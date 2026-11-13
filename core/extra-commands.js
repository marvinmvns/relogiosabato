// Codificadores dos comandos restantes do Podsfine 1.2.3, um a um, fiéis ao
// CommandUtils.java (o arquivo e a linha de cada um ficam em `source` no catálogo).
// `personal: true` = grava dado da pessoa que o relógio não deixa ler de volta
// (perfil, remédios, SOS...): a suíte automática não envia; use a aba Comandos.

const utf8 = (s) => Array.from(new TextEncoder().encode(String(s ?? '')));
const u16 = (n) => [(n >> 8) & 0xff, n & 0xff];
const u32 = (n) => [(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff];
const hexBytes = (t) => {
  const c = String(t ?? '').replace(/0x/gi, '').replace(/[^0-9a-f]/gi, '');
  if (c.length % 2) throw new Error('hex com número ímpar de dígitos');
  return (c.match(/../g) || []).map((b) => parseInt(b, 16));
};
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const ymd = (s) => {
  const [y, m, d] = String(s || today()).split('-').map(Number);
  if (!y || !m || !d) throw new Error('data no formato AAAA-MM-DD');
  return [y, m, d];
};
/** Data de 2 bytes usada no clima e no ciclo (CommandUtils: (ano-2000)<<1 ...). */
export function date2(s) {
  const [y, m, d] = ymd(s);
  return [(((y - 2000) << 1) + ((m & 15) >> 3)) & 0xff, (((m & 7) << 5) + (d & 31)) & 0xff];
}
/** Data de 2 bytes de BleUtils.encodeDate / ByteUtils.convertDateToBytes (bit 15 opcional). */
function date16(y, m, d, flag = 0) {
  const v = ((flag & 1) << 15) | (((y - 2000) & 63) << 9) | ((m & 15) << 5) | (d & 31);
  return [(v >> 8) & 0xff, v & 0xff];
}
/** Temperatura com sinal em 7 bits: positivo = 64 + valor, negativo = |valor|. */
export const temp7 = (t) => (t > 0 ? ((t & 63) + 64) : (Math.abs(t) & 63));
const trimUtf8 = (s, max) => {
  const b = utf8(s);
  if (b.length <= max) return b;
  let cut = max;
  while (cut > 0 && (b[cut] & 0xc0) === 0x80) cut--; // não corta um caractere no meio
  return b.slice(0, cut);
};
const lenText = (s, max = 255) => { const b = trimUtf8(s, max); return [b.length, ...b]; };
const list = (s) => String(s ?? '').split(/[;,]/).map((x) => x.trim()).filter(Boolean);
const hhmm = (s) => { const [h, m] = String(s).split(':').map(Number); return [h & 0xff, m & 0xff]; };

const P = {
  data: (label = 'Data (AAAA-MM-DD)') => ({ name: 'data', type: 'string', label, default: today }),
  texto: (name, label, def = '') => ({ name, type: 'string', label, default: def }),
  n: (name, label, def, min = 0, max = 255) => ({ name, type: 'u8', label, default: def, min, max }),
  n16: (name, label, def, min = 0, max = 65535) => ({ name, type: 'u16', label, default: def, min, max }),
  s: (name, label, def, min = -128, max = 127) => ({ name, type: 'u8s', label, default: def, min, max }),
  hex: (label, def = '') => ({ name: 'dados', type: 'string', label, default: def }),
};

export const EXTRA = {
  // ---------- clima (05/xx) ----------
  sendWeatherInfo: {
    params: [P.data(), P.n('codigo', 'Código do tempo (0 = sol...)', 0), P.n('ar', 'Qualidade do ar', 0), P.s('temp', 'Temperatura agora (°C)', 25, -63, 63),
      P.s('max', 'Máxima (°C)', 29, -63, 63), P.s('min', 'Mínima (°C)', 19, -63, 63), P.n('umidade', 'Umidade (%)', 60, 0, 100), P.texto('cidade', 'Cidade', 'Sao Paulo')],
    encode: (p) => [...date2(p.data), p.codigo & 0xff, p.ar & 0xff, temp7(p.temp), temp7(p.max), temp7(p.min), 0, 0, p.umidade & 0xff, ...utf8(p.cidade)],
    note: 'Clima do dia: data(2) código ar temp máx mín (7 bits com sinal) 0(2) umidade e o nome da cidade (como o DeviceFragment chama).',
  },
  sendWeatherInfo_2: {
    params: [P.texto('dias', 'Dias "AAAA-MM-DD código máx mín", separados por ;', `${today()} 0 29 19`), P.texto('cidade', 'Cidade', 'Sao Paulo')],
    encode: (p) => {
      const days = String(p.dias).split(';').map((d) => d.trim().split(/\s+/)).filter((d) => d[0]);
      const out = [days.length & 0xff];
      for (const [d, code, max, min] of days) {
        let lo = Number(min); const hi = Number(max);
        if (hi === lo) lo -= 1; // igual ao app oficial
        out.push(...date2(d), Number(code) & 0xff, temp7(hi), temp7(lo));
      }
      return [...out, ...utf8(p.cidade)];
    },
    note: 'Previsão de vários dias: quantidade e 5 bytes por dia (data código máx mín). O app oficial copia 10 bytes por dia por engano; aqui vão os 5 que o formato prevê.',
  },
  sendNewWeatherInfo: {
    params: [P.data(), P.n('codigo', 'Código do tempo', 0), P.n('ar', 'Qualidade do ar', 0), P.s('temp', 'Temperatura agora (°C)', 25, -63, 63),
      P.s('max', 'Máxima (°C)', 29, -63, 63), P.s('min', 'Mínima (°C)', 19, -63, 63), P.n16('pressao', 'Pressão (hPa)', 1013), P.n('umidade', 'Umidade (%)', 60, 0, 100),
      P.n('vento', 'Vento (m/s)', 3), P.n16('direcao', 'Direção do vento (graus)', 90, 0, 360), P.n16('visibilidade', 'Visibilidade (m)', 10000), P.n('chuva', 'Chance de chuva (%)', 10, 0, 100), P.texto('cidade', 'Cidade', 'Sao Paulo')],
    encode: (p) => {
      let lo = p.min; if (p.max === lo) lo -= 1;
      return [...date2(p.data), p.codigo & 0xff, p.ar & 0xff, temp7(p.temp), temp7(p.max), temp7(lo), ...u16(p.pressao), p.umidade & 0xff, p.vento & 0xff,
        ...u16(p.direcao), ...u16(p.visibilidade), p.chuva & 0xff, ...utf8(p.cidade)];
    },
    note: 'Clima completo: data código ar temp máx mín pressão(2) umidade vento direção(2) visibilidade(2) chuva e a cidade.',
  },

  // ---------- perfil, metas e dados pessoais (02/xx) ----------
  setUserInfo: {
    personal: true,
    params: [{ name: 'sexo', type: 'enum', label: 'Sexo', default: 1, options: [[1, 'masculino'], [0, 'feminino']] }, P.n('idade', 'Idade (anos)', 30, 1, 127),
      P.n16('altura', 'Altura (cm)', 170, 50, 255), P.n16('peso', 'Peso (kg)', 70, 10, 255)],
    encode: (p) => [((p.sexo & 1) << 7) + (p.idade & 127), (p.altura >> 1) & 0xff, (((p.altura & 1) << 7) + (p.peso >> 3)) & 0xff, ((p.peso & 7) << 5) & 0xff],
    note: 'Perfil em 4 bytes: sexo(1 bit) idade(7) altura(8+1) peso(5+3). O relógio usa para calorias e distância.',
  },
  settingUserName: {
    personal: true,
    params: [P.texto('nome', 'Nome mostrado no relógio', 'Sabatinho')],
    encode: (p) => lenText(p.nome),
    note: 'Tamanho e o nome em UTF-8.',
  },
  setCalorieTarget: {
    personal: true,
    params: [P.n16('kcal', 'Meta de calorias (kcal)', 300, 1, 65535)],
    encode: (p) => u32(p.kcal * 1000),
    note: 'Meta em calorias (kcal × 1000), u32.',
  },
  setDistanceTarget: {
    personal: true,
    params: [{ name: 'metros', type: 'u16', label: 'Meta de distância (metros)', default: 5000, min: 1, max: 65535 }],
    encode: (p) => u32(p.metros),
    note: 'Meta de distância em metros, u32.',
  },
  sendSosInfo: {
    personal: true,
    params: [P.texto('nome', 'Nome do contato', ''), P.texto('numero', 'Telefone', '')],
    encode: (p) => [...lenText(p.nome), ...lenText(p.numero)],
    note: 'Contato de SOS: tamanho+nome e tamanho+número. Este relógio não declara SOS nos recursos.',
  },
  settingMedicineReminder: {
    personal: true,
    params: [P.texto('remedios', 'Remédios "liga dias HH:MM HH:MM", separados por ;', '0 127 08:00 20:00'), P.n('maximo', 'Máximo de remédios do relógio', 5, 1, 15)],
    encode: (p) => {
      const meds = String(p.remedios).split(';').map((x) => x.trim().split(/\s+/)).filter((x) => x[0] !== undefined && x[0] !== '');
      const body = meds.flatMap(([on, rep, ...times], i) => {
        const ts = times.slice(0, 7);
        return [((Number(on) & 1) << 7) | (i << 3) | (ts.length & 7), Number(rep) & 0xff, ...ts.flatMap(hhmm)];
      });
      return [1, (meds.length & 15) | ((p.maximo & 15) << 4), ...body];
    },
    note: 'Lembrete de remédio: 1, quantidade|máximo<<4 e por remédio: liga<<7|índice<<3|horários, dias da semana e HH:MM. Remédio padrão desligado.',
  },
  setMenstrual: {
    personal: true,
    params: [P.data('Início do último ciclo (AAAA-MM-DD)'), P.n('dias', 'Duração (dias)', 5, 1, 15), P.n('ciclo', 'Ciclo (dias)', 28, 15, 60),
      P.n('lembrete', 'Lembrar menstruação (1/0)', 0, 0, 1), P.n('antes', 'Dias de antecedência', 1), P.texto('hora', 'Hora do lembrete', '09:00'),
      P.n('ovulacao', 'Lembrar ovulação (1/0)', 0, 0, 1), P.n('ovAntes', 'Dias de antecedência (ovulação)', 1), P.texto('ovHora', 'Hora (ovulação)', '09:00'),
      P.n('fluxo', 'Fluxo (nível)', 0), P.n('dor', 'Dor (nível)', 0)],
    encode: (p) => [...date2(p.data), p.dias & 0xff, p.ciclo & 0xff, p.lembrete & 0xff, p.antes & 0xff, ...hhmm(p.hora), p.ovulacao & 0xff, p.ovAntes & 0xff, ...hhmm(p.ovHora), p.fluxo & 0xff, p.dor & 0xff],
    note: '14 bytes: data(2) duração ciclo, lembrete/antecedência/hora/minuto da menstruação e da ovulação, fluxo e dor.',
  },
  sendEventReminder: {
    personal: true,
    params: [{ name: 'tipo', type: 'u16', label: 'Tipo do lembrete (bit do 13/00)', default: 1, min: 0, max: 65535 }, P.n('ligado', 'Ligado (1/0)', 0, 0, 1),
      P.n('repetir', 'Dias da semana (bits 1-7)', 254, 0, 254), P.texto('horas', 'Até 3 horários HH:MM separados por ,', '09:00')],
    encode: (p) => {
      const ts = list(p.horas).slice(0, 3).map(hhmm);
      while (ts.length < 3) ts.push([0xff, 0xff]);
      return [...u32(p.tipo), ((p.repetir & 254) + (p.ligado ? 1 : 0)) & 0xff, ...ts.flat()];
    },
    note: 'Tipo(4) repetir|liga e 3 horários (FF FF = vazio).',
  },
  setWatchFace: {
    personal: true,
    params: [P.hex('Mostrador em hex (como o app oficial envia)', '00')],
    encode: (p) => hexBytes(p.dados),
    note: 'Troca o mostrador: o app oficial manda o id do mostrador em hex, sem conversão.',
  },
  sendLogoValue: {
    personal: true,
    params: [P.n('ligar', 'Logo ao ligar (1/0)', 1, 0, 1), P.n16('imagem', 'Id da imagem', 0), P.n('mostrar', 'Mostrar logo (1/0)', 1, 0, 1), P.n('compartilhar', 'Logo compartilhado (1/0)', 0, 0, 1),
      P.n('animado', 'Animado (1/0)', 0, 0, 1), P.n('quadros', 'Quadros', 0), P.n16('periodo', 'Período (ms)', 0), P.n16('repeticoes', 'Repetições', 0)],
    encode: (p) => [p.ligar & 0xff, ...u16(p.imagem), p.mostrar & 0xff, p.compartilhar & 0xff, p.animado & 0xff, p.quadros & 0xff, ...u16(p.periodo), ...u16(p.repeticoes)],
    note: 'Logo de ligar (bonés e crachás): liga, imagem(2), mostrar, compartilhar, animado, quadros, período(2), repetições(2).',
  },

  // ---------- localização ----------
  sendGPS: {
    params: [{ name: 'latitude', type: 'string', label: 'Latitude', default: '-23.55' }, { name: 'longitude', type: 'string', label: 'Longitude', default: '-46.63' }],
    encode: (p) => {
      const now = new Date();
      const [y, mo, d, h, mi, s] = [now.getFullYear(), now.getMonth() + 1, now.getDate(), now.getHours(), now.getMinutes(), now.getSeconds()];
      // O app oficial chama sendGPS(longitude, latitude); mantida a ordem do fio.
      const coord = (v) => {
        const n = Math.trunc(Number(v) * 1e6);
        return [((((v > 0 ? 0 : 1) << 7) + (n >> 24)) & 127), (n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
      };
      return [(((y - 2000) << 2) + ((mo & 255) >> 2)) & 0xff, (((mo & 3) << 6) + (d << 1) + (h >> 4)) & 0xff, (((h & 15) << 4) + (mi >> 2)) & 0xff, (((mi & 3) << 6) + s) & 0xff,
        ...coord(Number(p.longitude)), ...coord(Number(p.latitude))];
    },
    note: 'Data e hora em 4 bytes e longitude e latitude × 10⁶. O app oficial zera o bit de sinal com & 127; reproduzido como está.',
  },

  // ---------- textos de IA, tradução e ChatGPT (dependem do app oficial on-line) ----------
  sendAiDialAnswer: { params: [P.texto('texto', 'Resposta', 'Ola')], encode: (p) => utf8(p.texto), note: 'Texto UTF-8 puro.' },
  sendAiDialStyle: { params: [P.texto('estilo', 'Estilo', 'simples')], encode: (p) => lenText(p.estilo), note: 'Tamanho e o estilo em UTF-8.' },
  sendAiSetAlarm: {
    personal: true, // cria alarme/tarefa no relógio
    params: [P.texto('hora', 'Hora HH:MM', '07:00'), P.n('repetir', 'Repetir (bits)', 0), P.texto('texto', 'Texto (até 200 bytes)', 'Acordar'), P.texto('titulo', 'Título (até 50 bytes)', 'Alarme')],
    encode: (p) => [...hhmm(p.hora), p.repetir & 0xff, ...lenText(p.texto, 200), ...lenText(p.titulo, 50)],
    note: 'Hora, repetir, tamanho+texto (200) e tamanho+título (50).',
  },
  sendAiAlarmDate: {
    personal: true, // cria alarme/tarefa no relógio
    params: [P.texto('quando', 'Data e hora (AAAA-MM-DD HH:MM)', `${today()} 07:00`), P.n('repetir', 'Repetir (0 = só nesta data)', 0), P.texto('texto', 'Texto', 'Lembrete'), P.texto('titulo', 'Título', 'Alarme')],
    encode: (p) => {
      const [d, t] = String(p.quando).split(' ');
      const [y, m, dd] = ymd(d);
      return [...date16(y, m, dd, p.repetir === 0 ? 1 : 0), ...hhmm(t || '00:00'), p.repetir & 0xff, ...lenText(p.texto, 200), ...lenText(p.titulo, 50)];
    },
    note: 'Data(2, bit 15 = sem repetição) hora, repetir, tamanho+texto e tamanho+título.',
  },
  sendSoureText: { params: [P.n('idioma', 'Idioma', 0), P.texto('texto', 'Texto de origem', 'Ola')], encode: (p) => [p.idioma & 0xff, ...utf8(p.texto)], note: 'Idioma e o texto de origem da tradução.' },
  sendTranslateText: { params: [P.n('idioma', 'Idioma', 1), P.texto('texto', 'Texto traduzido', 'Hello')], encode: (p) => [p.idioma & 0xff, ...utf8(p.texto)], note: 'Idioma e o texto traduzido.' },
  sendSimSoureText: { params: [P.n('idioma', 'Idioma', 0), P.texto('texto', 'Texto de origem', 'Ola')], encode: (p) => [p.idioma & 0xff, ...utf8(p.texto)], note: 'Tradução simultânea: idioma e texto de origem.' },
  sendSimTranslateText: { params: [P.n('idioma', 'Idioma', 1), P.texto('texto', 'Texto traduzido', 'Hello')], encode: (p) => [p.idioma & 0xff, ...utf8(p.texto)], note: 'Tradução simultânea: idioma e texto traduzido.' },
  sendChatGptQuziText: { params: [P.texto('texto', 'Pergunta', 'Que horas sao?')], encode: (p) => utf8(p.texto), note: 'A pergunta que o relógio mostra, em UTF-8.' },
  sendChatGptQuziStart: {
    params: [P.n16('tamanho', 'Tamanho da resposta (0 = parar)', 0), P.n('partes', 'Partes', 1)],
    encode: (p) => (p.tamanho === 0 ? [0] : [p.tamanho & 0xff, (p.tamanho >> 8) & 0xff, p.partes & 0xff]),
    note: 'Tamanho (little-endian, como no app) e partes; 0 encerra.',
  },
  sendChatGptAsrText: { params: [P.n('estado', 'Estado', 0), P.texto('texto', 'Texto reconhecido', 'Ola')], encode: (p) => [p.estado & 0xff, ...utf8(p.texto)], note: 'Estado e o texto reconhecido por voz.' },
  sendTODOReminder: {
    personal: true, // cria alarme/tarefa no relógio
    params: [P.texto('quando', 'Data e hora (AAAA-MM-DD HH:MM)', `${today()} 09:00`), P.texto('titulo', 'Título (até 120 bytes)', 'Tarefa'), P.texto('texto', 'Texto (até 360 bytes)', 'Teste do Relogio Sabatinho')],
    encode: (p) => {
      const [d, t] = String(p.quando).split(' ');
      const [y, m, dd] = ymd(d);
      const title = trimUtf8(p.titulo, 120);
      const body = trimUtf8(p.texto, 360);
      return [...date16(y, m, dd), ...hhmm(t || '00:00'), title.length & 0xff, (title.length >> 8) & 0xff, ...title, ...body];
    },
    note: 'Data(2) hora(2) tamanho do título (little-endian) título e texto.',
  },

  // ---------- crachá/boné (3A) e fone (25, 26, 27): o TF37 Pro só confirma ----------
  sendBarrageInfo: {
    params: [P.n('direcao', 'Direção', 0), P.n('cor', 'Cor', 1), P.n('velocidade', 'Velocidade', 1), P.n('fonte', 'Tamanho da fonte', 16), P.n16('largura', 'Largura', 240),
      P.n16('altura', 'Altura', 240), P.n16('maximo', 'Máximo', 10), P.texto('tamanhos', 'Tamanhos dos binários, separados por ,', '')],
    encode: (p) => { const sizes = list(p.tamanhos).map(Number); return [p.direcao & 0xff, p.cor & 0xff, p.velocidade & 0xff, p.fonte & 0xff, ...u16(p.largura), ...u16(p.altura), ...u16(p.maximo), ...u16(sizes.length), ...sizes.flatMap(u16)]; },
    note: 'Texto rolante de crachás: direção cor velocidade fonte largura(2) altura(2) máximo(2) quantidade(2) e tamanhos(2 cada).',
  },
  sendEpEQSetting: {
    params: [P.n('suportados', 'EQs suportados', 1), P.texto('mapa', 'Mapa de EQs, separados por ,', '0'), P.n('atual', 'EQ atual', 0), P.n('porEq', 'Parâmetros por EQ', 0), P.texto('valores', 'Valores, separados por ,', '')],
    encode: (p) => [p.suportados & 0xff, ...list(p.mapa).map((x) => Number(x) & 0xff), p.atual & 0xff, p.porEq & 0xff, ...list(p.valores).map((x) => Number(x) & 0xff)],
    note: 'Fone: suportados, mapa, atual, parâmetros por EQ e valores.',
  },
  setEpANCSetting: { params: [P.n('suportados', 'Modos suportados', 1), P.texto('mapa', 'Mapa', '0'), P.n('atual', 'Atual', 0)], encode: (p) => [p.suportados & 0xff, ...list(p.mapa).map((x) => Number(x) & 0xff), p.atual & 0xff], note: 'Fone: cancelamento de ruído (suportados, mapa, atual).' },
  setEp3DAudioSetting: { params: [P.n('suportados', 'Modos suportados', 1), P.texto('mapa', 'Mapa', '0'), P.n('atual', 'Atual', 0)], encode: (p) => [p.suportados & 0xff, ...list(p.mapa).map((x) => Number(x) & 0xff), p.atual & 0xff], note: 'Fone: áudio 3D (suportados, mapa, atual).' },
  setEpSquelchSetting: { params: [P.n('ligado', 'Ligado (1/0)', 0, 0, 1), P.n('suportados', 'Modos suportados', 1), P.texto('mapa', 'Mapa', '0'), P.n('atual', 'Atual', 0)], encode: (p) => [p.ligado & 0xff, p.suportados & 0xff, ...list(p.mapa).map((x) => Number(x) & 0xff), p.atual & 0xff], note: 'Fone: redução de ruído do microfone.' },
  setEpKeyFunSetting: {
    params: [P.texto('teclas', 'Mapa de teclas (hex)', '00'), P.texto('funcoes', 'Mapa de funções (hex)', '00'), P.texto('esquerda', 'Funções do lado esquerdo (hex)', '00'), P.texto('direita', 'Funções do lado direito (hex)', '00')],
    encode: (p) => { const k = hexBytes(p.teclas); const f = hexBytes(p.funcoes); return [k.length & 0xff, ...k, f.length & 0xff, ...f, ...hexBytes(p.esquerda), ...hexBytes(p.direita)]; },
    note: 'Fone: quantidade+mapa de teclas, quantidade+mapa de funções e as funções atuais de cada lado.',
  },
  sendEpDeviceName: { params: [P.texto('nome', 'Nome do fone', 'Sabatinho')], encode: (p) => lenText(p.nome), note: 'Fone: tamanho e nome em UTF-8.' },
  sendEpWorldTimeZone: {
    params: [P.texto('cidades', 'Cidades "nome hex-do-horário", separadas por ;', '')],
    encode: (p) => { const items = String(p.cidades).split(';').map((x) => x.trim()).filter(Boolean).map((x) => { const [name, ...t] = x.split(/\s+/); return [...lenText(name), ...hexBytes(t.join(''))]; }); return [items.length & 0xff, ...items.flat()]; },
    note: 'Fone: quantidade e, por cidade, tamanho+nome e os bytes de horário.',
  },
  sendEpBrightness: { params: [P.n('nivel', 'Nível', 1), P.n('maximo', 'Nível máximo', 5)], encode: (p) => [p.nivel & 0xff, p.maximo & 0xff], note: 'Fone: brilho atual e máximo.' },
  sendEpVolume: { params: [P.n('nivel', 'Volume', 5)], encode: (p) => [p.nivel & 0xff], note: 'Fone: volume.' },
};
