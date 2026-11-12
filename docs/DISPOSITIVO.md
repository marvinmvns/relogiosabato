# TF37 Pro: perfil observado

Datas em UTC. "Observado" = medido neste relógio; "hipótese" = ainda não provado.

## Manual (observado)

- FCC ID `2BD94-TF37PRO`, Shenzhen Hongsheng wang Technology Co., Ltd, produto "Smart Band".
- Botão: segurar 3 s liga/desliga (vibra 3x); **segurar 10 s reseta e reinicia**.
- Indicador luminoso pisca 5 s ao ligar.
- Banda 2402–2480 MHz, potência máxima < 20 dBm.
- App: "podsfine" (Play Store/App Store ou QR code; o QR do PDF tem resolução baixa demais para leitura).

## Anúncio BLE (observado em 2026-11-12)

| Campo | Valor |
|---|---|
| Nome | `TF37Pro` |
| Endereço | `41:42:BA:B6:3B:E9` |
| Manufacturer data | company ID `0x314C` (12620), conteúdo `4142bab63be9000107` |
| Service UUIDs anunciados | nenhum |

O conteúdo do manufacturer data é o próprio endereço (`41 42 BA B6 3B E9`) seguido de
`00 01 07`. Significado dos três bytes finais: desconhecido. `0x314C` não parece ser um
company ID oficial do Bluetooth SIG (hipótese: valor fixo do SDK do fabricante).

## GATT (observado em 2026-11-12, só descoberta)

Handles conforme reportados pelo BlueZ/Bleak (handle da declaração da característica;
o handle do valor costuma ser +1, confirme numa captura).

| Serviço | Característica | Handle | Propriedades | Papel provável |
|---|---|---|---|---|
| `18AC` | `2AAC` | 6 | read, notify | relógio → app |
| `18AC` | `2AAD` | 9 | write, write-without-response | app → relógio |
| `1106` | `1107` | 12 | read, notify | relógio → app (canal 2) |
| `1106` | `1108` | 15 | write, write-without-response | app → relógio (canal 2) |
| `180F` | `2A19` | 2 | read, notify | bateria |

Observações:

- Não há Device Information (`180A`), nem o canal HryFine `6E400001…9F`, nem `FF00`.
- `1106` é, no padrão Bluetooth, "OBEX File Transfer" (Bluetooth clássico); aqui o
  fabricante reaproveitou o número. Os nomes padrão não descrevem a função real.
- A bateria (2A19) respondeu `0x00` em 2026-11-12. Pode ser bateria realmente baixa
  ou campo não preenchido pelo firmware. Comparar com a tela do relógio carregado.
- Análise estática (2026-11-12): no app, `18AC/2AAD/2AAC` é o canal de **comandos** e
  `1106/1107/1108` é o canal de **transferência de arquivos** (D5/D6: mostradores, contatos, álbum) da variante 5610; o firmware usa `18A8`/`2AA9`, que só aparece em modo de atualização. Os quadros são DF/FD, iguais ao HryFine.
  Detalhes em [PROTOCOLO.md](PROTOCOLO.md).

## Em aberto

Chip/SoC, versão de firmware, formato dos comandos, papel de cada canal, modo OTA e
forma de recuperação.
