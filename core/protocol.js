// Protocolo DF/FD do TF37 Pro (ver ../docs/PROTOCOLO.md e ../docs/CAPTURAS.md).
// Módulo puro: sem Bluetooth e sem DOM, para poder ser testado com `node --test`.

export const UUID = {
  service: '000018ac-0000-1000-8000-00805f9b34fb',
  write: '00002aad-0000-1000-8000-00805f9b34fb',
  notify: '00002aac-0000-1000-8000-00805f9b34fb',
  batteryService: '0000180f-0000-1000-8000-00805f9b34fb',
  batteryLevel: '00002a19-0000-1000-8000-00805f9b34fb',
  // Canal de arquivos D5/D6 (variante 5610; o firmware usa 18A8 em modo DFU): o app NUNCA escreve nele.
  otaService: '00001106-0000-1000-8000-00805f9b34fb',
};

export const DF = 0xdf;
export const FD = 0xfd;

/** Checksum: soma de todos os bytes do quadro exceto o byte 3, módulo 256. */
export function checksum(frame) {
  let sum = 0;
  for (let i = 0; i < frame.length; i++) if (i !== 3) sum += frame[i];
  return sum & 0xff;
}

/** Monta um quadro DF como CommandUtils.generalSendBytes + NotifyWriteUtils.addSumCheck. */
export function buildFrame(cmd, key, payload = [], version = 0) {
  const p = Uint8Array.from(payload);
  const frame = new Uint8Array(9 + p.length);
  frame[0] = DF;
  frame[1] = ((p.length + 5) >> 8) & 0xff;
  frame[2] = (p.length + 5) & 0xff;
  frame[4] = cmd & 0xff;
  frame[5] = version & 0xff;
  frame[6] = key & 0xff;
  frame[7] = (p.length >> 8) & 0xff;
  frame[8] = p.length & 0xff;
  frame.set(p, 9);
  frame[3] = checksum(frame);
  return frame;
}

/** ACK do app (AckPackageConfigUtils.configAck): status 0 = ok, 3 = checksum inválido. */
export function buildAck(cmd, key, status = 0, version = 0) {
  const frame = Uint8Array.from([FD, 0, 6, 0, cmd & 0xff, version & 0xff, key & 0xff, 0, 1, status & 0xff]);
  frame[3] = checksum(frame);
  return frame;
}

/** Decodifica um quadro completo. Devolve null se não começar com DF/FD. */
export function parseFrame(frame) {
  if (!frame || frame.length < 7 || (frame[0] !== DF && frame[0] !== FD)) return null;
  const declared = ((frame[1] << 8) | frame[2]) + 4;
  const out = {
    kind: frame[0] === DF ? 'DF' : 'FD',
    cmd: frame[4],
    version: frame[5],
    key: frame[6],
    checksumOk: checksum(frame) === frame[3],
    lengthOk: declared === frame.length,
    payload: new Uint8Array(0),
  };
  if (out.kind === 'DF' && frame.length >= 9) {
    const plen = (frame[7] << 8) | frame[8];
    out.payload = frame.slice(9, 9 + plen);
    out.lengthOk = out.lengthOk && plen + 9 === frame.length;
  } else if (out.kind === 'FD') {
    out.payload = frame.slice(7);
    out.status = frame[frame.length - 1];
  }
  return out;
}

/**
 * Remonta quadros que chegam picotados em várias notificações.
 * push(bytes) devolve a lista de quadros completos.
 */
export class Reassembler {
  constructor() {
    this.buf = null;
    this.total = 0;
  }

  push(chunk) {
    const data = Uint8Array.from(chunk);
    const done = [];
    if (this.buf) {
      const merged = new Uint8Array(this.buf.length + data.length);
      merged.set(this.buf);
      merged.set(data, this.buf.length);
      if (merged.length >= this.total) {
        done.push(merged.slice(0, this.total));
        this.buf = null;
      } else {
        this.buf = merged;
      }
      return done;
    }
    if (data.length >= 3 && (data[0] === DF || data[0] === FD)) {
      const total = ((data[1] << 8) | data[2]) + 4;
      if (data.length < total) {
        this.buf = data;
        this.total = total;
        return done;
      }
      done.push(data.slice(0, total));
      return done;
    }
    done.push(data); // bytes fora do formato: entrega como estão
    return done;
  }

  reset() {
    this.buf = null;
  }
}

/** Data/hora no formato de 4 bytes de CommandUtils.sendSystemTime. */
export function encodeTime(d) {
  const y = d.getFullYear() - 2000;
  const mo = d.getMonth() + 1;
  const day = d.getDate();
  const h = d.getHours();
  const mi = d.getMinutes();
  const s = d.getSeconds();
  return [
    ((y << 2) + (mo >> 2)) & 0xff,
    (((mo & 3) << 6) + (day << 1) + (h >> 4)) & 0xff,
    (((h & 15) << 4) + (mi >> 2)) & 0xff,
    (((mi & 3) << 6) + s) & 0xff,
  ];
}

export function decodeTime(b) {
  return {
    year: 2000 + (b[0] >> 2),
    month: ((b[0] & 3) << 2) | (b[1] >> 6),
    day: (b[1] >> 1) & 31,
    hour: ((b[1] & 1) << 4) | (b[2] >> 4),
    minute: ((b[2] & 15) << 2) | (b[3] >> 6),
    second: b[3] & 63,
  };
}

export const hex = (bytes) => Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join(' ');

export function ascii(bytes) {
  return Array.from(bytes, (b) => (b >= 32 && b < 127 ? String.fromCharCode(b) : '.')).join('');
}

/**
 * Testes disponíveis no app. Todos vêm de CommandUtils (Podsfine 1.2.3).
 * kind: 'leitura' só pede dados; 'ação' muda algo visível mas reversível.
 * Comandos perigosos (20/02 iniciar OTA, 02/09 reset de fábrica, 08/xx bind/unbind)
 * ficam de fora de propósito.
 */
export const TESTS = [
  { id: 'identity', label: 'Identidade (F3/00)', cmd: 0xf3, key: 0x00, payload: [], kind: 'leitura' },
  { id: 'features', label: 'Recursos (00/00)', cmd: 0x00, key: 0x00, payload: [0], kind: 'leitura' },
  { id: 'nameVersion', label: 'Nome e firmware (02/17)', cmd: 0x02, key: 0x17, payload: [], kind: 'leitura' },
  { id: 'productId', label: 'ID do produto (14/00)', cmd: 0x14, key: 0x00, payload: [1], kind: 'leitura' },
  { id: 'otaInfo', label: 'Info de OTA / chip (20/01)', cmd: 0x20, key: 0x01, payload: [], kind: 'leitura' },
  { id: 'battery', label: 'Bateria (11/00)', cmd: 0x11, key: 0x00, payload: [0], kind: 'leitura' },
  { id: 'settings', label: 'Configurações (02/06)', cmd: 0x02, key: 0x06, payload: [1], kind: 'leitura' },
  { id: 'today', label: 'Dados de hoje (01/01)', cmd: 0x01, key: 0x01, payload: [1], kind: 'leitura' },
  { id: 'alarms', label: 'Alarmes (06/08)', cmd: 0x06, key: 0x08, payload: [1], kind: 'leitura' },
  { id: 'faceCode', label: 'Mostrador atual (0B/01)', cmd: 0x0b, key: 0x01, payload: [1], kind: 'leitura' },
  { id: 'otaUnique', label: 'Código único OTA (0C/00)', cmd: 0x0c, key: 0x00, payload: [1], kind: 'leitura' },
  { id: 'otaStatus', label: 'Status de OTA (0C/03)', cmd: 0x0c, key: 0x03, payload: [1], kind: 'leitura' },
  { id: 'screenTime', label: 'Tempo de tela (02/1F)', cmd: 0x02, key: 0x1f, payload: [0], kind: 'leitura' },
  { id: 'findWatch', label: 'Encontrar relógio (06/00)', cmd: 0x06, key: 0x00, payload: [1], kind: 'ação' },
  { id: 'healthOn', label: 'Saúde em tempo real: ligar (02/03)', cmd: 0x02, key: 0x03, payload: [1], kind: 'ação' },
  { id: 'healthOff', label: 'Saúde em tempo real: desligar (02/03)', cmd: 0x02, key: 0x03, payload: [0], kind: 'ação' },
  { id: 'sportOn', label: 'Esporte em tempo real: ligar (02/02)', cmd: 0x02, key: 0x02, payload: [1], kind: 'ação' },
  { id: 'sportOff', label: 'Esporte em tempo real: desligar (02/02)', cmd: 0x02, key: 0x02, payload: [0], kind: 'ação' },
  { id: 'setTime', label: 'Acertar hora (02/08)', cmd: 0x02, key: 0x08, payload: () => encodeTime(new Date()), kind: 'ação' },
];

// Pares comando/chave (decimal) que o app se recusa a enviar, mesmo por engano:
// 20/02 iniciar OTA, 02/09 reset de fábrica, 08/00 bind, 08/01 unbind.
const BLOCKED = new Set(['32/2', '2/9', '8/0', '8/1']);

export function isBlocked(cmd, key) {
  return BLOCKED.has(`${cmd}/${key}`);
}

/** Interpreta respostas conhecidas. Devolve texto legível ou ''. */
export function describe(f) {
  if (!f || f.kind !== 'DF') return '';
  const p = f.payload;
  const k = `${f.cmd}/${f.key}`;
  switch (k) {
    case '2/23': { // 02/17 nome e versão: [tam][versão][tam][projeto]
      const vl = p[0] ?? 0;
      const pl = p[1 + vl] ?? 0;
      return `firmware/projeto: ${ascii(p.slice(1, 1 + vl))} ${ascii(p.slice(2 + vl, 2 + vl + pl))}`;
    }
    case '32/1': { // 20/01 OTA: prefixo(4) len versão len chip
      if (p.length < 6) return '';
      const vlen = p[4];
      const version = ascii(p.slice(5, 5 + vlen));
      const clen = p[5 + vlen] ?? 0;
      const chip = ascii(p.slice(6 + vlen, 6 + vlen + clen));
      return `OTA id=${hex(p.slice(0, 4))} versão=${version} chip=${chip}`;
    }
    case '17/0':
    case '17/1':
      return `bateria: ${p[p.length - 1]}%`;
    case '17/5':
      return `carregando: ${p[0]}`;
    case '20/0':
      return `produto: ${ascii(p)}`;
    case '0/0':
      return describeFeatures(f);
    case '2/8':
      return p.length >= 4 ? `hora: ${JSON.stringify(decodeTime(p))}` : '';
    case '4/0':
      return `saúde em tempo real: ${hex(p)} (último byte ${p[p.length - 1]})`;
    default:
      return ascii(p).replace(/\./g, '').length >= 4 ? `texto: ${ascii(p)}` : '';
  }
}

/** Bits do bloco de recursos, conforme NotifyWriteUtils (case 0). Índices do quadro inteiro. */
export function describeFeatures(f) {
  const b = new Uint8Array(9 + f.payload.length);
  b.set(f.payload, 9);
  const flags = [];
  const bit = (i, mask, name) => { if (b.length > i && (b[i] & mask) === mask) flags.push(name); };
  if (b[9] === 1) flags.push('G-sensor');
  if (b[11] === 1) flags.push('frequência cardíaca');
  if (b[13] === 1) flags.push('GPS');
  bit(15, 0x80, 'sedentarismo'); bit(15, 0x40, '24h'); bit(15, 0x20, 'carrossel'); bit(15, 0x10, 'contatos');
  bit(16, 0x40, 'OTA'); bit(16, 0x20, 'QR code'); bit(16, 0x04, 'msg nova'); bit(16, 0x02, 'alarme');
  bit(17, 0x80, 'mostrador'); bit(17, 0x40, 'mostrador custom'); bit(17, 0x20, 'enviar mostrador');
  bit(18, 0x80, 'não perturbe'); bit(18, 0x40, 'unidades'); bit(18, 0x10, 'clima 7 dias');
  bit(18, 0x02, 'HID'); bit(18, 0x01, 'SOS');
  bit(19, 0x20, 'relato de bateria'); bit(19, 0x04, 'lembretes');
  const platform = b.length > 15 ? (b[15] & 15) : 0;
  return `recursos: ${flags.join(', ') || 'nenhum'}; plataforma ${platform <= 1 ? 1 : platform}`;
}
