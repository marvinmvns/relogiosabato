# Podsfine 1.2.3 — sistema: conexão, OTA, transferência de arquivos, mídia, rede, manifest

Análise **estática** (somente leitura de texto) do APK descompilado. Nada foi executado, nenhum servidor foi acessado.
Caminhos relativos a `SRC = sources/com/lianhezhuli/podsFine/` (salvo indicação). Manifest em `podsfine-1.2.3-res/resources/AndroidManifest.xml`.
Marcação: **[E]** = estático (lido diretamente no código), **[H]** = hipótese/inferência.
Segredos (appids, chave de assinatura, chave do Tencent Map, client_id/secret GoMore) aparecem como `<segredo no app>`. Nenhum MAC é reproduzido.

---

## 0. Resumo dos canais GATT (como o app os usa)

| Serviço | Caract. | Uso no app | Fonte |
|---|---|---|---|
| 0x18AC | 0x2AAC notify | respostas/eventos DF/FD do relógio | `BleConstants.java:7,36` [E] |
| 0x18AC | 0x2AAD write (WITHOUT_RESPONSE) | comandos DF/FD do app; também stream de câmera (0x2B 03) | `BleConstants.java:8`, `ble/MBleManager.java:504-518` [E] |
| 0x1106 | 0x1107 notify / 0x1108 write | protocolo "legado D5/D6" (OTA genérico + **todas as transferências de arquivo**) quando `is5610Type=true` | `AppConfig.java:152-157`, `BleConstants.java:26,29,32` [E] |
| 0x18A8 | 0x2AA8 notify / 0x2AA9 write | (a) mesmo protocolo D5/D6 legado em modelos sem flag 5610; (b) protocolo **"Cus5610" do bootloader/DFU** (variáveis `OTAServerUuid5610`/`OTANotifyUuid5610`/`OTAWriteUuid5610`, que **nunca mudam**) | `BleConstants.java:22-24,28-33`, `ble/ota/Cus5610OTANotifyWriteUtils.java:113` [E] |
| 0x180F | 0x2A19 | bateria lida por `read` (não notify) se o relógio não suporta relatório de bateria por comando | `ble/utils/NotifyWriteUtils.java:808-812` [E] |
| 0x1800 | 0x2A00 | leitura do nome | `NotifyWriteUtils.java:2134-2139` [E] |

**Atenção à nomenclatura confusa** [E]: as constantes `OTA_*_5610` valem 0x1106/1107/1108, mas as variáveis `OTAServerUuid5610/OTANotifyUuid5610/OTAWriteUuid5610` valem 0x18A8/2AA8/2AA9 (`BleConstants.java:22-33`). A flag `is5610Type` vem do bit 3 do byte 24 da resposta de recursos (cmd 0x00) quando `codeFormat` é 8 ou 9 (`NotifyWriteUtils.java:440-446`) e, ao ser setada, redireciona o canal legado para 0x1106 (`AppConfig.java:152-157`).
**[H]** Para o TF37 Pro (GATT normal com 0x1106 e sem 0x18A8): arquivos/mostradores vão pelo protocolo D5/D6 legado em 0x1106/0x1108; o firmware vai por `0x20/0x02` → o relógio reinicia em DFU (anúncio contendo `56 10`, endereço com último byte XOR 0x55) e expõe 0x18A8, onde roda o protocolo Cus5610.

---

## 1. Conexão e sequência de inicialização

### 1.1 Pilha BLE
- Biblioteca: `com.welie.blessed` (BluetoothCentralManager/Peripheral, versão modificada com `setNotifyNormal`) — fila interna de operações GATT do próprio blessed. `ble/MBleManager.java:27-36,466` [E]
- Modo de scan `LOW_LATENCY`, criado com Handler da main looper. `MBleManager.java:77-81` [E]
- **Uma conexão por vez**: um único campo `peripheral`; `connect()` substitui o atual. `MBleManager.java:54,333-346` [E]
- Escrita sempre `WriteType.WITHOUT_RESPONSE`. `MBleManager.java:517` [E]
- Peculiaridade: se a característica de notify **não** tem descritor CCCD 0x2902, o app cria um descritor local falso (`addDescriptor`), marca `isNormalDevice=false` e passa a **escrever comandos em 0x2AAC** (a própria característica de notify) em vez de 0x2AAD. `MBleManager.java:453-482,504-509,533-537` [E]

### 1.2 Scan / filtros
- Scan **sem filtro de hardware** (`scanForPeripherals()` sem UUID/nome). `MBleManager.java:307-321` [E]
- Aceitação no app: manufacturer data (AD type 0xFF) convertido em hex contém `"31"`, `"32"` ou `"33"` (filtro muito frouxo); tipo do aparelho = byte 10 do manufacturer data. `ble/avd/BleAvdRecordUtil.java:19-41`, `function/home/activity/BasicScanBleDeviceActivity.java:261-276` [E]
- Detecção de DFU: o scan record inteiro em hex com `:` contém `":56:10"` (`SCANBYTES_DFU`). `BleConstants.java:34`, `BasicScanBleDeviceActivity.java:462-464`, `ble/utils/HexUtil.java:72-83` [E]
- `SCAN_BYTES = ":00:01"` está declarado mas **não é usado** em lugar nenhum. `BleConstants.java:35` (grep sem outras ocorrências) [E]
- Os filtros por nome (`C01`, `Podsfine`, `C03`, `TF20 BOX`, `SE-ONE`...) existem como constantes. `BleConstants.java:10-20` [E]

### 1.3 Após conectar (GATT)
1. `onServicesDiscovered`: tenta `readCharacteristic(0x18A8/0x2AA8)`; se a característica existir → "isDfu5610". `MBleManager.java:189-193` [E]
2. Pede MTU **450** (DFU) ou **247** (normal). Em modo normal coloca `DataStatus=SYNCHRONIZE` (watchdog de 30 s volta para IDLE). `MBleManager.java:193-196`, `NotifyWriteUtils.java:2069-2080` [E]
3. Após **1000 ms**: em DFU habilita notify em 0x18A8/0x2AA8; senão limpa a fila e habilita notify em 0x18AC/0x2AAC. `MBleManager.java:197-215` [E]
4. Depois: plataforma 1/2 → `requestMtu(410)`; se `isSupportFmMtu` → envia `0x27/0x06`; resposta chega como cmd 0x35 key 1 → `requestMtu(min(512, valor))`; plataforma 10 → MTU 23. `NotifyWriteUtils.java:749-751,765-769,1752-1760` [E]
5. Ao desconectar: `clearServicesCache()` (refresh do cache GATT), flags zeradas. `MBleManager.java:131-143` [E]

### 1.4 Enquadramento DF/FD (base para tudo abaixo)
- Construção: `DF LEN_H LEN_L CMD VER KEY PLEN_H PLEN_L PAYLOAD` com `LEN = PLEN + 5`; `VER = CommandUtils.DEVICE_VERSION` (inicial 0, depois o byte 5 da resposta de recursos). `ble/utils/CommandUtils.java:227-243`, `NotifyWriteUtils.java:305` [E]
- Na fila, `addSumCheck` **insere** o checksum na posição 3: soma de todos os bytes (sem sinal) & 0xFF. Quadro final: `DF LEN_H LEN_L SUM CMD VER KEY PLEN_H PLEN_L PAYLOAD`. `NotifyWriteUtils.java:2050-2063` [E]
- Recepção: `DF` → aloca `LEN+4` e remonta fragmentos; checa soma (todos os bytes exceto índice 3). Se OK responde ACK `FD 00 06 SUM CMD VER KEY 00 01 00`; se a soma falha responde o mesmo com status `03`. `NotifyWriteUtils.java:249-299,1781`, `ble/utils/AckPackageConfigUtils.java:5-7` [E]
- Pacote iniciando com `FD` = ACK do relógio → `handleAck`. `NotifyWriteUtils.java:263-266` [E]

### 1.5 Fila / timeouts
- Fila única `CopyOnWriteArrayList`; envio em `HandlerThread("writeThread")`. `NotifyWriteUtils.java:102,146-151` [E]
- Fragmentação **fixa em 20 bytes** com `sleep(20 ms)` entre fragmentos, independentemente do MTU negociado. `NotifyWriteUtils.java:188-198` [E]
- Com a MainActivity aberta, após um quadro DF espera o ACK FD (timeout **100 s** → `resetAll()` limpa tudo). Sem MainActivity, não espera ACK. `NotifyWriteUtils.java:205-211,226-234` [E]
- Escritas são descartadas enquanto `isOTA=true` ou desconectado. `NotifyWriteUtils.java:160-165` [E]
- Bind: timeout de **15 s** sem resposta 0x08 → `disconnect()`. Anti-repetição de 5 s. `NotifyWriteUtils.java:236-240,1822-1838` [E]

### 1.6 Sequência de comandos ao conectar/vincular [E salvo indicação]

| # | Gatilho | Comando (CMD/KEY) | Payload | Fonte |
|---|---|---|---|---|
| 1 | notify 0x2AAC OK, +1000 ms | `0x14/0x00` getProductId | `01` | `function/home/activity/MainActivity.java:760-799`, `CommandUtils.java:841-843` |
| 2 | idem | `0x00/0x00` getDeviceFeatures | `00` | `CommandUtils.java:249-251` |
| 3 | idem | `0xF3/0x00` getDeviceInfo | (vazio, PLEN=0) | `CommandUtils.java:76,245-247` |
| 4 | resposta cmd 0x00 (recursos) em SYNCHRONIZE e `isSupportHid` | `0x10/0x00` sendSystemVersion | `[SDK_INT, 0, 0]` | `NotifyWriteUtils.java:756-758`, `CommandUtils.java:721-723` |
| 5 | ACK 0x10, ou recursos com `isDeviceInfo` | `0x02/0x17` getDeviceNameVersion | (vazio) | `NotifyWriteUtils.java:759-760,1935-1942`, `CommandUtils.java:845-847` |
| 6 | resposta 0x02/0x17 (versão + nome do projeto) ou recursos sem HID/deviceInfo | `0x08/0x00` **bind** | 8 bytes ASCII = 8 primeiros hex de `UUID.randomUUID()` sem hífens, gerado uma vez e salvo em SharedPreferences (`DeviceBean.bindCode`) | `NotifyWriteUtils.java:864-880,1805-1838`, `CommandUtils.java:520-522` |
| 6b | se `DEVICE_VERSION < 2` | **sem bind**: vai direto ao setUserInfo | — | `NotifyWriteUtils.java:1805-1821` |
| 7 | resposta 0x08 byte[9]=1 (1º vínculo: apaga dados do dia) ou 2 (já vinculado) | `0x02/0x12` setUnit se suportado; senão `0x09/0x00` fuso (ver≥3) ou `0x02/0x08` hora | unit: `[dist(0 métrico/1), temp(0 °C/1)]` | `NotifyWriteUtils.java:1176-1236`, `CommandUtils.java:800-802` |
| 7x | byte[9]=3 | relógio recusou → `disconnect()` | — | `NotifyWriteUtils.java:1232-1235` |
| 8 | ACK 0x02/0x12 | `0x09/0x00` setTimeZone (ver≥3) ou hora | `[sinal(0=+,1=−), |offset em horas inteiras|]` | `NotifyWriteUtils.java:1855-1862`, `CommandUtils.java:534-537`, `utils/DateUtil.java:134-136` |
| 9 | ACK 0x09 | `0x02/0x08` sendSystemTime | 4 bytes bit-packed BE: ano−2000(6) mês(4) dia(5) hora(5) min(6) seg(6) | `NotifyWriteUtils.java:1915-1919`, `CommandUtils.java:501-510` |
| 10 | ACK 0x02/0x08 | `0x02/0x04` setUserInfo (+ `0x02/0x20` nome, se suportado) | `sexo(1)\|idade(7)`, altura(9 bits), peso(8 bits) empacotados em 4 bytes; nome: `[len][UTF-8]` | `ble/infoutils/BleDataUtils.java:1226-1236`, `CommandUtils.java:253-271,857-871` |
| 11 | ACK 0x02/0x04 | `0x02/0x05` meta de passos | int32 BE (padrão 5000) | `BleDataUtils.java:1210-1216`, `CommandUtils.java:273-275` |
| 12 | ACK 0x02/0x05 | `0x02/0x06` getSettingInfo | `01` | `BleDataUtils.java:1218-1224`, `CommandUtils.java:277-279` |
| 13 | resposta 0x02/0x06 | `0x02/0x01` setLanguage se diferente do idioma do telefone (ACK key 1 → passo 14); senão passo 14 direto | `[código]` | `NotifyWriteUtils.java:995-1018`, `NotifyWriteUtils.java:1864-1866` |
| 14 | syncProcess | `0x0B/0x01` getFaceCode (se suporta mostradores) → resp 0x0B/0x09 → `0x0B/0x04` (se customizável) → resp 0x0B/0x05 | `01` | `NotifyWriteUtils.java:1840-1846,1238-1262`, `CommandUtils.java:681-687` |
| 15 | fim da etapa de mostrador | `0x01/0x00` syncData | `01` | `NotifyWriteUtils.java:1785-1787`, `CommandUtils.java:281-283` |
| 16 | relógio envia `0x01/0x02` (início) … dados … `0x01/0x03` (fim) | rajada de pedidos condicionais: FC alta/baixa, tela sempre-acesa, DND, badge `0x32/0x01`, vídeo `0x2C/0x03`, menstrual, nº alarmes, nº fotos, bateria (cmd ou GATT 0x2A19), lembretes, `createBond()` (HID/pareamento clássico), tempo de tela, comandos de fone (EP) → `DataStatus=IDLE` | — | `NotifyWriteUtils.java:772-863` |
| 17 | ocioso, ~5 s | `0x0C/0x00` getOtaUniqueCode → resp → `0x0C/0x01` product code → evento `OTA_INFO_READY` → consulta OTA na rede | `01` | `MainActivity.java:158-168`, `BleDataUtils.java:1436-1446`, `CommandUtils.java:697-703` |
| 18 | relógio envia ID do algoritmo (cmd 0x04 key 24, [H] dentro de `handleSportData`) | HTTP à GoMore → `0x04/0x19` | `[01, len, chave ASCII]` | `BleDataUtils.java:251-257`, `MainActivity.java:1029-1031`, `network/request/HttpClient.java`, `CommandUtils.java:1489-1497` |

Pareamento clássico: para `isPairing` o app chama `createBond()` em um endereço derivado (último byte do MAC BLE XOR 0x55); para HID, `createBond()` no próprio endereço após 3 s. `NotifyWriteUtils.java:822-834,1789-1802` [E]. MainActivity re-tenta o bond a cada 35 s até 3 vezes. `MainActivity.java:200-222` [E]

### 1.7 Reconexão
- `BaseReconnectBlueActivity`: Android ≥ 8 alterna entre `disconnect()+connect(mac)` e scan; Android < 8 primeiro scan, depois até 3 conexões diretas. `base/activity/BaseReconnectBlueActivity.java:314-345` [E]
- Durante o scan aceita o MAC salvo **ou** o MAC com último byte XOR 0x55; se o anúncio contém `56 10` marca DFU e conecta no endereço derivado. `BaseReconnectBlueActivity.java:117-156` [E]
- `autoConnect()` do blessed também existe. `MBleManager.java:375-383` [E]
- Serviço em primeiro plano `MsgPushService` também reconecta ao MAC salvo. `service/MsgPushService.java:85` [E]

---

## 2. OTA

### 2.1 Dois protocolos distintos
1. **Legado D5/D6** (`OTAUtils`, `MultipleOTAUtils`, `OTANotifyWriteUtils`): usado para firmware em modelos antigos (`DeviceOtaActivity`) **e para todos os arquivos** (mostradores, contatos, álbum, logo...). Canal = `OTA_SERVICE_UUID/OTA_WRITE_UUID/OTA_CHARACTERISTIC_UUID` (0x1106/1108/1107 se `is5610Type`, senão 0x18A8/2AA9/2AA8). [E]
2. **Cus5610** (`Cus5610OTAUtils`, `Cus5610OTANotifyWriteUtils`, `Cus5610CommandUtils`): firmware Bluetrum por partições, **sempre** em 0x18A8 / write 0x2AA9 / notify 0x2AA8, com MTU 450, em modo DFU. Acionado por `Device5610OtaActivity` (é a tela de OTA do fragmento "Device" do Podsfine). `function/podsFine/home/DeviceFragment.java:773-776` [E]

**Comparação com `com.bluetrum.fota` (ABOta)** [E]: a biblioteca ABOta **não está no APK** (nenhuma ocorrência de `com.bluetrum.fota`, da magia `CC AA 55 EE 12 19 E4`, nem de opcodes 0x91/0x92/0xA0/0x90). O único código Bluetrum é `com.bluetrum.abpartool` (conversor de imagem). O OTA do Podsfine é **proprietário do integrador (Lianhezhuli)**: cabeçalhos `D5` (pedido) / `D6` (resposta/dados), blocos de 4 KiB com somas. [H] O bootloader Bluetrum do TF37 pode também falar ABOta, mas este app não usa isso.

### 2.2 Fluxo Cus5610 (firmware do TF37 — [E] no app, [H] no comportamento do relógio)

```
[Tela OTA aberta]
  ├─ readData(18A8/2AA8)? ── sim (já em DFU) ─→ (ver "DFU" abaixo; botão é clicado automaticamente)
  └─ não (modo normal, canal 18AC)
       DF 0x20/01 requestOTAInfo  ──→  resp cmd 0x20 (versão, nome, unique_code=hex(payload[9..]))
       evento OTA_INFO_READY
       GET https://ota.lianhezhuli.com/api/hry/get_update?unique_code=…&sign=…
       └─ bin_list vazio → "versão mais recente"
       └─ bin_list ≠ ∅ → DF 0x20/02 [01] requestStartOTA
              resp 0x20/02 byte[9]: 1=bateria baixa | 2=tocando música | 3=em chamada → aborta
                                    outro → relógio inicia OTA [H: reinicia em bootloader/DFU]
            baixa cada bin (ordenado por part_id) para filesDir/ota/
            desconecta → scan → conecta em MAC' (último byte XOR 0x55) → MTU 450 → notify 2AA8
[DFU, canal 18A8: write 2AA9 / notify 2AA8]
   +1 s  D5 0F 01 01 ... payload {10 00}  GET_VERSION ─→ resp fun 0x0F (string) → parityStyle=true
   +3 s  startOta: D5 03 ... tabela de partições (n × 9 B)  ─→ resp fun 03
   para cada bin (part_id = área):
      D5 02 ... pré-checagem 40 KiB (10 somas)  ─→ resp fun 02 byte[9]
          0xFF → os 10 blocos já batem: pula-os, próxima pré-checagem
          n    → retoma a partir do bloco (último−10+n+1)
      para cada bloco de 4 KiB:
          D5 <área> 01 01 IDX SUB ... (pedaços de MTU−14) × ~10
          D5 02 01 01 IDX 00 ... soma do bloco ─→ resp fun 02 (valor IGNORADO pelo app)
      D5 0A ... soma32 do arquivo inteiro ─→ resp fun 0A byte[3]==1 ? próximo bin : refaz listas
   após o último bin: D5 0E ... REBOOT → "sucesso"
```
Fontes: `function/device/Device5610OtaActivity.java:126-129,199-213,295-315,318-339,342-390,416-447,492-506,599-617`; `ble/ota/Cus5610OTAUtils.java:81-110,113-265,267-288,492-539`; `ble/ota/Cus5610OTANotifyWriteUtils.java:107-123,149-258`; `ble/utils/NotifyWriteUtils.java:1399-1431`; `CommandUtils.java:849-855`.

**Quadro Cus5610 (pedido)** [E] `Cus5610CommandUtils.java:109-135`:
`D5 | FUN | 01 | 01 | IDX_H IDX_L | SUB | SUM_H SUM_L | LEN_H LEN_L | PAYLOAD`
- `IDX` = número do bloco de 4 KiB; `SUB` = índice do pedaço dentro do bloco.
- `SUM` = soma 16 bits (sem sinal) dos 11 bytes de cabeçalho (com SUM=0) + todos os bytes do payload.
- Bug [E]: `for (byte b : bArr)` sem checar `null` — todos os chamadores passam array (mesmo vazio).

**Quadro Cus5610 (resposta)** [E] `Cus5610OTANotifyWriteUtils.java:155-197`: começa com `D6`; `[1]=FUN`; `[3]=status` (1 OK, 2 cabeçalho, 3 checksum, 4 versão de protocolo, 5 comprimento, 6 protocolo, 7 erro na checagem 4K, 8 BLE caiu, 9 timeout local, 10 firmware maior que o limite); comprimento total = `[8]+9` [H: layout exato do cabeçalho de resposta]. **O status só é logado** — o fluxo continua pelo `FUN`, exceto em 0x0A.

**Checksums** [E] `Cus5610OTAUtils.java:145-247`:
- Arquivo dividido em blocos de 4096 B; **o último é preenchido com zeros até 4096** e enviado inteiro.
- Por bloco: soma simples dos bytes (32 bits) ou, se `parityStyle` (definido ao receber a resposta de GET_VERSION), duas somas: bytes pares e ímpares (8 bytes).
- Pré-checagem: 10 somas por quadro (40 KiB) → permite **retomada/skip** de blocos já gravados (o relógio compara com a flash [H]).
- Total: soma 32 bits de todos os bytes do arquivo (`FUN 0x0A`).
- Tamanho do pedaço de dados: `MTU − 14` (11 de cabeçalho + 3 ATT); com MTU 450 → 436 B, ~10 pedaços por bloco.
- Ritmo: um pacote por vez, o próximo só sai no callback `onCharacteristicWrite` de 0x2AA9; timeout de 100 s → `disconnect()`. `Cus5610OTANotifyWriteUtils.java:33,107-137,288-298`, `NotifyWriteUtils.java:2141-2146` [E]
- Pacote maior que `deviceMtu` (= MTU−3) **não é escrito**, só arma o timeout → desconecta após 100 s. `Cus5610OTANotifyWriteUtils.java:112-118` [E]

**Formato esperado do firmware** [E/H]: o servidor devolve `bin_list[]` com `binFile` (URL), `part_id`, `part_addr`, `part_len`, `binSize`, `version`, `is_force`, `is_test`, `is_white`, `sort`. `network/bean/OtaUpdateInfo.java:65-96` [E]. Cada `.bin` é enviado **bruto**, sem nenhum cabeçalho adicionado pelo app. `part_id` vira o `FUN` dos pacotes de dados (4 código, 5 áudio, 6 fontes, 7 imagens, 8 parâmetros padrão, 9 mostrador) e a tabela de partições (`part_id`, endereço e tamanho, BE) vai **literalmente do servidor para o bootloader**. `Device5610OtaActivity.java:480-489`, `Cus5610OTAUtils.java:90-110`, `Cus5610CommandUtils.java:93-107` [E]

**Verificação de versão** [E]: no fluxo 5610 o app **não compara versões**; quem decide é o servidor pelo `unique_code` (há também o `GET_VERSION` FUN 0x0F, só logado). No legado, o app envia ao relógio a tabela de versões (`0x0C/0x02`, 8×uint16) e o relógio responde quais partes precisam (`0xFFFF` = não). `function/device/DeviceOtaActivity.java:321-338`, `BleDataUtils.java:1454-1470`.

**Falha / recuperação** [E salvo indicação]:
- Erro/desconexão → `onOTAError` → UI "falhou, atualizar novamente". `Cus5610OTAUtils.java:327-329,459-483`, `Device5610OtaActivity.java:621-660`
- Watchdog de progresso de **6 s** (`RetryPolicy.DEFAULT_RETRY_TIMEOUT_IN_MILLIS`), renovado a cada pacote. `Device5610OtaActivity.java:513-517`, `androidx/camera/core/RetryPolicy.java:12`
- Reconexão automática a cada 5 s; se reconectar e detectar 0x18A8 → reenvia GET_VERSION e reinicia em 3 s. `Device5610OtaActivity.java:599-637`
- Ao detectar DFU em qualquer conexão, o app abre a tela de OTA e "clica" o botão sozinho. `BasicConnectBleDeviceActivity.java:210-222`, `Device5610OtaActivity.java:207-212`
- [H] Recuperação real depende do bootloader manter o modo DFU após falha (o design com pré-checagem de 40 KiB indica suporte a retomada).
- Bug [E/H]: se a soma total (FUN 0x0A) falha, `onPartTotalCheckRst(false)` reconstrói as listas mas **não reenvia nada** → só sai pelo watchdog de 6 s. `Cus5610OTAUtils.java:521-539`
- Download sem verificação: `binSize` nunca é usado; sem hash/assinatura. `network/request/RequestUtils.java:196-240` [E]

### 2.3 Protocolo legado D5/D6 (OTA genérico e transferência de arquivos)

**Quadro de comando** [E] `ble/ota/OTACommandUtils.java:49-70`: `D5 | MAIN | SUB | OP | 00 | 00 | LEN_H LEN_L | PAYLOAD | SUM8` (SUM8 = soma de todos os bytes anteriores & 0xFF).
**Dados**: `D6 + bloco bruto` de (`frameSize` − 1) bytes, sem ACK por quadro. `OTAUtils.java:234-265` [E]
**CRC**: CRC-8 polinômio **0x31**, init 0x00, sem reflexão, sem XOR final — um por grupo e um do arquivo inteiro. `OTAUtils.java:239-251` [E]

```
OTAUtils.startOTA:  MTU 247 → desliga notify 2AAC → (+1 s) liga notify OTA (1107/2AA8) ; timeout 60 s
onNotifySuccess(OTA) → NotifyWriteUtils.isOTA=true, resetAll → onOTAReady
D5 M S 01 .. [MTU-3 (2B BE)] [tamanho do arquivo (4B BE)]   ─→ resp OP 0x81
      [8..9]=frameSize do relógio  [10..11]=intervalo ms  [12]=quadros/grupo  [13]=timeout×5 s
      (resposta curta de 9 B = erro: [8]=0x6B ou [5]=0x0D)
loop por grupo: N × (D6 + dados)  →  D5 M S 02 .. [crc8 do grupo]  ─→ resp 0x82 [5]==0 ? próximo : erro
fim:            D5 M S 03 .. [crc8 do arquivo]                ─→ resp 0x83 [5]==0 ? sucesso : erro
firmware: D5 M S 04 (reboot) ; arquivos: volta MTU, desliga notify OTA, (+1 s) liga 2AAC, otaEnd → 0x0B/01
```
Fontes: `OTAUtils.java:190-233,268-349`, `OTANotifyWriteUtils.java:29-32,86-106,125-214`, `MainActivity.java:777-792`, `NotifyWriteUtils.java:2004-2031` [E].
Ritmo: `sleep(sendInterval)` **antes de cada** pacote (padrão 500 ms até o relógio informar; 0 vira 50 ms); timeout padrão 10 s por comando → `disconnect()`. `OTANotifyWriteUtils.java:29-32,91,101,120-123,180-182` [E]
Chamada telefônica durante OTA → erro 14. `OTANotifyWriteUtils.java:216-221` [E]
Firmware multi-arquivo (`MultipleOTAUtils`): MAIN=1, SUB = `sourceId−1` (1 principal, 2 configurações, 3 recurso interno, 4 recurso externo, 5 beep, 6 DSP XIP, 7 DSP code); timeout de 17 s para o notify abrir; reboot só depois do último. `MultipleOTAUtils.java:70-145`, `DeviceOtaActivity.java:316`, `OTACommandUtils.java:29-35` [E]

### 2.4 Tabela de opcodes OTA

| Protocolo | Campo | Valor | Significado | Fonte |
|---|---|---|---|---|
| DF | 0x20/0x01 | — | pedir info OTA (versão, nome, unique_code) | `CommandUtils.java:849-851`, `NotifyWriteUtils.java:1411-1430` |
| DF | 0x20/0x02 | `01` | iniciar OTA; resp [9]: 1 bateria baixa, 2 música, 3 chamada | `CommandUtils.java:853-855`, `NotifyWriteUtils.java:1399-1410` |
| DF | 0x0C/0x00..0x03 | `01` / tabela | legado: unique code, product code, enviar versões (16 B), status OTA | `CommandUtils.java:697-711`, `BleDataUtils.java:1436-1471` |
| D5 legado | OP 0x01 / 0x81 | MTU+tam / params | início | `OTACommandUtils.java:72-74`, `OTANotifyWriteUtils.java:159-188` |
| D5 legado | OP 0x02 / 0x82 | crc8 | CRC do grupo | `OTACommandUtils.java:76-78`, `OTANotifyWriteUtils.java:189-199` |
| D5 legado | OP 0x03 / 0x83 | crc8 | CRC do arquivo / fim | idem, `:200-210` |
| D5 legado | OP 0x04 | — | reiniciar | `OTACommandUtils.java:80-82` |
| D6 legado | — | dados | quadro de dados (app→relógio); do relógio = erro | `OTAUtils.java:252-255`, `OTANotifyWriteUtils.java:139-141` |
| Cus5610 | FUN 0x01 | — | info de firmware OTA (versão, projeto, unique code) | `Cus5610CommandUtils.java:100`, `Cus5610OTANotifyWriteUtils.java:212-228` |
| Cus5610 | FUN 0x02 | somas | checagem 4K / pré-checagem 40K | `Cus5610OTAUtils.java:186-234`, `:229-237` |
| Cus5610 | FUN 0x03 | n×9 B | distribuição da tabela de partições | `Cus5610OTAUtils.java:90-110` |
| Cus5610 | FUN 0x04–0x09 | dados | área: código, áudio, fontes, imagens, parâmetros, mostrador | `Cus5610CommandUtils.java:93-99` |
| Cus5610 | FUN 0x0A | soma32 | soma total | `Cus5610OTAUtils.java:247`, `:521-539` |
| Cus5610 | FUN 0x0B/0x0C/0x0D | — | GET_MTU / SET_PACKAGE / FRAME_TOTAL — definidos, **não usados** | `Cus5610CommandUtils.java:101-106` |
| Cus5610 | FUN 0x0E | — | reiniciar | `Cus5610OTAUtils.java:524` |
| Cus5610 | FUN 0x0F | `10 00` | obter versão; ativa somas par/ímpar | `Device5610OtaActivity.java:437,608`, `Cus5610OTANotifyWriteUtils.java:248-255` |

### 2.5 RISCOS do OTA (para quem estuda o próprio relógio)
1. **Tabela de partições vinda do servidor gravada diretamente**: endereço/tamanho errados (ou um bin de outro modelo) podem sobrescrever o bootloader ou a área errada e **inutilizar o relógio**. O app não valida nada. [E/H]
2. **Sem integridade nem autenticidade no app**: sem hash/assinatura, `binSize` ignorado, `usesCleartextTraffic=true` global — se alguma `binFile` vier por http, um MITM troca o firmware. [E] (o uso de http nas URLs é [H])
3. **O app ignora resultados de erro**: status das respostas D6 só logado; resultado da checagem por bloco de 4K ignorado; após falha da soma total não reenvia. A integridade depende do bootloader. [E]
4. **Somas simples (não CRC)** no Cus5610 e **CRC-8** no legado: detecção fraca de corrupção. [E]
5. **Desconexão no meio** (timeouts de 100 s, watchdog de 6 s, pacote > MTU) deixa o relógio em DFU; a recuperação depende do bootloader continuar anunciando `56 10` em MAC XOR 0x55. [H]
6. **Último bloco preenchido com zeros** até 4 KiB: o tamanho da partição precisa comportar isso. [E/H]
7. Aparelho "trava" ao clicar: o app inicia OTA automaticamente ao ver DFU — cuidado com conexões automáticas em modo DFU. [E]
8. O relógio recusa OTA com bateria baixa, música ou chamada (bom). [E]
9. Para estudo: nunca enviar FUN 0x03/0x04–0x09/0x0E ao relógio real sem backup/meio de recuperação (ex.: UART/bootloader ROM do AB569X). [H]

### 2.6 `libabpartool.so` / `ParTool` (apenas lado Java)
- JNI: `rawToPar(byte[] argb, w, h, bool, bool, bool)`, `rawToParv3(argb, w, h, bool, bool)`, `rawToRle(argb, w, h, int)`. Entrada = pixels **ARGB8888, 4 bytes por pixel em ordem A,R,G,B** (big-endian do `int`). `sources/com/bluetrum/abpartool/ParTool.java:8-53`, `.../utils/ImageUtils.java:5-22` [E]
- Usado para: mostrador DIY (`InstallDiyDial.java:212-216`, último bool = "suporta rotação"), prévia de mostrador IA (`InstallAIPreDial.java:75`), badge (`PictureBadgeUtil.java:87`), barrage (`BarragePushHelper.java:120`, flags `true,false,true`), logos de liga/desliga (`CustomLogoActivity.java:530`). [E]
- [H] ".par" = formato de imagem nativo Bluetrum (provavelmente comprimido/indexado); os booleans devem ser alfa/compressão/rotação — semântica não visível no Java. Não lida com o arquivo de firmware.

---

## 3. Transferência de arquivos / mostradores
Todos vão pelo **protocolo D5/D6 legado** no canal OTA (0x1106/0x1108 no TF37 [H]); comandos DF de controle antes/depois no 0x18AC. [E]

| Tipo | MAIN/SUB | Formato do conteúdo | Comandos DF associados | Fonte |
|---|---|---|---|---|
| Mostrador online | 5/1 | `.bin` baixado; salvo como texto Base64 ofuscado (`=`, `+`, `/` trocados por hashes MD5 hex de palavras fixas) → decodificado; se `!binPreviewFlag`, cortado pelo comprimento lido numa tabela do cabeçalho (bytes 16/17 e entradas de 20 B) [H: remove prévia anexa] | antes: nenhum; depois: `otaEnd` → `0x0B/0x01`; registro `census/add_dial_down` | `function/podsFine/device/dial/DialDetailsActivity.java:509-529,609-628`, `utils/StringUtils.java:57-69` |
| Mostrador DIY (plat. 0/1/2 ou `is565Bmp`) | 2/1 | foto → escala/compressão → rotação 90° opcional → BMP888 → `ParTool.rawToPar` | depois: `0x0B/0x05` setCustomWatchFace (faceCode 2 B, ou 8 B se `is8Bytes`) + timeX/Y, cor 16 bits, posições, bgUpdate | `dial/code/InstallDiyDial.java:163-216,264-272,113`, `CommandUtils.java:633-645` |
| Mostrador DIY (plat. 8) | 2/1 | cabeçalho de 16 B: `[0]=2`, largura LE16 @4, altura LE16 @6, comprimento LE32 @8 + **RGB565 big-endian** (RRRRRGGG GGGBBBBB) | idem | `InstallDiyDial.java:218-231`, `utils/BitmapUtils.java:267-281` |
| Mostrador DIY (outros) | 2/1 | `DialGenerateUtils.getBinBuffer` → `watchBg.bin` | idem | `InstallDiyDial.java:233-256` |
| Mostrador de vídeo / multi-imagem | 9/1 | concatenação de quadros: `"jpeg"` (0x6A706567 BE) + comprimento BE32 + JPEG (qualidade 100 decrescente até o limite) | antes: `0x2C/0x01 [abre, fps, segundos]` (ou `0x2C/0x06` multi); depois: `0x2C/0x04` info (faceCode 2/8 B + posições) | `dial/code/InstallVideoDial.java:120-195`, `dial/util/PictureCaseUtil.java:14-50,81`, `CommandUtils.java:1208-1227,1590` |
| Badge (crachá) | 13/1,2,3 | Par / JPEG com cabeçalho "jpeg" | `0x32/0x01,03,04,05,07,0A,0C,0D` | `dial/code/InstalllBadgeDial.java:385-413`, `CommandUtils.java:647-679` |
| Álbum | 10/1 | JPEG ≤ **25 600 B**, escala 220×177, rotação 90° | antes `0x2E/0x00 [pid BE16]` → resp cmd 0x2E; apagar `0x2E/0x01`; status do cartão `0x2D/0x00` | `function/photoalbum/PhotoAlbumManager.java:86-119,250-279`, `BitmapUtils.java:340-358`, `CommandUtils.java:1186-1197` |
| Contatos | 4/1 | arquivo `filesDir/contact/contact.bin`: **MD5(16 B do corpo)** + corpo: `[n][00]` + n×`[offset LE16][lenNome][lenNúmero]` + strings UTF-8 nome+número concatenadas; nome ≤ ~30 B, número ≤ 20 caracteres | SOS `0x02/0x10` se suportado | `function/podsFine/device/contact/ContactActivity.java:334-400`, `Constants.java:30` |
| Logo liga/desliga | 2/3 | Par | — | `CustomLogoActivity.java:514-530` |
| QR codes (pagamento/social) | 2/5..9 | bin gerado | — | `function/qrcode/activity/CodeGenerateActivity.java:275`, `OTACommandUtils.java:36-44` |
| Prévia de mostrador IA | 12/1 | Par | — | `InstallAIPreDial.java:75-80` |
| Barrage | 16/1 | Par | — | `barrage/BarragePushHelper.java:120-132` |

Tamanhos de bloco: quadro de dados = `frameSize` informado pelo relógio na resposta 0x81 (menos 1 B do `D6`); grupos de `groupPacNum` quadros com CRC-8 por grupo. ACK somente por grupo (0x82) e no fim (0x83). [E] `OTANotifyWriteUtils.java:175-178`
Observação [E/H]: o construtor `OTAUtils(..., byte[] , String, boolean, boolean is8Bytes)` com `is8Bytes=false` chama `getSendBuffer(false)` que tenta abrir `filePath` nulo → provável exceção. `OTAUtils.java:124-139,162-181`.
`BitmapUtils.setBmp565Bytes` grava a última imagem DIY em SharedPreferences. `BitmapUtils.java:287-290` [E]

---

## 4. Câmera e áudio

### 4.1 Câmera remota / prévia no relógio (cmd 0x2B = 43) [E]
- Controle: `0x06/0x01` abrir câmera, `0x06/0x02` disparar, `0x2B/0x01 [1|0]` iniciar/parar stream. `CommandUtils.java:313-323,1199-1202`
- O relógio envia `0x2B/0x02`: largura LE16, altura LE16, rotação, `frameCache` (tamanho máximo do quadro). `NotifyWriteUtils.java:1675-1689`
- O app redimensiona/roda a prévia e comprime em **JPEG** reduzindo a qualidade de 5 em 5 até caber em `frameCache`. `function/camera/activity/BaseCameraTakePhotoActivity.java:234-236`, `BitmapUtils.java:156-167`
- Envio **fora do enquadramento DF** (sem soma/ACK): fragmentos `2B 03 + pedaço de (MTU−5) B` em 0x2AAD, 3 tentativas com 100 ms. O relógio pede o próximo quadro com `0x2B/0x03` (controle de fluxo por pedido). `ble/camera/CameraNotifyWriteUtils.java:66-122`, `NotifyWriteUtils.java:1690-1691`, `BaseCameraTakePhotoActivity.java:428-436`
- [H/bug] quadro ≤ MTU−5 é escrito **sem** o prefixo `2B 03` (`CameraNotifyWriteUtils.java:73-79`).

### 4.2 Áudio do relógio (microfone) [E]
- Relógio→app: DF cmd **0x35 (53) key 0**, payload `[seq BE16][len][bytes Opus]`. `NotifyWriteUtils.java:1735-1748`
- Decodificação com **Concentus** (Opus em Java): 16 kHz, mono, quadros Opus de **40 B** → 320 amostras (20 ms, ~16 kbit/s); buffer de 240 B. Saída PCM 16 bits LE. `ble/recordAudio/DeviceAudioEvent.java:39,54,117-125,190-194`, `decoder/OpusToPcmDecoder.java:7-108`, `org/concentus/SilkConstants.java:27`
- Gravações (cmd **0x36**): `0x36/0x01` início com nome → app grava WAV em `filesDir/<conta>_audio/`; `0x36/0x03` fim; `0x36/0x02`, `0x36/0x04` confirmar/apagar. `ble/recordAudio/aifun/RecordMediaAudio.java:27-86`, `CommandUtils.java:1658-1670`
- O mesmo áudio alimenta funções de IA na nuvem (chat, tradução, mostrador por voz) via SDK elejo/Obtune — ver §5. `aisdk/code/obtune/*`, `ble/recordAudio/aifun/AI*.java`
- `0x30/0x0A` (syncAudio) informa estado de reprodução/volume. `CommandUtils.java:1586-1588`

### 4.3 `ble/avd`
Não é áudio/vídeo: é parser de **advertising data** (AD records), usado no filtro de scan (§1.2). `ble/avd/AdRecordUtil.java`, `BleAvdRecordUtil.java` [E]

---

## 5. Rede e privacidade

### 5.1 Hosts
- API principal: `https://api.about.fund/api/` (debug: `https://dev.mtwowe.com/api/`); ativação WeChat: `https://shresource.lianhezhuli.com/api/`; privacidade/termos em `privacy.lhzl666.com`. `network/Urls.java` [E]
- OTA: `https://ota.lianhezhuli.com/api/...`; clima: `oil.mtwowe.com` e `minieraly.mtwowe.com`; GoMore: `saas-api.gomore.club`; IA elejo: `api.elejoai.cn`, `lang.elejoai.cn:8002`, `obtune-ai-auth.elejoai.cn`, `provider.elejoai.com`. `network/request/Request.java:85-248,424-429`, `MainActivity.java:1030`, `sources/com/elejo/obtunesdk/**` [E]
- Retrofit/OkHttp com HTTP/1.1, 1 requisição por vez, timeouts de 30 s, `LoggingInterceptor` (loga as requisições). Sem TrustManager permissivo no código do app. `network/NetWorkManager.java:22-45` [E]

### 5.2 Assinatura (algoritmo, sem segredos) [E] `utils/SignUtils.java:13-38`, `Constants.java:246-256`
1. Parâmetros base: `appid=<segredo no app>` (um para API, outro para OTA), `lang=<idioma do sistema>`, `nonce=<inteiro aleatório 10000..1009999>`.
2. Adiciona `timestamp` (Unix em segundos) e, se autenticado, `authcode` da sessão.
3. Ordena as chaves (ordem lexicográfica), concatena `k=v&` **omitindo valores vazios ou iguais a "0"**, acrescenta `key=<segredo no app>`.
4. `sign = MD5` hex (32 caracteres) da string. A OTA usa um segredo próprio, diferente do da API.

### 5.3 Endpoints relevantes (amostra; lista completa em `Request.java`)
| Endpoint | Método | Parâmetros principais | Finalidade |
|---|---|---|---|
| `ota.lianhezhuli.com/api/hry/get_update` | GET | `unique_code` + base + sign | OTA 5610 (Bluetrum) |
| `ota.lianhezhuli.com/api/ota/get_update` | GET | `unique_code`, `product_code` | OTA legado |
| `ota.lianhezhuli.com/api/ota/down_finish` / `down_error` | POST | `ota_id`, `bin_id`, `version`, `after_version`, `user_uid`, (`msg`) | telemetria de OTA |
| `<binFile>` | GET (@Url, streaming) | — | download de bin/mostrador |
| `dial/get_list`, `dial_cate/get_dials`, `dial/get_detail`, `dial_resolution/get_views` | GET | `binsize`, `feature` (hex dos recursos do relógio), `format_id`, `rid` (resolução), `shape`, `page`, `limit`, `is_payment` | mostradores online |
| `census/add_dial_down` | POST | `dial_id` | contagem de downloads |
| `custom_idpic/get_idpic`, `diy_bgimg/get_bgimg` | GET | `custom_code`, `product_code`, `rid`, `shape` | imagens do aparelho / fundos |
| `member_devices/bind_mac` | POST | `mac` (BLE), `name`, `model` | vincula relógio à conta |
| `health_*/add`, `add_history`, `get_*` | POST/GET | séries de FC, PA, SpO2, glicose, sono, passos, **ciclo menstrual** | sincronização de saúde na nuvem ([H] depende da opção "armazenamento de dados" em rede/local, `MainActivity.java:486-490`) |
| `sport_device/add` | POST | tipo, duração, calorias, passos, distância, lista de BPM, `device_mac`, `device_name` | treinos |
| `guard_locus/add` | POST | `lat`, `lon`, `position`, `insert_time` | **localização** (função "guardião"/amigos) |
| `weather/get_daily_weather` / `get_current_weather` | GET | `lat`, `lon`, `city` | clima |
| `log_device/push_log` | POST | `device_model`, `error_code`, `error_msg`, `phone_model`, versão do Android | log de erro |
| `log_app/push_log` | POST | `json_log` | log do app |
| `census/add_member_life` | POST | `app_type`, `app_version` | telemetria |
| `login_*` (conta, Google, QQ, WeChat, anônimo), `member/*`, `bind_*` | POST | credenciais/tokens | autenticação |
| `aiart_*`, `trade_order/aiart_combo`, `pay_predeposit/pay_order` | GET/POST | prompts/imagens/pedidos | IA de imagens e pagamentos |
| `xiaoxiang/active` | POST | `device_name` = MD5(<segredo> + MAC), `project` (nome do firmware), `product_code` | ativação de IA de terceiro |
| `saas-api.gomore.club/api/firmware/key/get` | POST multipart | `client_id`, `client_secret` (`<segredo no app>`), `device_id` (ID enviado pelo relógio) | licença do algoritmo GoMore, repassada ao relógio |

Fontes: `Request.java:81-484`, `network/request/RequestUtils.java:105-503`, `function/podsFine/home/DeviceFragment.java:1107-1119,1636-1641`, `network/request/HttpClient.java`, `Device5610OtaActivity.java:223-227,342-349` [E].

### 5.4 Dados do usuário/aparelho que saem do telefone [E]
MAC BLE e nome do relógio; códigos únicos/produto do firmware; recursos do relógio; dados de saúde (incl. menstrual) e treinos com BPM; localização (clima/guardião); idioma; modelo do telefone e versão do Android em logs; e-mail (código de verificação); para IA: **áudio do microfone do relógio**, textos de conversa/memória e ID do aparelho para a elejo (`ElejoConversationMemoryApi.java:214-218`, `CloudConfigResolver.java:633-638`). Notificações do telefone são lidas pelo `NotificationListenerService` e enviadas **ao relógio** (local). Logs de protocolo (incluem MAC e bytes) vão para `getExternalFilesDir()/Podsfine/`. `utils/WriteLogUtils.java:13`

### 5.5 SDKs de terceiros (pelo que é visível)
| SDK | Uso no código do app | Coleta provável |
|---|---|---|
| Tencent Bugly (`com.tencent.bugly`) | **nenhuma referência/inicialização** no código do app [E] | [H] inativo |
| Tencent Beacon/QMSP (`tmsbeacon`, `tnkbeacon`) | nenhuma referência direta [E] | [H] dependência do Map SDK |
| Tencent Map/Location/Navi (`com.tencent.map`, `lbssearch`) | 55 arquivos; chave no manifest (`<segredo no app>`) [E] | localização, mapas de treino |
| QQ (`tauth`, `connect`) e WeChat OpenSDK (`mm.opensdk`) | login/compartilhar/pagar [E] | tokens de conta |
| Google Sign-In / Play Services Maps | login Google, mapas [E] | conta Google |
| Firebase | só classes de exceção [E] | [H] nenhum |
| elejo ObtuneSdk (`com.elejo.obtunesdk`) | IA de voz/tradução/chat [E] | áudio, texto, device_id, product_code |
| GoMore (via HTTP) | chave de algoritmo [E] | ID do relógio |
| watchda sportlib | treinos com GPS (`SportConfigure.setUserId(uid)`) [E] `MyApp.java:111-120` | UID, rotas |
| Concentus (Opus), FFmpegKit, PictureSelector, OkDownload, greenDAO/SQLCipher(lib) | utilitários | — |

---

## 6. Manifest [E]
Arquivo: `podsfine-1.2.3-res/resources/AndroidManifest.xml`
- `minSdk 24`, `targetSdk 36`. `:12-14`
- `allowBackup="true"` (dados do app incluídos em backup/adb backup conforme a versão do Android), `usesCleartextTraffic="true"` e `network_config.xml` com `<base-config cleartextTrafficPermitted="true"/>` (HTTP liberado para todos os hosts), `requestLegacyExternalStorage="true"`. `:89-100`, `res/xml/network_config.xml`
- Permissões notáveis: `BLUETOOTH_PRIVILEGED` (`:50`, só concedida a apps de sistema), `READ_PHONE_STATE` (`:54`), `CAMERA` (`:59`), `ACCESS_FINE_LOCATION` (`:63`), `READ_CONTACTS`/`WRITE_CONTACTS` (`:64-65`), `ACTIVITY_RECOGNITION` (`:66`), `RECEIVE_BOOT_COMPLETED` (`:69`, sem receiver de boot no app), `HARDWARE_TEST` (`:77`), `FOREGROUND_SERVICE_LOCATION`/`_CONNECTED_DEVICE` (`:83`), `BLUETOOTH_ADVERTISE`, `POST_NOTIFICATIONS`, `MODIFY_AUDIO_SETTINGS`, `CHANGE_WIFI_STATE`.
- Serviços: `NPNotificationService` (NotificationListener, `foregroundServiceType=connectedDevice`, `:692-701`); `MsgPushService` (primeiro plano, connectedDevice, não exportado, `:719-723`); `ProtectService` (**exportado sem permissão**, processo `:RemoteProcess`, `:710-714`); `MessageService` (**exportado sem permissão**, `:715-718`); `AliveJobService` (JobService, `:724-728`); `SportDataService` (location, `:736-739`); `UploadDeviceDataService`, `UpdateRankStepService`.
- Receivers: `NotificationDeleteReceiver` (não exportado), `LocaleChangeReceiver` (exportado, `LOCALE_CHANGED`, `:729-735`), `ProfileInstallReceiver` (androidx, protegido por `DUMP`).
- `<queries>` declara apps de mensagens (SMS Samsung/Android, WeChat, QQ, Facebook, Messenger, Twitter, Skype…) — para filtrar notificações a repassar ao relógio [H].
- Atividades exportadas: `WelcomeActivity`, `tencent.tauth.AuthActivity`, `wxapi.WXEntryActivity`.

**Riscos do manifest** [H]: serviços exportados sem permissão podem ser iniciados/vinculados por outros apps; cleartext global + `allowBackup` aumentam a superfície; `BLUETOOTH_PRIVILEGED` é ignorada em apps comuns.
