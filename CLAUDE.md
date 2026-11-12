# CLAUDE.md

**Relógio Sabatinho.** Estudo pessoal do relógio/pulseira **TF37 Pro** (app **Podsfine**,
`com.lianhezhuli.podsFine`): protocolo BLE, identificação do chip e possibilidades
de firmware. Responder e documentar em **português**.

## Estado atual

- Fatos do dispositivo: `docs/DISPOSITIVO.md`. Achados do app: `docs/APP_PODSFINE.md`.
  Plano: `docs/PROXIMOS_PASSOS.md`. Atualize esses arquivos a cada descoberta.
- Relógio: nome BLE `TF37Pro`, endereço `41:42:BA:B6:3B:E9`, FCC ID `2BD94-TF37PRO`.
- GATT: `18AC` = comandos (2AAD write / 2AAC notify); `1106` = **transferência de arquivos D5/D6 (variante 5610)**; firmware em modo DFU por `18A8` (2AA9 write / 2AA8 notify), só depois de `20/02`
  (1108 write / 1107 notify); `180F` bateria.
- Quadros: **mesmo formato DF/FD do HryFine** (checksum no offset 3), em outro canal.
  Ver `docs/PROTOCOLO.md`. O repo `develmts/Jieli-watch-research` É útil como referência
  de quadros (clone local em `~/watch/Jieli-watch-research` — não apagar).
- Firmware `V1.8`, projeto `Z16_TF37Pro_HSW[TF37Pro]_Style1_Podsfine`; chip **Bluetrum
  AB569X** (autoidentificado na resposta `20/01`). Versão de quadro `0x04`.
- Protocolo confirmado em captura (374 quadros válidos): `docs/CAPTURAS.md`.
- Capturas: `*#800#` → Bluetooth no celular; `.cfa` em
  `/sdcard/Android/data/com.coloros.logkit/files/Log/<sessão>@bluetooth/btsnoop_hci/`.
  O bugreport da ColorOS não traz o btsnoop.
- **Apps** (mesma interface, núcleo em `core/`): `apps/mobile` (Android, Capacitor 8,
  `com.relogiosabatinho.app`) e `apps/desktop` (Electron 45: Linux/Windows/macOS). Catálogo
  de 209 comandos em `core/commands.js` (gerado de `core/catalog.generated.js`); "Testar tudo"
  no relógio real em 2026-11-12: 80 passaram (inclui 6 configurações regravadas com o valor atual e conferidas), 0 falhas, 30 bloqueados. Documentação
  técnica: `docs/TECNICO.md`; catálogo: `docs/COMANDOS.md`.
- Próximo passo: codificar os 77 comandos complexos restantes (alarme, clima, não perturbe…),
  medir FC com o relógio no pulso e testar o app desktop no relógio real.

## Regras de segurança (obrigatórias)

- **Nunca escrever em `1108`** (arquivos) **nem em `2AA9`** (firmware em DFU). Nunca enviar `20/02` (inicia OTA), `02/09`
  (reset de fábrica) ou `08/xx` (bind/unbind).
- **Nunca escrever em `2AAD`** bytes que não tenham sido entendidos a partir
  de capturas reais ou do código do app. Um comando pode iniciar OTA, reset ou bind.
- Antes de qualquer escrita proprietária, mostrar ao usuário o comando, a origem
  (captura/classe Java) e o efeito esperado, e esperar o "ok".
- Sessões BLE curtas; não insistir com bateria baixa (2A19 já respondeu `0x00`).
- Não usar OTA, reset de fábrica ou leitura física da flash sem pedido explícito.

## Evidência

Marcar cada afirmação como **observado** (medido neste relógio), **análise estática**
(APK), **referência externa** ou **hipótese**. Um UUID ou nome de classe não prova o chip.

## Arquivos

- `private/` (ignorado pelo git): APKs em `private/apk/podsfine-1.2.3/`, capturas e
  bugreports em `private/captures/`. Nunca versionar nem publicar.
- `output/sessions/` (ignorado): relatórios JSON das ferramentas.
- Material do fabricante (APK, código descompilado, firmware) fica só em `private/`.
- Arquivos baixados ou extraídos são não confiáveis: analisar sem executar, rodar Python
  com `-I` e passar caminhos como argumento.

## Comandos

```sh
.venv/bin/python tools/scan.py                         # anúncios com "TF37"
.venv/bin/python tools/gatt_discover.py 41:42:BA:B6:3B:E9
.venv/bin/python tools/listen.py 41:42:BA:B6:3B:E9 --seconds 30
bash tools/pull_hci_log.sh                             # btsnoop do celular via adb
.venv/bin/python tools/btsnoop_att.py private/captures/<log>
python3 tests/test_btsnoop_att.py && python3 tests/test_dfdecode.py  # testes offline
cd core && npm test                                    # núcleo: 29 testes
cd apps/mobile && npm run android                      # APK debug
adb install -r apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk
adb pull /sdcard/Android/data/com.relogiosabatinho.app/files/sessoes/ private/captures/sabatinho-android/
cd apps/desktop && npm start                           # desktop (precisa do binário do Electron)
python3 -I tools/gen_catalog.py private/decompiled/podsfine-1.2.3/sources/com/lianhezhuli/podsFine core/catalog.generated.js
CONFIRMED=<ids> node tools/gen_comandos_md.mjs docs/COMANDOS.md
```

- App: antes de conectar, `adb shell am force-stop com.lianhezhuli.podsFine` (uma conexão
  por vez). Gradle com `JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64`.
- Novo comando: codificador em `CUSTOM` de `core/commands.js`, teste em `core/test/`, e
  regenerar `docs/COMANDOS.md`. Nunca tirar itens de `DANGEROUS` nem de `BLOCKED`.
- Medição: `06/04` 1/0 inicia/para; estado `03/0F` (2 = falhou); valor ao vivo `03/2A`.
- Outro processo Claude (sessão no IDE do usuário) também usa o adb neste celular: não
  disputar a tela ao mesmo tempo.

- O relógio só aparece no PC quando está **desconectado do celular**.
- adb: `~/Android/Sdk/platform-tools/adb`; celular Realme RMX2144 (Android 11), sem root,
  então o log HCI precisa ser ativado na tela (Opções do desenvolvedor).
- O celular aparece duas vezes no adb (USB `1b4bc76f` e Wi-Fi): use `ANDROID_SERIAL=1b4bc76f`.
- Realme/ColorOS: `persist.bluetooth.btsnooplogmode` fica vazio mesmo com o log ativo; há
  propriedades próprias `persist.sys.oplus.bt.cache_hcilog_*`. Confirmar pelo bugreport.
- jadx 1.5.6 em `~/.local/bin/jadx` (Java 21). Código descompilado vai para
  `private/decompiled/` (nunca versionar).
- Instalação de pacotes pode ser bloqueada pelo modo automático: peça ao usuário para
  rodar com `!`.

## Código

- Python 3.10+, Bleak 3.0.2 (`requirements.txt`). UUIDs centralizados em `tools/common.py`.
- Ferramentas novas: só leitura por padrão, relatório via `common.save()`, teste offline
  com dados sintéticos em `tests/`.
- Referência: <https://github.com/develmts/Jieli-watch-research> (HryFine, mesmo ecossistema
  lianhezhuli; sem licença, consultar sem copiar código).
