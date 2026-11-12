# App Podsfine: análise estática inicial

Versão analisada: **1.2.3** (versionCode 73, minSdk 24, targetSdk 36), instalada da
Play Store em 2026-11-11 e copiada do celular com `adb pull`. Os APKs ficam em
`private/apk/podsfine-1.2.3/` (não versionados).

| Arquivo | SHA-256 |
|---|---|
| base.apk | `8b54ddfea04de003bd40599a58689bccb1d7aa4fe70d715073c950872d987f1a` |
| split_config.arm64_v8a.apk | `197ac695712594359d7f81d307113e8dbb9778e3612db50d9c206738aaca5772` |
| split_config.pt.apk | `e54da6214d1090843135d76461345042fcca337827ff2dcd59a56f3cf014cee6` |
| split_config.xxhdpi.apk | `018111818ebf8f2ced0367ded27b64f455025c9f89f49b773f3436b381107794` |

Método até aqui: apenas `strings` sobre os `classes*.dex`, sem descompilar e sem
executar nada. Ainda não há código Java reconstruído.

## Achados

- Os seis UUIDs do relógio (`18AC`, `2AAC`, `2AAD`, `1106`, `1107`, `1108`) aparecem
  em `classes2.dex` (e `2AAC` também em `classes3.dex`): confirma que este app fala
  com o TF37 Pro.
- Código BLE em `com.lianhezhuli.podsFine.ble`, com subpacotes `bean`, `utils`
  (`CommandUtils`), `ota`, `listener`, `enums`, `recordAudio`, `infoutils` e a classe
  `MBleManager`. Usa a biblioteca [BLESSED](https://github.com/weliem/blessed-android)
  (`com.welie.blessed`).
- Classes de OTA: `OTAUtils`, `OTACommandUtils`, `OTANotifyWriteUtils`,
  `MultipleOTAUtils`, `Cus5610OTAUtils`, `Cus5610CommandUtils`,
  `Cus5610OTANotifyWriteUtils`.
- `recordAudio` com `OpusToPcmDecoder` e `BlePacketDispatcher`: áudio Opus via BLE
  (provavelmente para fones/gravação; papel no TF37 Pro desconhecido).
- **Pista de chip:** `com.bluetrum.abpartool.ParTool` + `lib/arm64-v8a/libabpartool.so`
  (Bluetrum). O mesmo app atende fones de ouvido, então isso não prova o chip do
  relógio.
- Outros SDKs: `com.elejo.obtunesdk`, `com.watchda.sportlib`, mapas Tencent,
  ffmpeg-kit, sqlcipher, Bugly.

## Próximo passo nesta frente

Descompilar com [jadx](https://github.com/skylot/jadx) e ler `MBleManager`,
`utils/CommandUtils` e `ota/*` para obter: formato do quadro, checksum, lista de
comandos e qual UUID cada um usa. Cruzar com uma captura HCI real.
