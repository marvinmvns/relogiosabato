// Sessão com o TF37 Pro: conexão, notificações, remontagem, ACK, envio de comandos
// e registro de tudo. Independe de plataforma: o Bluetooth vem do adaptador `ble`.
//
// Interface do adaptador ble (Android: Capacitor; desktop: Web Bluetooth):
//   initialize()
//   requestDevice({ namePrefix?, optionalServices }) -> { id, name }
//   connect(id, onDisconnect)
//   disconnect(id)
//   getServices(id) -> [{ uuid, characteristics: [{ uuid, properties: string[] }] }]
//   startNotifications(id, service, characteristic, cb(Uint8Array))
//   read(id, service, characteristic) -> Uint8Array
//   writeWithoutResponse(id, service, characteristic, Uint8Array)
//   scan?({ namePrefix }, cb(result), ms)  // opcional
import {
  UUID, buildFrame, buildAck, parseFrame, Reassembler, describe, hex, isBlocked,
} from './protocol.js';

export const OTA_NOTIFY = '00001107-0000-1000-8000-00805f9b34fb';

const cmdKey = (c, k) => `${c.toString(16).padStart(2, '0')}/${k.toString(16).padStart(2, '0')}`.toUpperCase();
export { cmdKey };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Tempos do app oficial (ms). minBattery: abaixo disso não reconecta sozinho (regra do projeto). */
export const TIMING = {
  notifyDelay: 1000, handshakeDelay: 1000,
  reconnectAfterDrop: 10000, reconnectAfterFail: 3000, reconnectScanMs: 5000,
  autoReconnect: true, minBattery: 15,
};

export class Session extends EventTarget {
  constructor({ ble, recorder, responses = [], timing = {} }) {
    super();
    this.timing = { ...TIMING, ...timing };
    this.ble = ble;
    this.recorder = recorder;
    this.responses = new Map(responses.map((r) => [`${r.cmd}/${r.key}`, r]));
    this.device = null;
    this.version = 0; // byte de versão; o relógio informa (0x04 no TF37 Pro)
    this.reasm = new Reassembler();
    this.info = {};
    this.lastByCmd = new Map(); // "cmd/key" -> última resposta DF
    this.waiters = new Set();
    this.counters = { rx: 0, tx: 0, invalid: 0 };
  }

  get connected() {
    return Boolean(this.device);
  }

  #emit(type, detail) {
    this.dispatchEvent(new CustomEvent(type, { detail }));
  }

  #setInfo(key, value) {
    this.info[key] = value;
    this.#emit('info', { key, value });
  }

  /**
   * Conecta escolhendo o relógio na lista do sistema. A lógica de conexão segue o app
   * oficial (Podsfine 1.2.3, MBleManager + BaseReconnectBlueActivity + MainActivity):
   *   1. conecta e descobre os serviços;
   *   2. espera 1 s e ativa as notificações em 2AAC;
   *   3. espera 1 s e pede 14/00 (produto), 00/00 (recursos) e F3/00 (identidade);
   *   4. se a conexão cair sem o usuário pedir, reconecta sozinho: 10 s depois da queda
   *      e 3 s depois de cada tentativa que falhar, alternando conexão direta e busca.
   * O passo seguinte do app oficial (vínculo 08/xx) fica de fora: é bloqueado aqui.
   */
  async connect(opts = {}) {
    // Dois toques em "Conectar" abriam duas conexões em paralelo, que brigavam pelo
    // mesmo relógio (GATT 133). Uma de cada vez.
    if (this.connecting) throw new Error('já está conectando; aguarde');
    if (this.device) return;
    this.#cancelReconnect();
    this.connecting = true;
    try {
      await this.ble.initialize();
      this.#emit('status', { text: 'Escolha o relógio na lista' });
      const device = await this.ble.requestDevice({
        namePrefix: opts.any ? undefined : 'TF37',
        optionalServices: [UUID.service, UUID.batteryService, UUID.otaService],
      });
      this.lastDevice = device;
      this.autoReconnect = this.timing.autoReconnect;
      // O link às vezes cai logo depois de conectar, antes dos serviços (visto no BlueZ do
      // Linux e no Android): repete a sequência inteira, não só o connect.
      for (let round = 1; ; round++) {
        try {
          await this.#open(device, 4);
          break;
        } catch (e) {
          if (this.device) { try { await this.ble.disconnect(device.id); } catch (_e) { /* já caiu */ } this.device = null; }
          if (round >= 3 || /cancel/i.test(e.message)) throw e;
          await this.recorder.add({ type: 'erro', note: `conexão caiu durante a preparação (${e.message}); repetindo, rodada ${round + 1} de 3` });
          this.#emit('status', { text: `A conexão caiu durante a preparação. Tentando de novo (${round + 1} de 3).` });
          await sleep(1500);
        }
      }
    } finally {
      this.connecting = false;
    }
  }

  async #open(device, attempts) {
    await this.recorder.add({ type: 'evento', note: `conectando a ${device.name || '?'} ${device.id}` });
    this.#emit('status', { text: `Conectando a ${device.name || device.id}` });
    await this.#connectWithRetry(device.id, attempts);
    this.device = device;
    this.reasm.reset();
    this.version = 0;

    const services = await this.ble.getServices(device.id);
    this.services = services;
    await this.recorder.add({ type: 'gatt', summary: `${services.length} serviços`, services });

    // Podsfine: onServicesDiscovered -> postDelayed(setNotify 2AAC, 1000 ms).
    await sleep(this.timing.notifyDelay);
    this.#alive();
    await this.ble.startNotifications(device.id, UUID.service, UUID.notify, (b) => this.#onWatchData(b));
    await this.recorder.add({ type: 'evento', note: 'notificações ativas em 2AAC (comandos)' });
    await this.#subscribeOptional(UUID.batteryService, UUID.batteryLevel, '2A19', (b) => {
      this.#setInfo('bateria2a19', `${b[0]}%`);
      this.recorder.add({ dir: 'rx', channel: '2A19', hex: hex(b), summary: `2A19 notificou ${b[0]}%` });
    });
    // Canal de OTA: só escuta. Nada é escrito no 1108.
    await this.#subscribeOptional(UUID.otaService, OTA_NOTIFY, '1107', (b) => {
      this.recorder.add({ dir: 'rx', channel: '1107-OTA', hex: hex(b), summary: 'notificação no canal de OTA' });
    });
    try {
      const b = await this.ble.read(device.id, UUID.batteryService, UUID.batteryLevel);
      this.#setInfo('bateria2a19', `${b[0]}%`);
      await this.recorder.add({ dir: 'rx', channel: '2A19', hex: hex(b), summary: `2A19 leu ${b[0]}%` });
    } catch (e) {
      await this.recorder.add({ type: 'erro', note: `leitura 2A19: ${e.message}` });
    }
    this.#setInfo('aparelho', `${device.name || '?'} (${device.id})`);
    // Podsfine: onNotifySuccess -> postDelayed(getProductId, getDeviceFeatures, getDeviceInfo; 1000 ms).
    await sleep(this.timing.handshakeDelay);
    await this.#handshake();
    if (!this.device) throw new Error('o relógio desconectou logo depois de conectar');
    this.reconnectTry = 0;
    this.#emit('connection', { connected: true, device });
  }

  #alive() {
    if (!this.device) throw new Error('o relógio desconectou durante a conexão');
  }

  /**
   * As três leituras que o app oficial manda logo depois de ativar as notificações
   * (MainActivity.onNotifySuccess), todas já confirmadas no relógio real. Também evitam
   * que o TF37 Pro derrube a conexão: sem nenhum comando em ~11 s ele desconecta (status 19).
   */
  async #handshake() {
    const reads = [
      [0x14, 0x00, [0x01], '14/00 produto', 'ID do produto'],
      [0x00, 0x00, [0x00], '00/00 recursos', 'Recursos do relógio'],
      [0xf3, 0x00, [], 'F3/00 identidade', 'Identidade do relógio'],
    ];
    for (const [cmd, key, payload, what, label] of reads) {
      if (!this.device) return;
      try {
        const reply = this.waitFor((f) => f.cmd === cmd && f.key === key, 3000);
        await this.#write(buildFrame(cmd, key, payload, this.version), `${label} (ao conectar)`);
        if (!(await reply)) await this.recorder.add({ type: 'evento', note: `ao conectar: sem resposta a ${what} em 3 s` });
      } catch (e) {
        await this.recorder.add({ type: 'erro', note: `ao conectar (${what}): ${e.message}` });
      }
    }
  }

  /** O Android falha às vezes com GATT 133 / reason 62; tenta de novo. */
  async #connectWithRetry(id, attempts = 4) {
    for (let i = 1; i <= attempts; i++) {
      try {
        await this.ble.connect(id, () => this.#onDisconnect(id));
        if (i > 1) await this.recorder.add({ type: 'evento', note: `conectou na tentativa ${i}` });
        return;
      } catch (e) {
        await this.recorder.add({ type: 'erro', note: `tentativa ${i}/${attempts} de conexão: ${e.message}` });
        try { await this.ble.disconnect(id); } catch (_e) { /* já desconectado */ }
        if (i === attempts) throw e;
        this.#emit('status', { text: `Falhou (${e.message}). Tentando de novo, ${i + 1} de ${attempts}` });
        await sleep(1500 * i);
      }
    }
  }

  async #subscribeOptional(service, characteristic, label, cb) {
    try {
      await this.ble.startNotifications(this.device.id, service, characteristic, cb);
      await this.recorder.add({ type: 'evento', note: `notificações ativas em ${label}` });
    } catch (e) {
      await this.recorder.add({ type: 'evento', note: `sem notificações em ${label}: ${e.message}` });
    }
  }

  #onDisconnect(id) {
    if (!this.device) return;
    this.device = null;
    this.recorder.add({ type: 'evento', note: `desconectado (${id})` });
    this.#emit('connection', { connected: false });
    if (!this.connecting) this.#scheduleReconnect(this.timing.reconnectAfterDrop);
  }

  // ---------- reconexão automática (BaseReconnectBlueActivity) ----------

  get reconnecting() {
    return Boolean(this.reconnectTimer) || Boolean(this.reconnectBusy);
  }

  #batteryLow() {
    const pct = parseInt(this.info.bateria2a19 ?? this.info.bateria, 10);
    return Number.isFinite(pct) && pct < this.timing.minBattery;
  }

  #scheduleReconnect(ms) {
    if (!this.autoReconnect || !this.lastDevice || this.device) return;
    if (this.#batteryLow()) {
      this.recorder.add({ type: 'evento', note: `reconexão automática suspensa: bateria abaixo de ${this.timing.minBattery}%` });
      this.#emit('status', { text: 'Bateria baixa: não vou reconectar sozinho. Toque em "Conectar".' });
      return;
    }
    this.#cancelReconnect();
    this.#emit('status', { text: `Relógio desconectado. Reconectando em ${Math.round(ms / 1000)} s.` });
    this.reconnectTimer = setTimeout(() => { this.reconnectTimer = null; this.#reconnect(); }, ms);
  }

  #cancelReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
  }

  async #reconnect() {
    if (this.device || this.connecting || !this.autoReconnect) return;
    this.reconnectTry = (this.reconnectTry || 0) + 1;
    const n = this.reconnectTry;
    const device = this.lastDevice;
    this.connecting = true;
    this.reconnectBusy = true;
    try {
      // Podsfine (Android 8+): tentativas pares conectam direto; ímpares buscam o
      // anúncio do relógio antes, o que ajuda o Android a achar o aparelho de novo.
      if (n % 2 === 0 && this.ble.scan) {
        this.#emit('status', { text: `Procurando o relógio (reconexão ${n})` });
        let seen = false;
        try {
          await this.ble.scan({ namePrefix: 'TF37' }, (r) => { if (r.id === device.id) seen = true; }, this.timing.reconnectScanMs);
        } catch (_e) { /* sem busca nesta plataforma: conecta direto */ seen = true; }
        if (!seen) throw new Error('o relógio não apareceu na busca');
      }
      await this.recorder.add({ type: 'evento', note: `reconexão automática ${n}` });
      await this.#open(device, 1);
      await this.recorder.add({ type: 'evento', note: `reconectado na tentativa ${n}` });
    } catch (e) {
      await this.recorder.add({ type: 'erro', note: `reconexão ${n} falhou: ${e.message}` });
      if (this.device) { try { await this.ble.disconnect(device.id); } catch (_e) { /* já caiu */ } this.device = null; }
      this.connecting = false;
      this.reconnectBusy = false;
      this.#scheduleReconnect(this.timing.reconnectAfterFail);
      return;
    }
    this.connecting = false;
    this.reconnectBusy = false;
  }

  /** Desconecta a pedido do usuário: não reconecta sozinho depois. */
  async disconnect() {
    this.autoReconnect = false;
    this.#cancelReconnect();
    if (this.device) {
      const { id } = this.device;
      await this.ble.disconnect(id);
      this.#onDisconnect(id);
    }
    this.#emit('status', { text: 'Desconectado. A reconexão automática fica desligada até você tocar em "Conectar".' });
  }

  async scan(ms = 10000) {
    if (!this.ble.scan) throw new Error('scan de anúncios não disponível nesta plataforma');
    await this.ble.initialize();
    await this.recorder.add({ type: 'evento', note: `scan de anúncios (${ms / 1000} s)` });
    const seen = new Map();
    await this.ble.scan({ namePrefix: 'TF37' }, (r) => {
      const key = `${r.id}|${JSON.stringify(r.manufacturerData)}`;
      const n = (seen.get(key) || 0) + 1;
      seen.set(key, n);
      if (n === 1 || n % 20 === 0) {
        this.recorder.add({
          type: 'anuncio', dir: 'rx', channel: 'anuncio',
          summary: `${r.name || '?'} ${r.id} RSSI ${r.rssi}`,
          manufacturerData: r.manufacturerData, uuids: r.uuids || [], count: n,
        });
      }
    }, ms);
    await this.recorder.add({ type: 'evento', note: `scan terminado: ${seen.size} variações de anúncio` });
    return seen.size;
  }

  /** Tudo o que chega em 2AAC: grava o pedaço bruto, remonta, decodifica, confirma. */
  async #onWatchData(chunk) {
    this.counters.rx++;
    this.#emit('packet', { dir: 'rx' });
    await this.recorder.add({ dir: 'rx', channel: '2AAC-bruto', hex: hex(chunk), summary: `${chunk.length} bytes` });
    for (const frame of this.reasm.push(chunk)) {
      const f = parseFrame(frame);
      if (!f) {
        await this.recorder.add({ dir: 'rx', channel: '2AAC', hex: hex(frame), summary: 'fora do formato DF/FD' });
        continue;
      }
      const valid = f.checksumOk && f.lengthOk;
      if (!valid) this.counters.invalid++;
      const spec = this.responses.get(`${f.cmd}/${f.key}`);
      let parsed;
      if (spec?.parse && f.kind === 'DF') {
        try { parsed = spec.parse(f.payload); } catch (e) { parsed = { erro: e.message }; }
      }
      const text = describe(f);
      const entry = await this.recorder.add({
        dir: 'rx', channel: '2AAC', kind: f.kind, cmd: f.cmd, key: f.key, version: f.version,
        valid, status: f.status, hex: hex(frame), payload: hex(f.payload),
        summary: `${f.kind} ${cmdKey(f.cmd, f.key)}${spec ? ` ${spec.name}` : ''}${valid ? '' : ' ⚠ checksum/tamanho inválido'}`,
        text, parsed,
      });
      if (f.kind === 'DF') {
        if (this.version !== f.version) {
          this.version = f.version;
          this.#setInfo('versao', `0x${f.version.toString(16).padStart(2, '0')}`);
        }
        await this.#write(buildAck(f.cmd, f.key, valid ? 0 : 3, this.version), 'ACK');
        this.lastByCmd.set(`${f.cmd}/${f.key}`, entry);
        this.#remember(f, text);
      }
      this.#emit('frame', { frame: f, entry });
      for (const w of [...this.waiters]) {
        if (w.match(f)) {
          this.waiters.delete(w);
          w.resolve({ frame: f, entry });
        }
      }
    }
  }

  #remember(f, text) {
    const k = `${f.cmd}/${f.key}`;
    if (k === '2/23') this.#setInfo('firmware', text.replace('firmware/projeto: ', ''));
    else if (k === '32/1') this.#setInfo('chip', text.replace('OTA ', ''));
    else if (k === '17/0' || k === '17/1') this.#setInfo('bateria', text.replace('bateria: ', ''));
    else if (k === '0/0') this.#setInfo('recursos', text.replace('recursos: ', ''));
    else if (k === '20/0') this.#setInfo('produto', text.replace('produto: ', ''));
    else if (k === '17/5') this.#setInfo('carregando', text.replace('carregando: ', ''));
    else if (k === '17/6') this.#setInfo('alertaBateria', f.payload[0] === 1 ? 'abaixo de 20%' : 'abaixo de 10%');
  }

  /** Espera um quadro que satisfaça `match`, ou null após `ms`. */
  waitFor(match, ms) {
    return new Promise((resolve) => {
      const w = { match, resolve };
      this.waiters.add(w);
      setTimeout(() => {
        if (this.waiters.delete(w)) resolve(null);
      }, ms);
    });
  }

  async #write(frame, label) {
    if (!this.device) throw new Error('relógio desconectado');
    const f = parseFrame(frame);
    if (f.kind === 'DF' && isBlocked(f.cmd, f.key)) throw new Error(`comando ${cmdKey(f.cmd, f.key)} bloqueado por segurança`);
    await this.ble.writeWithoutResponse(this.device.id, UUID.service, UUID.write, frame);
    this.counters.tx++;
    this.#emit('packet', { dir: 'tx' });
    await this.recorder.add({
      dir: 'tx', channel: '2AAD', kind: f.kind, cmd: f.cmd, key: f.key,
      hex: hex(frame), payload: hex(f.payload), summary: `${label} · ${f.kind} ${cmdKey(f.cmd, f.key)}`,
    });
  }

  /** Envia um comando do catálogo. Comandos perigosos nunca saem. */
  async send(command, params = {}) {
    if (command.risk === 'perigoso') throw new Error(`"${command.label}" é bloqueado por segurança`);
    if (!command.encode) throw new Error(`"${command.label}" tem payload complexo ainda não implementado`);
    const payload = command.encode({ ...defaults(command), ...params });
    const frame = buildFrame(command.cmd, command.key, payload, this.version);
    await this.#write(frame, command.label);
    return frame;
  }
}

export function defaults(command) {
  const out = {};
  for (const p of command.params || []) out[p.name] = typeof p.default === 'function' ? p.default() : p.default;
  return out;
}
