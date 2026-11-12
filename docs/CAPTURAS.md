# Capturas HCI do Podsfine com o TF37 Pro

## Como foram obtidas (Realme RMX2144, ColorOS / Realme UI 2)

O `adb bugreport` desta ColorOS **não inclui** o `btsnoop_hci.log`, e o adb não pode
nem ler as propriedades do log HCI. O caminho que funcionou:

1. Opções do desenvolvedor → registro HCI ligado; reiniciar o celular.
2. Discar `*#800#` → registro de **Bluetooth** → gravar → usar o Podsfine → parar.
3. Os logs ficam em
   `/sdcard/Android/data/com.coloros.logkit/files/Log/<data>@bluetooth/btsnoop_hci/`
   com extensão **`.cfa`**, mas são btsnoop padrão (H4, datalink 1002).
4. `adb pull` da pasta `btsnoop_hci` → `private/captures/logkit-<sessão>/`.

`cached_hci/` contém logs antigos de **todos** os aparelhos Bluetooth do celular
(desde 2026-08-31). Ficam só em `private/`.

## Arquivos analisados

| Arquivo | Conteúdo |
|---|---|
| `btsnoop_hci_20261112_000702.cfa` | Reconexão após reiniciar o celular + sincronização inicial: 402 eventos ATT, 344 quadros DF/FD |
| `btsnoop_hci_20261112_001205.cfa` | Sessão curta com medição em tempo real e bateria: 30 quadros DF/FD |
| `cached_hci/btsnoop_hci_20261012_225549.cfa` | Contém o endereço do relógio (2026-10-12), mas nenhum tráfego ATT |

Pipeline:

```sh
.venv/bin/python tools/btsnoop_att.py <arquivo.cfa> --json private/captures/analise/<nome>.json
python3 tools/dfdecode.py private/captures/analise/<nome>.json [--summary]
```

**Resultado: 374 quadros DF/FD, todos com checksum e tamanho válidos** (após remontar os
quadros longos divididos em várias notificações/escritas).

## Achados (observado)

- Canal: escritas do app no **handle 0x000A** (valor de `2AAD`), notificações do relógio
  no **handle 0x0007** (valor de `2AAC`). O canal de OTA `1106` não foi usado.
- MTU negociado pelo app: 0x64 (100) após um pedido inicial de 0xF7.
- **Byte de versão = `0x04`** em todos os quadros do relógio; o app passa a usá-lo depois
  da primeira resposta (as três primeiras escritas saem com `00`).
- **Firmware: `V1.8`**, projeto **`Z16_TF37Pro_HSW[TF37Pro]_Style1_Podsfine`** (resposta
  `02/17`). "HSW" coincide com Hongsheng Wang, o fabricante do manual.
- **Chip: o relógio se identifica como `AB569X`** na resposta de OTA `20/01`
  (`6a7adcd4 04 "V1.8" 06 "AB569X"`). AB569X é uma família de SoC Bluetooth da
  **Bluetrum**, o que confirma a pista do APK (`com.bluetrum.abpartool`). É a
  autoidentificação do firmware, não uma inspeção física.
- Recursos (`00/00`): 41 bytes de payload começando com `01 ff 01 02`; mapa de bits
  ainda não interpretado.
- ACK `FD` neste relógio tem **10 bytes** (`FD 00 06 SUM CMD 04 KEY 00 01 00`), um a mais
  que o ACK de 9 bytes descrito para o HryFine.
- Bateria: `11/00` respondeu payload `00`, e `2A19` também leu `0x00`. Ou a bateria
  está mesmo baixa, ou o campo tem outro significado. Comparar com o relógio carregado.
- Sessão `001205`: o app enviou `02/02 01` e `02/03 01` (ligar esporte/saúde em tempo
  real) e depois `… 00` para desligar; o relógio mandou `04/00` com payload
  `000000000000000000000054`: passos de hoje = 0, distância = 0, calorias = 84 (3×u32 BE; `BleDataUtils.handleSportData`, análise estática), **não** frequência cardíaca.
- O app também envia `08/00` (bind, com um ID de 8 caracteres), `02/08` (hora),
  `18/06`, `09/00`, `0C/00` e `04/19` (uma string em base64 de ~60 caracteres,
  possivelmente um token: **não copiar para a documentação**).

## Em aberto (resolvido por análise estática em 2026-11-12)

Todos os itens que estavam aqui foram interpretados em
[ENGENHARIA_REVERSA.md](ENGENHARIA_REVERSA.md) e [comandos/RECEBIDOS.md](comandos/RECEBIDOS.md):
mapa de recursos `00/00` (com os valores deste relógio em `comandos/recursos.json`), `18/06`
(hora + GPS do celular), `27/06` (MTU = 100), `01/02`/`01/03` (início/fim do sync), `03/08` →
`03/09` (limiares de FC), `02/1F` (tempo de tela), `02/3E`/`02/40`/`02/42` (lembretes de
exercício, leitura, viagem), `02/47` (nº de alarmes), `04/00` (passos/distância/calorias) e
`02/06` (configurações em TLV). Falta **confirmar no relógio** os sensores de saúde (FC, SpO2,
PA, estresse) com o relógio no pulso.
