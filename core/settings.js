// Leitura da resposta de configurações (02/06) e teste de comandos de configuração
// SEM alterar o relógio: lê o valor atual e regrava exatamente o mesmo valor.
// Formato conforme BleDataUtils.handleSettingInfo do Podsfine 1.2.3 (índices do
// quadro - 9 = índices do payload). Só os campos de posição fixa são usados.

/** Campos fixos do payload de 02/06. `language5Bytes` vem dos recursos (byte 18, bit 0x04). */
export function parseSettings(p, { language5Bytes = false } = {}) {
  if (!p || p.length < 19) return null;
  const langEnd = language5Bytes ? 18 : 17; // 4 ou 5 bytes de idiomas suportados a partir de 13
  return {
    metaPassos: ((p[6] << 24) | (p[7] << 16) | (p[8] << 8) | p[9]) >>> 0, // hipótese forte: 5000 = padrão do app
    levantarParaAcender: p[11],
    idioma: p[12],
    idiomasSuportados: Array.from(p.slice(13, langEnd)),
    envioAutomaticoEsporte: p[langEnd],
    envioAutomaticoSaude: p[langEnd + 1],
    ...parseTags(p, langEnd + 2),
  };
}

// Campos com etiqueta depois do bloco fixo. Só as etiquetas de tamanho conhecido;
// para na primeira desconhecida (o resto continua no registro, em hex).
// Tamanhos conforme BleDataUtils.handleSettingInfo. Como o app oficial, para na primeira
// etiqueta desconhecida (no TF37 Pro: 0x33, logo depois da 0x0A).
const TAG_LEN = {
  4: 6, 5: 2, 6: 9, 7: 9, 8: 2, 9: 2, 10: 12, 11: 5, 12: 6, 13: 3, 14: 2, 15: 5, 16: 2, 17: 9,
  18: 2, 19: 2, 20: 2, 21: 9, 22: 5, 23: 5, 24: 2, 25: 9, 26: 9, 27: 2, 28: 9, 29: 9,
  // 0x33 não existe no app oficial (ele para aqui). Tamanho 9 deduzido da resposta real do
  // TF37 Pro: com ele, as etiquetas seguintes (0x0D, 0x19, 0x1A, 0x1B) fecham exatamente no
  // fim do payload. O conteúdo fica guardado em hex, sem interpretação.
  0x33: 9,
};
// Medições automáticas com o mesmo formato da FC automática (etiqueta 6).
const AUTO_TAGS = { 17: 'oxigenioAutomatico', 25: 'estresseAutomatico', 26: 'pressaoAutomatica', 28: 'temperaturaAutomatica', 29: 'hrvAutomatico' };
const AUTO_CMD = { oxigenioAutomatico: ['sendBoAutoTestSetting', 'oxigênio automático'], estresseAutomatico: ['sendPrAutoTestSetting', 'estresse automático'], pressaoAutomatica: ['sendBPAutoTestSetting', 'pressão automática'], temperaturaAutomatica: ['sendTemperAutoTestSetting', 'temperatura automática'], hrvAutomatico: ['sendHrvAutoTestSetting', 'HRV automático'] };
const hhmm = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

function parseTags(p, start) {
  const out = {};
  let i = start;
  while (i < p.length && TAG_LEN[p[i]] && i + TAG_LEN[p[i]] <= p.length) {
    const t = p[i];
    if (t === 4) out.sono = { ligado: p[i + 1], inicio: hhmm((p[i + 2] << 8) | p[i + 3]), fim: hhmm((p[i + 4] << 8) | p[i + 5]) };
    if (t === 5) out.pulsoDeUso = p[i + 1];
    if (t === 6) out.fcAutomatica = { ligado: p[i + 1], intervaloMin: (p[i + 3] << 8) | p[i + 4], inicio: hhmm((p[i + 5] << 8) | p[i + 6]), fim: hhmm((p[i + 7] << 8) | p[i + 8]) };
    if (t === 8) out.etiqueta08 = p[i + 1];
    if (t === 9) out.carrossel = p[i + 1];
    if (t === 10) out.notificacoesPorApp = Array.from(p.slice(i + 1, i + 12));
    if (t === 11) out.levantarJanela = { inicio: hhmm((p[i + 1] << 8) | p[i + 2]), fim: hhmm((p[i + 3] << 8) | p[i + 4]) };
    if (t === 12) out.naoPerturbe = { ligado: p[i + 1], inicio: hhmm((p[i + 2] << 8) | p[i + 3]), fim: hhmm((p[i + 4] << 8) | p[i + 5]) };
    if (t === 13) out.unidades = { distancia: p[i + 1], temperatura: p[i + 2] };
    if (t === 16) out.tempoDeTela = p[i + 1];
    if (t === 0x33) out.etiqueta33 = Array.from(p.slice(i + 1, i + 9), (b) => b.toString(16).padStart(2, '0')).join(' ');
    const auto = AUTO_TAGS[t];
    if (auto) out[auto] = { ligado: p[i + 1], intervaloMin: (p[i + 3] << 8) | p[i + 4], inicio: hhmm((p[i + 5] << 8) | p[i + 6]), fim: hhmm((p[i + 7] << 8) | p[i + 8]) };
    if (t === 27) out.sonoCientifico = p[i + 1];
    if (t === 7) out.sedentarismo = { naoPerturbe: p[i + 1], ligado: p[i + 2], limite: (p[i + 3] << 8) | p[i + 4], tempo: p[i + 5], inicio: p[i + 6], fim: p[i + 7], repetir: p[i + 8] };
    i += TAG_LEN[t];
  }
  if (i < p.length) out.paradoNaEtiqueta = `0x${p[i].toString(16).padStart(2, '0')} (tamanho desconhecido)`;
  return out;
}

/** Comandos de configuração que dá para regravar com o valor lido, sem mudar nada. */
export function writeBackPlan(settings) {
  if (!settings) return [];
  return [
    { id: 'handBright', params: { i: settings.levantarParaAcender }, campo: 'levantar o pulso para acender' },
    { id: 'setLanguage', params: { i: settings.idioma }, campo: 'idioma' },
    { id: 'setStepTarget', params: { passos: settings.metaPassos }, campo: 'meta de passos' },
    { id: 'setRealtimeSport', params: { i: settings.envioAutomaticoEsporte }, campo: 'envio automático de esporte' },
    { id: 'setRealtimeHealth', params: { i: settings.envioAutomaticoSaude }, campo: 'envio automático de saúde' },
    ...(settings.pulsoDeUso !== undefined ? [{ id: 'sendWearing', params: { i: settings.pulsoDeUso }, campo: 'pulso de uso' }] : []),
    ...(settings.sono ? [{ id: 'sendSleepSetting', params: { ligado: settings.sono.ligado, inicio: min(settings.sono.inicio), fim: min(settings.sono.fim) }, campo: 'sono' }] : []),
    ...(settings.fcAutomatica ? [{ id: 'sendHrAutoTestSetting', params: { ligado: settings.fcAutomatica.ligado, intervalo: settings.fcAutomatica.intervaloMin, inicio: min(settings.fcAutomatica.inicio), fim: min(settings.fcAutomatica.fim) }, campo: 'FC automática' }] : []),
    ...(settings.sedentarismo ? [{ id: 'sendSedentaryRemind', params: { ...settings.sedentarismo, limite: settings.sedentarismo.limite & 0xff }, campo: 'sedentarismo' }] : []),
    ...Object.entries(AUTO_CMD).filter(([k]) => settings[k]).map(([k, [id, campo]]) => ({ id, params: { ligado: settings[k].ligado, intervalo: settings[k].intervaloMin, inicio: min(settings[k].inicio), fim: min(settings[k].fim) }, campo })),
    ...(settings.sonoCientifico !== undefined ? [{ id: 'sendScientSleepTestSetting', params: { ligado: settings.sonoCientifico }, campo: 'sono científico' }] : []),
    ...(settings.limitesFc ? [{ id: 'sendHrAutoHigLowFla', params: { altoLigado: settings.limitesFc.alto.ligado, alto: settings.limitesFc.alto.atual, baixoLigado: settings.limitesFc.baixo.ligado, baixo: settings.limitesFc.baixo.atual }, campo: 'limites de alerta de FC' }] : []),
    ...Object.entries(settings.leituras || {}).filter(([, v]) => v).map(([id, dados]) => ({ id, params: { dados }, campo: RAW_READS.find((r) => r.write === id)?.campo || id })),
    ...(settings.naoPerturbe ? [{ id: 'setDND', params: { ligado: settings.naoPerturbe.ligado, inicio: min(settings.naoPerturbe.inicio), fim: min(settings.naoPerturbe.fim) }, campo: 'não perturbe' }] : []),
  ];
}

const min = (hhmmText) => { const [h, m] = String(hhmmText).split(':').map(Number); return h * 60 + m; };

/** Tudo o que dá para devolver ao valor lido depois de testar comandos que alteram configurações. */
export function restorePlan(settings) {
  if (!settings) return [];
  return [
    ...writeBackPlan(settings),
    ...(settings.unidades ? [{ id: 'setUnit', params: { i: settings.unidades.distancia, i2: settings.unidades.temperatura }, campo: 'unidades' }] : []),
    ...(settings.tempoDeTela !== undefined ? [{ id: 'sendScreenTime', params: { i: settings.tempoDeTela }, campo: 'tempo de tela' }] : []),
  ];
}

/** Resposta 03/09 (pedida com 03/08): alerta de FC alta e baixa (BleDataUtils, b == 9). */
export function parseHrLimits(p) {
  if (!p || p.length < 10) return null;
  return {
    alto: { ligado: p[0], max: p[1], min: p[2], passo: p[3], atual: p[4] },
    baixo: { ligado: p[5], max: p[6], min: p[7], passo: p[8], atual: p[9] },
  };
}

/**
 * Leituras cuja resposta tem o mesmo formato do comando de gravação (conferido em
 * NotifyWriteUtils e CommandUtils): a suíte regrava o payload lido, byte a byte.
 * Estes são sempre regravados com o valor lido, mesmo com "incluir configurações",
 * para nunca apagar alarmes ou lembretes.
 */
export const RAW_READS = [
  { read: 'requestGazeDistance', resp: [0x02, 0x3c], write: 'settingGazeDistance', campo: 'lembrete de olhar longe' },
  { read: 'requestFitnessReminder', resp: [0x02, 0x3e], write: 'settingFitnessReminder', campo: 'lembrete de exercício' },
  { read: 'requestReadingReminder', resp: [0x02, 0x40], write: 'settingReadingReminder', campo: 'lembrete de leitura' },
  { read: 'requestTravelReminder', resp: [0x02, 0x42], write: 'settingTravelReminder', campo: 'lembrete de viagem' },
  { read: 'requestHandWash', resp: [0x02, 0x4a], write: 'settingHandWash', campo: 'lembrete de lavar as mãos' },
  { read: 'requestDrinkReminder', resp: [0x22, 0x00], write: 'settingDrinkWater', campo: 'lembrete de beber água' },
  { read: 'getAlarm', resp: [0x06, 0x08], write: 'setAlarm', campo: 'alarmes' },
];
