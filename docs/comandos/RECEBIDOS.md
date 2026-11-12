# Podsfine 1.2.3: quadros que vêm do relógio (TF37 Pro)

Análise estática de `ble/utils/NotifyWriteUtils.java`, `ble/utils/AckPackageConfigUtils.java`, `ble/infoutils/BleDataUtils.java`, `ble/infoutils/SleepUtils.java` e `ble/utils/CommandUtils.java` (este só para ligar as respostas aos pedidos). Os quadros de `observados.txt` foram usados para conferir os layouts.

Convenções:
- `pN` é o byte N do payload. O byte do quadro correspondente é `N+9`, porque o código Java indexa o quadro inteiro.
- Multibyte é big-endian, salvo indicação contrária (`LE`).
- Ficaram de fora deste documento, por privacidade: as coordenadas (18/06), a chave/token GoMore (04/19), o código de bind (08/00 do app), o ID do 04/18, os valores de perfil (02/04 e p0..p3 do 02/06) e o valor do fuso horário.
- **hipótese** = inferência que o código não confirma.

Arquivos gerados:
- `recebidos.json`: 101 entradas, uma por cmd/key recebido.
- `recursos.json`: mapa byte/bit dos recursos, com `payload_offset`.

---

## 1. Recepção, remontagem, checksum e ACK

Os dados chegam pela característica notify `0x2AAC` (serviço `0x18AC`) e passam por `onChange` → `dataHandle` (`NotifyWriteUtils.java:249`).

### Remontagem (`:252-277`)
1. **Com o buffer vazio** (`receiveBytes == null`):
   - Se o 1º byte é `0xDF`, lê `LEN = (b1<<8)|b2` e aloca um buffer de `LEN+4` bytes. `LEN` conta os bytes depois de `DF LEN_H LEN_L SUM`. Copia o fragmento e guarda `destPos`.
   - Se o 1º byte é `0xFD`, é um ACK: vai para `handleAck` sem remontagem.
   - Qualquer outro 1º byte é ignorado.
2. **Com o buffer em andamento**, cada notificação seguinte é concatenada em `destPos`. Se ultrapassar o tamanho, não copia e o quadro nunca fecha. Nada limpa esse estado, a não ser `resetAll`.
3. **Quando `destPos == tamanho`**, o quadro está completo e é processado.

### Checksum (`:280-296`)
Soma de todos os bytes exceto o índice 3, `& 0xFF`, comparada com o byte 3. É o mesmo cálculo que o app usa ao enviar (`addSumCheck`, `:2056`).

### ACK que o app envia (`AckPackageConfigUtils.configAck` + `addSumCheck`)
`FD 00 06 SUM CMD VER KEY 00 01 STATUS`, onde `STATUS` é `00` para OK e `03` para checksum inválido. É o mesmo formato de 10 bytes que o relógio usa.
- O app manda ACK de **todo** quadro DF válido, inclusive das respostas aos próprios pedidos. O ACK sai **antes** do switch (`:298`).
- Com checksum inválido, manda o NACK `03` e reinicia o timeout de 100 s (`:1781-1782`). Nesse caso o `receiveBytes` **não** é zerado e `destPos` volta a 0. Na prática o app espera que o relógio retransmita o mesmo quadro no mesmo buffer.

### ACK que o relógio envia (`handleAck`, `:1849-1993`)
- Usa `bArr[4]` (cmd), `bArr[6]` (key) e `bArr[9]` (status, 0 = OK).
- O envio do app é **stop-and-wait**: um DF só sai depois do ACK do anterior ou de 100 s (`TIMEOUT_RUN`). Isso vale enquanto `MainActivity` está viva.
- Quadros com mais de 20 bytes são enviados em pedaços de 20, com 20 ms entre eles.

### DEVICE_VERSION
Só a resposta 00/00 atualiza `DEVICE_VERSION`, com o byte 5 do quadro (`:305`). Esse valor vai no byte VER de todos os comandos e ACKs seguintes. Neste relógio é **4**. Com `VER>=3` o app manda o fuso (09/00) antes da hora, e com `VER>=2` faz o bind por código. O valor também muda a leitura do byte 10 dos recursos.

### Peculiaridades (para não replicar)
- **Fim do `case 7`** (eventos, `:1175`): termina em `return` sem `receiveBytes = null`. O buffer antigo fica preso, e o próximo fragmento é copiado na posição 0 dele. **hipótese**: é um artefato do JADX; um cliente próprio deve sempre zerar o buffer.
- **Ramo genérico de 02/xx** (`:995-1020`): qualquer 02/xx não tratado cai nele. Durante a sincronização, isso dispara a lógica de idioma e `syncProcess`.
- **0xF3 (getDeviceInfo)**: o app envia o pedido, mas não existe `case` para a resposta. Ela recebe ACK e é descartada.

### Handshake reconstruído (estático) e conferido com a captura
Cada passo mostra o que dispara o envio seguinte:

1. O relógio manda 11/06 espontaneamente.
2. O app manda 00/00 e o relógio responde com os recursos.
3. O app manda 11/00 e o relógio responde a bateria.
4. Como `deviceInfo=1`, o app manda 02/17; o relógio responde versão e projeto.
5. O app faz o bind com 08/00 (código); o relógio responde 08/00 com `p0=02`.
6. Como `supportFmMtu=1`, o app manda 27/06; o relógio responde `0064`.
7. O relógio manda 20/01.
8. Como `supportUnitSetting=1`, o app manda 02/12 (unidades).
9. O ACK de 02/12 com `VER>=3` faz o app mandar 09/00 (fuso).
10. O ACK de 09 faz o app mandar 02/08 (hora).
11. O ACK de 02/08 faz o app mandar 02/04 (perfil).
12. O ACK de 02/04 faz o app mandar 02/05 (meta de passos).
13. O ACK de 02/05 faz o app mandar 02/06; o relógio responde as configurações.
14. Como `supportWatchFaceSet=0`, o app manda 01/00 (sync).
15. O relógio despeja o histórico: 01/02, 04/01, 04/18, 01/03.
16. O fim da sincronização (01/03) dispara, conforme os recursos: 03/08, 02/47, 02/3E, 02/40, 02/42, 02/1F e 11/00.
17. O 04/18 faz o app buscar a chave GoMore no servidor e enviar 04/19.

Toda a cadeia bate com a ordem observada, o que valida o mapa de recursos abaixo. O 18/06 (`sendGPS`: hora compactada + latitude/longitude) e o par 02/02 → ACK → 02/03 vêm de outras telas.

---

## 2. Tabela dos recebidos (resumo; detalhes em `recebidos.json`)

| cmd/key | Nome | Gatilho | Ação do app |
|---|---|---|---|
| FD (ACK) | confirmação | qualquer DF do app | libera a fila e encadeia a sincronização |
| 00/00 | recursos | 00/00 | DeviceFunEvent; define VER; 02/17, bind, 27/06 |
| 01/02 | início da sincronização | 01/00 | flag de limpeza |
| 01/03 | fim da sincronização | – | pede bateria, lembretes, alarmes, FC alta/baixa… |
| 02/06 | configurações | 02/06 | DeviceSettingInfo; idioma; 01/00 ou 0B/01 |
| 02/17 | versão + projeto | 02/17 | grava versão e projeto; bind 08/00 |
| 02/33, 35, 38, 3C, 3E, 40, 42, 46, 47, 48, 4A | lembretes, contadores, tempo de tela | 02/xx | beans |
| 03/00, 01, 02, 03, 07, 32, 36 | histórico de FC, PA, SpO2, temperatura, estresse, VFC, MeiTuo | sync/medição | grava no banco |
| 03/09 | limiares de FC alta/baixa | 03/08 | HrAutoTestBean |
| 03/0F, 12, 15, 29, 31 | estado da medição (FC, SpO2, PA, estresse, temperatura) | espontâneo | UI |
| 03/2A, 03/2F | valor em tempo real / temperatura instantânea | espontâneo | UI |
| 04/00, 01, 02, 04, 10 | passos de hoje, passos por hora, sono antigo, resumo de sono, sono 5610 | sync | grava |
| 04/0B, 0F, 11 | treinos e esporte vinculado | sync/espontâneo | grava e envia ao servidor |
| 04/0C, 0D, 0E | esportes suportados, ACK, estado | – | config |
| 04/18 | ID para a chave GoMore | sync | rede → 04/19 |
| 04/1A, 1B, 1C | trilha GPS (início, pontos, fim) | sync | grava a trilha |
| 06/08 | alarmes | pedido | AlarmBean |
| 07/xx | eventos (câmera, música, encontrar celular, hora…) | espontâneo | ver §4 |
| 08/00 | resultado do bind | 08/00 | 1/2 = ok, 3 = desconecta |
| 0B/05, 06, 09 | mostradores | 0B/01, 0B/04 | config |
| 0C/00, 01, 02, 03 | OTA (código, produto, partições, status) | 0C/xx | OTA |
| 0D | QR | – | QrInfoBean |
| 0F | MAC BT clássico | – | bond |
| 11/00, 01, 03, 05, 06 | bateria, economia, carregamento, limiar baixo | pedido/espontâneo | AppConfig |
| 13/00, 01 | lembretes de evento | 13/xx | lista |
| 14 | código cliente-produto | 14/00 | AppConfig |
| 19/00 | menstrual | 19/00 | reenvia |
| 20/01, 02 | info e status da OTA nova | 20/xx | otaUniqueCode |
| 22 | beber água | 22/00 | DrinkWaterBean |
| 25, 26, 27/00-04 | fone TWS / brilho / volume | 25/xx | beans |
| 27/06 | MTU do firmware | 27/06 | requestMtu |
| 2B, 2C, 2D, 2E, 30, 31, 32, 35, 36, 37, 3A, 3B, 1E | vídeo, mostrador em vídeo, SD, álbum, IA, crachá, Opus, barragem | – | utilitários |
| F3/00 | info do dispositivo | F3/00 | **sem parser** |

---

## 3. Layouts detalhados

### Data de 2 bytes (`BleUtils.getDateBean`)
`ano = (b0 & 0x7F) >> 1` (+2000); `mês = ((b0 & 1) << 3) | (b1 >> 5)`; `dia = b1 & 0x1F`. São 6 bits de ano, 4 de mês e 5 de dia (`encodeDate` faz o inverso).

Exemplo: `35 6B` = **2026-11-11**.

### Hora que o app envia (02/08; igual aos 4 primeiros bytes de 18/06)
32 bits: `ano-2000 (6) | mês (4) | dia (5) | hora (5) | min (6) | seg (6)`.

### Passos e calorias (cmd 04)
- **04/00, hoje**: `p0..3` passos, `p4..7` distância, `p8..11` calorias, cada um u32 BE. O app descarta valores absurdos (passos > 2,4 M, distância > 1,92 M, calorias > 44,64 M). **hipótese**: distância em metros; calorias em cal (kcal×1000), dado que 04/11 divide calorias por 1000.
- **04/01, por hora**: `data(2) | nHoras(2) | nHoras × [passos u32, dist u32, cal u32]`. A hora é o índice do registro.

### Sono
- **04/04, resumo**: `data | n | n × [início u16, fim u16, profundo, leve, acordado]`, tudo em minutos.
- **04/10, algoritmo 5610**: `data | nFases | nCochilos | nFases × [início u16, fim u16, modo] | nCochilos × [início, fim]`.
  - Os horários são minutos do dia; se `fim <= início`, soma 1440.
  - Modos: 1 = leve, 2 = profundo, 3 = REM, 4 = ignorado nas somas, outros = acordado. Cochilos recebem modo 10000.
  - Gera `DaySleepStatisticsBean`. Os bits `rem2Light` dos recursos tratam REM como leve na UI.
- **04/02, formato antigo**: registros de 4 bytes `[min u16][?][modo]`. O cálculo de duração do app parece errado.

### FC, PA, SpO2, VFC e temperatura (cmd 03)
Todos usam `data(2) | n(2) | n × 8 bytes`, com cada registro assim:

| offset | campo |
|---|---|
| 0..3 | segundos desde 0h (u32) |
| 4 | modo |
| 5 | automático (==1) |
| 6 | sistólica (PA) / inteiro (temperatura) |
| 7 | valor: FC bpm (≥30), diastólica, SpO2 % (≤100), VFC ms, decimal (temperatura) |

- **Temperatura**: o valor é a string `"inteiro.decimal"`, então 36,5 é enviado como `24 05`.
- **Estresse (03/07)**: registros de 3 bytes `[min do dia u16][valor]`.
- **03/09, limiares**: `[altaOn, máx, mín, passo, altaAtual, baixaOn, máx, mín, passo, baixaAtual]`. As listas de opções são geradas de `mín` a `máx` com o `passo`.
- **Estado da medição** (03/0F, 12, 15, 29, 31): status 0 = parado, 1 = medindo, 2 = falhou. O app inicia medições com 06/04 (FC) e comandos irmãos.
- **03/2A**: `[tipo 1=FC | 2=SpO2][valor]`, em tempo real.

### Treinos e GPS
- **04/0B**: `data | início u32 | duração u32 s | modo | ? | 5 × FC | cal u32 | dist u32 | passos u32`.
- **04/11 e 04/0F**: `data | início s desde 0h | duração | modo | flags u16 | FC | cal | dist | passos`.
  - `flags u16`: bit3 passos, bit2 distância, bit1 calorias, bit0 FC. Só os campos marcados aparecem, nessa ordem.
  - 04/11 divide calorias por 1000 e exige duração ≥ 60 s. Com `supportIntervalHeartRate`, traz ainda `flags2` e zonas de FC.
- **04/1A**: início da trilha, `tipo | data | início`.
- **04/1B**: `n | n × [lon u32, lat u32]`.
  - bit31 = sinal negativo.
  - O valor está em formato graus/minutos: `int(v/1e7) + (v%1e7)/1e5/60`.
  - **hipótese**: longitude primeiro, deduzido do construtor `LatLng(f2, f)`.
- **04/1C**: fim da trilha.

### Configurações (02/06)
**Cabeçalho**

| bytes | conteúdo |
|---|---|
| p0..p10 | não lidos pelo app (**hipótese** abaixo) |
| p11 | levantar-pulso |
| p12 | idioma atual |
| p13..p16 | bitmap de idiomas, MSB = índice 0 (5 bytes se `language5Bytes`) |
| byte seguinte | realtimeSport |
| byte seguinte | realtimeHealth |

Hipótese para p0..p10, por cruzamento com o 02/04 e o 02/05 enviados logo antes: p0 sexo, p1 altura, p2 peso, p3 idade, p6..p9 meta de passos u32. p4, p5 e p10 seguem desconhecidos.

**TLVs**

| tag | conteúdo |
|---|---|
| 04 | sono `[on, ini u16 min, fim u16 min]` |
| 05 | no pulso |
| 06, 11, 19, 1A, 1C, 1D | medição automática (FC, SpO2, estresse, PA, temperatura, VFC): `[on, ?, ciclo u16 min, ini u16, fim u16]` |
| 07 | sedentário `[dnd, on, limiar u16, tempo, hora ini, hora fim, repetição]` |
| 08 | 24 h |
| 09 | carrossel |
| 0A | 11 bytes, mais 9 de bitmap de apps (pares suporte/push: KakaoTalk, YouTube, Messenger, Gmail / Snapchat, TikTok, Pinterest, GoogleChat / LinkedIn, Tumblr, Flickr, VK / Zalo, DingTalk, Weibo, Alipay / Teams, Telegram, Outlook, Outros) |
| 0B | levantar-pulso, janela de horário |
| 0C | DND `[on, ini, fim]` |
| 0D | unidades `[distância, temperatura]` |
| 0E | perfil |
| 10 | tempo de tela |
| 12-14 | fone |
| 15 | flags de "HealthyShape" |
| 1B | sono automático |
| 0F, 16, 17, 18 | pulados |

Uma tag desconhecida encerra a leitura.

### Alarmes (06/08)
- `p0 = (máx << 4) | qtd`; `p1 = (modos de toque << 4) | toques`.
- Registros de 5 bytes: `hora, min, repetição, (modo << 4) | toque, (ligado << 6) | (ação << 4) | índice`.

### Identidade, OTA e bateria
- **02/17**: `len | versão | len | projeto` (ASCII).
- **20/01**: `4 bytes ? | len | versão | len | chip`. O `otaUniqueCode` é o hex do payload inteiro.
- **0C/00**: código único; o app então pede 0C/01 (produto).
- **0C/02**: pares por partição; `FFFF` = não atualizar.
- **11/00 e 11/01**: % de bateria no **último** byte.
- **11/06**: `1` → limiar 20 %, outro valor → 10 %.

### Unidades
O app manda 02/12 `[distância, temperatura]` com 0 = métrico/°C, mapeado de `institution==1` e `temp_unit==1`. O relógio as devolve na tag 0D do 02/06.

---

## 4. Eventos espontâneos (relógio → app)

| cmd/key | Evento | O app faz |
|---|---|---|
| 07/00 | encontrar celular | toca/vibra (`FindPhoneEvent start`) |
| 07/0C | parar de procurar o celular | `FindPhoneEvent stop` |
| 07/01 | abrir a câmera remota | abre a câmera (debounce de 1 s) |
| 07/02 | disparar foto | broadcast `takePhotoAction` |
| 07/03 | sair da câmera | fecha a câmera |
| 07/11 | trocar câmera frontal/traseira | `CameraDirEvent(p0)` |
| 07/12 | flash | `CameraLightEvent(p0)` |
| 07/04 | tecla de mídia | p0: `20` vol+, `24` vol−, `40` anterior, `42` próxima, `80` pausa, `81` play/pause |
| 07/06 | relógio quer metadados de música | liga o modo e **responde 07/07** (estado, volume, volume máx., nome da faixa) |
| 07/07 | pedido de estado de música | responde 07/07 |
| 07/08 | fim do modo de música | desliga o modo |
| 07/09 | parar a busca pelo relógio | `EVENT_STOP_FIND_DEV` |
| 07/0B | **pedido de hora** | **responde 02/08** com a hora atual |
| 07/13 | reautenticar a IA | chamada de rede, se o modelo for XiaoXiang |
| 03/0F…31, 03/2A, 03/2F | estado e valores de medição | UI |
| 04/0E, 04/0F | estado e dados de esporte vinculado | UI e banco |
| 11/01, 11/05, 11/06 | bateria, carregamento, limiar baixo | AppConfig |
| 0B/06 | mostrador personalizado atualizado | evento |
| 35/00 | áudio Opus da voz | `OpusByteEvent` |
| 20/02, 0C/03 | status da OTA | eventos |

---

## 5. Mapa de recursos (00/00)

A tabela completa está em `recursos.json` (byte do quadro, `payload_offset`, máscara, condição, campo e significado). Pontos que exigem atenção:

- **Bytes inteiros, não bits**: 9, 11 e 13 (`==1`), e 12, 14 e 20 (valores).
- **Campos multibit**: 15 (nibble baixo = plataforma), 17 (5 bits de resolução), 27 (tipo / formato) e 31 (bits 6..3 = estilo DIY).
- **Byte 10 depende de VER**: com VER 0 é o valor inteiro; com VER ≥ 1, bit1 → `gSenorFun` 2 ou 1, e bit7 → configuração de sono.
- **Bits invertidos** (bit = 0 significa "sim"): 22.7 `gluRecord`, 31.1 `handBright`, 39.0 `supportHeadSet`, 40.3 `supportWakeonTouch`, 49.7 `supportEleShowDIY`.
- **Bit compartilhado**: 41.5 liga tanto "olhar ao longe" quanto "lembrete de exercício".
- **Condicionais**: os bits 24.4..2 só valem com `codeFormat` 8/9. 24.3 também liga `is5610Type`.
- Os bytes 32 e 33 não são lidos.
- Cada bloco só é lido se o quadro tiver o tamanho mínimo; sem ele, o app assume `false`.

### Aplicação ao 00/00 observado (41 bytes de payload, quadro de 50, VER=4)
O byte 50 do quadro falta, então os campos `supportRequestHRV`, `supportHRVMeasurement`, `supportMeiTuo` e `supportSimulateECG` ficam `false`.

**O que dá para concluir com segurança:**
- **Base**: `01` tem G-sensor; `ff` (com VER 4) → `gSenorFun=2` e configuração de sono suportada; `01` tem FC; `02` → `hrFun=2`; sem GPS.
- **Byte 15 = `ca`**: sedentário, 24 h, **plataforma 10**. Plataforma 10 não pede MTU 410. Como `supportFmMtu=1`, o MTU vem do 27/06.
- **Byte 16 = `16`**: formato 1, protocolo novo de notificações, alarmes. **Sem** bit de OTA (16.6) e sem QR.
- **Byte 17 = `00`**: **não** suporta troca, personalização nem envio de mostradores. Por isso a sincronização vai direto para 01/00.
- **Byte 18 = `48`**: unidades e notificações de ~20 apps; idiomas em 4 bytes; sem HID e sem DND.
- **Byte 19 = `30`**: bateria por comando (11/00).
- **Byte 20 = `08`**: codeFormat 8, que habilita o byte 24.
- **Byte 21 = `01`**: deviceInfo (02/17).
- **Byte 24 = `5b`**: notificações BLE, RGB565, mostrador de 8 bytes (`is5610Type=true`), DIY online e restaurar DIY padrão.
- **Byte 25 = `90`**: **OTA novo** (25.7) e beber água.
- **Byte 26 = `01`**: esporte vinculado.
- **Byte 29 = `22`**: sedentário de 30 min e **sono pelo algoritmo 5610**, o que explica receber 04/10.
- **Byte 31 = `01`**: levantar-pulso suportado (bit invertido = 0) e MTU informado pelo firmware.
- **Byte 34 = `84`**: estresse e alerta de FC alta/baixa, o que explica o 03/08 enviado.
- **Byte 37 = `88`**: lembrete de remédio e "findDevice".
- **Byte 39 = `04`**: fone (bit invertido).
- **Byte 40 = `82`**: acordar por toque (bit invertido).
- **Byte 41 = `3c`**: olhar ao longe, exercício, tradução IA, leitura e viagem, o que explica 02/3E, 02/40 e 02/42.
- **Byte 44 = `d0`**: estresse automático.
- **Byte 45 = `10`**: número de alarmes, o que explica o 02/47.
- **Byte 48 = `e2`**: lavar as mãos, PA automática, "lessRepeat" e sono automático.
- **Byte 49 = `50`**: mostrar DIY no crachá (invertido).

**O que fica em aberto:**
- O significado exato de `hrFun=2`, de plataforma 10 (**hipótese**: a família Bluetrum, já que o 20/01 diz "AB569X") e de `deviceShape=1`.
- Os bits ligados que o app não lê: 16.4, 18.6 parcial, 19.4, 24.6 e outros.
- O byte `0x40` em p27 (byte 36): o único bit ligado, 0x40, não é lido.
- A ausência do bit 16.6 contrasta com o bit 25.7 ligado: a OTA usa o caminho novo (cmd 0x20).

---

## 6. Quadros observados interpretados

| quadro | interpretação |
|---|---|
| **11/06** `01` | aviso de bateria baixa com limiar 20 %; chega espontaneamente logo após conectar |
| **00/00** `01 ff 01 02 00 00 ca 16 …` | recursos (§5) |
| **11/00** `00` | resposta ao pedido de bateria: o último byte é 0, e o app mostraria 0 %. **hipótese**: o firmware não preenche o valor, ou o relógio estava carregando |
| **02/17** | `04` + "V1.8", depois `28` (40) + "Z16_TF37Pro_HSW[TF37Pro]_Style1_Podsfine": versão de firmware e projeto |
| **27/06** `00 64` | MTU do firmware = 100; o app pede `min(MTU do periférico, 100)` |
| **20/01** `6a7adcd4 04 "V1.8" 06 "AB569X"` | p0..p3 desconhecidos (**hipótese**: carimbo de build, 0x6A7ADCD4 ≈ agosto de 2026 em epoch); versão; chip Bluetrum AB569X (**hipótese** pelo nome). O hex inteiro vira `otaUniqueCode` |
| **08/00** `02` | bind: dispositivo já vinculado (reconexão). O app segue para 02/12 → 09/00 → 02/08 → 02/04 → 02/05 → 02/06 (§1) |
| **02/06** (86 bytes, truncado na captura) | ver o detalhamento logo abaixo |
| **01/02** `01` | início da sincronização |
| **04/01** `35 6b 00 18 …` | data 2026-11-11, 24 horas × 12 bytes, todas zeradas |
| **04/18** `01 08 + 8 bytes` | cabeçalho (**hipótese**: tipo 1, tamanho 8) mais o ID para a licença GoMore (não reproduzido); o app responde com 04/19 |
| **01/03** `01` | fim da sincronização |
| **04/00** 12 × `00` | passos, distância e calorias de hoje zerados |
| **11/01** `00` | relato espontâneo de bateria = 0 (mesma ressalva do 11/00) |
| **03/09** `00 96 6e 0a 78 00 32 28 05 2d` | alerta de FC alta desligado (opções 110..150, passo 10, atual 120); alerta de FC baixa desligado (opções 40..50, passo 5, atual 45) |
| **02/47** `0a` | máximo de 10 alarmes |
| **02/3E, 02/40, 02/42** `00 00 00 00 08 00` | exercício, leitura e viagem: desligados, sem repetição, 08:00 |
| **04/10** `00 00 00 00` | sono 5610 vazio: data zero, 0 fases, 0 cochilos |
| **04/0C** `80 01 02 03 … 55 …` | lista de esportes suportados. O app guarda os PLEN bytes crus. **hipótese**: `0x80` é contagem ou flag e os ids vão de 1 em diante |

**Detalhe do 02/06**
- p0..p3: perfil (valores omitidos).
- p6..p9 `00 00 13 88`: meta de 5000 passos (**hipótese**; bate com o 02/05 enviado).
- p11 `00`: levantar-pulso desligado.
- p12 `00`: idioma índice 0.
- Bitmap de idiomas `80 00 00 00`: só o índice 0 (**hipótese**: inglês).
- realtimeSport `00`, realtimeHealth `00`.

TLVs:

| tag | valores |
|---|---|
| 04 | sono ligado, 22:00–08:00 |
| 05 | no pulso = 1 |
| 06 | FC automática ligada, a cada 30 min, 00:00–23:59 |
| 07 | sedentário desligado (dnd 0), limiar 15, tempo 45, 8 h–22 h, repetição `0xF8` |
| 08 | 24 h = 1 |
| 0A | 11 × `01` (**hipótese**: chaves das notificações principais) e bitmap de apps `33 03 c3 ff ff 00 00 00 00` → KakaoTalk, Messenger, Snapchat, LinkedIn, VK, Zalo, DingTalk, Weibo, Alipay, Teams, Telegram, Outlook e "Outros", com suporte e push ligados |
| 0D | unidades métricas / °C |
| 19 | estresse automático ligado, a cada 60 min, 00:00–23:59 |
| 1A | PA automática (truncado na captura) |

**Comandos enviados pelo app** (o que pedem / o que o relógio responde)

| comando | o que é | resposta |
|---|---|---|
| 01/02, 01/03 | marcadores de sincronização que vêm do **relógio** | – |
| 03/08 | pedido dos limiares de FC alta/baixa | 03/09 |
| 02/1F | pedido de tempo de tela | o app não tem parser dedicado; não veio resposta na captura |
| 02/3E, 02/40, 02/42, 02/47 | ver a tabela acima | ver a tabela acima |
| 02/06 | pedido de configurações | 02/06 |
| 09/00 | fuso: `[sinal (1 = negativo), horas]` | só ACK |
| 0C/00 | pedido do código único de OTA | esperado 0C/00 com o código; o app então pede 0C/01. Nenhuma resposta capturada |
| 18/06 | `sendGPS`: hora compactada + latitude/longitude, cada uma u32 com bit31 = sinal (**hipótese**: mesma escala do 04/1B) | só ACK (sem parser para 18) |
| 27/06 | pedido de MTU | `00 64` |
