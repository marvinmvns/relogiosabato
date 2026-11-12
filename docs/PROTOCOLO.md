# Protocolo BLE do TF37 Pro (análise estática do Podsfine 1.2.3)

Evidência: **análise estática** do APK descompilado com jadx 1.5.6
(`private/decompiled/podsfine-1.2.3/`, não versionado), **confirmada em captura HCI**
em 2026-11-12: 374 quadros DF/FD do Podsfine com este relógio, todos com checksum e
tamanho válidos. Ver [CAPTURAS.md](CAPTURAS.md). Classes citadas ficam em
`com.lianhezhuli.podsFine`.

Confirmado na captura: escrita no handle `0x000A` (`2AAD`), notificação no `0x0007`
(`2AAC`); versão `0x04`; ACK `FD` de 10 bytes; quadros maiores que o MTU chegam em
vários pedaços e precisam ser remontados.

## Canais GATT (`BleConstants`)

| Constante | UUID | Papel |
|---|---|---|
| `SERVICE_UUID` | `18AC` | Serviço de comandos |
| `CHARACTERISTIC_WRITE_UUID` | `2AAD` | App → relógio (comandos e ACKs) |
| `CHARACTERISTIC_NOTIFY_UUID` | `2AAC` | Relógio → app (respostas, dados, ACKs) |
| `OTA_SERVICE_UUID_5610` | `1106` | **Transferência de arquivos D5/D6** (`OTAUtils`/`MultipleOTAUtils`) quando o relógio tem o bit 5610 |
| `OTA_CHARACTERISTIC_UUID_5610` | `1107` | Notificação do canal de arquivos (o app só escuta) |
| `OTA_WRITE_UUID_5610` | `1108` | **Escrita de arquivos D5/D6: não usar** (o firmware vai por `18A8`/`2AA9`, só em DFU) |
| `OTA_*_ELSE` / `OTAServerUuid5610` | `18A8/2AA8/2AA9` | **Bootloader de firmware (Cus5610)**: só aparece depois de `20/02`, em modo DFU; ausente no modo normal. Nunca escrever em `2AA9` |

Filtro de scan: `SCAN_BYTES = ":00:01"` (modo normal; bate com o fim do manufacturer
data observado, `…00 01 07`) e `SCANBYTES_DFU = ":56:10"` (modo de atualização).

## Formato do quadro: o mesmo DF/FD do estudo HryFine

Igual ao documentado em
[develmts/Jieli-watch-research `docs/UUID_AND_PROTOCOL.md`](https://github.com/develmts/Jieli-watch-research/blob/main/docs/UUID_AND_PROTOCOL.md),
mas transportado em `2AAD/2AAC` em vez de `6E40…9F`.

`CommandUtils.generalSendBytes` monta o quadro intermediário e
`NotifyWriteUtils.addSumCheck` insere o checksum no offset 3:

| Offset | Tamanho | Conteúdo |
|---:|---:|---|
| 0 | 1 | `0xDF` (`ACK_HEADER = -33`) |
| 1 | 2 (big-endian) | tamanho do payload + 5 |
| 3 | 1 | checksum: soma de **todos os outros bytes** do quadro, módulo 256 |
| 4 | 1 | comando (`COMMAND_ID`) |
| 5 | 1 | versão (`DEVICE_VERSION`, começa em 0 e é atualizada a partir do byte 5 de respostas do relógio) |
| 6 | 1 | chave/subcomando |
| 7 | 2 (big-endian) | tamanho do payload |
| 9 | n | payload |

ACK: começa com `0xFD` (`ACK_RESPONSE_HEADER = -3`); ver `AckPackageConfigUtils`.

## Comandos de leitura (candidatos seguros)

Formato `comando/chave payload`, antes do checksum.

| Método | Comando/chave | Payload | O que pede |
|---|---|---|---|
| `getDeviceInfo` | `F3/00` | vazio | identidade (versão, projeto) |
| `getDeviceFeatures` | `00/00` | `00` | bloco de recursos |
| `requestBattery` | `11/00` | `00` | bateria |
| `getDeviceNameVersion` | `02/17` | vazio | nome e versão |
| `getProductId` | `14/00` | `01` | ID do produto |
| `requestOTAInfo` | `20/01` | vazio | identidade de OTA (só leitura) |

## Comandos que alteram o relógio (não enviar sem decisão explícita)

| Método | Comando/chave | Efeito |
|---|---|---|
| `requestStartOTA` | `20/02` payload `01` | **entra em modo de atualização** |
| `sendRestoreFactory` | `02/09` payload `01` | **restaura padrão de fábrica** |
| `sendBindDevice` / `sendUnbindDevice` | `08/00` / `08/01` | vincula/desvincula |
| `sendSystemTime` | `02/08` | ajusta data/hora |
| `findWatch` | `06/00` payload `01` | faz o relógio vibrar (inofensivo, mas é ação) |

A tabela completa está em `ble/utils/CommandUtils.java` (cerca de 1.700 linhas).
Respostas são tratadas em `ble/utils/NotifyWriteUtils.java`.

## Diferenças em relação ao HryFine do repo antigo

- Canal de comandos: `18AC/2AAD/2AAC` (TF37 Pro) × `6E40…9F` (HryFine).
- OTA: `20/01` e `20/02` (`COMMAND_ID_OTA_NEW = 32`) × `13/01` e `13/02` no HryFine.
- OTA por GATT: serviço `1106` (5610) × `FF00`.

## Observado no logcat do celular (2026-11-12 00:07–00:10, sem payload)

Com o registro HCI ligado, a pilha Bluetooth do Realme passou a logar em modo verbose,
mas o bugreport da ColorOS **não inclui** o `btsnoop_hci.log`. O logcat mostra, numa
sessão do Podsfine com o TF37 Pro:

- 183 escritas GATT do app e ~178 notificações, todas no **handle 7** (valor da `2AAC`;
  declaração no 6, como reporta o BlueZ).
- Tamanho das notificações (mensagem ATT, inclui 3 bytes de opcode+handle): 12 bytes
  (131x) → **9 bytes de dados, o tamanho exato de um ACK `FD`**; 17 bytes (18x) e 21
  bytes (9x) → 14 e 18 bytes de dados, compatíveis com respostas `DF`.

Coerente com o formato DF/FD; os bytes em si ainda não foram vistos.

## Validar

1. Captura HCI do app real: conferir que as escritas em `2AAD` começam com `DF` e que o
   checksum bate (`tools/btsnoop_att.py`).
2. Só então enviar um comando de leitura (`F3/00`) por uma ferramenta própria, com o
   comando, a origem e o efeito mostrados ao usuário antes.
