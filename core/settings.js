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
};
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
    if (t === 7) out.sedentarismo = { naoPerturbe: p[i + 1], ligado: p[i + 2], limite: (p[i + 3] << 8) | p[i + 4], tempo: p[i + 5], inicio: p[i + 6], fim: p[i + 7], repetir: p[i + 8] };
    i += TAG_LEN[t];
  }
  if (i < p.length) out.paradoNaEtiqueta = `0x${p[i].toString(16).padStart(2, '0')} (desconhecida também para o app oficial)`;
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
  ];
}

/** Tudo o que dá para devolver ao valor lido depois de testar comandos que alteram configurações. */
export function restorePlan(settings) {
  if (!settings) return [];
  return [
    ...writeBackPlan(settings),
    ...(settings.unidades ? [{ id: 'setUnit', params: { i: settings.unidades.distancia, i2: settings.unidades.temperatura }, campo: 'unidades' }] : []),
    ...(settings.tempoDeTela !== undefined ? [{ id: 'sendScreenTime', params: { i: settings.tempoDeTela }, campo: 'tempo de tela' }] : []),
  ];
}
