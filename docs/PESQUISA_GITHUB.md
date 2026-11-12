# Pesquisa em GitHub e na web: protocolo DF/FD, Bluetrum AB569X e FCC

Pesquisa feita em 2026-11-12, só leitura: READMEs e documentos de protocolo, arquivos-fonte
lidos via `raw.githubusercontent.com` e `codeberg.org/.../raw`, API pública de busca de
repositórios do GitHub (sem login), WebSearch e WebFetch. Nenhuma ferramenta, firmware ou
SDK externo foi baixado ou executado. Nenhum dado pessoal (endereço, nome) foi usado nas
buscas. Trechos citados são curtos; nenhum bloco de código foi copiado.

Para cruzar as tabelas também consultei a análise estática local do Podsfine 1.2.3
(`private/decompiled/…/CommandUtils.java`, `NotifyWriteUtils.java`, `BleDataUtils.java`),
a mesma base de [PROTOCOLO.md](PROTOCOLO.md). Os valores no código Java são **decimais**;
aqui eles aparecem em hexadecimal (`BATTERY_ID = 17` → `11`).

Legenda de evidência: **observado** (captura deste relógio), **estático** (código do app),
**externo** (outro projeto, outro aparelho), **hipótese** (não comprovado).

## 1. Fontes

| Fonte | O que contém | Licença declarada | Relevância |
|---|---|---|---|
| [develmts/Jieli-watch-research](https://github.com/develmts/Jieli-watch-research) (commit `3d115ed`), em especial `docs/UUID_AND_PROTOCOL.md`, `docs/COMMANDS_AND_NEXT_STEPS.md`, `docs/FEATURE_MAP.md` | Quadro DF, ACK FD de 9 bytes, mapa de bits de recursos (2A28), comandos de leitura HryFine, resposta de mostradores `0F/09` | nenhuma no repositório | **alta** |
| [victorbillyph/chinese-smartwatch-homeassistant](https://github.com/victorbillyph/chinese-smartwatch-homeassistant) (commit `86ef39e`), `docs/PROTOCOL.md`, `custom_components/laxasfit/const.py` e `ble_protocol.py` | Tabela completa de comandos do app LaxasFit 1.5.7: grupos, chaves de `02`, controle `0C`, tipos de notificação, dados de esporte `05`, mostradores `0F`. Diz que o chip é **Bluetrum AB5610** e que o OTA `18A8/2AA8/2AA9` é "Bluetrum CYS5610" | MIT | **alta** |
| [Gadgetbridge, LaxasFit](https://codeberg.org/Freeyourgadget/Gadgetbridge) (`master`; último commit na pasta `laxasfit`: `e69558d`, 2026-11-03), arquivos `devices/laxasfit/LaxasFitConstants.java`, `LaxasFitCoordinator.java`, `service/devices/laxasfit/LaxasFitDeviceSupport.java`; [página do aparelho](https://gadgetbridge.org/gadgets/wearables/laxasfit/) | Implementação real (Q11, "parcialmente suportado"): grupos, hora, alarmes, dados de saúde, informação de hardware `0A/10` | AGPL-3.0-or-later (cabeçalhos dos arquivos) | **alta** |
| [kereemsunay/bandbridge](https://github.com/kereemsunay/bandbridge) (commit `45b3029`), `docs/PROTOCOL.md` | PBS163/HryFine: comandos `02`, identidade, **layouts de saúde `05`**, codificação de data em 2 bytes, eventos `0C` | MIT | **alta** |
| [jsphu/polosmart-pbs163-ble](https://github.com/jsphu/polosmart-pbs163-ble) (commit `13db9af`), `docs/PROTOCOL_SPECIFICATION.md` | Mesmo PBS163: chaves `02`, push de mensagem, tipos de app, limites de texto na tela, eventos de mídia/câmera | MIT | média |
| [InsertX2k/hryfine_ultra3_com_protocol](https://github.com/InsertX2k/hryfine_ultra3_com_protocol) (`main`), README e `make_generic_cmd_pattern.py` | "Ultra 3" HryFine: quadros completos de exemplo, contatos e mostradores pelo canal `FF00/FF02` (quadros `D5/D6`), SOS `02/1F`, nome `02/24` | nenhuma | média |
| [kagaimiq/bluetrum-tools](https://github.com/kagaimiq/bluetrum-tools) (`main`), README | Modo de download UART da Bluetrum, desembaralhamento de firmware, nomes-código dos chips, leitura das marcações | MIT | **alta** (hardware) |
| [atc1441/Bluetrum_AB5682_Hacking](https://github.com/atc1441/Bluetrum_AB5682_Hacking) (`main`), README | AB5682 (estojo de fone com tela): pino de download, mapa de memória, chave de código no eFuse. O repositório também redistribui SDK vazado, ferramenta do fabricante e dumps | nenhuma (conteúdo de terceiros vazado) | média (só o README foi lido) |
| [milcorix/wearfit-pro-ble](https://github.com/milcorix/wearfit-pro-ble) (`master`), `PROTOCOL.md` | Outro protocolo (`AB`/`EA`), mesmo fabricante de chip: **protocolo ABOta da Bluetrum** (`FF12`, `FE59`), `AcquireNotify` no BlueZ | MIT | média |
| [omerefr/bluetrum-speaker-mod](https://github.com/omerefr/bluetrum-speaker-mod), README | Backup e escrita de flash de caixa de som AB5607E (PRAO) por UART de um fio | não verificada | baixa/média |
| [BLUETRUM/bluetrum_updater](https://github.com/BLUETRUM/bluetrum_updater), [BLUETRUM/bluetrum_sdk_doc](https://github.com/BLUETRUM/bluetrum_sdk_doc), [Gitee Bluetrum](https://gitee.com/Bluetrum) | Material oficial, só para AB32VG1 (MCU RISC-V): atualização por UART, documentação do SDK, "Downloader" | updater: nenhuma; sdk_doc: Apache-2.0 | baixa |
| [fccid.io/2BD94-TF37PRO](https://fccid.io/2BD94-TF37PRO) | Metadados da certificação FCC do TF37 Pro e lista de anexos | — | média |
| [mehranshahmiri/openwatch-LY736D](https://github.com/mehranshahmiri/openwatch-LY736D), [DavidBates/knockoffwatch](https://github.com/DavidBates/knockoffwatch) | Relógios vendidos como "LaxasFit"/"LaxaFit Pro" que usam **outros** protocolos (cabeçalho `CD`, família FitPro; e `AB 00 len FF`) | openwatch: MIT; knockoffwatch: não verificada | baixa |
| [tiagojr159/app_HryFine_smartwatch](https://github.com/tiagojr159/app_HryFine_smartwatch), `FeatureCommandBuilder.kt` | Quadros `A5 … XOR`, que não batem com nenhuma captura DF/FD; parecem placeholders | nenhuma | baixa (não usar) |
| [TruthGh0st/C30-20-Pro-BLE-Reverse-Engineering](https://github.com/TruthGh0st/C30-20-Pro-BLE-Reverse-Engineering) | JieLi/FitHere, protocolo `AB` via L2CAP; texto humorístico, o próprio autor diz que "pode conter erros" | nenhuma | baixa |
| Posts no Reddit citados pelo develmts (ReFine; "BOOD/Cus5610") | Possivelmente notas sobre Cus5610 | — | **não verificável**: reddit.com bloqueado para o WebFetch |

Buscas sem nenhum resultado: `ab5610`, `AB5691`, `lianhezhuli`, `bluetrum fota` no GitHub;
`"Cus5610"`, `"000018ac-0000-1000-8000-00805f9b34fb"` e `"2AAD" "2AAC" "18AC"` na web.
Ausência de resultado não prova que o material não exista: a busca de código do GitHub
precisa de login e não foi usada.

## 2. Achado principal: mesmo quadro, tabela de comandos diferente

Todas as fontes HryFine/LaxasFit usam **o mesmo formato DF/FD** do TF37 Pro (cabeçalho
`DF`, tamanho big-endian = payload + 5, checksum no offset 3 = soma dos demais bytes mod
256, comando, versão, chave, tamanho do payload).

Mas a **numeração dos comandos do Podsfine é outra.** O mesmo byte de comando tem
significados diferentes, às vezes perigosos:

| Byte de comando | Podsfine / TF37 Pro (estático; ✓ = visto em captura) | HryFine / LaxasFit (externo) |
|---|---|---|
| `06` | controle do aparelho: encontrar relógio, câmera, pedir medição ✓ | **reset do aparelho** (const.py, Ultra 3) |
| `07` | eventos relógio → app (câmera, música, encontrar celular) | **teste de fábrica** |
| `0A` | push de mensagem | **leitura de flash** (const.py); "pedir dados" no Gadgetbridge (`0A/10` = info de hardware) |
| `0B` | mostradores | **teste do aparelho** |
| `0D` | QR code | **restauração de fábrica** |
| `01` | sincronização de dados | **OTA legado** |
| `03` | dados de saúde (FC, PA, SpO2, temperatura) | **vincular (bind)** |
| `04` | dados de esporte/passos ✓ | **desvincular (unbind)** |

**Regra prática: nunca use uma tabela HryFine/LaxasFit/Gadgetbridge para escolher um
comando a enviar ao TF37 Pro.** Só o formato do quadro é transferível. Os layouts de
payload às vezes também são (seção 5), mas sob outro número de comando.

## 3. Quadro e ACK: comparação

| Item | TF37 Pro (observado) | develmts / PBS163 / bandbridge | victorbillyph | Gadgetbridge |
|---|---|---|---|---|
| Byte 5 do quadro DF | versão `0x04` (as 3 primeiras escritas do app saem com `00`) | `0x01` | "sempre `0x01`" | "cmd type": `0x01` = dado, `0x10` = ação |
| ACK `FD` | **10 bytes**: `FD 00 06 SUM CMD 04 KEY 00 01 00` | 9 bytes: `FD 00 05 SUM CMD KEY AUX_H AUX_L STATUS` | `FD len len SUM CMD VER KEY STATUS` (com versão) | `sendAck(cmd, key, tamanho, [01])` |
| Checksum | soma dos outros bytes mod 256 | igual | igual | igual |
| Quadro maior que o MTU | chega em pedaços (observado) | concatenar até `len + 4` (bandbridge) | igual | igual |
| Dado recebido precisa de ACK? | o app responde com FD (observado) | **sim**: "If the ACK is missing, the band stops sending" (bandbridge) | — | sempre envia ACK |

Leitura: o ACK do TF37 Pro **tem campo de versão** no offset 5, como descreve o
victorbillyph e ao contrário do ACK de 9 bytes do develmts/PBS163. Hipótese: é uma geração
mais nova do protocolo (versão 4), que acrescentou a versão ao ACK. A divisão de
`00 01 00` (status? auxiliar?) continua em aberto.

## 4. Tabela cruzada comando/chave

Coluna "Nossa lista" = [PROTOCOLO.md](PROTOCOLO.md) e [CAPTURAS.md](CAPTURAS.md).
Coluna "Podsfine" = nome do método/constante no `CommandUtils` (estático). As colunas
externas mostram o que **o mesmo par cmd/chave** significa em cada fonte, ou onde a mesma
**função** fica (marcado "função em …").

| cmd/chave | Nossa lista | Podsfine (estático) | HryFine/LaxasFit (externo) | Gadgetbridge | Situação |
|---|---|---|---|---|---|
| `F3/00` | info do aparelho ✓ | `getDeviceInfo` | **igual**: `F3/00` com payload `[lenVer][ver][lenProj][proj]` (develmts, bandbridge) | — | **concorda** |
| `00/00` | recursos ✓ | `getDeviceFeatures` | função em `19/00` (develmts, bandbridge, const.py `CMD_GET_FEATURE=25`) e na característica `2A28` | — | número diferente; layout dos bits ainda não comparado |
| `11/00` | bateria ✓ | `requestBattery` (`BATTERY_ID=17`) | `11` = lembrete de beber água (const.py `CMD_DRINK=17`) | — | **conflito de número** |
| `02/17` | nome + versão ✓ | `getDeviceNameVersion` (2, 23) | `02/17` (23 decimal) não aparece nas tabelas HryFine lidas; cuidado com a confusão decimal/hex: `02/11` (17 decimal) = chamada recebida | `02/11` = chamada | só no Podsfine |
| `02/08` | ajustar hora ✓ | `sendSystemTime` (2, 8) | função em `02/01` (todas as fontes); `02/08` = economia de energia (const.py) | `02/01`, byte 5 = `0x10` | **mesmo empacotamento de 4 bytes** (seção 5); chave diferente |
| `02/09` | restaurar fábrica | `sendRestoreFactory` (2, 9) | `02/09` = levantar o pulso para acender (const.py) | `02/09` = tela ao levantar | **conflito**; perigoso nos dois sentidos |
| `02/02`, `02/03` | esporte/saúde em tempo real ✓ | `setRealtimeSport` / `setRealtimeHealth` | `02/02` = alarmes; `02/03` = meta de passos (const.py) ou sedentário (PBS163) | `02/02` = alarmes | conflito; dentro da família HryFine as fontes também divergem |
| `02/01` | — | `setLanguage` | `02/01` = hora | `02/01` = hora | conflito |
| `02/05` | — | `setStepTarget` | `02/05` = sedentário | `02/05` = sedentário | conflito |
| `02/0D` | — | `set24Hour` (2, 13) | função em `02/1A` (PBS163, bandbridge, Ultra 3); `02/0D` = LED de FC | — | conflito |
| `02/10` | — | `setAlarm` (2, 16) | função em `02/02` | `02/02` (8 posições) | conflito |
| `02/12` | — | `setUnit` (2, 18) | `02/12` = **push de mensagem**; unidade em `02/1B` | `02/12` = mensagem | conflito |
| `02/14` | — | `sendSosInfo` (2, 20) | SOS em `02/1F` (Ultra 3) | — | conflito |
| `02/21` | — | `settingDrinkWater` (2, 33) | `02/21` = beber água (const.py, PBS163, Ultra 3) | — | **concorda** |
| `0A/00` | push de mensagem | `sendMsg` (`MSG_PUSH_ID=10`) | função em `02/12`: `[tipo, 00, 00, texto UTF-8]`, até 196 bytes | `02/12` | número diferente; comparar o layout do payload |
| `0A/01` | — | `sendDeleteMsg` | — | — | só no Podsfine |
| `06/00` | encontrar relógio | `findWatch` | função em `02/0B` (todas); `06` = **reset** | `02/0B` | **conflito perigoso** |
| `06/0F` | — | `stopFindWatch` (6, 15) | — | — | — |
| `06/01`–`06/03` | (câmera "07/xx" no pedido) | `sendCameraOpen/PhotoCap/Close` | câmera em `0C/03`, `0C/04` (relógio → app) | `0C/02`–`0C/04` | número diferente |
| `06/04`–`06/06` | — | pedir FC, PA, SpO2 | `02/0D`, `02/0E`, `02/1C` (PBS163) | `02/0D`, `02/0E`, `02/1C` | número diferente |
| `06/08` | alarmes (no pedido) | `getAlarm` (6, 8) — **leitura** | leitura de alarmes em `08/00` (develmts) | — | **concorda com a hipótese** (leitura) |
| `06/09` | — | **`sendShutDown`** (6, 9) | — | — | **não enviar**: desliga o relógio |
| `07/xx` | câmera (no pedido) | só relógio → app: `07/00` encontrar celular, `07/01` abrir câmera, `07/04` volume, `07/06`–`07/08` sincronizar música, `07/09` parar busca, `07/0B` pedir hora, `07/0C` parar busca do celular, `07/11`/`07/12` direção/luz da câmera | função em `0C` (relógio → app): `01` encontrar celular, `0A`–`0D` mídia | `0C` | número diferente; payload provável de 1 byte (`DF 00 06 … 0C 01 KEY 00 01 STATE`, PBS163) |
| `05/00`–`05/02` | clima (no pedido) | `sendWeatherInfo` (5, 0/1), `sendNewWeatherInfo` (5, 2) | clima em `02/13` (const.py), `02/1D` (PBS163, Ultra 3), 7 dias em `02/23`; `05` = **dados de esporte** | `02/20` | número diferente |
| `0B/01`, `0B/03`–`0B/05` | mostradores (no pedido) | `getFaceCode` (11, 1), `setWatchFace` (11, 3), `getCustomizeFaceInfo` (11, 4), `setCustomWatchFace` (11, 5) | **mesmas chaves** em `0F/01`, `0F/03`, `0F/04`, `0F/05`; resposta `0F/09` com contagem, códigos e limites (develmts) | — | **chaves concordam**, comando diferente (`0B` × `0F`) |
| `03/00`–`03/03` | — | dados de saúde: FC, PA, SpO2, temperatura (`handleHealthData`) | `05/04` FC, `05/05` PA, `05/0E` SpO2, `05/0D` temperatura | `05/04`, `05/05`, `05/0E` | número diferente |
| `04/00` | "possível FC" no byte `0x54` ✓ | **passos de hoje**: passos u32, distância u32, calorias u32 (`handleSportData`) | `05/0C` hoje: mesmo layout de 3×u32 (bandbridge) | `05/0C` | **correção**: ver seção 6 |
| `04/01`, `04/02` | — | passos por hora; sono | `05/02` passos em blocos de 15 min; `05/09` sono | `05/02`, `05/09` | número diferente; data de 2 bytes igual |
| `01/00`, `01/01` | (`01/02`, `01/03` em aberto) ✓ | `syncData` (tudo), `getTodayData` (hoje) | `05/01` sincronizar histórico; `05/0A` hoje (bandbridge); `01` = **OTA legado** | `05/01` (byte 5 = `0x10`) | número diferente |
| `08/00`, `08/01` | bind/unbind ✓ | `sendBindDevice`, `sendUnbindDevice` | bind `03/00` (ID ASCII de 8 caracteres), unbind `04/00` | unbind `04/00` | número diferente; **mesmo ID de 8 caracteres** |
| `0C/00` | em aberto ✓ | `getOtaUniqueCode` (`OTA_INFO_ID=12`) | `0C` = controle do aparelho | `0C` = botões | resolve item em aberto (seção 6) |
| `20/01`, `20/02` | info de OTA ✓ / iniciar OTA | `requestOTAInfo`, **`requestStartOTA`** | função em `13/01`, `13/02`+`01`; `20/00` = identificação do produto | `13/02` vazio = "info da pulseira" | número diferente; **`20/02` não enviar** |
| `14/00` | ID do produto | `getProductId` (`PRODUCT_ID=20`) | `14` = sedentário (const.py); produto em `20/00` | — | conflito |
| `09/00` | em aberto ✓ | `setTimeZone` (`TIME_ZONE_ID=9`) | `09/00` = ler configurações (develmts) | — | conflito; no TF37 é **escrita** |

## 5. Payloads documentados que valem para o TF37 Pro

Formatos que aparecem iguais nas fontes externas e no código do Podsfine. Mesmo layout,
mas o número do comando muda.

- **Hora (4 bytes, 32 bits):** ano−2000 (6 bits), mês (4), dia (5), hora (5), minuto (6),
  segundo (6), big-endian. Fontes: bandbridge `PROTOCOL.md`, `ble_protocol.py`
  (`sync_time`), Gadgetbridge (`setTime`, deslocamentos 26/22/17/12/6). O `sendSystemTime`
  do Podsfine faz as mesmas operações com chave `02/08`. Obs.: o `docs/PROTOCOL.md` do
  victorbillyph descreve um "Packed BCD" que **não bate** com o próprio código dele; vale
  o código.
- **Data em 2 bytes** (histórico): ano = 2000 + ((b0 & 0x7F) >> 1); mês =
  ((b0 & 1) << 3) + (b1 >> 5); dia = b1 & 0x1F. Fontes: bandbridge e `BleUtils.getDateBean`
  do Podsfine (igual).
- **Totais do dia:** passos u32, distância u32, calorias u32. bandbridge: "small cal;
  divide by 1000 for kcal". No Podsfine é `04/00`.
- **Identidade `F3/00`:** `[tamanho][versão][tamanho][projeto]`, comprimentos de 1 byte
  (develmts). Coerente com o `V1.8` / `Z16_TF37Pro_…` observado.
- **Push de mensagem (HryFine `02/12`):** `[tipo, 00, 00, texto UTF-8]`, no máximo 196
  bytes; tipos 0 = chamada, 1 = SMS, 2 = QQ, 3 = WeChat, 4 = Facebook, 5 = Twitter,
  6 = Skype, 7 = Line, 8 = WhatsApp, 9 = KakaoTalk, 10 = Instagram (PBS163; a numeração
  do victorbillyph tem pequenas diferenças). PBS163 relata, no aparelho dele, que `0x00`
  corta o texto e que cabem cerca de 3 linhas de 13–14 caracteres. **Hipótese** para o
  `0A/00` do Podsfine: comparar com `sendMsg`/`sendMsgNewProtocol` antes de supor o mesmo
  layout.
- **Mostradores:** resposta HryFine `0F/09` (develmts): contagem (1 byte), código ativo
  (8 bytes), N códigos de 8 bytes, limite de fundo (4 bytes BE), limite de mostrador
  (4 bytes BE). Podsfine usa as mesmas chaves (1, 3, 4, 5) no comando `0B`.
- **Contatos e mostradores por canal de arquivo (Ultra 3):** pelo `FF00/FF02`, com
  cabeçalho `D5 …` e dados `D6 [token 16 bytes] …`. O TF37 Pro **não tem** `FF00`; no
  Podsfine o equivalente provável é o canal `1106` (hipótese). Não testar: é canal de
  escrita em flash.
- **Mapa de recursos:** develmts documenta 27 bytes (`2A28`/`19/00`) com dezenas de bits
  (`isOTA`, `isSupport7Weather`, `supportMacXor55`…). O bloco `00/00` do TF37 Pro tem 41
  bytes e começa com `01 ff 01 02`, então o layout **não** é o mesmo byte a byte. Comparar
  com o `readFeatures` do `NotifyWriteUtils` do Podsfine.

## 6. Correções e extensões à nossa lista

Tudo nesta seção é **análise estática local**, aplicada a quadros **observados**. Nenhum
comando foi enviado.

1. **`04/00` = passos de hoje, não frequência cardíaca.** O payload observado
   `00000000 00000000 00000054` dá passos 0, distância 0, calorias 84 (0x54) no layout
   3×u32 do `handleSportData`, o mesmo do bandbridge. Corrigir a hipótese "último byte =
   FC" em [CAPTURAS.md](CAPTURAS.md).
2. **`0C/00` = pedido do código único de OTA** (`getOtaUniqueCode`). Pelo victorbillyph
   (externo), esse código vai como parâmetro `unique_code` para
   `ota.lianhezhuli.com/api/hry/get_update`; a requisição é assinada com MD5 sobre os
   parâmetros ordenados e uma constante do app. **Não reproduzi a constante nem o appid
   aqui**: consultar a fonte, se for preciso.
3. **`18/06` = envio de GPS** (`sendGPS`, `NAVIGATION_ID=24`).
4. **`04/19` = `sendGomoreKey` (4, 25).** A string base64 de ~60 caracteres é,
   provavelmente, uma chave de licença do algoritmo de saúde GoMore (**hipótese** pelo
   nome do método). Mantenha fora da documentação.
5. **`09/00` = ajustar fuso horário** (`setTimeZone`): é escrita, não leitura.
6. **`27/06` = `requestFmMtu` (39, 6).** `02/1F` = pedir tempo de tela; `02/3E` = lembrete
   de exercício; `02/40` = lembrete de leitura; `02/42` = lembrete de viagem; `02/47` =
   número de alarmes; `03/08` = pedir limites de FC (os nomes de método são pedidos
   `request…`; as respostas podem chegar com outra chave).
7. **Comandos novos que mudam estado e precisam de cuidado:** `06/09` desliga o relógio
   (`sendShutDown`); `02/09` restaura a fábrica; `08/01` desvincula; `20/02` entra em OTA;
   `13/xx` (no Podsfine: lembretes de evento) mexe na agenda.
8. **Leituras candidatas (estático, não testadas):** `06/08` alarmes; `02/06`
   configurações; `0B/01` mostradores; `13/00` suporte a lembrete de evento; `02/47`
   número de alarmes. Antes de usar, confirmar no `NotifyWriteUtils` qual chave volta e se
   o relógio grava alguma coisa.

## 7. Gadgetbridge

- **Classe:** `LaxasFitCoordinator`, que reconhece só nomes `^(Q11.*)$`; o TF37 Pro
  (`TF37Pro`) **não** seria detectado. Também não usa `18AC`: só o canal `6E400001…9F`.
  Status na página oficial: Q11 "partially supported", e "might need the official app to
  properly initialize the device". Adicionado no PR #5774.
- **O que implementa** (`LaxasFitDeviceSupport`): data e hora (`02/01`, tipo `0x10`),
  bateria, encontrar pulseira (`02/0B`) e celular, chamada (`02/11`) e notificação
  (`02/12`), 8 alarmes (`02/02`), idioma (`02/15`), perfil (`02/04`), meta de passos
  (`02/03`), vibração (`02/08`), interruptor de notificações (`02/07`), braço de uso
  (`02/06`), tela ao levantar (`02/09`), sedentário (`02/05`), não perturbe (`02/14`),
  horário de sono (`02/0F`), clima (`02/20`); sincroniza passos, FC, PA, SpO2, sono e
  totais (`05/xx`); unbind `04/00` e reset `0D/01`; informação de hardware `0A/10` (duas
  strings, "LED" e "GSensor"); info da pulseira `13/02`.
- **Inicialização:** escreve vários comandos (`02/0A`, `0A/0A`, `0A/0C`, `02/FF`…) e
  sincroniza a hora. Isso **não é** uma sequência só de leitura, e os números não valem
  para o TF37 Pro.
- **Nenhuma outra classe do Gadgetbridge** com DF/FD ou `18AC` foi encontrada (a busca de
  código no Codeberg não foi feita). Um driver para o TF37 Pro seria uma classe nova, que
  reaproveitaria a parte de quadros/checksum/ACK e trocaria a tabela inteira.
- O arquivo de constantes credita Petr Vaněk (2021–2024), autor do suporte FitPro. Os
  nomes de app "LaxasFit"/"LaxaFit Pro" cobrem pelo menos três protocolos diferentes
  (DF/FD, `CD` FitPro, `AB … FF`). O nome do app não identifica o protocolo.

## 8. Bluetrum AB569X

### Fatos com fonte

- **Autoidentificação (observado):** a resposta `20/01` do TF37 Pro traz `AB569X`, e o
  APK contém `com.bluetrum.abpartool`.
- **LaxasFit/HryFine usam Bluetrum (externo):** o victorbillyph cita "Bluetrum AB5610" e
  chama o OTA `18A8/2AA8/2AA9` de "Bluetrum CYS5610". É a fonte pública mais próxima de
  explicar o **`Cus5610`** do Podsfine: o "5610" parece ser o número do chip Bluetrum. É
  inferência sobre outro aparelho; não prova o chip do TF37 Pro.
- **Família AB561x = "NOVA"** na tabela de nomes-código do kagaimiq. **AB569x não aparece
  nessa tabela** (lista: CRWN AB530x, EPIC AB532x, JAZZ AB536x, NOVA AB561x, PRAO AB560x,
  SMAT AB563x, EAGR AB568x, ZOOM AB571x…).
- **AB5691/AB5691F em relógios:** só em fichas de vendedores (ex.:
  [Global Sources](https://p.globalsources.com/IMAGES/PDT/SPEC/231/K1231818231.pdf),
  [HKTDC](https://www.hktdc.com/event/hkelectronicsfairse/sc/product/1Z03MMPUT)), com
  versões de Bluetooth contraditórias (5.1/5.3/5.4) e flash externa de 128 Mbit em alguns
  modelos. **Nenhuma folha de dados pública do AB569x foi encontrada.**
- **Modo de download UART (kagaimiq, testado só em AB560x/PRAO):** UART de 3,3 V com TX e
  RX unidos por um resistor de ~200 Ω (um fio só), ligado ao pino de download: em geral
  `PB3` (muitas vezes junto com o USB D+), às vezes `PA7`, e no AB560x também o `VUSB`. A
  ferramenta lê/escreve/apaga a flash SPI NOR interna, informa o ID e o tamanho da flash e
  a "code key". O próprio autor avisa que não é garantido em outros chips ("the code blob
  being a biggest concern").
- **Firmware embaralhado:** o kagaimiq descreve imagens com cabeçalho/código de boot,
  `app.bin` e `res.bin`, com uma "code key" para desembaralhar o código. No AB5682B o
  atc1441 diz que a chave tem 4 bytes e fica no **eFuse**. Logo, um dump cru não é
  legível sem essa chave.
- **AB5682 (atc1441):** RAM 0x10000–0x37C00, ROM 0x80000–0x98000, flash interna de 2 MB
  mapeada em 0x10000000, UART de depuração de um fio (recomenda no máximo 115200 baud com
  o circuito simples). No A9 Pro o `PB3` sai no pino CC do USB-C.
- **OTA da Bluetrum por BLE (milcorix, outro relógio Bluetrum):** biblioteca
  `com.bluetrum.fota` ("ABOta"); serviços `FF12` (FOTA, só em modo OTA) e `FE59`
  (bootloader de recuperação); comandos `0x91` GET_INFO, `0x92` GET_INFO_ALL, `0xA0` START
  (endereço + tamanho), `0x20` SEND_DATA (≤ 512 bytes), respostas `0x90 <estado>`; "no
  container, no signatures on the app side". O autor relata que um relógio deixado em
  modo OTA sem dados "usually reboots back after a disconnect + timeout".
- **Material oficial** (GitHub/Gitee da Bluetrum) cobre só o AB32VG1.

### Hipóteses (não comprovadas)

- O `1106/1107/1108` ("Cus5610") do TF37 Pro seria o OTA Bluetrum desta família, talvez
  com o mesmo protocolo ABOta ou parecido, mas em UUIDs remapeados. Verificar no código de
  OTA do Podsfine (`Cus5610OTAUtils` e o pacote `com.bluetrum`), **sem enviar nada**.
- `SCANBYTES_DFU = ":56:10"` (o anúncio em modo de atualização termina com `56 10`) reforça
  a ligação "5610" = família do chip/bootloader.
- Se o AB569x seguir o padrão dos irmãos, o pino de download seria `PB3`/USB D+ ou
  `VUSB`. O TF37 Pro carrega por contatos; se um deles for `VUSB`, talvez dê para entrar
  no modo UART sem abrir o relógio. **Pura especulação**: só o AB560x tem `VUSB`
  documentado.

### O que seria preciso para fazer dump ou regravar, e os riscos

1. Identificar o chip fisicamente (marcação; ver a regra do kagaimiq: os 4 dígitos
   hexadecimais antes da letra final são o modelo em decimal, como `15E2F` → AB5602F).
2. Achar o pino de download, ligar a UART de um fio a 3,3 V e verificar se a ferramenta
   sincroniza. Essa ferramenta nunca foi testada em AB569x.
3. Ler a flash inteira (só leitura) e guardar o backup antes de qualquer outra coisa.
4. Para entender o conteúdo, obter a code key (provavelmente no eFuse).

Riscos: abrir o relógio (bateria LiPo pequena, cola, cabos flex, perda da vedação);
3,3 V/5 V errado queima o pino; escrita ou apagamento errado deixa o relógio sem boot, e a
recuperação depende do modo UART da ROM continuar acessível; o pacote de OTA por BLE
(`20/02` + `1108`) não tem reversão conhecida. O repositório do atc1441 redistribui SDK e
ferramenta vazados: não baixar (licença e confiança desconhecidas).

## 9. FCC 2BD94-TF37PRO

Fonte: [fccid.io](https://fccid.io/2BD94-TF37PRO), acessado em 2026-11-12. O fcc.report e
os anexos individuais do fccid.io responderam HTTP 403, e o site da FCC recusou o download
direto dos anexos para cliente automatizado. **Os PDFs não foram lidos.**

- Requerente: Shenzhen Hongsheng Wang Technology Co., Ltd; produto "Smart Bracelet",
  modelo TF37PRO; concessão em 2026-08-21; Parte 15C; 2402–2480 MHz.
- **Duas concessões:** "Digital Transmission System" (0,0037 W) e "Spread Spectrum
  Transmitter" (0,0038 W). Hipótese: uma é BLE e a outra BR/EDR (Bluetooth clássico),
  o que combinaria com a família HryFine que tem endereço clássico derivado (`MAC XOR
  0x55`, bit `supportMacXor55`). Confirmar no relatório de teste.
- Anexos públicos: fotos internas e externas, manual, etiqueta, fotos do ensaio,
  relatório de antena, dois relatórios de teste, exposição a RF.
- **Diagrama de blocos, esquemas e descrição operacional:** só metadados, sem URL; há
  pedido de confidencialidade de curto e longo prazo. Hipótese: um item de curto prazo
  pode virar público depois do prazo do pedido, então vale olhar de novo.

## 10. UUID `18AC`/`2AAC`/`2AAD` e "Cus5610"

Nenhum repositório, documento ou página pública encontrado cita esses UUIDs ou a string
"Cus5610". As únicas referências a "5610" são as do victorbillyph ("AB5610", "CYS5610") e
o post do Reddit "BOOD/Cus5610" que o develmts registra como pista não verificada (o
Reddit não abriu nesta pesquisa).

## 11. O que vale testar a seguir (baixo risco)

Em ordem, sem enviar nada ao relógio até o item 6:

1. **Decodificar o `02/08` já capturado** com o empacotamento 6/4/5/5/6/6 bits e comparar
   com o horário da captura. Confirma o formato offline.
2. **Reler os `04/00` capturados** como passos/distância/calorias (3×u32) e corrigir
   CAPTURAS.md. Procurar `03/00` (FC) nas capturas da sessão de medição.
3. **Ensinar o `tools/dfdecode.py`** a mostrar os nomes do Podsfine (tabela da seção 4):
   `0C/00`, `18/06`, `04/19`, `09/00`, `27/06`… Os nomes saem do código do app; nada vai
   para o relógio.
4. **Análise estática do OTA** (`Cus5610OTAUtils`, pacote `com.bluetrum`): ver se usa os
   opcodes ABOta (`91/92/A0/20/90`) e a magia de identificação descrita pelo milcorix.
   Só ler código.
5. **Comparar o bloco de recursos `00/00` de 41 bytes** com o `readFeatures` do Podsfine
   e com o mapa de 27 bytes do develmts.
6. **Única leitura nova pelo BLE, se decidido:** `06/08` (alarmes) ou `0B/01`
   (mostradores), depois de confirmar no `NotifyWriteUtils` que são só leitura, com
   comando, origem e efeito mostrados antes e o relógio carregado. Responder com ACK todo
   quadro DF recebido; o bandbridge diz que sem ACK a pulseira para de enviar.
7. **Se as notificações não chegarem no BlueZ**, usar `AcquireNotify` em vez de
   `StartNotify` (milcorix; já registrado em REPOS_RELACIONADOS.md).
8. **FCC por um navegador comum (pessoa, não script):** abrir as fotos internas e procurar
   a marcação do chip (logo "AB"/"BT" e o código de 5 caracteres), contatos de teste
   (`PB3`, `DP`, `TX`, `VBAT`) e a flash externa. Ler o relatório de teste para ver se a
   segunda concessão é BR/EDR. Rever a carta de confidencialidade para saber quando o
   diagrama de blocos fica público.
9. **Não fazer:** nada que use a tabela HryFine (`06`, `07`, `0A`, `0B`, `0D`, `01`
   significam reset, teste de fábrica, leitura de flash e afins); `20/02`; escrita em
   `1108`; `06/09`; `02/09`; abrir o relógio enquanto o chip não for identificado pelas
   fotos da FCC.

## 12. Limitações desta pesquisa

- A API do GitHub sem login esgotou o limite durante a pesquisa. Alguns repositórios
  (`sir3ns/hryfine_D115_hack`, `MSMUARDH/HryFine`) só tiveram o README ou nada lido.
- Sem busca de código no GitHub nem no Codeberg. Com `gh` autenticado, repetir as
  consultas de [REPOS_RELACIONADOS.md](REPOS_RELACIONADOS.md) e acrescentar
  `"Cus5610"`, `"AB569"` e `"MSG_PUSH_ID"`.
- Reddit e os anexos da FCC não foram lidos.
- As tabelas externas descrevem **outros aparelhos e outras versões de app**. As
  divergências internas da família HryFine (por exemplo `02/03` = meta de passos ou
  sedentário) mostram que nem entre elas os números são estáveis.
