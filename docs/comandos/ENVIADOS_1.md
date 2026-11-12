# Comandos BLE DF/FD — parte 1 (CommandUtils.java linhas 240–918)

App Podsfine 1.2.3, relógio TF37 Pro. Análise **estática** do código descompilado (jadx). Tudo marcado como *hipótese* foi inferido sem prova direta no código.

Total: **88 métodos** `public static byte[]` (incluindo o helper `generalSendBytes(cmd,key)` e as duas sobrecargas de `sendWeatherInfo`).

## Quadro e ACK

- App→relógio (write 0x2AAD): `DF LEN_H LEN_L SUM CMD VER KEY PLEN_H PLEN_L PAYLOAD`. `LEN = PLEN + 5` (= tamanho total − 4). `SUM` = soma de todos os outros bytes mod 256, inserida no offset 3 por `addSumCheck` (o `generalSendBytes` monta sem SUM; `write()` insere).
- `VER` = `CommandUtils.DEVICE_VERSION`, que começa em 0 e passa a ser o byte [5] da resposta a `getDeviceFeatures` (cmd 0x00). Várias decisões do app dependem dele (VER<2: bind simplificado; VER>=3: envia fuso antes da hora).
- Relógio→app (notify 0x2AAC): mesmo formato com `DF`; o app confere o SUM e responde com ACK `FD 00 06 SUM CMD VER KEY 00 01 STATUS` (STATUS 0 = ok, 3 = checksum inválido).
- ACK do relógio para comandos do app: quadro `FD` com o mesmo CMD/KEY e `STATUS` em payload[0] (índice 9 do quadro); 0 = sucesso. Para cmd 0x02/0x03 o app emite `DeviceSettingEvent(key, ok, status)`.
- Índices de resposta abaixo são **do payload** (payload[0] = byte 9 do quadro), salvo quando dito 'quadro[n]'.

## Classes de risco

`leitura` só lê · `acao` momentâneo/reversível · `config` grava estado · `perigoso` reset/bind/unbind/OTA.

Contagem: leitura=25, acao=19, config=39, perigoso=5

**Perigosos:** `sendRestoreFactory` (0x02/0x09), `sendBindDevice` (0x08/0x00), `sendUnbindDevice` (0x08/0x01), `sendVersionInfo` (0x0C/0x02), `requestStartOTA` (0x20/0x02)


## Helper

| key | método | nome | risco | payload | resposta | fonte |
|---|---|---|---|---|---|---|
| variável | `generalSendBytes` | montador de quadro vazio | leitura | sem payload. Quadro antes do checksum: DF 00 05 CMD VER KEY 00 00; addSumCheck insere SUM no offset 3 -> DF 00 05 SUM CMD VER KEY 00 00. VER = CommandUtils.DEVICE_VERSION (vem do byte [5] da resposta a getDeviceFeatures). | depende do cmd/key | CommandUtils.java:241 |

## 0x00 — funções do dispositivo

| key | método | nome | risco | payload | resposta | fonte |
|---|---|---|---|---|---|---|
| 0x00 | `getDeviceFeatures` | pedir mapa de funções | leitura | 1 byte: 0x00. | cmd 0x00 key 0x00. Quadro: [5]=VER (vira DEVICE_VERSION). Payload (índice no quadro): [9] tem G-sensor; [10] função G-sensor (bit7=ajuste de sono se VER>0); [11] tem FC; [12] função FC; [13] tem GPS; [14] função GPS; [15] bit7 sedentário, bit6 ajuste 12/24h, bit5 carrossel, bit4 contatos, bits3..0 plataforma; [16] bit7 forma da tela, bit6 OTA, bit5 QR, bit3 janela de levantar-pulso, bit2 protocolo novo de mensagem, bit1 alarme; [17] bit7 troca de mostrador, bit6 mostrador custom, bit5 push de mostrador, bits4..0 resolução; [18] bit7 DND, bit6 unidades, bit5 perfil, bit4 clima 7 dias, bit3 20 apps de notificação, bit2 idioma em 5 bytes, bit1 HID, bit0 SOS; [19] bit5 relatório de bateria, bit3 código ácido nucleico, bit2 lembrete de evento, bit0 200 contatos; [20] formato de código; [21] bit6 clima novo, bit4 pareamento clássico, bit3 logo liga/desliga, bit0 info do dispositivo (0x02/0x17); ... continua até ~[50] (bytes de mostrador 8 bytes/RGB565, Ep/fone, lembretes, IA, auto-teste HRV/temp/sono/PA, etc.). Depois, em sincronização: se HID -> sendSystemVersion; senão se info -> getDeviceNameVersion; senão bind. | CommandUtils.java:249 |

## 0x01 — sincronização

| key | método | nome | risco | payload | resposta | fonte |
|---|---|---|---|---|---|---|
| 0x00 | `syncData` | sincronizar histórico | leitura | 1 byte: 0x01. | relógio envia cmd 0x01 key 0x02 (início), vários quadros cmd 0x03 (saúde: FC, PA, SpO2, temp, sono, HRV, estresse...) e cmd 0x04 (esporte), e cmd 0x01 key 0x03 (fim). No fim o app dispara vários pedidos (bateria, tempo de tela, alarmes etc.). Se DEVICE_VERSION<2 e nada chegou, o app apaga os dados de hoje locais. | CommandUtils.java:281 |
| 0x01 | `getTodayData` | sincronizar dados de hoje | leitura | 1 byte: 0x01. | mesmo fluxo de syncData: 0x01/0x02 início, quadros 0x03/0x04, 0x01/0x03 fim | CommandUtils.java:309 |

## 0x02 — configurações

| key | método | nome | risco | payload | resposta | fonte |
|---|---|---|---|---|---|---|
| 0x00 | `handBright` | levantar pulso para acender (liga/desliga) | config | 1 byte: 0=desligado, 1=ligado (raiseBean.powerSwitch). | só ACK FD (FD 00 06 SUM CMD VER KEY 00 01 STATUS; STATUS 0 = sucesso, !=0 = falha) | CommandUtils.java:285 |
| 0x00 | `raiseToWake` | levantar pulso com janela de horário | config | 5 bytes: [0]=liga(0/1); [1..2]=início em minutos desde 00:00 (uint16 BE); [3..4]=fim em minutos (uint16 BE). | só ACK FD (FD 00 06 SUM CMD VER KEY 00 01 STATUS; STATUS 0 = sucesso, !=0 = falha) | CommandUtils.java:289 |
| 0x01 | `setLanguage` | idioma do relógio | config | 1 byte: código do idioma (DeviceLanguageUtils): 0 en, 1 zh-CN, 2 zh-TW/HK, 3 fr, 4 es, 5 pl, 6 pt, 7 it, 8 de, 9 nl, 10 tr, 11 ru, 12 cs, 13 fa, 14 hu, 15 el, 16 ar, 17 tl, 18 ms, 19 id, 20 vi, 21 th, 22 my, 23 hi, 24 ko, 25 ja, 26 sv, 27 he, 28 bn, 29 ro, 30 da, 31 fi, 32 uk. Só é enviado se o bit correspondente estiver no bitmap de idiomas da resposta 0x02/0x06. | só ACK FD (FD 00 06 SUM CMD VER KEY 00 01 STATUS; STATUS 0 = sucesso, !=0 = falha); no sync, ACK de key 1 continua o fluxo (getFaceCode/syncData) | CommandUtils.java:293 |
| 0x02 | `setRealtimeSport` | streaming de passos em tempo real | acao | 1 byte: 1=ligar, 0=desligar. | só ACK FD (FD 00 06 SUM CMD VER KEY 00 01 STATUS; STATUS 0 = sucesso, !=0 = falha); após ACK o app pode reenviar setRealtimeHealth | CommandUtils.java:297 |
| 0x03 | `setRealtimeHealth` | streaming de saúde em tempo real | acao | 1 byte: 1=ligar, 0=desligar. | só ACK FD (FD 00 06 SUM CMD VER KEY 00 01 STATUS; STATUS 0 = sucesso, !=0 = falha) | CommandUtils.java:301 |
| 0x04 | `setUserInfo` | gravar perfil físico do usuário | config | 4 bytes = 32 bits empacotados MSB-first: bit31 = sexo (1 se sex 0/1, 0 se sex 2; hipótese 1=masculino, 0=feminino); bits30..24 = idade (7 b, calculada da data de nascimento); bits23..15 = altura em cm (9 b); bits14..5 = peso em kg (10 b); bits4..0 = 0. Ou seja: b0=(sexo<<7)+idade; b1=altura>>1; b2=((altura&1)<<7)+(peso>>3); b3=(peso&7)<<5. | só ACK FD (FD 00 06 SUM CMD VER KEY 00 01 STATUS; STATUS 0 = sucesso, !=0 = falha); no sync, ACK de 0x04 dispara setStepTarget | CommandUtils.java:253 |
| 0x05 | `setStepTarget` | meta de passos | config | 4 bytes: uint32 big-endian com a meta de passos. | só ACK FD (FD 00 06 SUM CMD VER KEY 00 01 STATUS; STATUS 0 = sucesso, !=0 = falha); no sync, ACK dispara getSettingInfo | CommandUtils.java:273 |
| 0x06 | `getSettingInfo` | ler configurações do relógio | leitura | 1 byte: 0x01. | cmd 0x02 key 0x06 (BleDataUtils.handleSettingInfo). Índices no quadro: [9..19] não lidos; [20] levantar pulso; [21] idioma; [22..25] (ou [22..26] se idioma 5 bytes) bitmap de idiomas suportados (MSB-first, bit 7-(n%8) do byte n/8); depois 1 byte esporte em tempo real e 1 byte saúde em tempo real; depois TLVs sem comprimento (tag 1 byte + tamanho fixo): 4 sono(5), 5 pulso de uso(1), 6 FC auto(8), 7 sedentário(8, limiar 16 BE), 8 24h(1), 9 carrossel(1), 10 bitmap de apps de notificação(11), 11 janela levantar-pulso(4), 12 DND(5), 13 unidades(2), 14 perfil(1), 15/22/23 ignorados(4), 16 tempo de tela(1), 17 SpO2 auto(8), 18/19/20 switches Ep(1), 21 'healthy shape' bits(8), 24 ignorado(1), 25 estresse auto(8), 26 PA auto(8), 27 sono auto(1), 28 temp auto(8), 29 HRV auto(8). No sync, depois ajusta idioma automático. | CommandUtils.java:277 |
| 0x07 | `sendSleepSetting` | janela de monitoramento de sono | config | 5 bytes: [0] liga (0/1); [1..2] início em minutos desde 00:00 (uint16 BE); [3..4] fim em minutos (uint16 BE). | só ACK FD (FD 00 06 SUM CMD VER KEY 00 01 STATUS; STATUS 0 = sucesso, !=0 = falha) (lido de volta no TLV 4 de 0x02/0x06) | CommandUtils.java:495 |
| 0x08 | `sendSystemTime` | acertar data/hora | config | 4 bytes = 32 bits MSB-first: bits31..26 ano-2000 (6 b, até 2063); bits25..22 mês 1-12; bits21..17 dia; bits16..12 hora 0-23; bits11..6 minuto; bits5..0 segundo. Hora LOCAL (Calendar padrão), sem fuso no quadro. | só ACK FD (FD 00 06 SUM CMD VER KEY 00 01 STATUS; STATUS 0 = sucesso, !=0 = falha); no sync, ACK de 0x08 dispara setUserInfo (+ settingUserName). O relógio também pode pedir hora via cmd 0x07 key 0x0B | CommandUtils.java:501 |
| 0x09 | `sendRestoreFactory` | restaurar padrão de fábrica | perigoso | 1 byte: 0x01. | só ACK FD (FD 00 06 SUM CMD VER KEY 00 01 STATUS; STATUS 0 = sucesso, !=0 = falha) | CommandUtils.java:512 |
| 0x0A | `sendWearing` | pulso de uso | config | 1 byte: valor do pulso (hipótese: 0=esquerdo, 1=direito). | só ACK FD (FD 00 06 SUM CMD VER KEY 00 01 STATUS; STATUS 0 = sucesso, !=0 = falha) (lido no TLV 5 de 0x02/0x06) | CommandUtils.java:516 |
| 0x0B | `sendHrAutoTestSetting` | medição automática de FC | config | 8 bytes: [0] liga (0/1); [1] 0x00 (reservado); [2..3] intervalo em minutos uint16 BE (padrão 30); [4..5] início em minutos desde 00:00 (BE); [6..7] fim em minutos (BE) (padrão 00:00-23:59). | só ACK FD (FD 00 06 SUM CMD VER KEY 00 01 STATUS; STATUS 0 = sucesso, !=0 = falha) (lido no TLV 6 de 0x02/0x06) | CommandUtils.java:528 |
| 0x0C | `sendSedentaryRemind` | lembrete de sedentarismo | config | 8 bytes: [0] dndSwitch (não incomodar no horário de almoço, hipótese); [1] liga (0/1); [2..3] limiar uint16 BE (app usa 15; hipótese: passos mínimos); [4] intervalo em minutos (30..120); [5] hora início (0-23); [6] hora fim; [7] repetição: bitmask com ordem INVERTIDA em relação aos outros (dia1=bit7 ... dia7=bit1; padrão 0xFE). | só ACK FD (FD 00 06 SUM CMD VER KEY 00 01 STATUS; STATUS 0 = sucesso, !=0 = falha) (lido no TLV 7 de 0x02/0x06) | CommandUtils.java:539 |
| 0x0D | `set24Hour` | formato 12/24 h | config | 1 byte: 0 = 12 h, 1 = 24 h (TimeFormatActivity). | só ACK FD (FD 00 06 SUM CMD VER KEY 00 01 STATUS; STATUS 0 = sucesso, !=0 = falha) (TLV 8 de 0x02/0x06) | CommandUtils.java:689 |
| 0x0E | `setCarousel` | carrossel/estilo de menu | config | 1 byte: valor (hipótese 0/1). | só ACK FD (FD 00 06 SUM CMD VER KEY 00 01 STATUS; STATUS 0 = sucesso, !=0 = falha) (TLV 9 de 0x02/0x06) | CommandUtils.java:693 |
| 0x10 | `setAlarm` | gravar alarmes (lista completa) | config | 2 + 5*n bytes: [0] (maxNum<<4) \| n (n = alarmes enviados, 0..15); [1] (ringModeNum<<4) \| ringNum (quantidade de modos/toques disponíveis, ecoados da leitura); para cada alarme i: [hora 0-23][minuto][repetição bitmask (dia1=bit0..dia7=bit6, 0 = uma vez; padrão 0x7F)][(ringMode<<4) \| ring][(powerSwitch<<6) \| (action<<4) \| index (index 0-15)]. Os alarmes são lidos do mapa por chave 0..n-1 (se as chaves vierem com buracos -> NPE, hipótese). | só ACK FD (FD 00 06 SUM CMD VER KEY 00 01 STATUS; STATUS 0 = sucesso, !=0 = falha) | CommandUtils.java:783 |
| 0x11 | `setDND` | não perturbe | config | 5 bytes: [0] liga (0/1); [1..2] início em minutos desde 00:00 (uint16 BE); [3..4] fim em minutos (uint16 BE). Pode atravessar a meia-noite (início > fim). | só ACK FD (FD 00 06 SUM CMD VER KEY 00 01 STATUS; STATUS 0 = sucesso, !=0 = falha) (TLV 12 de 0x02/0x06) | CommandUtils.java:773 |
| 0x12 | `setUnit` | unidades | config | 2 bytes: [0] distância: 0 = métrico (usuário institution==1), 1 = imperial; [1] temperatura: 0 = °C (temp_unit==1), 1 = °F (rótulos hipótese pela convenção). | só ACK FD (FD 00 06 SUM CMD VER KEY 00 01 STATUS; STATUS 0 = sucesso, !=0 = falha); no sync, ACK dispara setTimeZone (VER>=3) ou sendSystemTime | CommandUtils.java:800 |
| 0x13 | `setProfile` | perfil/modo | config | 1 byte: valor do perfil. | só ACK FD (FD 00 06 SUM CMD VER KEY 00 01 STATUS; STATUS 0 = sucesso, !=0 = falha) (TLV 14 de 0x02/0x06) | CommandUtils.java:812 |
| 0x14 | `sendSosInfo` | contato SOS | config | [0] lenNome; nome UTF-8; [..] lenNum; número UTF-8. Sem truncamento (comprimento >255 corrompe o byte de tamanho). Dado pessoal. | só ACK FD (FD 00 06 SUM CMD VER KEY 00 01 STATUS; STATUS 0 = sucesso, !=0 = falha) | CommandUtils.java:725 |
| 0x17 | `getDeviceNameVersion` | ler versão de firmware e nome do projeto | leitura | sem payload (PLEN=0; usa generalSendBytes de 2 args). | cmd 0x02 key 0x17: [0] lenV; versão (texto); [..] lenN; nome do projeto (texto). Depois o app chama bindDevice | CommandUtils.java:845 |
| 0x1C | `sendScreenTime` | tempo de tela acesa | config | 1 byte: código: 1=5 s, 2=10 s, 3=15 s, 4=30 s, 5=60 s, 6=2 min, 7=5 min, 8=10 min, 255=sempre ligada (só códigos listados pelo relógio em 0x02/0x46). | só ACK FD (FD 00 06 SUM CMD VER KEY 00 01 STATUS; STATUS 0 = sucesso, !=0 = falha) (TLV 16 de 0x02/0x06) | CommandUtils.java:738 |
| 0x1F | `requestScreenTime` | ler tempo de tela | leitura | 1 byte: 0x00. | desconhecido: key 0x1F não tem ramo próprio no case 2 (cai no ramo genérico que só emite SET_SETTING_STATES); hipótese: só ACK ou valor em payload[0] | CommandUtils.java:742 |
| 0x20 | `settingUserName` | nome do usuário | config | [0] len; apelido UTF-8 (sem truncamento; >255 bytes corrompe len). Dado pessoal. | só ACK FD (FD 00 06 SUM CMD VER KEY 00 01 STATUS; STATUS 0 = sucesso, !=0 = falha) | CommandUtils.java:857 |
| 0x21 | `settingDrinkWater` | lembrete de beber água | config | 6 bytes: [0] pausa no almoço (0/1); [1] liga (0/1); [2] intervalo em minutos / 15 (unidades de 15 min); [3] hora início (0-23); [4] hora fim; [5] repetição bitmask (dia1=bit0..dia7=bit6, padrão 0x7F). | só ACK FD (FD 00 06 SUM CMD VER KEY 00 01 STATUS; STATUS 0 = sucesso, !=0 = falha) | CommandUtils.java:877 |
| 0x23 | `sendPaymentCode` | QR de pagamento (texto) | config | [0] tipo (codeType do app); [1..2] tamanho uint16 BE; [3..] texto UTF-8 do QR (vazio = apagar, hipótese). Dado sensível (código de pagamento) — não registrar valores. | só ACK FD (FD 00 06 SUM CMD VER KEY 00 01 STATUS; STATUS 0 = sucesso, !=0 = falha) | CommandUtils.java:882 |
| 0x24 | `sendSocialCode` | QR social (texto) | config | [0] tipo (codeType); [1..2] tamanho uint16 BE; [3..] texto UTF-8. | só ACK FD (FD 00 06 SUM CMD VER KEY 00 01 STATUS; STATUS 0 = sucesso, !=0 = falha) | CommandUtils.java:895 |
| 0x26 | `setMsgRedSwitch` | ponto vermelho de mensagens | config | 1 byte: 1/0. | só ACK FD (FD 00 06 SUM CMD VER KEY 00 01 STATUS; STATUS 0 = sucesso, !=0 = falha) (TLV 18 de 0x02/0x06) | CommandUtils.java:908 |
| 0x27 | `setMsgNotifySwitch` | notificação de mensagens | config | 1 byte: 1/0. | só ACK FD (FD 00 06 SUM CMD VER KEY 00 01 STATUS; STATUS 0 = sucesso, !=0 = falha) (TLV 19) | CommandUtils.java:912 |
| 0x28 | `setMsgNotifyAllSwitch` | notificação de todos os apps | config | 1 byte: 1/0. | só ACK FD (FD 00 06 SUM CMD VER KEY 00 01 STATUS; STATUS 0 = sucesso, !=0 = falha) (TLV 20) | CommandUtils.java:916 |
| 0x46 | `requestScreenTimeTypes` | ler opções de tempo de tela | leitura | 1 byte: 0x00. | cmd 0x02 key 0x46: payload = lista de códigos (1 byte cada, ver sendScreenTime) | CommandUtils.java:746 |

## 0x05 — clima

| key | método | nome | risco | payload | resposta | fonte |
|---|---|---|---|---|---|---|
| 0x00 | `sendWeatherInfo` | clima do dia (formato antigo) | config | 10 bytes + cidade: [0..1] data 16 bits BE: bits15..9 = ano-2000 (7 b), bits8..5 = mês (4 b), bits4..0 = dia (5 b); [2] código do clima (do servidor); [3] qualidade do ar (AirPollution.air, 0 se nulo); [4] temperatura atual; [5] máxima (ceil); [6] mínima (floor) — temperatura em sinal-magnitude de 1 byte: bit6=1 se >0, bits5..0 = \|valor\| (0..63); 0 e negativos têm bit6=0 (0 e -0 iguais; >63 transborda); [7..8] uint16 BE = sempre 0 no chamador (campo reservado, hipótese); [9] umidade %; [10..] nome da cidade em bytes do charset padrão (UTF-8 no Android), sem prefixo de tamanho nem limite. | ACK FD cmd 0x05 (status em [9]; app emite WeatherSetEvent) | CommandUtils.java:360 |
| 0x01 | `sendWeatherInfo` | previsão de vários dias (7 dias) | config | [0] N = número de dias; depois N blocos de 5 bytes: [data16 BE (data 16 bits BE: bits15..9 = ano-2000 (7 b), bits8..5 = mês (4 b), bits4..0 = dia (5 b))][código clima][máx][mín] (temperatura em sinal-magnitude de 1 byte: bit6=1 se >0, bits5..0 = \|valor\| (0..63); 0 e negativos têm bit6=0 (0 e -0 iguais; >63 transborda); se máx==mín, mín-=1); depois o nome da cidade (charset padrão) nos últimos bytes. BUG: cada dia é copiado como 10 bytes (5 lixo zero); no último dia, se o nome da cidade tiver <5 bytes, System.arraycopy estoura, a exceção é engolida e o último dia + a cidade ficam zerados. | ACK FD cmd 0x05 (WeatherSetEvent) | CommandUtils.java:399 |
| 0x02 | `sendNewWeatherInfo` | clima do dia (formato novo) | config | 16 bytes + cidade: [0..1] data 16 bits BE: bits15..9 = ano-2000 (7 b), bits8..5 = mês (4 b), bits4..0 = dia (5 b); [2] código do clima; [3] qualidade do ar; [4] temp atual; [5] máx (ceil); [6] mín (floor; se igual à máx, -1) — temperatura em sinal-magnitude de 1 byte: bit6=1 se >0, bits5..0 = \|valor\| (0..63); 0 e negativos têm bit6=0 (0 e -0 iguais; >63 transborda); [7..8] pressão (grndLevel, uint16 BE, hPa provável); [9] umidade %; [10] vento (velocidade inteira); [11..12] direção do vento em graus uint16 BE; [13..14] visibilidade uint16 BE (unidade do servidor, provável metros); [15] probabilidade de chuva % (rainPop*100); [16..] nome da cidade (charset padrão). Exceções são engolidas (quadro parcial). | ACK FD cmd 0x05 (WeatherSetEvent) | CommandUtils.java:441 |

## 0x06 — controle do relógio (medir, câmera, achar, alarmes)

| key | método | nome | risco | payload | resposta | fonte |
|---|---|---|---|---|---|---|
| 0x00 | `findWatch` | encontrar relógio | acao | 1 byte: 0x01. | só ACK FD (FD 00 06 SUM CMD VER KEY 00 01 STATUS; STATUS 0 = sucesso, !=0 = falha); hipótese: ao parar, o relógio envia cmd 0x07 key 0x09 (app trata como EVENT_STOP_FIND_DEV) | CommandUtils.java:305 |
| 0x01 | `sendCameraOpen` | abrir câmera no relógio | acao | 1 byte: 0x01. | só ACK FD (FD 00 06 SUM CMD VER KEY 00 01 STATUS; STATUS 0 = sucesso, !=0 = falha); depois o relógio envia cmd 0x07 key 0x02 para tirar foto e 0x07/0x03 para sair | CommandUtils.java:313 |
| 0x02 | `sendPhotoCap` | foto tirada | acao | 1 byte: 0x01. | só ACK FD (FD 00 06 SUM CMD VER KEY 00 01 STATUS; STATUS 0 = sucesso, !=0 = falha) | CommandUtils.java:317 |
| 0x03 | `sendCameraClose` | fechar câmera | acao | 1 byte: motivo; 1 = câmera fechada pelo app (CameraSateReceiver), 2 = pedido de abrir câmera recusado (app sem permissão/ocupado em sync, MainActivity). | só ACK FD (FD 00 06 SUM CMD VER KEY 00 01 STATUS; STATUS 0 = sucesso, !=0 = falha) | CommandUtils.java:321 |
| 0x04 | `sendRequestHeartRate` | medir frequência cardíaca | acao | 1 byte: 1=iniciar, 0=parar. | hipótese: o relógio responde com ACK FD; status/resultado chega por cmd 0x03 (handleHealthData): keys 0x0F/0x12/0x15/0x29/0x31 = status de medição (payload[0]); valores medidos chegam como dados de saúde (0x03/0x00 FC, 0x01 PA, 0x02 SpO2, 0x03 temp, 0x32 HRV). Mapeamento exato key->tipo não confirmado | CommandUtils.java:325 |
| 0x05 | `sendRequestBloodPressure` | medir pressão arterial | acao | 1 byte: 1=iniciar, 0=parar. | hipótese: o relógio responde com ACK FD; status/resultado chega por cmd 0x03 (handleHealthData): keys 0x0F/0x12/0x15/0x29/0x31 = status de medição (payload[0]); valores medidos chegam como dados de saúde (0x03/0x00 FC, 0x01 PA, 0x02 SpO2, 0x03 temp, 0x32 HRV). Mapeamento exato key->tipo não confirmado | CommandUtils.java:335 |
| 0x06 | `sendRequestBloodOxygen` | medir SpO2 | acao | 1 byte: 1=iniciar, 0=parar. | hipótese: o relógio responde com ACK FD; status/resultado chega por cmd 0x03 (handleHealthData): keys 0x0F/0x12/0x15/0x29/0x31 = status de medição (payload[0]); valores medidos chegam como dados de saúde (0x03/0x00 FC, 0x01 PA, 0x02 SpO2, 0x03 temp, 0x32 HRV). Mapeamento exato key->tipo não confirmado | CommandUtils.java:340 |
| 0x08 | `getAlarm` | ler alarmes | leitura | 1 byte: 0x01. | cmd 0x06 key 0x08 do relógio: mesmo layout de setAlarm ([0] max<<4\|n, [1] ringModeNum<<4\|ringNum, n blocos de 5 bytes). ACK FD de 6/8 também emite evento de teste | CommandUtils.java:778 |
| 0x12 | `sendRequestPressure` | medir estresse | acao | 1 byte: 1=iniciar, 0=parar. | hipótese: o relógio responde com ACK FD; status/resultado chega por cmd 0x03 (handleHealthData): keys 0x0F/0x12/0x15/0x29/0x31 = status de medição (payload[0]); valores medidos chegam como dados de saúde (0x03/0x00 FC, 0x01 PA, 0x02 SpO2, 0x03 temp, 0x32 HRV). Mapeamento exato key->tipo não confirmado | CommandUtils.java:345 |
| 0x15 | `sendRequestTempre` | medir temperatura | acao | 1 byte: 1=iniciar, 0=parar. | hipótese: o relógio responde com ACK FD; status/resultado chega por cmd 0x03 (handleHealthData): keys 0x0F/0x12/0x15/0x29/0x31 = status de medição (payload[0]); valores medidos chegam como dados de saúde (0x03/0x00 FC, 0x01 PA, 0x02 SpO2, 0x03 temp, 0x32 HRV). Mapeamento exato key->tipo não confirmado | CommandUtils.java:350 |
| 0x15 | `sendRequestHrv` | medir HRV (variante com key de temperatura) | acao | 1 byte: 1=iniciar, 0=parar. | hipótese: o relógio responde com ACK FD; status/resultado chega por cmd 0x03 (handleHealthData): keys 0x0F/0x12/0x15/0x29/0x31 = status de medição (payload[0]); valores medidos chegam como dados de saúde (0x03/0x00 FC, 0x01 PA, 0x02 SpO2, 0x03 temp, 0x32 HRV). Mapeamento exato key->tipo não confirmado | CommandUtils.java:355 |
| 0x16 | `sendRequestHRV` | medir HRV | acao | 1 byte: 1=iniciar, 0=parar. | hipótese: o relógio responde com ACK FD; status/resultado chega por cmd 0x03 (handleHealthData): keys 0x0F/0x12/0x15/0x29/0x31 = status de medição (payload[0]); valores medidos chegam como dados de saúde (0x03/0x00 FC, 0x01 PA, 0x02 SpO2, 0x03 temp, 0x32 HRV). Mapeamento exato key->tipo não confirmado | CommandUtils.java:330 |

## 0x08 — vínculo (bind)

| key | método | nome | risco | payload | resposta | fonte |
|---|---|---|---|---|---|---|
| 0x00 | `sendBindDevice` | vincular (bind) ao celular | perigoso | N bytes: código de bind em ASCII (8 caracteres hex, prefixo de UUID aleatório). Não reproduzir valores reais. | cmd 0x08 (do relógio) payload[0]: 1 = primeiro vínculo (app limpa dados de hoje/últimas medições, depois setUnit ou fuso/hora); 2 = já vinculado com este código (reconexão); 3 = recusado -> app desconecta. Log 移除绑定超时 = 'remover timeout de bind'. Também há ACK FD | CommandUtils.java:520 |
| 0x01 | `sendUnbindDevice` | desvincular | perigoso | 1 byte: 0x01. | só ACK FD (FD 00 06 SUM CMD VER KEY 00 01 STATUS; STATUS 0 = sucesso, !=0 = falha) (handleAck cmd 8 key 1 só loga 解除绑定 = 'desvincular') | CommandUtils.java:524 |

## 0x09 — fuso horário

| key | método | nome | risco | payload | resposta | fonte |
|---|---|---|---|---|---|---|
| 0x00 | `setTimeZone` | fuso horário | config | 2 bytes: [0] sinal (0 = UTC+ ou zero, 1 = UTC-); [1] \|offset\| em horas inteiras. Fusos fracionários (+5:30, +5:45) são truncados para horas. Ex.: UTC-3 -> 01 03. | só ACK FD (FD 00 06 SUM CMD VER KEY 00 01 STATUS; STATUS 0 = sucesso, !=0 = falha); no sync, ACK de cmd 9 dispara sendSystemTime | CommandUtils.java:534 |

## 0x0A — notificações

| key | método | nome | risco | payload | resposta | fonte |
|---|---|---|---|---|---|---|
| 0x00 | `sendMsg` | notificação (protocolo antigo) | acao | [0..1] id da notificação uint16 BE (StatusBarNotification.id truncado); [2..5] horário de postagem em segundos Unix uint32 BE; [6] lenA; nome do app (UTF-8); [..] lenT; título (UTF-8); [..] lenC uint16 BE; conteúdo (UTF-8). Limite: tamanho total <= MTU-12 (plataforma 7: 503); plataformas 1/2: app<=50, título<=30, conteúdo<=300 bytes. Conteúdo é cortado no limite (pode partir caractere UTF-8 no meio); se cabeçalho+app+título > limite retorna null. | só ACK FD (FD 00 06 SUM CMD VER KEY 00 01 STATUS; STATUS 0 = sucesso, !=0 = falha) | CommandUtils.java:543 |
| 0x00 | `sendMsgNewProtocol` | notificação (protocolo novo, com tipo) | acao | [0..1] id uint16 BE; [2..5] segundos Unix uint32 BE; [6] tipo do app: 1 SMS, 2 WeChat, 3 QQ, 4 Facebook/Messenger, 5 Twitter, 6 Skype, 7 LINE, 8 WhatsApp, 9 KakaoTalk, 10 Instagram, 23 Zalo, 255 outro; [7] lenA + app UTF-8; lenT + título UTF-8; lenC uint16 BE + conteúdo UTF-8. Total limitado a 199 bytes (plataforma 10) ou 503; só o conteúdo é cortado (sem cuidado com UTF-8). Sem limite para app/título: se passarem do limite, length3 fica negativo (bug, hipótese de exceção). | só ACK FD (FD 00 06 SUM CMD VER KEY 00 01 STATUS; STATUS 0 = sucesso, !=0 = falha) | CommandUtils.java:588 |
| 0x01 | `sendDeleteMsg` | apagar notificação | acao | 2 bytes: id da notificação uint16 BE. | só ACK FD (FD 00 06 SUM CMD VER KEY 00 01 STATUS; STATUS 0 = sucesso, !=0 = falha) | CommandUtils.java:623 |

## 0x0B — mostradores

| key | método | nome | risco | payload | resposta | fonte |
|---|---|---|---|---|---|---|
| 0x01 | `getFaceCode` | listar mostradores | leitura | 1 byte: 0x01. | hipótese de pareamento: cmd 0x0B key 0x09 (handleWatchFaceInfo): [0] N; [1..2] (ou [1..8]) código atual; N códigos de 2 (ou 8) bytes; últimos 8 bytes = tamanho do papel de parede padrão uint32 BE + tamanho do mostrador padrão uint32 BE. No sync, segue para getCustomizeFaceInfo ou syncData | CommandUtils.java:681 |
| 0x03 | `setWatchFace` | trocar mostrador ativo | config | 2 bytes (ou 8 em relógios 'is8Bytes'): código do mostrador, convertido de string hex (vem da lista de getFaceCode). String inválida pode lançar exceção. | só ACK FD (FD 00 06 SUM CMD VER KEY 00 01 STATUS; STATUS 0 = sucesso, !=0 = falha); hipótese: relógio reenvia lista 0x0B/0x09 | CommandUtils.java:628 |
| 0x04 | `getCustomizeFaceInfo` | ler parâmetros do mostrador personalizado | leitura | 1 byte: 0x01. | cmd 0x0B key 0x05: mesmo layout de setCustomWatchFace (11 bytes) ou setCustomWatchFace8 (17 bytes). Key 0x06 com payload[0]=1 = relógio avisa que o mostrador custom mudou | CommandUtils.java:685 |
| 0x05 | `setCustomWatchFace` | parâmetros do mostrador personalizado (código 2 bytes) | config | 11 bytes: [0..1] código do mostrador (hex->bytes); [2..3] X da hora uint16 BE; [4..5] Y da hora uint16 BE; [6..7] cor uint16 BE (provável RGB565); [8] elemento acima da hora; [9] elemento abaixo; [10] bgUpdate (1 = fundo novo enviado). | ACK FD cmd 0x0B key 5 (EVENT_CUSTOM_WATCH_FACE_ACK) | CommandUtils.java:633 |
| 0x05 | `setCustomWatchFace8` | parâmetros do mostrador personalizado (código 8 bytes) | config | 17 bytes: [0..7] código do mostrador; [8..9] X BE; [10..11] Y BE; [12..13] cor BE; [14] acima; [15] abaixo; [16] bgUpdate. | ACK FD cmd 0x0B key 5 | CommandUtils.java:640 |

## 0x0C — OTA (antigo)

| key | método | nome | risco | payload | resposta | fonte |
|---|---|---|---|---|---|---|
| 0x00 | `getOtaUniqueCode` | OTA: código único | leitura | 1 byte: 0x01. | cmd 0x0C key 0x00: payload bruto -> string hex maiúscula (otaUniqueCode); app em seguida envia getOtaProductCode | CommandUtils.java:697 |
| 0x01 | `getOtaProductCode` | OTA: código de produto | leitura | 1 byte: 0x01. | cmd 0x0C key 0x01: payload bruto -> hex maiúsculo (otaProductCode); app emite OTA_INFO_READY | CommandUtils.java:701 |
| 0x02 | `sendVersionInfo` | OTA: comparar versões dos módulos | perigoso | 20 bytes: slots de uint16 BE por sourceId (bytes [2*id-2],[2*id-1]); slot não usado = 0. | cmd 0x0C key 0x02 (handleOtaInfo): por pares de bytes, FF FF = sem atualização para: main, setting, recurso interno, recurso externo, beep, DSP XIP, DSP code, (>=20 bytes) Sifli init e Sifli font. Menos de 16 bytes = nada | CommandUtils.java:705 |
| 0x03 | `getDeviceOtaStatus` | OTA: status | leitura | 1 byte: 0x01. | cmd 0x0C key 0x03: último byte do payload = status (OtaStatusEvent) | CommandUtils.java:709 |

## 0x0D — QR code

| key | método | nome | risco | payload | resposta | fonte |
|---|---|---|---|---|---|---|
| 0x00 | `getQrCodeInfo` | info de QR code | leitura | 1 byte: 0x00. | cmd 0x0D: [0..3] tamanho de arquivo uint32 BE (bug: bytes sem máscara, sinal estendido se >=0x80); [4..5] largura uint16 BE (app usa como altura também) | CommandUtils.java:713 |
| 0x01 | `resetQrCode` | apagar/resetar QR code | config | 1 byte: tipo do relógio, mapeado do codeType do app: 1->0, 2->3, 3->1, 4->4, outro->2 (nomes dos tipos não confirmados; hipótese: carteiras/redes). | ACK FD cmd 0x0D key 1 (EVENT_QR_CODE_RESET) | CommandUtils.java:717 |

## 0x0E — chamadas

| key | método | nome | risco | payload | resposta | fonte |
|---|---|---|---|---|---|---|
| 0x00 | `sendPhoneCallState` | chamada telefônica | acao | [0] estado: 1 = tocando, 4 = ociosa/encerrada, 5 = atendida/em chamada; [1] lenNome; nome (≤30 caracteres Java, bytes no charset padrão/UTF-8: pode passar de 30 bytes); [..] lenNum; número em US-ASCII (≤20 caracteres; não-ASCII vira '?'). Dado pessoal. | só ACK FD (FD 00 06 SUM CMD VER KEY 00 01 STATUS; STATUS 0 = sucesso, !=0 = falha); recusar/atender pelo relógio chega por outro canal (não neste método) | CommandUtils.java:754 |

## 0x10 — versão do sistema do celular

| key | método | nome | risco | payload | resposta | fonte |
|---|---|---|---|---|---|---|
| 0x00 | `sendSystemVersion` | informar versão do Android | config | 3 bytes: [0] SDK_INT (ex. 34); [1] 0; [2] 0. | só ACK FD (FD 00 06 SUM CMD VER KEY 00 01 STATUS; STATUS 0 = sucesso, !=0 = falha); após ACK: getDeviceNameVersion ou bind | CommandUtils.java:721 |

## 0x11 — bateria

| key | método | nome | risco | payload | resposta | fonte |
|---|---|---|---|---|---|---|
| 0x00 | `requestBattery` | ler bateria | leitura | 1 byte: 0x00. | cmd 0x11 key 0x00 (ou 0x01 quando o relógio reporta sozinho): último byte = % de bateria. Outros keys do relógio: 0x03 modo economia (payload[0]), 0x05 status de carga, 0x06 bateria baixa (1 -> 20%, senão 10%) | CommandUtils.java:750 |

## 0x13 — lembretes de evento

| key | método | nome | risco | payload | resposta | fonte |
|---|---|---|---|---|---|---|
| 0x00 | `getSupportEventReminder` | tipos de lembrete de evento suportados | leitura | 1 byte: 0x00. | cmd 0x13 key 0x00: payload bruto (bytes opacos de suporte) que o app guarda e reenvia em getEventReminder | CommandUtils.java:804 |
| 0x01 | `getEventReminder` | ler lembretes de evento | leitura | N bytes: exatamente o payload recebido em 0x13/0x00. | cmd 0x13 key 0x01: registros de 11 bytes (contagem = ((PLEN_H&1)<<8 + PLEN_L)/11; PLEN_L lido com sinal, bug se >=0x80): [0..3] tipo/id uint32 BE; [4] repetição (bits7..1) \| habilitado (bit0); [5..10] até 3 horários (hora, minuto), FF FF = vazio | CommandUtils.java:808 |
| 0x02 | `sendEventReminder` | gravar lembrete de evento | config | 11 bytes: [0..3] tipo/id uint32 BE; [4] (repeat & 0xFE) \| habilitado (bit0); [5..10] 3 pares (hora = min/60, minuto = min%60); pares não usados = FF FF. | ACK FD cmd 0x13 key 2 (EVENT_REMINDER_SETTING) | CommandUtils.java:816 |
| 0x03 | `sendDeleteEventReminder` | apagar lembrete de evento | config | 5 bytes: [0..3] tipo/id uint32 BE; [4] 0x00. | ACK FD cmd 0x13 key 3 (EVENT_REMINDER_DELETE) | CommandUtils.java:837 |

## 0x14 — ID de produto

| key | método | nome | risco | payload | resposta | fonte |
|---|---|---|---|---|---|---|
| 0x00 | `getProductId` | ler ID de produto/cliente | leitura | 1 byte: 0x01. | cmd 0x14: payload ASCII 'clientNameCode-clientProductCode' (separado por '-'); vazio ou sem '-' = desconhecido | CommandUtils.java:841 |

## 0x20 — OTA (novo)

| key | método | nome | risco | payload | resposta | fonte |
|---|---|---|---|---|---|---|
| 0x01 | `requestOTAInfo` | OTA novo: ler info | leitura | sem payload (PLEN=0). | cmd 0x20 (key != 2, >=13 bytes): payload inteiro em hex = otaUniqueCode; quadro[13] = lenVersão, versão, depois lenNome, nome. Emite OTA_INFO_READY | CommandUtils.java:849 |
| 0x02 | `requestStartOTA` | OTA novo: iniciar atualização | perigoso | 1 byte: 0x01. | cmd 0x20 key 0x02: payload[0] 1 -> OtaStatusEvent(2), 2 -> (4), 3 -> (3), outro -> 'começar a atualizar' (开始升级) | CommandUtils.java:853 |

## 0x22 — lembrete de água

| key | método | nome | risco | payload | resposta | fonte |
|---|---|---|---|---|---|---|
| 0x00 | `requestDrinkReminder` | ler lembrete de água | leitura | sem payload (PLEN=0). | cmd 0x22: [0] pausa de almoço; [1] liga; [2] intervalo/15 (app multiplica por 15 = minutos); [3] hora início; [4] hora fim; [5] repetição & 0x7F | CommandUtils.java:873 |

## 0x32 — crachá eletrônico (mostrador de imagem/vídeo)

| key | método | nome | risco | payload | resposta | fonte |
|---|---|---|---|---|---|---|
| 0x01 | `getBadgeFaceInfo` | info do mostrador de vídeo (crachá) | leitura | 1 byte: 0x01. | hipótese: cmd 0x32 key 0x02: [0..1] largura uint16 LE; [2..3] altura LE; [4..5] cache LE; [6] fps máx; [7] duração máx | CommandUtils.java:647 |
| 0x03 | `setEleSinglePicFace` | ativar mostrador de imagem única (crachá) | config | sem payload (PLEN=0). | só ACK FD (FD 00 06 SUM CMD VER KEY 00 01 STATUS; STATUS 0 = sucesso, !=0 = falha) (hipótese) | CommandUtils.java:669 |
| 0x04 | `setEleMulitPicFace` | ativar mostrador multi-imagem (crachá) | config | 2 bytes: [0] intervalo entre imagens (padrão 1, unidade provável segundos); [1] total de quadros. | só ACK FD (FD 00 06 SUM CMD VER KEY 00 01 STATUS; STATUS 0 = sucesso, !=0 = falha) (hipótese) | CommandUtils.java:673 |
| 0x05 | `setEleVideoFace` | ativar mostrador de vídeo (crachá) | config | 2 bytes: [0] fps; [1] total de quadros. | só ACK FD (FD 00 06 SUM CMD VER KEY 00 01 STATUS; STATUS 0 = sucesso, !=0 = falha) (hipótese) | CommandUtils.java:677 |
| 0x07 | `getBadgeSingleFaceInfo` | info do mostrador de imagem única (crachá) | leitura | 1 byte: 0x01. | hipótese: cmd 0x32 key 0x08: [0..1] largura LE; [2..3] altura LE; [4..7] cache uint32 BE | CommandUtils.java:651 |
| 0x0A | `getBadgeSingleImageCount` | máx. de imagens mescláveis (crachá) | leitura | 1 byte: 0x01. | hipótese: cmd 0x32 key 0x0B: [0] contagem máxima (setMergeMaxCount) | CommandUtils.java:655 |
| 0x0C | `startBadgePushImage` | iniciar push multi-imagem (crachá) | acao | 1 byte: 0x00. | só ACK FD (FD 00 06 SUM CMD VER KEY 00 01 STATUS; STATUS 0 = sucesso, !=0 = falha) (hipótese) | CommandUtils.java:659 |
| 0x0D | `stopBadgePushImage` | encerrar push multi-imagem (crachá) | acao | 1 byte: 0x00. | só ACK FD (FD 00 06 SUM CMD VER KEY 00 01 STATUS; STATUS 0 = sucesso, !=0 = falha) (hipótese) | CommandUtils.java:664 |

## 0xF3 — info do dispositivo

| key | método | nome | risco | payload | resposta | fonte |
|---|---|---|---|---|---|---|
| 0x00 | `getDeviceInfo` | pedir info do dispositivo (F3) | leitura | sem payload (PLEN=0). | desconhecido: não há case 0xF3 (-13) no switch de NotifyWriteUtils.dataHandle; o app só devolve ACK FD a qualquer quadro válido e descarta o conteúdo (hipótese: tratado em outro caminho não encontrado ou ignorado) | CommandUtils.java:245 |

## Notas detalhadas de payload

### Data/hora — `sendSystemTime` (0x02/0x08)
32 bits, MSB primeiro, hora **local** do celular (sem fuso no quadro):

| bits | campo | faixa |
|---|---|---|
| 31..26 | ano − 2000 | 0..63 (até 2063) |
| 25..22 | mês | 1..12 |
| 21..17 | dia | 1..31 |
| 16..12 | hora | 0..23 |
| 11..6 | minuto | 0..59 |
| 5..0 | segundo | 0..59 |

Exemplo (calculado à mão): 2026-11-12 14:30:05 → ano 26, mês 11, dia 12, hora 14, min 30, s 5 →
`b0 = (26<<2)|(11>>2) = 0x6A`, `b1 = ((11&3)<<6)|(12<<1)|(14>>4) = 0xD8`, `b2 = ((14&15)<<4)|(30>>2) = 0xE7`, `b3 = ((30&3)<<6)|5 = 0x85`.

O relógio também pode pedir a hora (cmd 0x07 key 0x0B → app responde com `sendSystemTime`).

### Fuso — `setTimeZone` (0x09/0x00)
`[sinal][horas]`: sinal 0 = positivo/zero, 1 = negativo; horas inteiras (`offset_ms / 3600000`, truncado — fusos de meia hora perdem os 30 min; inclui horário de verão vigente). Brasil (UTC−3): `01 03`. No sync, para VER≥3 o app manda o fuso e, no ACK, a hora.

### Perfil físico — `setUserInfo` (0x02/0x04)
32 bits: `sexo:1 | idade:7 | altura_cm:9 | peso_kg:10 | 0:5`. Sexo: o app põe 1 para `sex` 0 ou 1 e 0 para `sex` 2 (hipótese: 1 = masculino/indefinido, 0 = feminino). Padrões: 18 anos, 170 cm, 50 kg.

### Data dos quadros de clima
16 bits: `ano−2000:7 | mês:4 | dia:5` (diferente da data/hora acima, que usa 6 bits de ano).

### Temperatura de clima
1 byte sinal-magnitude: `bit6 = 1` se a temperatura é > 0; `bits5..0 = |t|`. Zero e negativos têm bit6 = 0. Faixa útil −63..+63 °C; acima disso transborda. Máx usa `ceil`, mín usa `floor`; se ficarem iguais o app subtrai 1 da mín.

### Clima — três formatos (cmd 0x05)
- **key 0x00 (antigo, dia único)**: `data16, código, ar, temp, máx, mín, 00 00, umidade, cidade…`.
- **key 0x01 (vários dias)**: `N, N×[data16, código, máx, mín], cidade…`. Bug: cada dia é copiado com 10 bytes em vez de 5; os 5 extras são sobrescritos pelo dia seguinte/cidade, mas no último dia, se a cidade tiver menos de 5 bytes UTF-8, o `arraycopy` estoura, a exceção é engolida e o último dia e a cidade ficam zerados.
- **key 0x02 (novo)**: `data16, código, ar, temp, máx, mín, pressão16, umidade, vento, direção16, visibilidade16, chuva%, cidade…` (todos os 16 bits em big-endian).
- Cidade: `String.getBytes()` (UTF-8 no Android), sem byte de tamanho — vai até o fim do payload. O `código` vem direto do servidor de clima do fabricante (tabela não verificada aqui).
- Resposta: ACK FD cmd 0x05 → `WeatherSetEvent(ok, status)`.

### Alarmes — `setAlarm` (0x02/0x10) e `getAlarm` (0x06/0x08)
Escrita e leitura usam o **mesmo layout** (leitura chega como cmd 0x06 key 0x08 vindo do relógio):

```
[0] maxNum<<4 | n          (n = nº de alarmes no quadro; máx. que o relógio aceita no nibble alto)
[1] ringModeNum<<4 | ringNum (nº de modos de toque / toques — ecoados da leitura)
para cada alarme (5 bytes):
  [+0] hora   [+1] minuto   [+2] repetição (bitmask)
  [+3] ringMode<<4 | ring
  [+4] powerSwitch<<6 | action<<4 | index(0..15)
```
- `setAlarm` **substitui a lista inteira** (não há comando de alarme individual nesta faixa). Para apagar um, envie a lista sem ele.
- Repetição: bit0 = 1º dia da tela … bit6 = 7º dia (padrão 0x7F = todo dia; 0 = uma vez). Qual dia da semana é o "1º" (domingo ou segunda) não está provado — *hipótese*: segunda.
- Padrões do bean: powerSwitch = 1, action = 1, ring/ringMode = 0.
- O app lê `alarmList.get(i)` para i = 0..n−1; se os índices vierem com buraco → NullPointerException (*hipótese* de bug).

### Sedentarismo — `sendSedentaryRemind` (0x02/0x0C)
`[almoço-DND][liga][limiar_hi=0][limiar_lo][intervalo_min][hora_ini][hora_fim][repetição]`.
- O limiar é lido de volta como uint16 BE (TLV 7 de 0x02/0x06); o app fixa 15 (*hipótese*: passos mínimos no intervalo).
- Intervalo: 30, 45, 60, 75, 90, 105 ou 120 min (listas das telas).
- **Repetição com bits invertidos**: 1º dia = bit7 … 7º dia = bit1 (padrão 0xFE). Nos outros lembretes (alarme, água) o 1º dia é bit0.

### Não perturbe — `setDND` (0x02/0x11) e janelas de horário
`[liga][início_min BE16][fim_min BE16]`, minutos desde 00:00 (`hora*60+min`). Mesmo formato em `raiseToWake` (0x02/0x00, 5 bytes) e `sendSleepSetting` (0x02/0x07). `sendHrAutoTestSetting` (0x02/0x0B) acrescenta `[0x00][intervalo_min BE16]` entre o liga e as horas.

### Lembrete de água — `settingDrinkWater` (0x02/0x21) / `requestDrinkReminder` (0x22)
`[almoço][liga][intervalo/15][hora_ini][hora_fim][repetição]` — o intervalo vai em unidades de 15 min. A leitura chega como cmd 0x22 com o mesmo layout (repetição & 0x7F).

### Notificações — `sendMsg` / `sendMsgNewProtocol` (0x0A/0x00)
```
[0..1] id (uint16 BE, id da notificação Android truncado)
[2..5] hora de postagem, segundos Unix UTC (uint32 BE)
[6]    tipo do app            <- só no protocolo novo
[..]   lenApp(1) + nome do app UTF-8
[..]   lenTítulo(1) + título UTF-8
[..]   lenConteúdo(2, BE) + conteúdo UTF-8
```
- Protocolo novo quando o bit "NewMessageProtocol" (feature byte [16] bit2) está ligado.
- Tipos: 1 SMS, 2 WeChat, 3 QQ, 4 Facebook/Messenger, 5 Twitter/X, 6 Skype, 7 LINE, 8 WhatsApp, 9 KakaoTalk, 10 Instagram, 23 Zalo, 255 outros.
- Limites: antigo = MTU−12 (plataforma 7: 503; plataformas 1/2: app ≤ 50, título ≤ 30, conteúdo ≤ 300 bytes); novo = 199 (plataforma 10) ou 503 no total. Só o conteúdo é cortado, em bytes — pode partir um caractere UTF-8 multibyte. No antigo, se cabeçalho + app + título não couberem, o método devolve `null`.
- Só é enviado se o app estiver na lista de apps escolhidos e o relógio estiver ocioso. `sendDeleteMsg` (0x0A/0x01) leva só o id de 16 bits.

### Chamada — `sendPhoneCallState` (0x0E/0x00)
`[estado][lenNome][nome][lenNúmero][número]`. Estados: 1 = tocando, 5 = atendida (em chamada), 4 = ociosa/desligada. O nome é cortado em 30 **caracteres** (os bytes UTF-8 podem passar disso); o número em 20 caracteres US-ASCII.

### Mostradores (cmd 0x0B)
- `getFaceCode` (key 0x01) → resposta key 0x09: `[N][código atual][N códigos]…[papel de parede padrão u32 BE][mostrador padrão u32 BE]` (códigos de 2 bytes, ou 8 se o feature byte [24] bit3 "is8Bytes" estiver ligado).
- `setWatchFace` (key 0x03): payload = código (hex → bytes).
- `setCustomWatchFace` / `…8` (key 0x05) e `getCustomizeFaceInfo` (key 0x04 → resposta key 0x05): `[código 2|8][X BE16][Y BE16][cor BE16][acima][abaixo][bgUpdate]`. A cor provavelmente é RGB565 (*hipótese*). O relógio manda key 0x06 com payload[0] = 1 quando o mostrador custom muda.
- A imagem de fundo e os mostradores em si vão por outro canal de transferência de arquivo (fora desta faixa).

### Crachá eletrônico (cmd 0x32)
Família de outro produto (电子吧唧 = "crachá eletrônico"); pouco provável no TF37. O pareamento pedido→resposta é *hipótese* (key 1→2 info de vídeo, 7→8 imagem única, 10→11 contagem de mesclagem). Repare que as respostas usam **little-endian** nos 16 bits de largura/altura, ao contrário do resto do protocolo.

### Lembretes de evento (cmd 0x13)
Fluxo: `getSupportEventReminder` (0x00) → relógio devolve bytes opacos → `getEventReminder` (0x01) reenvia esses bytes → relógio devolve registros de 11 bytes. Registro: `[tipo u32 BE][repetição bits7..1 | habilitado bit0][h1][m1][h2][m2][h3][m3]`, com `FF FF` para horário vazio. `sendEventReminder` (0x02) grava um registro; `sendDeleteEventReminder` (0x03) apaga por tipo (`tipo u32 + 00`).

### OTA
- Antigo (cmd 0x0C): `getOtaUniqueCode` (0x00) → `getOtaProductCode` (0x01) → o app consulta o servidor → `sendVersionInfo` (0x02, 20 bytes com versões u16 BE por sourceId) → o relógio diz quais módulos (main, setting, recursos, beep, DSP, Sifli…) precisam atualizar (FF FF = não) → `getDeviceOtaStatus` (0x03). A transferência em si fica em outra classe (OTANotifyWriteUtils).
- Novo (cmd 0x20): `requestOTAInfo` (0x01, sem payload) → versão/nome/identificador; `requestStartOTA` (0x02, `[01]`) coloca o relógio em atualização. **Perigoso**: uma interrupção pode deixar o relógio em modo DFU.

### Vínculo (cmd 0x08)
`sendBindDevice` envia um código de 8 caracteres hex (aleatório, guardado no celular). O relógio responde (cmd 0x08, payload[0]): 1 = primeiro vínculo, 2 = reconexão com o mesmo código, 3 = recusado (o app desconecta). Sem resposta em 15 s, o app desiste. `sendUnbindDevice` desfaz o vínculo. Mandar um bind com outro código pode desvincular o celular atual ou exigir confirmação no relógio — tratar como **perigoso**.

### Resposta de configurações — `getSettingInfo` (0x02/0x06)
Índices do quadro: [20] levantar pulso, [21] idioma, [22..25/26] bitmap de idiomas, depois esporte e saúde em tempo real, depois uma sequência de TLVs **sem byte de tamanho** (tag + tamanho fixo implícito): 4 sono (5), 5 pulso de uso (1), 6 FC auto (8), 7 sedentário (8), 8 24h (1), 9 carrossel (1), 10 apps de notificação (11), 11 janela de levantar pulso (4), 12 DND (5), 13 unidades (2), 14 perfil (1), 15/22/23 ignorados (4), 16 tempo de tela (1), 17 SpO2 auto (8), 18–20 chaves de mensagem (1 cada), 21 visibilidade de telas de saúde (8), 24 ignorado (1), 25 estresse auto (8), 26 PA auto (8), 27 sono auto (1), 28 temperatura auto (8), 29 HRV auto (8). Uma tag desconhecida desalinha o resto do parse (sem tamanho explícito).

## Surpresas e possíveis bugs
1. `sendRequestHrv` (0x06/0x15) usa a mesma key da temperatura apesar do nome/log de HRV; o HRV de verdade é `sendRequestHRV` (0x06/0x16).
2. Clima de vários dias: estouro de `arraycopy` com cidade curta (< 5 bytes) zera o último dia e a cidade sem erro visível.
3. Não há tratamento para a resposta 0xF3 (`getDeviceInfo`), nem para 0x02/0x1F (`requestScreenTime`).
4. Cortes de texto (notificação, chamada) em bytes/caracteres sem respeitar UTF-8.
5. Leituras com sinal: tamanho do QR (u32) e contagem de lembretes (PLEN_L) não aplicam `& 0xFF`.
6. Repetição do sedentarismo usa ordem de bits invertida em relação a alarme/água.
7. `handBright` e `raiseToWake` usam a mesma key (0x02/0x00) com tamanhos diferentes (1 vs 5 bytes) — o relógio deve diferenciar pelo PLEN.
8. Comandos com dados pessoais/sensíveis: `setUserInfo`, `settingUserName`, `sendSosInfo`, `sendPhoneCallState`, `sendMsg*`, `sendPaymentCode`/`sendSocialCode`, `sendBindDevice` (código de bind). Ao testar, não registrar os valores reais.

