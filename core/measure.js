// Interpretação das medições do TF37 Pro, conforme o Podsfine 1.2.3
// (ble/infoutils/BleDataUtils.handleSportData / handleHealthData e view/MeasurementBtnView).
// Todos os inteiros multibyte são big-endian (BleUtils.byte2Int).
// `p` é sempre o payload do quadro DF (a partir do byte 9 do quadro).

const u16 = (p, i) => ((p[i] << 8) | p[i + 1]) >>> 0;
const u32 = (p, i) => ((p[i] << 24) | (p[i + 1] << 16) | (p[i + 2] << 8) | p[i + 3]) >>> 0;

/** Data de 2 bytes (BleUtils.getDateBean): ano 7 bits (desde 2000), mês 4 bits, dia 5 bits. */
export function decodeDate2(b0, b1) {
  const year = 2000 + ((b0 & 0x7f) >> 1);
  const month = ((b0 & 1) << 3) + ((b1 & 0xe0) >> 5);
  const day = b1 & 31;
  return { year, month, day, iso: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}` };
}

/** 04/00 — atividade de hoje: passos, distância (m) e calorias (cal). */
export function decodeToday(p) {
  if (p.length < 12) return null;
  const steps = u32(p, 0);
  const distanceM = u32(p, 4);
  const calories = u32(p, 8);
  // Mesmos limites de sanidade do app oficial.
  const plausible = steps <= 2400000 && distanceM <= 1920000 && calories <= 44640000;
  return { steps, distanceM, distanceKm: distanceM / 1000, calories, kcal: calories / 1000, plausible };
}

/** 04/01 — passos por hora: data(2) quantidade(2) e registros de 12 bytes. */
export function decodeHourly(p) {
  if (p.length < 4) return null;
  const date = decodeDate2(p[0], p[1]);
  const count = u16(p, 2);
  const hours = [];
  for (let i = 0; i < count && 4 + i * 12 + 12 <= p.length; i++) {
    const b = 4 + i * 12;
    let steps = u32(p, b);
    let distanceM = u32(p, b + 4);
    let calories = u32(p, b + 8);
    if (steps > 240000 || distanceM > 192000 || calories > 4464000) { steps = 0; distanceM = 0; calories = 0; }
    hours.push({ hour: i, steps, distanceM, calories });
  }
  return { date: date.iso, count, hours };
}

/** 03/00 — histórico de frequência cardíaca: data(2) quantidade(2), registros de 8 bytes. */
export function decodeHrHistory(p) {
  if (p.length < 4) return null;
  const date = decodeDate2(p[0], p[1]);
  const count = u16(p, 2);
  const records = [];
  for (let i = 0; i < count && 4 + i * 8 + 8 <= p.length; i++) {
    const b = 4 + i * 8;
    const seconds = u32(p, b);
    const bpm = p[b + 7];
    if (bpm < 30) continue; // o app oficial descarta valores abaixo de 30
    const hh = String(Math.floor(seconds / 3600)).padStart(2, '0');
    const mm = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
    records.push({ time: `${hh}:${mm}`, seconds, bpm, mode: p[b + 4], auto: p[b + 5] === 1 });
  }
  return { date: date.iso, count, records };
}

/** 03/2A — valor ao vivo durante a medição: [tipo, valor]. Tipo 1 = bpm, 2 = SpO2 %. */
export function decodeLive(p) {
  if (p.length < 2) return null;
  const type = p[0];
  const value = p[1];
  const name = { 1: 'frequência cardíaca', 2: 'oxigênio no sangue' }[type] || `tipo ${type}`;
  const unit = { 1: 'bpm', 2: '%' }[type] || '';
  return { type, value, name, unit };
}

/** 03/0F (FC), 03/12 (SpO2), 03/15 (pressão), 03/29 (estresse): estado da medição.
 *  0 parado, 1 medindo, 2 falhou (o Podsfine mostra "tentar de novo"; MeasurementBtnView). */
export const MEASURE_STATUS_KEYS = { 0x0f: 'frequência cardíaca', 0x12: 'oxigênio no sangue', 0x15: 'pressão arterial', 0x29: 'estresse', 0x31: 'temperatura' };

export function decodeStatus(key, p) {
  if (!(key in MEASURE_STATUS_KEYS) || p.length < 1) return null;
  const status = p[0];
  const text = { 0: 'parado', 1: 'medindo', 2: 'falhou: o relógio não conseguiu medir (está no pulso?)' }[status] ?? `estado ${status}`;
  return { what: MEASURE_STATUS_KEYS[key], status, text, failed: status === 2 };
}

/**
 * Comandos de medição sob demanda (CommandUtils.sendRequest*): 06/xx com payload 1 (iniciar) ou 0 (parar).
 * Só a frequência cardíaca é declarada pelos recursos deste relógio.
 */
export const MEASUREMENTS = [
  { id: 'hr', label: 'Frequência cardíaca', cmd: 0x06, key: 0x04, liveType: 1, unit: 'bpm', declared: true },
  { id: 'spo2', label: 'Oxigênio no sangue', cmd: 0x06, key: 0x06, liveType: 2, unit: '%', declared: false },
  { id: 'bp', label: 'Pressão arterial', cmd: 0x06, key: 0x05, liveType: null, unit: 'mmHg', declared: false },
  { id: 'stress', label: 'Estresse', cmd: 0x06, key: 0x12, liveType: null, unit: '', declared: false },
];

export function measureCommand(m, on) {
  return {
    id: `${m.id}-${on ? 'on' : 'off'}`, method: `sendRequest(${m.id})`, cmd: m.cmd, key: m.key,
    group: 'saude', risk: 'seguro', label: `${m.label}: ${on ? 'medir' : 'parar'}`,
    description: 'Inicia ou interrompe a medição no relógio.', params: [], encode: () => [on ? 1 : 0],
  };
}

/** Estatísticas simples de uma série de valores. */
export function stats(values) {
  if (!values.length) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  return { n: values.length, min, max, avg: Math.round(avg * 10) / 10, last: values[values.length - 1] };
}
