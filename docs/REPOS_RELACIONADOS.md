# Repositórios relacionados no GitHub

Busca feita em 2026-11-12 pela API pública de busca de repositórios do GitHub (sem
login, então sem busca de código). Termos: `podsfine`, `lianhezhuli`, `TF37Pro`,
`TF37 watch`, `Cus5610`, `olywear`, `hryfine`, `bluetrum smartwatch`, `bluetrum watch ble`.

## Resultado

**Nenhum repositório para TF37 Pro, Podsfine, lianhezhuli, Olywear ou Cus5610.**
Nenhum repositório encontrado usa os UUIDs do TF37 Pro (`18AC/2AAC/2AAD`,
`1106/1107/1108`) nos READMEs.

## Mais próximos (referência, não compatíveis)

| Repositório | Relação | UUIDs | Licença/uso |
|---|---|---|---|
| [develmts/Jieli-watch-research](https://github.com/develmts/Jieli-watch-research) | HryFine, mesmo ecossistema lianhezhuli; cita a variante Cus5610 | `6E40…9F`, `FF00` | sem licença: consultar |
| [jsphu/polosmart-pbs163-ble](https://github.com/jsphu/polosmart-pbs163-ble) | Pulseira HryFine; README cita lianhezhuli | `6E40…`, `FF00` | ver repo |
| [kereemsunay/bandbridge](https://github.com/kereemsunay/bandbridge) | Mesma PBS163; CLI macOS + HealthKit; cita JieLi e lianhezhuli | `6E40…` | ver repo |
| [InsertX2k/hryfine_ultra3_com_protocol](https://github.com/InsertX2k/hryfine_ultra3_com_protocol) | Protocolo do "Ultra 3" HryFine | `6E40…`, `FF00–FF02` | ver repo |
| [tiagojr159/app_HryFine_smartwatch](https://github.com/tiagojr159/app_HryFine_smartwatch) | App Android Kotlin genérico para relógios HryFine | não citados no README | ver repo |
| [milcorix/wearfit-pro-ble](https://github.com/milcorix/wearfit-pro-ble) | Outro app (Wearfit Pro), chip **Bluetrum** XunLong; protocolo AB/EA, OTA Bluetrum | `6E40…9E`, `FF12`, `FE59` | MIT |

## O que aproveitar

- **Correção (2026-11-12, após descompilar o app):** o formato de quadro DF/FD dos
  projetos HryFine **é o mesmo** do TF37 Pro; só o canal GATT muda (`18AC/2AAD/2AAC`).
  O `develmts/Jieli-watch-research` é a referência mais próxima para quadros, ACKs e
  comandos de leitura. Ver [PROTOCOLO.md](PROTOCOLO.md).
- Do `wearfit-pro-ble` (referência externa, outro dispositivo): em relógios Bluetrum no
  BlueZ, `StartNotify` pode aceitar o CCCD sem entregar dados; o autor precisou de
  `AcquireNotify`. Se `tools/listen.py` não receber nada, esta é uma causa possível.
  Ele também documenta os serviços de OTA da Bluetrum (`FF12`, `FE59`), úteis se o
  chip Bluetrum for confirmado.

## Refazer a busca

Com o `gh` instalado e autenticado, a busca de código cobre o que a API sem login não
cobre:

```sh
gh search code "000018ac-0000-1000-8000-00805f9b34fb"
gh search code "com.lianhezhuli.podsFine"
gh search code "Cus5610OTAUtils"
```
