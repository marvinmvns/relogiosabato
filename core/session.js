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

export class Session extends EventTarget {
  constructor({ ble, recorder, responses = [] }) {
    super();
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

  async connect({ any = false } = {}) {
    await this.ble.initialize();
    this.#emit('status', { text: 'Escolha o relógio na lista' });
    const device = await this.ble.requestDevice({
      namePrefix: any ? undefined : 'TF37',
      optionalServices: [UUID.service, UUID.batteryService, UUID.otaService],
    });
    await this.recorder.add({ type: 'evento', note: `conectando a ${device.name || '?'} ${device.id}` });
    this.#emit('status', { text: `Conectando a ${device.name || device.id}` });
    await this.#connectWithRetry(device.id);
    this.device = device;
    this.reasm.reset();
    this.version = 0;

    const services = await this.ble.getServices(device.id);
    await this.recorder.add({
      type: 'gatt',
      summary: `${services.length} serviços`,
      services,
    });

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
    this.#emit('connection', { connected: true, device });
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
        await new Promise((r) => setTimeout(r, 1500 * i));
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
  }

  async disconnect() {
    if (this.device) {
      const { id } = this.device;
      await this.ble.disconnect(id);
      this.#onDisconnect(id);
    }
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
