# Parte 2 — `CommandUtils.java` linha 920 até o fim (Podsfine 1.2.3)

Estudo **estático** (só leitura do código descompilado). 123 métodos `public static byte[]`. Quadro: `DF LEN_H LEN_L SUM CMD VER KEY PLEN_H PLEN_L PAYLOAD`; o SUM é inserido depois por `addSumCheck`. `cmd`/`key` abaixo em hexadecimal; nos layouts, `[n]` é o índice dentro do PAYLOAD. Respostas: quadros `DF` com dados (tratados em `NotifyWriteUtils.dataHandle` / `BleDataUtils`) ou ACK `FD` (tratado em `handleAck`, status em `byte[9]`, 0 = ok).

Bits de recurso: `frame[N]` é o índice **absoluto** no quadro de resposta de recursos `00/00` (`getDeviceFeatures`); no payload isso é `N-9`. Tudo que diz *hipótese* é inferência.

## Resumo de risco

| risco | qtd |
|---|---|
| leitura | 42 |
| acao | 29 |
| config | 46 |
| perigoso | 6 |

| aplica ao TF37 | qtd |
|---|---|
| provavel | 9 |
| desconhecido | 32 |
| improvavel | 82 |

**Perigosos:** `getEpShtudown` (0x06/0x09), `sendShutDown` (0x06/0x09), `getEpRestart` (0x06/0x0A), `sendDelAlbumPid` (0x2E/0x01), `deleteRecordFile` (0x36/0x04), `deleteAllowRecordFile` (0x36/0x04).

**Mais relevantes para uma pulseira simples (provável):** `setCalorieTarget` (0x02/0x2C), `setDistanceTarget` (0x02/0x2D), `reqeustHrHigLow` (0x03/0x08), `sendHrAutoHigLowFla` (0x03/0x0A), `getEpShtudown` (0x06/0x09), `sendShutDown` (0x06/0x09), `stopFindPhone` (0x06/0x0B), `stopFindWatch` (0x06/0x0F), `syncAudio` (0x07/0x07).


## cmd 0x02 — Configurações (SETTING)

| key | método | nome | risco | TF37 | payload | resposta | fonte |
|---|---|---|---|---|---|---|---|
| 0x1D | `sendBoAutoTestSetting` | Medicao automatica de SpO2 | config | desconhecido | 8 bytes: [0]=interruptor (0/1); [1]=0x00 reservado; [2..3]=intervalo em minutos u16 BE (UI mostra 'N minutos'); [4..5]=inicio em minutos desde 00:00 u16 BE; [6..7]=fim em minutos u16 BE (a UI usa 00:00..23:59). | ACK 0xFD com cmd 0x02 e a mesma key; byte[9] = status (0 = ok). handleAck publica DeviceSettingEvent(key, ok, status); settingSuccess so age nas keys 04/05/08, entao aqui nao ha acao extra. | 1380 |
| 0x2C | `setCalorieTarget` | Meta diaria de calorias | config | provavel | 4 bytes: (kcal * 1000) u32 BE (ou seja, em calorias pequenas). | ACK 0xFD com cmd 0x02 e a mesma key; byte[9] = status (0 = ok). handleAck publica DeviceSettingEvent(key, ok, status); settingSuccess so age nas keys 04/05/08, entao aqui nao ha acao extra. | 1499 |
| 0x2D | `setDistanceTarget` | Meta diaria de distancia | config | provavel | 4 bytes: distancia u32 BE em metros (a UI converte km*1000). | ACK 0xFD com cmd 0x02 e a mesma key; byte[9] = status (0 = ok). handleAck publica DeviceSettingEvent(key, ok, status); settingSuccess so age nas keys 04/05/08, entao aqui nao ha acao extra. | 1505 |
| 0x32 | `settingMedicineReminder` | Gravar lembretes de remedio | config | desconhecido | [0]=0x01 (fixo); [1]=(max<<4) \| (quantidade & 0x0F); para cada remedio i: [b0]=(interruptor<<7)\|(i<<3)\|(n&7), [b1]=repeticao (mascara), depois n pares (hora, minuto). Ate 7 horarios e 16 remedios (limites dos campos de bits; i>=16 corrompe o bit do interruptor). | ACK 0xFD com cmd 0x02 e a mesma key; byte[9] = status (0 = ok). handleAck publica DeviceSettingEvent(key, ok, status); settingSuccess so age nas keys 04/05/08, entao aqui nao ha acao extra. | 1426 |
| 0x33 | `requestMedicationReminder` | Ler lembretes de remedio | leitura | desconhecido | 1 byte: 0x01. | DF 02/33: [0]=interruptor geral; [1]=(max<<4)\|quantidade; por remedio: 1 byte (bit7=interruptor, bits6..3=indice, bits2..0=n horarios), 1 byte repeticao, n x (hora, minuto). | 1422 |
| 0x34 | `requestAllDayDND` | Ler 'nao perturbe o dia todo' | leitura | desconhecido | 1 byte: 0x01. | DF 02/35: payload[0]=interruptor -> DndAllDayBean + EVENT_DND_ALLDAY. | 1365 |
| 0x36 | `sendAllDayDND` | Gravar 'nao perturbe o dia todo' | config | desconhecido | 1 byte: 0x00/0x01. | ACK 0xFD com cmd 0x02 e a mesma key; byte[9] = status (0 = ok). handleAck publica DeviceSettingEvent(key, ok, status); settingSuccess so age nas keys 04/05/08, entao aqui nao ha acao extra. | 1369 |
| 0x37 | `requestAllDayLightup` | Ler 'tela sempre acesa o dia todo' | leitura | desconhecido | 1 byte: 0x01. | DF 02/38 (key+1): payload[0]=interruptor -> RaiseAllDayBean + EVENT_RAISE_ALLDAY. | 1357 |
| 0x39 | `sendAllDayLightup` | Gravar 'acender o dia todo' | config | desconhecido | 1 byte: 0x00/0x01. | ACK 0xFD com cmd 0x02 e a mesma key; byte[9] = status (0 = ok). handleAck publica DeviceSettingEvent(key, ok, status); settingSuccess so age nas keys 04/05/08, entao aqui nao ha acao extra. | 1361 |
| 0x3A | `setImageQuality` | Qualidade de imagem da previa | config | improvavel | 1 byte: nivel de qualidade (u8, valores da UI). | ACK 0xFD com cmd 0x02 e a mesma key; byte[9] = status (0 = ok). handleAck publica DeviceSettingEvent(key, ok, status); settingSuccess so age nas keys 04/05/08, entao aqui nao ha acao extra. | 1293 |
| 0x3B | `settingGazeDistance` | Gravar lembrete 'olhar ao longe' | config | desconhecido | 8 bytes: [0..1]=0x00 0x00; [2]=(interruptor<<7) \| (intervalo>>8 & 0x7F); [3]=intervalo & 0xFF (15 bits, hipotese: minutos); [4]=hora ini; [5]=min ini; [6]=hora fim; [7]=min fim. | ACK 0xFD com cmd 0x02 e a mesma key; byte[9] = status (0 = ok). handleAck publica DeviceSettingEvent(key, ok, status); settingSuccess so age nas keys 04/05/08, entao aqui nao ha acao extra. | 1410 |
| 0x3C | `requestGazeDistance` | Ler lembrete 'olhar ao longe' | leitura | desconhecido | 1 byte: 0x01. | DF 02/3C: payload[2] bit7=interruptor, payload[2]&0x7F e payload[3]=intervalo (o parser SOMA os dois em vez de deslocar — bug), [4]=hora ini, [5]=min ini, [6]=hora fim, [7]=min fim. | 1406 |
| 0x3D | `settingFitnessReminder` | Gravar lembrete de exercicio | config | desconhecido | 6 bytes: [0..1]=0x00 0x00; [2]=interruptor; [3]=repeticao (mascara de dias da semana, hipotese bit0=dom/seg); [4]=hora; [5]=minuto. | ACK 0xFD com cmd 0x02 e a mesma key; byte[9] = status (0 = ok). handleAck publica DeviceSettingEvent(key, ok, status); settingSuccess so age nas keys 04/05/08, entao aqui nao ha acao extra. | 1418 |
| 0x3E | `requestFitnessReminder` | Ler lembrete de exercicio | leitura | desconhecido | 1 byte: 0x01. | DF 02/3E: payload[2]=interruptor, [3]=repeticao, [4]=hora, [5]=minuto -> FitnessReminderBean. | 1414 |
| 0x3F | `settingReadingReminder` | Gravar lembrete de leitura | config | desconhecido | 6 bytes: [0..1]=0x00 0x00; [2]=interruptor; [3]=repeticao (mascara de dias da semana, hipotese bit0=dom/seg); [4]=hora; [5]=minuto. | ACK 0xFD com cmd 0x02 e a mesma key; byte[9] = status (0 = ok). handleAck publica DeviceSettingEvent(key, ok, status); settingSuccess so age nas keys 04/05/08, entao aqui nao ha acao extra. | 1459 |
| 0x40 | `requestReadingReminder` | Ler lembrete de leitura | leitura | desconhecido | 1 byte: 0x01. | DF 02/40: payload[2..5] = interruptor, repeticao, hora, minuto. | 1455 |
| 0x41 | `settingTravelReminder` | Gravar lembrete de saida/viagem | config | desconhecido | 6 bytes: [0..1]=0x00 0x00; [2]=interruptor; [3]=repeticao (mascara de dias da semana, hipotese bit0=dom/seg); [4]=hora; [5]=minuto. | ACK 0xFD com cmd 0x02 e a mesma key; byte[9] = status (0 = ok). handleAck publica DeviceSettingEvent(key, ok, status); settingSuccess so age nas keys 04/05/08, entao aqui nao ha acao extra. | 1467 |
| 0x42 | `requestTravelReminder` | Ler lembrete de saida/viagem | leitura | desconhecido | 1 byte: 0x01. | DF 02/42: payload[2..5] = interruptor, repeticao, hora, minuto. | 1463 |
| 0x43 | `sendPrAutoTestSetting` | Medicao automatica de estresse/pressao | config | desconhecido | 8 bytes: [0]=interruptor (0/1); [1]=0x00 reservado; [2..3]=intervalo em minutos u16 BE (UI mostra 'N minutos'); [4..5]=inicio em minutos desde 00:00 u16 BE; [6..7]=fim em minutos u16 BE (a UI usa 00:00..23:59). | ACK 0xFD com cmd 0x02 e a mesma key; byte[9] = status (0 = ok). handleAck publica DeviceSettingEvent(key, ok, status); settingSuccess so age nas keys 04/05/08, entao aqui nao ha acao extra. | 1373 |
| 0x47 | `requestNumberAlarms` | Ler numero maximo de alarmes | leitura | desconhecido | 1 byte: 0x00. | DF 02/47: payload[0]=numero (u8) -> AppConfig.setNumberAlarms. | 1314 |
| 0x48 | `requestNumberSavedAlbum` | Ler capacidade do album | leitura | improvavel | 1 byte: 0x00. | DF 02/48: payload[0]=numero (u8). | 1318 |
| 0x49 | `settingHandWash` | Gravar lembrete de lavar as maos | config | desconhecido | 8 bytes, mesmo layout de settingGazeDistance: 00 00, (sw<<7)\|(intervalo>>8&0x7F), intervalo&0xFF, hIni, mIni, hFim, mFim. | ACK 0xFD com cmd 0x02 e a mesma key; byte[9] = status (0 = ok). handleAck publica DeviceSettingEvent(key, ok, status); settingSuccess so age nas keys 04/05/08, entao aqui nao ha acao extra. | 1475 |
| 0x4A | `requestHandWash` | Ler lembrete de lavar as maos | leitura | desconhecido | 1 byte: 0x01. | DF 02/4A: mesmo layout de 02/3C (bit7 interruptor, intervalo 15 bits com o mesmo bug de soma, janela ini/fim). | 1471 |
| 0x4B | `sendBPAutoTestSetting` | Medicao automatica de pressao arterial | config | improvavel | 8 bytes: [0]=interruptor (0/1); [1]=0x00 reservado; [2..3]=intervalo em minutos u16 BE (UI mostra 'N minutos'); [4..5]=inicio em minutos desde 00:00 u16 BE; [6..7]=fim em minutos u16 BE (a UI usa 00:00..23:59). | ACK 0xFD com cmd 0x02 e a mesma key; byte[9] = status (0 = ok). handleAck publica DeviceSettingEvent(key, ok, status); settingSuccess so age nas keys 04/05/08, entao aqui nao ha acao extra. | 1387 |
| 0x4C | `sendScientSleepTestSetting` | Liga/desliga 'sono cientifico' | config | desconhecido | 1 byte: interruptor 0/1. | ACK 0xFD com cmd 0x02 e a mesma key; byte[9] = status (0 = ok). handleAck publica DeviceSettingEvent(key, ok, status); settingSuccess so age nas keys 04/05/08, entao aqui nao ha acao extra. | 1394 |
| 0x4D | `sendTemperAutoTestSetting` | Medicao automatica de temperatura | config | improvavel | 8 bytes: [0]=interruptor (0/1); [1]=0x00 reservado; [2..3]=intervalo em minutos u16 BE (UI mostra 'N minutos'); [4..5]=inicio em minutos desde 00:00 u16 BE; [6..7]=fim em minutos u16 BE (a UI usa 00:00..23:59). | ACK 0xFD com cmd 0x02 e a mesma key; byte[9] = status (0 = ok). handleAck publica DeviceSettingEvent(key, ok, status); settingSuccess so age nas keys 04/05/08, entao aqui nao ha acao extra. | 1399 |
| 0x4E | `sendHrvAutoTestSetting` | Medicao automatica de VFC (HRV) | config | desconhecido | 8 bytes: [0]=interruptor (0/1); [1]=0x00 reservado; [2..3]=intervalo em minutos u16 BE (UI mostra 'N minutos'); [4..5]=inicio em minutos desde 00:00 u16 BE; [6..7]=fim em minutos u16 BE (a UI usa 00:00..23:59). | ACK 0xFD com cmd 0x02 e a mesma key; byte[9] = status (0 = ok). handleAck publica DeviceSettingEvent(key, ok, status); settingSuccess so age nas keys 04/05/08, entao aqui nao ha acao extra. | 1706 |

## cmd 0x03 — Saúde (HEALTH_DATA)

| key | método | nome | risco | TF37 | payload | resposta | fonte |
|---|---|---|---|---|---|---|---|
| 0x08 | `reqeustHrHigLow` | Ler limites de alerta de FC | leitura | provavel | 1 byte: 0x01. | DF 03/09: [0]=interruptor alta, [1]=max, [2]=min, [3]=passo (gera a lista de opcoes), [4]=valor atual alta; [5]=interruptor baixa, [6]=max, [7]=min, [8]=passo, [9]=valor atual baixa (bpm, u8) -> HrAutoTestBean. | 1479 |
| 0x0A | `sendHrAutoHigLowFla` | Gravar limites de alerta de FC | config | provavel | 4 bytes u8: [0]=interruptor alta, [1]=limite alto (bpm), [2]=interruptor baixa, [3]=limite baixo (bpm). | ACK 0xFD cmd 0x03: status -> DeviceSettingEvent(key, ok, status). | 1484 |

## cmd 0x04 — Esporte vinculado / GoMore

| key | método | nome | risco | TF37 | payload | resposta | fonte |
|---|---|---|---|---|---|---|---|
| 0x0D | `settingSportLinkage` | Controlar treino vinculado | acao | desconhecido | 2 bytes u8: [0]=tipo de esporte; [1]=estado (o app usa 1 = iniciar e 4 = encerrar; hipotese 2/3 = pausar/retomar). | DF 04/0D: [0]=tipo, [1]=estado -> SportLinkageAckBean. Depois o relogio manda 04/0E (estado atual), 04/0F/04/11 (dados do treino) e 04/1A..1C (trajeto). | 1339 |
| 0x15 | `requestSportLinkageType` | Listar esportes suportados | leitura | desconhecido | Sem payload (PLEN=0, array vazio). | Hipotese: DF 04/0C ('手环上报当前支持的运动' = 'pulseira informa os esportes suportados'), PLEN bytes = ids de esporte -> AppConfig.setSupportLinkageType. | 1701 |
| 0x19 | `sendGomoreKey` | Enviar licenca do algoritmo GoMore | config | improvavel | [0]=0x01; [1]=L (u8); L bytes UTF-8 da chave (sem limite no app). | Sem parser especifico; o pedido parte do relogio (04/18: id do dispositivo em hex a partir do byte 11 -> EVENT_REQUEST_GOMORE). | 1489 |
| 0x1D | `requestHasGps` | Perguntar se o esporte usa GPS | leitura | desconhecido | 1 byte: tipo de esporte (u8). | Nao ha parser explicito para 04/1D em BleDataUtils (hipotese: so ACK ou resposta tratada indiretamente). | 1343 |

## cmd 0x06 — Controle do dispositivo (CONTROL_DEVICE)

| key | método | nome | risco | TF37 | payload | resposta | fonte |
|---|---|---|---|---|---|---|---|
| 0x09 | `getEpShtudown` | Desligar dispositivo (fone) | perigoso | provavel | 1 byte: 0x01 (constante). | Sem resposta propria: ACK 0xFD cmd 0x06 (handleAck so trata key 0x08). Espera-se queda da conexao BLE. | 920 |
| 0x09 | `sendShutDown` | Desligar relogio | perigoso | provavel | 1 byte: 0x01. | Nenhum tratamento especifico: o relogio so devolve o ACK 0xFD generico (handleAck nao tem ramo para este cmd). O app mostra um dialogo de espera e fecha a tela; a conexao cai. | 1352 |
| 0x0A | `getEpRestart` | Reiniciar dispositivo | perigoso | desconhecido | 1 byte: 0x01. | Nenhum tratamento especifico: o relogio so devolve o ACK 0xFD generico (handleAck nao tem ramo para este cmd). Conexao deve cair durante o reboot. | 925 |
| 0x0B | `stopFindPhone` | Parar 'encontrar telefone' | acao | provavel | 1 byte: 0x01. | Nenhum tratamento especifico: o relogio so devolve o ACK 0xFD generico (handleAck nao tem ramo para este cmd). O fluxo comeca no relogio com 07/00 (FindPhoneEvent start) e pode terminar com 07/0C vindo do relogio. | 1322 |
| 0x0F | `stopFindWatch` | Parar 'encontrar relogio' | acao | provavel | 1 byte: 0x01. | Nenhum tratamento especifico: o relogio so devolve o ACK 0xFD generico (handleAck nao tem ramo para este cmd). O relogio tambem pode avisar fim com 07/09 (EVENT_STOP_FIND_DEV). | 1347 |

## cmd 0x07 — Controle do app / música (CONTROL_APP)

| key | método | nome | risco | TF37 | payload | resposta | fonte |
|---|---|---|---|---|---|---|---|
| 0x07 | `syncAudio` | Sincronizar estado da musica | acao | provavel | u8 playState; curVolume u32 BE; maxVolume u32 BE; nome da faixa UTF-8 sem prefixo de tamanho, cortado em 50 bytes (pode cortar no meio de um caractere). Total 9 + n. | Sem resposta de dados. O relogio controla a musica com 07/04 payload[0]: 0x20 vol+, 0x24 vol-, 0x40 anterior, 0x42 proxima, 0x80/0x81 play/pausa; 07/08 encerra o modo de controle. | 1230 |

## cmd 0x17 — Logo de ligar/desligar

| key | método | nome | risco | TF37 | payload | resposta | fonte |
|---|---|---|---|---|---|---|---|
| 0x02 | `sendLogoValue` | Configurar logo de ligar/desligar | config | improvavel | 11 bytes: [0]=openPower (u8), [1..2]=imageId u16 BE, [3]=logoShow, [4]=onOffShareLogo, [5]=animLogo (0/1), [6]=animLogoFrameNum, [7..8]=animLogoPeriod u16 BE (hipotese: ms por quadro), [9..10]=animLogoRepeatCount u16 BE. Bean nulo -> payload vazio. | ACK 0xFD cmd 0x17 key 0x02 -> EVENT_ONOFF_LOGO. | 1176 |

## cmd 0x18 — GPS / localização

| key | método | nome | risco | TF37 | payload | resposta | fonte |
|---|---|---|---|---|---|---|---|
| 0x06 | `sendGPS` | Enviar localizacao do celular | config | desconhecido | 12 bytes: [0..3]=data-hora 32 bits BE (ano-2000:6\|mes:4\|dia:5\|hora:5\|min:6\|seg:6); [4..7]=longitude*1e6; [8..11]=latitude*1e6. Intencao: sinal-magnitude (bit31=1 se <=0). BUG: o codigo aplica '& 127' ao byte alto, apagando o bit de sinal, e usa complemento de dois para negativos — no Brasil (lat e lon negativas) o valor chega corrompido (ex.: -46,6 -> 0x7D38ED40). Obs.: valor 0 tambem marca sinal. | Nenhum tratamento especifico: o relogio so devolve o ACK 0xFD generico (handleAck nao tem ramo para este cmd). (cmd 0x18 nao tem ramo de dados em NotifyWriteUtils). | 1327 |

## cmd 0x19 — Ciclo menstrual (MENSTRUAL)

| key | método | nome | risco | TF37 | payload | resposta | fonte |
|---|---|---|---|---|---|---|---|
| 0x00 | `getMenstrual` | Ler ciclo menstrual | leitura | desconhecido | Sem payload. | DF 19/00: se PLEN=0 ou payload[4] (interruptor) = 0 e o app tiver ciclo ligado, o app reenvia setMenstrualSwitch(true) + setMenstrual(ultimo). Dado pessoal de saude. | 1252 |
| 0x01 | `setMenstrual` | Gravar ciclo menstrual | config | desconhecido | 14 bytes: [0..1]=data de inicio 16 bits BE (ano-2000:7 \| mes:4 \| dia:5); [2]=dias de menstruacao; [3]=duracao do ciclo; [4]=interruptor; [5]=dias de antecedencia; [6]=hora; [7]=minuto do lembrete; [8]=interruptor ovulacao; [9]=antecedencia; [10]=hora; [11]=minuto; [12]=nivel de fluxo do 1o dia; [13]=nivel de dor (0 se lista vazia). | Nenhum tratamento especifico: o relogio so devolve o ACK 0xFD generico (handleAck nao tem ramo para este cmd). (cmd 0x19 nao tem ramo em handleAck). | 1256 |
| 0x03 | `requestMenstrual` | Pedir dados do ciclo (tela de saude) | leitura | desconhecido | Sem payload. | Nao ha parser para 19/03 em NotifyWriteUtils (so a key 0x00 e tratada). Hipotese: relogio responde 19/00 ou so ACK. | 1285 |
| 0x05 | `setMenstrualSwitch` | Ligar/desligar ciclo menstrual | config | desconhecido | 1 byte: 0x00/0x01. | Nenhum tratamento especifico: o relogio so devolve o ACK 0xFD generico (handleAck nao tem ramo para este cmd). | 1289 |

## cmd 0x1E — ChatGPT / assistente (CHATGPT_ID)

| key | método | nome | risco | TF37 | payload | resposta | fonte |
|---|---|---|---|---|---|---|---|
| 0x00 | `sendChatGptQuziText` | Texto da pergunta (ChatGPT) | acao | improvavel | Texto UTF-8 cru, sem prefixo e sem limite no app. | Do relogio (AiChatDataUtil -> AiFunEvent): 1E/04 iniciar gravacao, 1E/05 fim, 1E/06 reiniciar, 1E/08/09 inicio/fim da funcao, 1E/12/13 pedir tocar/parar voz, 1E/14 tocar, 1E/15 parar, 1E/16 ja tocou (nomes das constantes KEY_CHATGPT_*). | 1593 |
| 0x01 | `sendChatGptAsrText` | Pedaco da resposta (ChatGPT) | acao | improvavel | [0]=indice do pedaco (u8); ate 900 bytes UTF-8. | Do relogio (AiChatDataUtil -> AiFunEvent): 1E/04 iniciar gravacao, 1E/05 fim, 1E/06 reiniciar, 1E/08/09 inicio/fim da funcao, 1E/12/13 pedir tocar/parar voz, 1E/14 tocar, 1E/15 parar, 1E/16 ja tocou (nomes das constantes KEY_CHATGPT_*). | 1611 |
| 0x02 | `sendChatGptQuziStart` | Inicio da resposta (ChatGPT) | acao | improvavel | 3 bytes: [0..1]=tamanho total em bytes u16 LITTLE-endian (byte baixo primeiro, diferente do resto do protocolo); [2]=numero de pacotes (u8). Se tamanho=0 envia so [0x00]. | Do relogio (AiChatDataUtil -> AiFunEvent): 1E/04 iniciar gravacao, 1E/05 fim, 1E/06 reiniciar, 1E/08/09 inicio/fim da funcao, 1E/12/13 pedir tocar/parar voz, 1E/14 tocar, 1E/15 parar, 1E/16 ja tocou (nomes das constantes KEY_CHATGPT_*). | 1599 |
| 0x03 | `sendChatGptQuziEnd` | Fim da resposta (ChatGPT) | acao | improvavel | 1 byte: 0x00. | Do relogio (AiChatDataUtil -> AiFunEvent): 1E/04 iniciar gravacao, 1E/05 fim, 1E/06 reiniciar, 1E/08/09 inicio/fim da funcao, 1E/12/13 pedir tocar/parar voz, 1E/14 tocar, 1E/15 parar, 1E/16 ja tocou (nomes das constantes KEY_CHATGPT_*). | 1607 |
| 0x07 | `noticeSpeechFail` | Falha de reconhecimento de voz (ChatGPT) | acao | improvavel | 1 byte: 0x00. | Do relogio (AiChatDataUtil -> AiFunEvent): 1E/04 iniciar gravacao, 1E/05 fim, 1E/06 reiniciar, 1E/08/09 inicio/fim da funcao, 1E/12/13 pedir tocar/parar voz, 1E/14 tocar, 1E/15 parar, 1E/16 ja tocou (nomes das constantes KEY_CHATGPT_*). | 1618 |
| 0x10 | `sendTODOReminder` | Criar lembrete de tarefa (IA) | config | improvavel | [0..1]=data 16 bits BE (ano-2000:6 \| mes:4 \| dia:5; ano fora de 2000..2063 faz encodeDate devolver null -> excecao); [2]=hora; [3]=minuto; [4..5]=tamanho do titulo u16 LITTLE-endian; titulo UTF-8 <=120 bytes; conteudo UTF-8 <=360 bytes ate o fim (sem prefixo). | Do relogio (AiChatDataUtil -> AiFunEvent): 1E/04 iniciar gravacao, 1E/05 fim, 1E/06 reiniciar, 1E/08/09 inicio/fim da funcao, 1E/12/13 pedir tocar/parar voz, 1E/14 tocar, 1E/15 parar, 1E/16 ja tocou (nomes das constantes KEY_CHATGPT_*). | 1622 |
| 0x11 | `deleteTODOReminder` | Apagar lembrete de tarefa (IA) | config | improvavel | 4 bytes: [0..1]=data 16 bits BE (como acima); [2]=hora; [3]=minuto. | Do relogio (AiChatDataUtil -> AiFunEvent): 1E/04 iniciar gravacao, 1E/05 fim, 1E/06 reiniciar, 1E/08/09 inicio/fim da funcao, 1E/12/13 pedir tocar/parar voz, 1E/14 tocar, 1E/15 parar, 1E/16 ja tocou (nomes das constantes KEY_CHATGPT_*). | 1643 |

## cmd 0x25 — Fones de ouvido (EARPHONE_CMD)

| key | método | nome | risco | TF37 | payload | resposta | fonte |
|---|---|---|---|---|---|---|---|
| 0x00 | `requestEpBattery` | Ler bateria dos fones/estojo | leitura | improvavel | Sem payload (PLEN=0; montado com generalSendBytes de 2 argumentos). | Quadro DF 25/00 ou 25/01, payload: [0]=bateria esquerda %, [1]=direita %, [2]=estojo %, [3]=carregando esq., [4]=carregando dir., [5]=carregando estojo (u8 cada) -> EpBatteryBean. | 930 |
| 0x01 | `sendUploadEpBattery` | Bateria fones (key de upload) | leitura | improvavel | Sem payload (PLEN=0). | Hipotese: 25/01 com o mesmo layout de 25/00. | 934 |
| 0x02 | `requestEpEQSetting` | Ler equalizador | leitura | improvavel | Sem payload. | DF 25/02 (ou 25/04): [0]=N presets; N bytes = ids dos presets; 1 byte = preset atual; 1 byte = M (parametros por preset); depois N*M bytes de parametros (u8). Obs.: o parser usa N para o numero de listas de parametros. | 938 |
| 0x03 | `sendEpEQSetting` | Gravar equalizador | config | improvavel | u8 supportEQNum; K bytes canSetEQMaps (ids); u8 curEQSet; u8 oneEQParamNums (M); depois, para cada preset em canSetEQParamList, M bytes de parametros. Total = 3 + K + L*M. | ACK 0xFD cmd 0x25; byte[9]=status -> Ep25SettingEvent(key, status==0, status). | 942 |
| 0x04 | `sendUploadEpEQSetting` | EQ (key de upload) | leitura | improvavel | Sem payload. | Hipotese: 25/04 no layout de 25/02. | 969 |
| 0x05 | `requestEpFindLeft` | Tocar fone esquerdo | acao | improvavel | Sem payload. | DF 25/05 payload[0]=estado (u8) -> StringValueEvent(EVENT_EPFINDLEFT) + ACK25. | 973 |
| 0x06 | `requestEpFindRight` | Tocar fone direito | acao | improvavel | Sem payload. | Nao ha parser para 25/06 (so ACK25). | 977 |
| 0x07 | `requestEpANCSetting` | Ler ANC (cancelamento de ruido) | leitura | improvavel | Sem payload. | DF 25/07 (ou 25/09): [0]=N modos; N bytes ids; 1 byte modo atual -> EpANCSettingBean. | 981 |
| 0x08 | `setEpANCSetting` | Gravar modo ANC | config | improvavel | u8 supportAncNums; K bytes canSetAncMaps; u8 curAncNum. Total K+2. | ACK 0xFD cmd 0x25; byte[9]=status -> Ep25SettingEvent(key, status==0, status). | 985 |
| 0x09 | `uploadEpANCSetting` | ANC (key de upload) | leitura | improvavel | Sem payload. | Hipotese: layout de 25/07. | 999 |
| 0x0A | `requestEp3DAudioSetting` | Ler audio 3D | leitura | improvavel | Sem payload. | DF 25/0A (ou 25/0C): [0]=N; N bytes ids; 1 byte atual -> Ep3DAudioSetBean. | 1003 |
| 0x0B | `setEp3DAudioSetting` | Gravar audio 3D | config | improvavel | u8 support3DAudioNums; K bytes ids; u8 cur3DAudioNum. | ACK 0xFD cmd 0x25; byte[9]=status -> Ep25SettingEvent(key, status==0, status). | 1007 |
| 0x0C | `uploadEp3DAudioSetting` | Audio 3D (key de upload) | leitura | improvavel | Sem payload. | Hipotese: layout de 25/0A. | 1021 |
| 0x0D | `requestEpSquelchSetting` | Ler 'squelch' (supressao de ruido) | leitura | improvavel | 1 byte: booleano (0/1); o app usa 0x00. Hipotese: 0 = apenas consultar. | DF 25/0D (ou 25/0F): [0]=ligado (u8); [1]=N; N bytes ids; 1 byte atual -> EpSquelchSetBean. | 1025 |
| 0x0E | `setEpSquelchSetting` | Gravar 'squelch' | config | improvavel | u8 on (0/1); u8 supportSquelchNums; K bytes ids; u8 curSquelchNum. Total K+3. | ACK 0xFD cmd 0x25; byte[9]=status -> Ep25SettingEvent(key, status==0, status). | 1029 |
| 0x0F | `uploadEpSquelchSetting` | Squelch (key de upload) | leitura | improvavel | Sem payload. | Hipotese: layout de 25/0D. | 1044 |
| 0x10 | `requestEpTouchWakeupSwitch` | Ler 'tocar para acordar' | leitura | improvavel | Sem payload. | DF 25/10 (ou 25/12): [0]=interruptor (u8) -> AppConfig + EVENT_EPTOUCHWAKEUPSWITCH. | 1048 |
| 0x11 | `setEpTouchWakeupSwitch` | Gravar 'tocar para acordar' | config | improvavel | 1 byte: 0x00/0x01. | ACK 0xFD cmd 0x25; byte[9]=status -> Ep25SettingEvent(key, status==0, status). Depois do ACK o app pede 25/10 de novo. | 1052 |
| 0x12 | `uploadEpTouchWakeupSwitch` | Toque-acordar (key de upload) | leitura | improvavel | Sem payload. | Hipotese: layout de 25/10. | 1056 |
| 0x13 | `requestEpBeepSwitch` | Ler bipe/aviso sonoro | leitura | improvavel | Sem payload. | DF 25/13 (ou 25/15): [0]=interruptor -> so guarda em AppConfig (sem evento). | 1060 |
| 0x14 | `setEpBeepSwitch` | Gravar bipe (incompleto) | config | improvavel | Sem payload (PLEN=0). | Hipotese: ACK25. | 1064 |
| 0x15 | `uploadEpBeepSwitch` | Bipe (key de upload) | leitura | improvavel | Sem payload. | Hipotese: layout de 25/13. | 1068 |
| 0x16 | `requestEpKeyFunSetting` | Ler funcoes dos botoes/toques | leitura | improvavel | Sem payload. | DF 25/16 (ou 25/18): [0]=K teclas; K bytes keyMap; 1 byte F funcoes; F bytes funMap; K bytes funcao atual esquerda; K bytes funcao atual direita -> EpKeyFunBean (status volta a IDLE). | 1072 |
| 0x17 | `setEpKeyFunSetting` | Gravar funcoes dos botoes | config | improvavel | u8 keyNum; keyMap[K]; u8 funNum; funMap[F]; curFunLeft[K]; curFunRight[K]; opcional u8 synAnother. Os arrays sao copiados do bean (tamanhos nao validados). | ACK 0xFD cmd 0x25; byte[9]=status -> Ep25SettingEvent(key, status==0, status). | 1076 |
| 0x18 | `uploadEpKeyFunSetting` | Teclas (key de upload) | leitura | improvavel | Sem payload. | Hipotese: layout de 25/16. | 1102 |
| 0x19 | `requestEpFindLeftClose` | Parar som do fone esquerdo | acao | improvavel | Sem payload. | ACK 0xFD cmd 0x25; byte[9]=status -> Ep25SettingEvent(key, status==0, status). Sem parser de dados para 25/19. | 1106 |
| 0x1A | `requestEpFindRightClose` | Parar som do fone direito | acao | improvavel | Sem payload. | ACK 0xFD cmd 0x25; byte[9]=status -> Ep25SettingEvent(key, status==0, status). Sem parser de dados para 25/1A. | 1110 |
| 0x1B | `requestEpDeviceName` | Ler nome do dispositivo (fone) | leitura | improvavel | Sem payload. | DF 25/1B (ou 25/1D): [0]=L; L bytes do nome (decodificado com charset padrao, na pratica UTF-8) -> EVENT_EPDEVICENAME. | 1114 |
| 0x1C | `sendEpDeviceName` | Renomear dispositivo (fone) | config | improvavel | u8 L (comprimento em bytes; trunca silenciosamente se >255); L bytes UTF-8 do nome. Sem limite aplicado pelo app. | ACK 0xFD cmd 0x25; byte[9]=status -> Ep25SettingEvent(key, status==0, status). Apos o ACK o app pede 25/1B. | 1118 |

## cmd 0x26 — Relógio mundial de fone (EARPHONE_WORLDTIME)

| key | método | nome | risco | TF37 | payload | resposta | fonte |
|---|---|---|---|---|---|---|---|
| 0x01 | `sendEpWorldTimeZone` | Gravar relogio mundial (cidades) | config | improvavel | u8 N; para cada cidade: u8 L, L bytes UTF-8 do nome, 4 bytes de tempo. Cidade 0: data-hora compactada em 32 bits BE (ano-2000:6 \| mes:4 \| dia:5 \| hora:5 \| min:6 \| seg:6). Demais: deslocamento em segundos relativo a cidade 0, sinal-magnitude (bit31=1 negativo, 31 bits de \|valor\|); obs.: deslocamento 0 sai com bit de sinal 1. | Nenhum tratamento especifico: o relogio so devolve o ACK 0xFD generico (handleAck nao tem ramo para este cmd). (cmd 0x26 nao tem ramo em handleAck). | 1126 |
| 0x02 | `requestEpWorldTimeZone` | Ler relogio mundial | leitura | improvavel | Sem payload. | DF 26/02 (ou 26/03): mesmo layout do envio (N; por cidade L, nome UTF-8, 4 bytes de tempo) -> EpWorldTimeZoneBean, salvo em 'city_time'. | 1152 |
| 0x03 | `uploadEpWorldTimeZone` | Relogio mundial (key de upload) | leitura | improvavel | Sem payload. | Hipotese: layout de 26/02. | 1156 |

## cmd 0x27 — Ajustes de fone/estojo + MTU (EARPHONE_SET)

| key | método | nome | risco | TF37 | payload | resposta | fonte |
|---|---|---|---|---|---|---|---|
| 0x00 | `requestEpBrightness` | Ler brilho (estojo com tela) | leitura | improvavel | Sem payload. | DF 27/00 (ou 27/01): [0]=nivel atual, [1]=nivel maximo (u8) -> EpBrightnessBean. | 1160 |
| 0x02 | `sendEpBrightness` | Gravar brilho | config | improvavel | 2 bytes: [0]=nivel atual (1..max, a UI usa progresso+1), [1]=nivel maximo (eco do valor lido). | ACK 0xFD cmd 0x27; byte[9]=status -> Ep27SettingEvent(key, status==0, status). | 1164 |
| 0x03 | `requestEpVolume` | Ler volume | leitura | improvavel | Sem payload. | DF 27/03 (ou 27/04): [0]=atual, [1]=maximo -> EpVolumeBean. | 1168 |
| 0x05 | `sendEpVolume` | Gravar volume | config | improvavel | 1 byte: nivel atual (u8). | ACK 0xFD cmd 0x27; byte[9]=status -> Ep27SettingEvent(key, status==0, status). | 1172 |
| 0x06 | `requestFmMtu` | Ler MTU preferido do firmware | leitura | desconhecido | Sem payload. | DF 27/06: [0..1]=MTU u16 BE. O app guarda min(512,max(23,v)) e chama requestMtu(min(MTU do periferico, max(23,v))). | 1204 |

## cmd 0x2B — Vídeo em tempo real da câmera (VIDEO_REALTIME_TRANS)

| key | método | nome | risco | TF37 | payload | resposta | fonte |
|---|---|---|---|---|---|---|---|
| 0x01 | `videoTrans` | Ligar/desligar transmissao de video da camera | acao | improvavel | 1 byte: 0x01 = iniciar, 0x00 = parar. | DF 2B/02: [0..1]=largura u16 LE, [2..3]=altura u16 LE, [4]=rotacao (u8), [5..6]=cache de quadros (o decompilador gerou expressao estranha; hipotese u16 LE) -> inicia envio. DF 2B/03 -> evento 'COMMAND_ID_VIDEO_REALTIME_TRANS'. | 1199 |

## cmd 0x2C — Mostrador de vídeo (VIDEO_WATCH_FACE)

| key | método | nome | risco | TF37 | payload | resposta | fonte |
|---|---|---|---|---|---|---|---|
| 0x01 | `sendVideoStart` | Iniciar envio de mostrador de video | config | improvavel | 3 bytes u8: [0]=tipo (o app usa 1), [1]=quadros por segundo (qtd de quadros / duracao), [2]=duracao em segundos. Valores >255 sao truncados. | DF 2C/02: [0..1]=largura u16 LE, [2..3]=altura u16 LE, [4]=angulo, [5..6]=tamanho de cache u16 LE -> VideoImgInfoBean; o app entao gera e envia as imagens (outro canal). DF 2C/05 -> BleDataStatus. | 1208 |
| 0x03 | `getVideoFaceInfo` | Ler layout do mostrador de video | leitura | improvavel | 1 byte: 0x01. | DF 2C/04: mesmo layout do setVideoFaceInfo8/2 (8 ou 2 bytes de id conforme is8Bytes), mais 1 byte elementDisplay se isSupportVideoFaceShowHide (frame[39]&0x40) -> salvo em VIDEO_WATCH_FACE_INFO. | 1226 |
| 0x04 | `setVideoFaceInfo8` | Gravar layout do mostrador de video (id 8 bytes) | config | improvavel | 17 bytes: [0..7]=faceCode (string hex -> 8 bytes), [8..9]=timeX u16 BE, [10..11]=timeY u16 BE, [12..13]=cor RGB565 u16 BE, [14]=elemento acima da hora, [15]=elemento abaixo, [16]=bgUpdate (0/1). faceCode com menos de 8 bytes gera excecao. | ACK 0xFD 2C/04 -> BleDataStatus(44,4,[status]). | 1212 |
| 0x04 | `setVideoFaceInfo2` | Gravar layout do mostrador de video (id 2 bytes) | config | improvavel | 11 bytes: [0..1]=faceCode, [2..3]=timeX u16 BE, [4..5]=timeY u16 BE, [6..7]=cor RGB565 BE, [8]=acima, [9]=abaixo, [10]=bgUpdate. | ACK 0xFD 2C/04 -> BleDataStatus(44,4,[status]). | 1219 |
| 0x06 | `sendMultiStart` | Iniciar mostrador multi-imagem | config | improvavel | 3 bytes u8 (hipotese: tipo, quantidade/taxa, duracao — mesmos papeis de 2C/01). | Hipotese: DF 2C/02 com largura/altura/angulo/cache, depois envio de imagens. | 1589 |

## cmd 0x2D — Cartão SD (SDCARD)

| key | método | nome | risco | TF37 | payload | resposta | fonte |
|---|---|---|---|---|---|---|---|
| 0x00 | `getSDcardStatuts` | Ler estado do cartao SD | leitura | improvavel | 1 byte: 0x01. | DF 2D/xx: payload[0]=status (1 = ok) e 5 bytes de payload copiados para AlbumEvent(45,key,status) (hipotese: status + capacidade/espaco). | 1187 |

## cmd 0x2E — Álbum de fotos (ALBUM)

| key | método | nome | risco | TF37 | payload | resposta | fonte |
|---|---|---|---|---|---|---|---|
| 0x00 | `sendNewAlbumPid` | Anunciar nova foto do album | config | improvavel | 2 bytes: pid u16 BE (truncado a 16 bits). | ACK 0xFD cmd 0x2E: status -> AlbumEvent(46,key,status,ok=status==0). Quadro DF 2E/xx: payload[0]=status, 2 bytes de pid -> AlbumEvent + RecordAlbumUtils.handleAlbum. A foto em si vai por outro canal (hipotese: transferencia de arquivo). | 1191 |
| 0x01 | `sendDelAlbumPid` | Apagar foto do album | perigoso | improvavel | 2 bytes: pid u16 BE. | Mesmo tratamento de 2E (AlbumEvent com status; log 'dele_device2'). | 1195 |

## cmd 0x30 — Tradução IA (AI_TRANSLATE)

| key | método | nome | risco | TF37 | payload | resposta | fonte |
|---|---|---|---|---|---|---|---|
| 0x05 | `sendSoureText` | Texto de origem (traducao) | acao | improvavel | [0]=indice do pedaco (u8, 0 se unico); depois ate 900 bytes UTF-8 (pedaco pode cortar caractere multibyte). | Do relogio: 30/00 payload[0]=idioma de origem, 30/01 payload[0]=idioma de destino, 30/02..04 = eventos (hipotese: inicio/fim de gravacao) -> AiFunEvent. | 1573 |
| 0x06 | `sendTranslateText` | Texto traduzido | acao | improvavel | [0]=indice do pedaco; ate 900 bytes UTF-8. | Do relogio: 30/00 payload[0]=idioma de origem, 30/01 payload[0]=idioma de destino, 30/02..04 = eventos (hipotese: inicio/fim de gravacao) -> AiFunEvent. | 1579 |
| 0x07 | `sendStartTranslate` | Inicio de bloco de texto (traducao) | acao | improvavel | 1 byte: 0x00. | Do relogio: 30/00 payload[0]=idioma de origem, 30/01 payload[0]=idioma de destino, 30/02..04 = eventos (hipotese: inicio/fim de gravacao) -> AiFunEvent. | 1561 |
| 0x08 | `sendEndTranslate` | Fim de bloco de texto (traducao) | acao | improvavel | 1 byte: 0x00. | Do relogio: 30/00 payload[0]=idioma de origem, 30/01 payload[0]=idioma de destino, 30/02..04 = eventos (hipotese: inicio/fim de gravacao) -> AiFunEvent. | 1565 |
| 0x09 | `sendRecordFail` | Falha na gravacao (traducao) | acao | improvavel | 1 byte: 0x00. | Do relogio: 30/00 payload[0]=idioma de origem, 30/01 payload[0]=idioma de destino, 30/02..04 = eventos (hipotese: inicio/fim de gravacao) -> AiFunEvent. | 1569 |
| 0x0A | `sendLanguageCode` | Definir par de idiomas (traducao) | config | improvavel | 2 bytes u8: [0]=idioma de origem, [1]=idioma de destino. | Do relogio: 30/00 payload[0]=idioma de origem, 30/01 payload[0]=idioma de destino, 30/02..04 = eventos (hipotese: inicio/fim de gravacao) -> AiFunEvent. | 1585 |

## cmd 0x31 — Mostrador por IA (AI_DIAL)

| key | método | nome | risco | TF37 | payload | resposta | fonte |
|---|---|---|---|---|---|---|---|
| 0x00 | `sendAiDialAnswer` | Texto reconhecido para mostrador IA | acao | improvavel | Texto UTF-8 cru, sem prefixo de tamanho (vazio permitido). | Teclas vindas do relogio neste cmd viram AiFunEvent (cmd,key[,dados]) consumido pela camada de IA. Keys do relogio: 01/02/03/05/08 = eventos do fluxo; 07 = parametros. | 1510 |
| 0x04 | `noticeAiDialSpeechFail` | Falha no reconhecimento de voz (mostrador IA) | acao | improvavel | 1 byte: 0x00. | Teclas vindas do relogio neste cmd viram AiFunEvent (cmd,key[,dados]) consumido pela camada de IA. | 1514 |
| 0x06 | `noticeSendAIPicFail` | Falha ao gerar/enviar imagem IA | acao | improvavel | 1 byte: 0x00. | Teclas vindas do relogio neste cmd viram AiFunEvent (cmd,key[,dados]) consumido pela camada de IA. | 1518 |
| 0x07 | `requestAiDialParams` | Ler parametros do mostrador IA | leitura | improvavel | 1 byte: 0x00. | DF 31/07: [0]=largura da previa, [1]=altura, [2]=cache (u8 cada; hipotese: unidades escaladas) -> AIDialParams. | 1522 |
| 0x0A | `sendAiDialStyle` | Enviar estilo do mostrador IA | acao | improvavel | [0]=L (u8); L bytes UTF-8. | Teclas vindas do relogio neste cmd viram AiFunEvent (cmd,key[,dados]) consumido pela camada de IA. | 1526 |

## cmd 0x36 — Gravação de áudio (RECORD_AUDIO)

| key | método | nome | risco | TF37 | payload | resposta | fonte |
|---|---|---|---|---|---|---|---|
| 0x02 | `sendReceiveRecord` | Aceitar recebimento de gravacao | acao | improvavel | 1 byte: 0x01 = aceitar (o app sempre manda 1), 0x00 = recusar (hipotese). | Do relogio: 36/01 [L, nome UTF-8] = gravacao vai comecar; 36/03 = fim; 36/05 [1/0] = exclusao permitida/negada; 36/06 [L, nome] = relogio pede exclusao. | 1657 |
| 0x04 | `deleteRecordFile` | Apagar gravacao no relogio | perigoso | improvavel | [0]=L (u8); L bytes UTF-8 do nome do arquivo. | DF 36/05 payload[0]: 1 = permitido (EVENT_RECORD_ALLOW_DELETE), 0 = negado. | 1661 |
| 0x04 | `deleteAllowRecordFile` | Autorizar exclusao pedida pelo relogio | perigoso | improvavel | 1 byte: 0x01 = autoriza (o app sempre manda 1), 0x00 = nega. | Do relogio: 36/01 [L, nome UTF-8] = gravacao vai comecar; 36/03 = fim; 36/05 [1/0] = exclusao permitida/negada; 36/06 [L, nome] = relogio pede exclusao. | 1669 |

## cmd 0x37 — IA em segundo plano (BACK_AI)

| key | método | nome | risco | TF37 | payload | resposta | fonte |
|---|---|---|---|---|---|---|---|
| 0x06 | `sendAiSetAlarm` | Criar alarme por comando de voz (IA) | config | improvavel | [0]=hora, [1]=minuto, [2]=repeticao (mascara de dias), [3]=L1, L1 bytes UTF-8 do texto (<=200 bytes, cortado com '...'), [n]=L2, L2 bytes UTF-8 do rotulo (<=50 bytes). | Nenhum tratamento especifico: o relogio so devolve o ACK 0xFD generico (handleAck nao tem ramo para este cmd). Teclas vindas do relogio neste cmd viram AiFunEvent (cmd,key[,dados]) consumido pela camada de IA. | 1531 |
| 0x07 | `sendAiAlarmDate` | Criar alarme com data (IA) | config | improvavel | [0..1]=data 16 bits BE: bit15=1 se alarme unico (repeticao==0), bits14..9=ano-2000, bits8..5=mes, bits4..0=dia; [2]=hora (0-23); [3]=minuto; [4]=repeticao; [5]=L1 + texto UTF-8 <=200 B; L2 + rotulo UTF-8 <=50 B. | Nenhum tratamento especifico: o relogio so devolve o ACK 0xFD generico (handleAck nao tem ramo para este cmd). Teclas vindas do relogio neste cmd viram AiFunEvent (cmd,key[,dados]) consumido pela camada de IA. | 1542 |

## cmd 0x3A — Letreiro rolante (BARRAGE)

| key | método | nome | risco | TF37 | payload | resposta | fonte |
|---|---|---|---|---|---|---|---|
| 0x00 | `requestBarrageInfo` | Ler parametros do letreiro | leitura | improvavel | 1 byte: 0x00. | DF 3A/02: [0]=direcao, [1]=cor, [2]=velocidade, [3]=tamanho da fonte, [4..5]=largura u16 BE, [6..7]=altura u16 BE, [8..9]=quantidade maxima u16 BE -> BarrageInfo. | 1297 |
| 0x01 | `sendBarrageInfo` | Configurar e iniciar letreiro | config | improvavel | 12 bytes fixos: dir, cor, velocidade, fonte (u8); largura u16 BE; altura u16 BE; maxCount u16 BE; count u16 BE; depois count x tamanho u16 BE (tamanho de cada bin). | ACK 0xFD 3A/01 -> EVENT_BARRAGE_START_PUSH (BarragePushHelper passa a enviar os dados, outro canal). | 1301 |

## cmd 0x3B — Tradução simultânea (AI_SIMTRANSLATE)

| key | método | nome | risco | TF37 | payload | resposta | fonte |
|---|---|---|---|---|---|---|---|
| 0x01 | `sendSimTLanguage` | Definir idiomas (traducao simultanea) | config | improvavel | 2 bytes u8: origem, destino. | Do relogio (onSimTranslateHandle): 3B/02 payload[0]=idioma de origem, 3B/03 payload[0]=idioma de destino; demais keys -> AiFunEvent com os dados. | 1673 |
| 0x08 | `sendSimSoureText` | Texto de origem (simultanea) | acao | improvavel | [0]=indice do pedaco; ate 900 bytes UTF-8. | Do relogio (onSimTranslateHandle): 3B/02 payload[0]=idioma de origem, 3B/03 payload[0]=idioma de destino; demais keys -> AiFunEvent com os dados. | 1677 |
| 0x09 | `sendSimTranslateText` | Texto traduzido (simultanea) | acao | improvavel | [0]=indice do pedaco; ate 900 bytes UTF-8. | Do relogio (onSimTranslateHandle): 3B/02 payload[0]=idioma de origem, 3B/03 payload[0]=idioma de destino; demais keys -> AiFunEvent com os dados. | 1683 |
| 0x0A | `sendSimStartTranslate` | Inicio de bloco (simultanea) | acao | improvavel | 1 byte: 0x00. | Do relogio (onSimTranslateHandle): 3B/02 payload[0]=idioma de origem, 3B/03 payload[0]=idioma de destino; demais keys -> AiFunEvent com os dados. | 1689 |
| 0x0B | `sendSimEndTranslate` | Fim de bloco (simultanea) | acao | improvavel | 1 byte: 0x00. | Do relogio (onSimTranslateHandle): 3B/02 payload[0]=idioma de origem, 3B/03 payload[0]=idioma de destino; demais keys -> AiFunEvent com os dados. | 1693 |
| 0x0C | `sendSimRecordFail` | Falha de gravacao (simultanea) | acao | improvavel | 1 byte: 0x00. | Do relogio (onSimTranslateHandle): 3B/02 payload[0]=idioma de origem, 3B/03 payload[0]=idioma de destino; demais keys -> AiFunEvent com os dados. | 1697 |

## cmd - — Auxiliar (não é comando)

| key | método | nome | risco | TF37 | payload | resposta | fonte |
|---|---|---|---|---|---|---|---|
| - | `concatArrys` | Auxiliar: concatenar arrays | leitura | desconhecido | - | - | 1138 |

## Explicações por método

- **`sendBoAutoTestSetting`** (0x02/0x1D): Configura medicao periodica de oxigenio no sangue ('血氧'). Recurso hipotetico: isSupportBoAutoTest (frame[22]&0x01).
- **`setCalorieTarget`** (0x02/0x2C): Grava a meta de calorias. Log '发送设置上路卡路里目标指令,值为' = 'enviar comando de meta de calorias, valor:'. So enviado se isSupportTargetCalories (frame[34]&0x20).
- **`setDistanceTarget`** (0x02/0x2D): Grava a meta de distancia. Log '发送设置距离目标指令' = 'enviar comando de meta de distancia'. So enviado se isSupportTargetDistance (frame[34]&0x10).
- **`settingMedicineReminder`** (0x02/0x32): Grava todos os lembretes de medicamento de uma vez.
- **`requestMedicationReminder`** (0x02/0x33): Le os lembretes de medicamento ('吃药提醒'). Recurso isSupportMedicationReminder (frame[37]&0x80); maximo variavel se isSupportMedicineReminderMax (frame[44]&0x02).
- **`requestAllDayDND`** (0x02/0x34): Le o interruptor de nao-perturbe integral ('全天勿扰'). Enviado se isSupportAllDayNotDisturbMode (frame[37]&0x20).
- **`sendAllDayDND`** (0x02/0x36): Liga/desliga o nao-perturbe em tempo integral.
- **`requestAllDayLightup`** (0x02/0x37): Le o interruptor de levantar-para-acender em tempo integral ('全天亮屏'). Enviado se isSupportAllDayLightUp (frame[37]&0x10).
- **`sendAllDayLightup`** (0x02/0x39): Liga/desliga o modo de acender a tela (gesto) durante o dia inteiro, sem janela de horario.
- **`setImageQuality`** (0x02/0x3A): Define a qualidade do video de previa da camera. Curiosidade: a key reaproveita a constante COMMAND_ID_BARRAGE (58 = 0x3A) dentro do cmd 0x02. Camera remota com previa de video no relogio; recurso isSupportVideoRealtimeTrans (frame[38]&0x20).
- **`settingGazeDistance`** (0x02/0x3B): Grava interruptor, intervalo e janela do lembrete de descanso visual.
- **`requestGazeDistance`** (0x02/0x3C): Le o lembrete de descanso visual ('远眺提醒'). O setter de recurso isSupportGazeDistance usa o mesmo bit de fitness (frame[41]&0x20) — possivel erro do fabricante.
- **`settingFitnessReminder`** (0x02/0x3D): Grava o lembrete diario de exercicio.
- **`requestFitnessReminder`** (0x02/0x3E): Le o lembrete de exercicio ('运动提醒'); fim da sincronizacao se isSupportFitnessReminder (frame[41]&0x20).
- **`settingReadingReminder`** (0x02/0x3F): Grava o lembrete de leitura.
- **`requestReadingReminder`** (0x02/0x40): Le o lembrete de leitura ('看书提醒'); se isSupportReadingReminder (frame[41]&0x08).
- **`settingTravelReminder`** (0x02/0x41): Grava o lembrete de saida.
- **`requestTravelReminder`** (0x02/0x42): Le o lembrete de saida ('出行提醒'); se isSupportTravelReminder (frame[41]&0x04).
- **`sendPrAutoTestSetting`** (0x02/0x43): Configura medicao periodica de estresse ('压力'). Log '发送设置压力自动测量指令' = 'enviar comando de medicao automatica de estresse'. Recurso hipotetico: isSupportPrAutoTest (frame[44]&0x80).
- **`requestNumberAlarms`** (0x02/0x47): Pergunta quantos alarmes o relogio suporta; fim da sincronizacao se isSupportNumberAlarms (frame[45]&0x10).
- **`requestNumberSavedAlbum`** (0x02/0x48): Pergunta quantas fotos o album do relogio guarda; se isSupportNumberSavedAlbum (frame[45]&0x08).
- **`settingHandWash`** (0x02/0x49): Grava interruptor, intervalo e janela do lembrete de lavar as maos.
- **`requestHandWash`** (0x02/0x4A): Le o lembrete de lavar as maos ('洗手提醒'); recurso isSupportHandwashReminder (frame[48]&0x80).
- **`sendBPAutoTestSetting`** (0x02/0x4B): Configura medicao periodica de pressao arterial ('血压'). Recurso hipotetico: isSupportBPAutoTest (frame[48]&0x40).
- **`sendScientSleepTestSetting`** (0x02/0x4C): Liga o monitoramento de sono avancado ('科学睡眠'). Recurso hipotetico: isSupportSleepAutoTest (frame[48]&0x02).
- **`sendTemperAutoTestSetting`** (0x02/0x4D): Configura medicao periodica de temperatura corporal ('体温'). Recurso hipotetico: isSupportTempAutoTest (frame[48]&0x04).
- **`sendHrvAutoTestSetting`** (0x02/0x4E): Configura medicao periodica de variabilidade da frequencia cardiaca. Recurso hipotetico: isSupportHRVAutoTest (frame[48]&0x08).
- **`reqeustHrHigLow`** (0x03/0x08): Pede os limiares de alerta de frequencia cardiaca alta/baixa. Log '请求心率过高过低提醒阈值' = 'solicitar limiar de alerta de FC alta/baixa'. Fim da sincronizacao se isSupportHeartLowHigFlag (frame[34]&0x04).
- **`sendHrAutoHigLowFla`** (0x03/0x0A): Grava os alertas de FC alta/baixa. Log '设置心率过高过低提醒阈值' = 'definir limiar de alerta de FC alta/baixa'.
- **`settingSportLinkage`** (0x04/0x0D): Inicia/encerra um treino no relogio a partir do app. Esporte vinculado (app<->relogio); recurso isSportLinkage (frame[26]&0x01).
- **`requestSportLinkageType`** (0x04/0x15): Pede a lista de esportes que o relogio aceita no modo vinculado. Log 'APP请求当前支持的运动' = 'APP solicita os esportes atualmente suportados'. Recurso isSupportSportLinkageType (frame[36]&0x80).
- **`sendGomoreKey`** (0x04/0x19): Grava no relogio a chave de licenca do algoritmo esportivo GoMore, obtida do servidor depois que o relogio envia 04/18 com seu id. Log '下发Gomore算法key值' = 'enviar o valor da chave do algoritmo Gomore'. Dado sensivel (licenca): nao registrar.
- **`requestHasGps`** (0x04/0x1D): Pergunta, para o tipo de esporte escolhido, se havera GPS/trajeto (hipotese). Esporte vinculado (app<->relogio); recurso isSportLinkage (frame[26]&0x01).
- **`getEpShtudown`** (0x06/0x09): Pede ao dispositivo que se desligue. Log '发送请求设备关机指令' = 'enviando pedido de desligamento do dispositivo'. Na UI de fone so aparece com isSupportEpShutdown (frame[28]&0x04); os bytes sao identicos a sendShutDown.
- **`sendShutDown`** (0x06/0x09): Desliga o relogio; usado na tela de dispositivo da UI 'screenless' sem checagem de bit de recurso. Log '发送关机指令' = 'enviar comando de desligar'. Mesmo quadro de getEpShtudown.
- **`getEpRestart`** (0x06/0x0A): Pede reinicializacao. Log '发送请求设备重启指令' = 'enviando pedido de reinicio do dispositivo'. Na UI de fone depende de isSupportEpRestart (frame[28]&0x08); tambem usado na tela de oculos (glasses) apos OTA.
- **`stopFindPhone`** (0x06/0x0B): Avisa o relogio que o usuario fechou o alerta de 'encontrar telefone' no celular. Log '发送退出找手机指令' = 'enviar comando de sair de encontrar telefone'. So enviado se isSupportOutFindPhone (frame[35]&0x08).
- **`stopFindWatch`** (0x06/0x0F): Para a vibracao/toque disparado pelo app para achar a pulseira (enviado no timeout do dialogo). Log '发送退出找手表指令' = 'enviar comando de sair de encontrar relogio'.
- **`syncAudio`** (0x07/0x07): Envia ao relogio estado de reproducao, volume e nome da faixa para o controle de musica. Disparado quando o relogio manda 07/06 (inicio) ou 07/07 (pedido) e apos comandos de play/pausa. Sem bit de recurso no envio.
- **`sendLogoValue`** (0x17/0x02): Escolhe qual logo (imagem ou animacao) aparece ao ligar e se ele e exibido. Tela CustomLogoActivity; recurso isSupportOnOffLogo (frame[21]&0x08). Nao envia a imagem em si, so os parametros.
- **`sendGPS`** (0x18/0x06): Envia data-hora e posicao do celular (obtida pelo SDK de localizacao Tencent) junto com o fluxo de clima; sem bit de recurso no envio. Privacidade: expoe a localizacao ao relogio. Os parametros sao (longitude, latitude), nessa ordem.
- **`getMenstrual`** (0x19/0x00): Pede a configuracao de ciclo gravada no relogio (fim da sincronizacao). Saude feminina; recurso isPhysiologicalCycle (frame[23]&0x80).
- **`setMenstrual`** (0x19/0x01): Grava inicio, duracao e lembretes do ciclo/ovulacao. Dado pessoal sensivel. Bean nulo causa NullPointerException (generalSendBytes recebe null). Saude feminina; recurso isPhysiologicalCycle (frame[23]&0x80).
- **`requestMenstrual`** (0x19/0x03): Enviado ao abrir a tela de saude se isMenstrualSwitch (frame[35]&0x02).
- **`setMenstrualSwitch`** (0x19/0x05): Liga/desliga a funcao de acompanhamento do ciclo no relogio; reenviado ao reconectar. Saude feminina; recurso isPhysiologicalCycle (frame[23]&0x80).
- **`sendChatGptQuziText`** (0x1E/0x00): Mostra no relogio a pergunta reconhecida do usuario. Log 'AIChat 聊天 下发回答的问题' = 'AIChat: enviar a pergunta a ser respondida'. Assistente ChatGPT/IA por voz; nenhum bit especifico encontrado no parser (hipotese: depende dos recursos de IA, ex. isSupportBackAI frame[43]&0x10 / isSupportAIWake frame[47]&0x80).
- **`sendChatGptAsrText`** (0x1E/0x01): Envia a resposta da IA em pedacos de ate 900 bytes.
- **`sendChatGptQuziStart`** (0x1E/0x02): Anuncia tamanho total e numero de pacotes da resposta que vira em 1E/01.
- **`sendChatGptQuziEnd`** (0x1E/0x03): Marca o fim da resposta.
- **`noticeSpeechFail`** (0x1E/0x07): Avisa que a fala nao foi reconhecida.
- **`sendTODOReminder`** (0x1E/0x10): Grava um lembrete/tarefa criado pelo assistente de IA. Assistente ChatGPT/IA por voz; nenhum bit especifico encontrado no parser (hipotese: depende dos recursos de IA, ex. isSupportBackAI frame[43]&0x10 / isSupportAIWake frame[47]&0x80).
- **`deleteTODOReminder`** (0x1E/0x11): Remove o lembrete identificado pela data-hora (minuto). Classificado como config por apagar apenas um item criado pelo app (recriavel).
- **`requestEpBattery`** (0x25/0x00): Pede nivel e estado de carga do fone esquerdo, direito e do estojo. Depende do bit isSupportEpCmd (frame[28] bit7 = 0x80, payload[19]) e e enviado no fim da sincronizacao.
- **`sendUploadEpBattery`** (0x25/0x01): Sem chamadores no app. Hipotese: key reservada para o relogio/fone enviar a bateria por iniciativa propria (o parser trata 25/01 igual a 25/00); envia-la do app provavelmente so solicita o mesmo relatorio. Recurso de fone (Ep); depende de isSupportEpCmd (frame[28]&0x80).
- **`requestEpEQSetting`** (0x25/0x02): Pede a lista de presets de EQ e o preset atual. Depende do bit isSupportEpCmd (frame[28] bit7 = 0x80, payload[19]) e e enviado no fim da sincronizacao.
- **`sendEpEQSetting`** (0x25/0x03): Envia de volta a estrutura de EQ com o preset escolhido (e parametros editados). Recurso de fone (Ep); depende de isSupportEpCmd (frame[28]&0x80).
- **`sendUploadEpEQSetting`** (0x25/0x04): Sem chamadores. Hipotese: key usada pelo dispositivo para notificar mudanca de EQ (parser trata 25/04 como 25/02). Recurso de fone (Ep); depende de isSupportEpCmd (frame[28]&0x80).
- **`requestEpFindLeft`** (0x25/0x05): Faz o fone esquerdo emitir som para ser encontrado (ligado na tela 'encontrar dispositivo'). Recurso de fone (Ep); depende de isSupportEpCmd (frame[28]&0x80).
- **`requestEpFindRight`** (0x25/0x06): Igual ao esquerdo, para o fone direito. Recurso de fone (Ep); depende de isSupportEpCmd (frame[28]&0x80).
- **`requestEpANCSetting`** (0x25/0x07): Pede modos de ANC suportados e o atual. Envio na sincronizacao exige isSupportEpCmd; a tela usa isSupportANC (frame[30]&0x20).
- **`setEpANCSetting`** (0x25/0x08): Seleciona o modo de cancelamento de ruido (ex.: ligado/transparencia/desligado, ids vindos do proprio dispositivo). Recurso de fone (Ep); depende de isSupportEpCmd (frame[28]&0x80).
- **`uploadEpANCSetting`** (0x25/0x09): Sem chamadores. Hipotese: notificacao espontanea de ANC (parser trata 25/09 como 25/07). Recurso de fone (Ep); depende de isSupportEpCmd (frame[28]&0x80).
- **`requestEp3DAudioSetting`** (0x25/0x0A): Pede modos de audio espacial/3D suportados e o atual. Depende do bit isSupportEpCmd (frame[28] bit7 = 0x80, payload[19]) e e enviado no fim da sincronizacao.
- **`setEp3DAudioSetting`** (0x25/0x0B): Seleciona o modo de audio 3D. Recurso de fone (Ep); depende de isSupportEpCmd (frame[28]&0x80).
- **`uploadEp3DAudioSetting`** (0x25/0x0C): Sem chamadores; hipotese: notificacao espontanea (parser trata 25/0C como 25/0A). Recurso de fone (Ep); depende de isSupportEpCmd (frame[28]&0x80).
- **`requestEpSquelchSetting`** (0x25/0x0D): Pede a configuracao de 'squelch' (hipotese: reducao de ruido de chamada/ENC). Diferente dos outros 'request', carrega 1 byte; o app sempre manda 0 na sincronizacao. Tela depende de isSupportSquelch (frame[30]&0x10).
- **`setEpSquelchSetting`** (0x25/0x0E): Liga/desliga e escolhe o nivel de squelch. Recurso de fone (Ep); depende de isSupportEpCmd (frame[28]&0x80).
- **`uploadEpSquelchSetting`** (0x25/0x0F): Sem chamadores; hipotese: notificacao espontanea (parser trata 25/0F como 25/0D). Recurso de fone (Ep); depende de isSupportEpCmd (frame[28]&0x80).
- **`requestEpTouchWakeupSwitch`** (0x25/0x10): Le o interruptor de despertar por toque. Depende do bit isSupportEpCmd (frame[28] bit7 = 0x80, payload[19]) e e enviado no fim da sincronizacao. Tambem e reenviado apos o ACK de 25/11.
- **`setEpTouchWakeupSwitch`** (0x25/0x11): Liga/desliga despertar por toque. A opcao aparece quando isSupportWakeonTouch e verdadeiro, que e o bit frame[40]&0x08 INVERTIDO (bit em 0 = suportado).
- **`uploadEpTouchWakeupSwitch`** (0x25/0x12): Sem chamadores; hipotese: notificacao espontanea (parser trata 25/12 como 25/10). Recurso de fone (Ep); depende de isSupportEpCmd (frame[28]&0x80).
- **`requestEpBeepSwitch`** (0x25/0x13): Le o interruptor de bipe (hipotese: tons de aviso do fone). Depende do bit isSupportEpCmd (frame[28] bit7 = 0x80, payload[19]) e e enviado no fim da sincronizacao.
- **`setEpBeepSwitch`** (0x25/0x14): Sem chamadores e SEM payload: o metodo nao carrega o valor desejado. Hipotese: funcao inacabada ou o firmware alterna o estado. Recurso de fone (Ep); depende de isSupportEpCmd (frame[28]&0x80).
- **`uploadEpBeepSwitch`** (0x25/0x15): Sem chamadores; hipotese: notificacao espontanea (parser trata 25/15 como 25/13). Recurso de fone (Ep); depende de isSupportEpCmd (frame[28]&0x80).
- **`requestEpKeyFunSetting`** (0x25/0x16): Le o mapeamento de gestos/teclas para funcoes nos fones esquerdo e direito. Depende do bit isSupportEpCmd (frame[28] bit7 = 0x80, payload[19]) e e enviado no fim da sincronizacao.
- **`setEpKeyFunSetting`** (0x25/0x17): Grava o mapeamento de teclas. Se isSupportKeySetSynOther (frame[34]&0x01) acrescenta 1 byte 'sincronizar com o outro fone'.
- **`uploadEpKeyFunSetting`** (0x25/0x18): Sem chamadores; hipotese: notificacao espontanea (parser trata 25/18 como 25/16). Recurso de fone (Ep); depende de isSupportEpCmd (frame[28]&0x80).
- **`requestEpFindLeftClose`** (0x25/0x19): Para o som de localizacao do fone esquerdo. Recurso de fone (Ep); depende de isSupportEpCmd (frame[28]&0x80).
- **`requestEpFindRightClose`** (0x25/0x1A): Para o som de localizacao do fone direito. Recurso de fone (Ep); depende de isSupportEpCmd (frame[28]&0x80).
- **`requestEpDeviceName`** (0x25/0x1B): Le o nome configurado do fone. Depende do bit isSupportEpCmd (frame[28] bit7 = 0x80, payload[19]) e e enviado no fim da sincronizacao. Tambem reenviado apos ACK de 25/1C.
- **`sendEpDeviceName`** (0x25/0x1C): Grava um novo nome para o fone (hipotese: nome Bluetooth anunciado). Recurso de fone (Ep); depende de isSupportEpCmd (frame[28]&0x80).
- **`sendEpWorldTimeZone`** (0x26/0x01): Envia a lista de cidades do relogio mundial com hora/fuso. Usado pelas telas de fuso de fone e de 'badge'. Depende de isSupportEpWorldTime (frame[28]&0x10) dentro do grupo Ep.
- **`requestEpWorldTimeZone`** (0x26/0x02): Le a lista de cidades gravada. Enviado na sincronizacao se isSupportEpCmd e isSupportEpWorldTime.
- **`uploadEpWorldTimeZone`** (0x26/0x03): Sem chamadores; hipotese: notificacao espontanea (parser trata 26/03 como 26/02). Depende de isSupportEpWorldTime (frame[28]&0x10) dentro do grupo Ep.
- **`requestEpBrightness`** (0x27/0x00): Le o brilho atual e maximo. Enviado se isSupportEpCmd e isSupportEpBrightScreen (frame[28]&0x01).
- **`sendEpBrightness`** (0x27/0x02): Grava o nivel de brilho; a UI bloqueia se a bateria do estojo estiver <=5% ('低电模式，不可以设置亮度' = 'modo de bateria fraca, nao e possivel ajustar o brilho').
- **`requestEpVolume`** (0x27/0x03): Le o volume atual e maximo. Enviado se isSupportEpCmd e isSupportEpVolume (frame[29]&0x80).
- **`sendEpVolume`** (0x27/0x05): Grava o nivel de volume do fone/estojo.
- **`requestFmMtu`** (0x27/0x06): Pergunta ao firmware o MTU desejado; enviado na conexao se isSupportFmMtu (frame[31]&0x01), senao, na plataforma 10, o app fixa MTU 23.
- **`videoTrans`** (0x2B/0x01): Abre (1) ou fecha (0) o fluxo de previa da camera do celular para a tela do relogio. Log '发送相机关闭视频流' = 'enviar camera fechar fluxo de video'. Camera remota com previa de video no relogio; recurso isSupportVideoRealtimeTrans (frame[38]&0x20).
- **`sendVideoStart`** (0x2C/0x01): Inicia a instalacao de um mostrador animado (video convertido em quadros) quando o fundo precisa ser atualizado (bgUpdate=1). Mostrador de video/multi-imagem; recurso isSupportVideoFaceSend (frame[38]&0x10).
- **`getVideoFaceInfo`** (0x2C/0x03): Le a configuracao atual do mostrador de video; enviado no fim da sincronizacao se isSupportVideoFaceSend.
- **`setVideoFaceInfo8`** (0x2C/0x04): Grava posicao/cor do relogio digital sobre o mostrador de video. Usado quando is8Bytes (frame[24]&0x08). Log '状态：设置视频表盘信息8' = 'estado: definir informacao do mostrador de video 8'.
- **`setVideoFaceInfo2`** (0x2C/0x04): Mesma funcao, para firmwares com id de mostrador de 2 bytes (is8Bytes falso). O log diz '8' por copia/cola.
- **`sendMultiStart`** (0x2C/0x06): Equivalente ao sendVideoStart para mostrador de varias fotos (InstallMultiDial). Mostrador de video/multi-imagem; recurso isSupportVideoFaceSend (frame[38]&0x10).
- **`getSDcardStatuts`** (0x2D/0x00): Pergunta se ha cartao SD/armazenamento disponivel para o album. Usado pelo PhotoAlbumManager; com isSupportGETSDCard (frame[44]&0x04) o app considera o SD sempre disponivel.
- **`sendNewAlbumPid`** (0x2E/0x00): Informa o id (pid) da foto que sera transferida para o album do relogio; o app aguarda resposta por 5 s ('发送超时' = 'tempo de envio esgotado'). Album de fotos: recurso isSupportPhotoAlbum (frame[39]&0x10).
- **`sendDelAlbumPid`** (0x2E/0x01): Pede ao relogio que apague a foto com o pid indicado. Album de fotos: recurso isSupportPhotoAlbum (frame[39]&0x10).
- **`sendSoureText`** (0x30/0x05): Envia o texto reconhecido no idioma de origem, em pedacos de ate 900 bytes. Log '发送翻译源' = 'enviar texto de origem da traducao'. Tradutor IA; recurso isSupportAITranslate (frame[41]&0x10).
- **`sendTranslateText`** (0x30/0x06): Envia o texto traduzido, mesmo esquema de pedacos. Log '发送翻译结果' = 'enviar resultado da traducao'. Tradutor IA; recurso isSupportAITranslate (frame[41]&0x10).
- **`sendStartTranslate`** (0x30/0x07): Marca o inicio de um bloco de texto (origem ou traducao). Tradutor IA; recurso isSupportAITranslate (frame[41]&0x10).
- **`sendEndTranslate`** (0x30/0x08): Marca o fim do bloco de texto. Tradutor IA; recurso isSupportAITranslate (frame[41]&0x10).
- **`sendRecordFail`** (0x30/0x09): Avisa o relogio que a captura/reconhecimento de audio falhou. Tradutor IA; recurso isSupportAITranslate (frame[41]&0x10).
- **`sendLanguageCode`** (0x30/0x0A): Informa ao relogio os idiomas de origem e destino (codigos da tabela do app).
- **`sendAiDialAnswer`** (0x31/0x00): Devolve ao relogio o texto (descricao) reconhecido/gerado para criar o mostrador por IA. Mostrador gerado por IA; recurso isSupportAiDial (frame[41]&0x02).
- **`noticeAiDialSpeechFail`** (0x31/0x04): Avisa o relogio que o reconhecimento de voz falhou. Mostrador gerado por IA; recurso isSupportAiDial (frame[41]&0x02).
- **`noticeSendAIPicFail`** (0x31/0x06): Avisa o relogio que a imagem do mostrador IA nao pode ser enviada. Mostrador gerado por IA; recurso isSupportAiDial (frame[41]&0x02).
- **`requestAiDialParams`** (0x31/0x07): Pede dimensoes da previa e cache para o mostrador IA. Mostrador gerado por IA; recurso isSupportAiDial (frame[41]&0x02).
- **`sendAiDialStyle`** (0x31/0x0A): Envia o nome do estilo escolhido para a geracao. Mostrador gerado por IA; recurso isSupportAiDial (frame[41]&0x02).
- **`sendReceiveRecord`** (0x36/0x02): Responde ao 36/01 do relogio confirmando que o app vai receber o audio (o app passa a gravar PCM->WAV). Gravador de voz do relogio; nenhum bit de recurso identificado no envio (hipotese).
- **`deleteRecordFile`** (0x36/0x04): Pede ao relogio que apague um arquivo de gravacao pelo nome. Gravador de voz do relogio; nenhum bit de recurso identificado no envio (hipotese).
- **`deleteAllowRecordFile`** (0x36/0x04): Resposta ao 36/06 (relogio pede para apagar): o app confirma e apaga sua copia local. Usa a MESMA key 0x04 de deleteRecordFile, diferenciada so pelo payload (ambiguo se um nome tiver 1 byte).
- **`sendAiSetAlarm`** (0x37/0x06): Cria um alarme a partir de uma intencao reconhecida pela IA, quando o firmware NAO tem isSupportAIAlarmDate. Obs.: o chamador usa Calendar.HOUR (12 h) se o relogio estiver em 12 h — hora pode sair errada. Assistente IA em segundo plano; recurso geral isSupportBackAI (frame[43]&0x10) (hipotese).
- **`sendAiAlarmDate`** (0x37/0x07): Variante com data, usada se isSupportAIAlarmDate (frame[47]&0x40).
- **`requestBarrageInfo`** (0x3A/0x00): Le os parametros do letreiro gravados no relogio. Letreiro rolante '弹幕' (texto/imagens correndo na tela); recurso isSupportBarrage (frame[44]&0x01).
- **`sendBarrageInfo`** (0x3A/0x01): Envia parametros do letreiro e os tamanhos das imagens (bins) que serao enviadas em seguida. Log '发送弹幕信息' = 'enviar informacao do letreiro'. Letreiro rolante '弹幕' (texto/imagens correndo na tela); recurso isSupportBarrage (frame[44]&0x01).
- **`sendSimTLanguage`** (0x3B/0x01): Informa o par de idiomas da traducao simultanea (troca de idioma).
- **`sendSimSoureText`** (0x3B/0x08): Envia o texto reconhecido em pedacos de ate 900 bytes. Log 'sim发送翻译源' = 'sim: enviar origem da traducao'. Traducao simultanea; recurso isSupportAISimTranslate (frame[48]&0x10).
- **`sendSimTranslateText`** (0x3B/0x09): Envia a traducao em pedacos. Log 'sim发送翻译结果' = 'sim: enviar resultado da traducao'. Traducao simultanea; recurso isSupportAISimTranslate (frame[48]&0x10).
- **`sendSimStartTranslate`** (0x3B/0x0A): Marca inicio de bloco de texto. Traducao simultanea; recurso isSupportAISimTranslate (frame[48]&0x10).
- **`sendSimEndTranslate`** (0x3B/0x0B): Marca fim de bloco de texto. Traducao simultanea; recurso isSupportAISimTranslate (frame[48]&0x10).
- **`sendSimRecordFail`** (0x3B/0x0C): Avisa falha de captura de audio. Traducao simultanea; recurso isSupportAISimTranslate (frame[48]&0x10).
- **`concatArrys`** (-/-): Nao e comando BLE: so concatena varios byte[] na ordem (usado por sendEpWorldTimeZone).

## Notas de payload (formatos complexos)

### 1. Quadro sem payload vs. payload de 1 byte
- `generalSendBytes(cmd, key)` (2 argumentos) gera `DF 00 05 cmd VER key 00 00` — **PLEN=0**, sem payload, e o SUM ainda não está inserido (o quadro tem 8 bytes antes do `addSumCheck`). Usado por quase todos os `request*`/`upload*` do grupo 0x25, por 0x26/0x27 e por `getMenstrual`/`requestMenstrual`.
- Muitos outros "pedidos de leitura" mandam 1 byte fixo (`0x01` nos lembretes do cmd 0x02, `0x00` em 0x47/0x48, IA, tradução). Mantenha o byte exato: o firmware pode rejeitar PLEN diferente (hipótese).

### 2. Data/hora compactada em 32 bits (sendGPS, cidade 0 do relógio mundial)
```
bits 31..26 ano-2000 (6 bits, 2000..2063)
bits 25..22 mês (4)     bits 21..17 dia (5)
bits 16..12 hora (5)    bits 11..6  minuto (6)   bits 5..0 segundo (6)
```
Big-endian. Mesmo esquema da data-hora usada em outras partes do protocolo (ex.: `sendSystemTime`, fora desta parte).

### 3. Datas de 16 bits (três variantes diferentes!)
| uso | layout (BE) |
|---|---|
| `setMenstrual` | ano-2000 em **7** bits (bits 15..9), mês 4 bits (8..5), dia 5 bits (4..0) |
| `sendTODOReminder`/`deleteTODOReminder` (`BleUtils.encodeDate`) | bit 15 = 0, ano-2000 6 bits (14..9), mês (8..5), dia (4..0); fora de 2000–2063 devolve `null` → exceção |
| `sendAiAlarmDate` (`ByteUtils.convertDateToBytes`) | bit 15 = alarme único (repetição==0), ano-2000 6 bits, mês, dia |

### 4. Sinal-magnitude e o bug do `sendGPS`
- O relógio mundial (`TimeZoneActivity`) codifica o deslocamento das cidades 1..N corretamente: `bit31 = 1` se negativo/zero, 31 bits com `|segundos|`.
- `sendGPS` tenta o mesmo com `valor*1e6`, mas faz `((sinal<<7) + (v>>24)) & 127`, **apagando o bit de sinal**, e usa o complemento de dois de `v` negativo. Para coordenadas do Brasil (lat. e lon. negativas) o relógio recebe lixo positivo (ex.: lon −46,6 → `7D 38 ED 40`). Hipótese: o firmware lê sinal-magnitude; uma reimplementação deveria usar `(neg<<31) | |v|`.
- Ordem dos argumentos: `sendGPS(longitude, latitude)` — longitude primeiro no payload.

### 5. Inconsistências de endianness
Quase tudo é big-endian, exceto:
- `sendChatGptQuziStart`: tamanho total u16 **little-endian**.
- `sendTODOReminder`: tamanho do título u16 **little-endian**.
- Respostas `2B/02` (vídeo da câmera) e `2C/02` (info de imagem do mostrador de vídeo): largura/altura/cache em **little-endian**.
- Resposta `27/06` (MTU): big-endian.

### 6. Auto-medições (cmd 0x02, keys 0x1D/0x43/0x4B/0x4D/0x4E)
`[sw, 00, intervalo_min u16 BE, inicio_min u16 BE, fim_min u16 BE]` — início/fim em minutos desde 00:00 (o app usa 0..1439). `0x4C` (sono científico) é só `[sw]`.

### 7. Lembretes de intervalo (0x3B olhar ao longe, 0x49 lavar as mãos)
`[00, 00, (sw<<7)|(intervalo>>8 & 0x7F), intervalo & 0xFF, hIni, mIni, hFim, mFim]`. Na leitura (0x3C/0x4A) o app **soma** `(b2 & 0x7F) + b3` em vez de `((b2&0x7F)<<8) | b3` — bug do app; intervalos > 255 aparecem errados na UI.

### 8. Lembretes de horário fixo (0x3D exercício, 0x3F leitura, 0x41 saída)
`[00, 00, sw, repetição, hora, minuto]`; leitura nas keys pares seguintes (0x3E/0x40/0x42) com o mesmo layout a partir do payload[2].

### 9. Remédios (0x32 / leitura 0x33)
```
[0] 0x01
[1] (max<<4) | (qtd & 0x0F)
por remédio i (0..qtd-1):
  [b0] (sw<<7) | (i<<3) | (n_horarios & 7)
  [b1] repetição
  n × (hora, minuto)
```

### 10. Pares de keys "pedir / gravar / notificar" no grupo 0x25
Padrão: `key N` = pedir, `N+1` = gravar, `N+2` = "upload" (sem chamador; o parser trata `N+2` igual a `N`, logo é provavelmente a notificação espontânea do dispositivo). Ex.: ANC 07/08/09, 3D 0A/0B/0C, squelch 0D/0E/0F, toque 10/11/12, bipe 13/14/15, teclas 16/17/18. Exceções: bateria 00/01, EQ 02/03/04, nome 1B/1C (resposta também em 1D).

### 11. Colisões de key / armadilhas
- `getEpShtudown` e `sendShutDown` geram **o mesmo quadro** `06/09 [01]`.
- `deleteRecordFile` e `deleteAllowRecordFile` usam ambos `36/04` (nome com prefixo de tamanho vs. 1 byte booleano).
- `setVideoFaceInfo8` e `setVideoFaceInfo2` usam ambos `2C/04` (17 vs. 11 bytes, escolhido por `is8Bytes`).
- `setImageQuality` usa `02/3A` reaproveitando a constante `COMMAND_ID_BARRAGE`.
- `setEpBeepSwitch` (25/14) não carrega valor.
- `setMenstrual(null)` causa NullPointerException no app (não chega a enviar).
- Leituras de "dia todo" respondem na key **+1**: `02/37 → 02/38`, `02/34 → 02/35`.

### 12. Textos
Todos os textos são UTF-8. Cortes: nome da faixa 50 B (`syncAudio`, sem prefixo), alarmes IA 200/50 B (com "..."), TODO 120/360 B, tradução/ChatGPT em pedaços de 900 B com índice u8 (o corte não respeita fronteira de caractere). Nome do fone e licença GoMore: sem limite no app além do byte de tamanho.

### 13. O que provavelmente vale para a TF37 (Bluetrum AB569X, Z16_TF37Pro)
Hipótese baseada só no código: pulseira simples tende a ter controle de música (`07/07`), achar telefone/relógio (`06/0B`, `06/0F`), desligar (`06/09`), metas (`02/2C`, `02/2D`) e alertas de FC (`03/08`, `03/0A`). Os grupos 0x25/0x26/0x27 (fones), câmera/vídeo/álbum/SD/letreiro e IA/tradução/ChatGPT dependem de bits que uma pulseira simples quase certamente não liga. A confirmação real é ler o bloco de recursos `00/00` do relógio e conferir os bits citados.

