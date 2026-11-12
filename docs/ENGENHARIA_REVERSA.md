# Engenharia reversa do Podsfine: comandos, sensores e sistema

Complementa o catálogo gerado [COMANDOS.md](COMANDOS.md) (o que o app de testes codifica e o que o relógio confirmou) com a **interpretação** de cada comando, as respostas e os sensores.

Engenharia reversa **estática** do Podsfine 1.2.3 (`CommandUtils`, `NotifyWriteUtils`,
`BleDataUtils`, `SleepUtils`, `MBleManager`, `ble/ota/*`, manifest e assets), feita em
2026-11-12. Os resultados foram cruzados com os quadros **observados** nas capturas HCI
([CAPTURAS.md](CAPTURAS.md)). Nenhum comando novo foi enviado ao relógio nesta etapa.

Todos os números estão em hexadecimal; o código Java usa decimal. Formato do quadro e
checksum: [PROTOCOLO.md](PROTOCOLO.md).

## Onde está cada coisa

| Arquivo | Conteúdo |
|---|---|
| [comandos/ENVIADOS_1.md](comandos/ENVIADOS_1.md) | 88 comandos app → relógio (`CommandUtils` até a linha 916): leituras, configurações, hora, fuso, perfil, alarmes, clima, notificações, mostradores, OTA |
| [comandos/ENVIADOS_2.md](comandos/ENVIADOS_2.md) | 123 comandos app → relógio (linha 920 em diante): fones, IA, álbum, vídeo, ciclo, GPS, lembretes, metas, medições automáticas. Inclui a coluna "aplica ao TF37" |
| [comandos/RECEBIDOS.md](comandos/RECEBIDOS.md) | 101 tipos de quadro relógio → app: recepção, ACK, remontagem, handshake, layouts de saúde, sono, esporte, configurações, alarmes, eventos espontâneos, mapa de recursos e os quadros observados interpretados campo a campo |
| [comandos/SISTEMA_OTA_REDE.md](comandos/SISTEMA_OTA_REDE.md) | Scan, conexão e sequência de inicialização; os dois protocolos de OTA; transferência de arquivos (mostradores, contatos, álbum, vídeo); câmera e áudio; servidores e privacidade; manifest |
| [comandos/comandos.json](comandos/comandos.json) | Tudo acima em formato de máquina: `enviados[]` (211 entradas, cada uma com cmd, key, nome, explicação, payload, resposta, risco e fonte), `recebidos[]` (101) e `recursos[]` |
| [comandos/recursos.json](comandos/recursos.json) | Mapa de recursos `00/00`, com 146 campos de byte/máscara; `tf37_observado` traz o valor lido do quadro real deste relógio |
| [comandos/sistema.json](comandos/sistema.json) | Sequência de conexão (22 passos), opcodes de OTA, endpoints (sem segredos) |

Os riscos dos 211 comandos de saída: leitura 67, ação reversível 48, configuração 85,
**perigoso 11**.

## Sensores do TF37 Pro

O relógio declara os sensores e funções no bloco de recursos `00/00`. Os valores abaixo
vêm da **resposta real deste relógio**, interpretada pelo `readFeatures` do app. São o que
o **firmware declara**, não uma inspeção do hardware.

| Sensor / função | Declarado | Como os dados chegam | Como pedir |
|---|---|---|---|
| **Acelerômetro (G-sensor)** | sim (`haveGSenor=1`, `gSenorFun=2`) | passos, distância e calorias de hoje `04/00` (3×u32 BE); por hora `04/01`; tempo real com `02/02 01` | sync `01/00` (tudo) ou `01/01` (hoje) |
| **Sono** (acelerômetro + algoritmo) | sim; **algoritmo 5610** (`is5610AlgSleep`), sono automático | `04/10`: fases `[início u16, fim u16, modo]` em minutos do dia, com modo 1 = leve, 2 = profundo, 3 = REM; mais cochilos | sync; janela de sono na tag 04 do `02/06` (observado 22:00–08:00) |
| **Óptico (PPG): frequência cardíaca** | sim (`haveHr=1`, `hrFun=2`) | histórico `03/00`; estado `03/0F`; valor ao vivo `03/2A` `[1][bpm]` | medir `06/04`; automática `02/0B` (observado a cada 30 min) |
| **Alerta de FC alta/baixa** | sim | limiares em `03/09` (observado: alta e baixa desligadas, 120 e 45 bpm) | ler `03/08`; gravar `03/0A` |
| **Pressão arterial** (estimada pelo PPG, sem manguito) | PA automática declarada | histórico `03/01` `[…][sist][diast]`; estado `03/15` | medir `06/05`; automática `02/4B` |
| **SpO2** | **incerto**: `supportBoAutoTest` desligado; `hrFun=2` pode ou não incluir SpO2 (hipótese) | histórico `03/02`; estado `03/12`; ao vivo `03/2A` `[2][%]` | medir `06/06` (testar para saber) |
| **Estresse** (derivado do PPG) | sim (`supportPressure`, automático) | histórico `03/07`, registros de 3 bytes `[min u16][valor]`; estado `03/29` | medir `06/12`; automática `02/43` (observado a cada 60 min) |
| **VFC (HRV)** | não (`supportHrvFunction` desligado; byte 50 ausente) | `03/32` | `06/16` (provavelmente sem efeito) |
| **Temperatura** | não (sem automática nem diário) | `03/03`, `03/2F`, `03/31` | `06/15`, que provavelmente não tem efeito |
| **GPS** | não (`haveGps=0`) | o relógio recebe a posição do celular em `18/06` | — |
| **Bateria** | sim, por comando | `11/00` (pedido) e `11/01` (espontâneo): % no último byte; `11/05` carregando; `11/06` limiar de bateria baixa (`01` = 20 %) | `11/00` |
| **Vibração, tela, toque, botão** | levantar o pulso e acordar por toque declarados | eventos `07/xx` (câmera, música, encontrar celular, pedido de hora) | `06/00` vibra ("encontrar relógio"); `06/0F` para |

Registro de saúde (FC, PA, SpO2, temperatura, VFC): `data(2) | n(2) | n × 8 bytes`, com
cada registro `[segundos desde 0h u32][modo][auto][sistólica ou inteiro][valor]`. A data
de 2 bytes é ano (6 bits, +2000) | mês (4) | dia (5); por exemplo `35 6B` = 2026-11-11.
Valores de FC/PA/SpO2 de sensor óptico barato são **estimativas**, não medidas clínicas.

## Correções ao que já estava documentado

1. **`1106/1107/1108` não é o canal de firmware.** É o canal de **arquivos** (protocolo
   `D5/D6` com CRC-8: mostradores, papel de parede, contatos, álbum…), usado quando
   `is5610Type` está ligado (bit 24.3 dos recursos; **ligado neste relógio**). O firmware
   vai por `20/02` (o relógio reinicia em modo DFU) e depois pelo serviço **`18A8`**
   (write `2AA9`, notify `2AA8`), que só aparece em modo DFU. A regra de nunca escrever em
   `1108` continua valendo: o canal grava na flash.
2. **`04/00` = passos, distância e calorias de hoje**, não frequência cardíaca. O
   `0x54 = 84` observado está no campo de calorias.
3. **ACK:** `FD 00 06 SUM CMD VER KEY 00 01 STATUS`, com STATUS `00` = ok e `03` =
   checksum errado (o app espera retransmissão). O app confirma **todo** quadro DF antes
   de processá-lo e manda **um comando por vez**, esperando o ACK (timeout de 100 s).
4. **VER:** vem só da resposta `00/00` (byte 5). Com VER ≥ 1 o app manda o fuso (`09/00`)
   antes da hora.
5. **Itens antes em aberto:**
   - `0C/00`: código único de OTA
   - `18/06`: hora + GPS do celular
   - `04/19`: licença GoMore; vem do servidor depois de `04/18`, que é o ID do relógio
   - `09/00`: fuso, `[sinal][horas]`
   - `27/06`: MTU; o relógio responde `0064` = 100
   - `01/02` e `01/03`: início e fim da sincronização
   - `03/08` → `03/09`: limiares de FC
   - `02/1F`: tempo de tela
   - `02/3E`, `02/40` e `02/42`: lembretes de exercício, leitura e viagem
   - `02/47`: número de alarmes
   - `08/00` resposta `02`: já vinculado; `01` = primeiro vínculo, `03` = recusado
6. **Scan:** o app aceita o aparelho se o manufacturer data (em hex) contém `31`, `32` ou
   `33`; o deste relógio começa com o company ID `0x314C`. O modo DFU aparece com `56 10`
   no anúncio e com o MAC cujo último byte é `XOR 0x55`.
7. **`F3/00`** é enviado, mas o app não tem parser para a resposta.

## Comandos perigosos (nunca enviar sem decisão explícita)

| cmd/key | Efeito |
|---|---|
| `02/09` | restaurar padrão de fábrica |
| `06/09` | **desligar o relógio** (`sendShutDown`) |
| `06/0A` | reiniciar |
| `08/00`, `08/01` | vincular / desvincular |
| `0C/02` | etapa do OTA (versões por partição) |
| `20/02` | entrar em OTA/DFU |
| `2E/01`, `36/04` | apagar foto do álbum / gravação (provavelmente não se aplicam) |
| qualquer escrita em `1108` ou `2AA9` | gravação de arquivo/firmware na flash |

Alguns números são reaproveitados por outras famílias de relógio com significado diferente:
no HryFine, `06` = reset e `0A` = leitura de flash. Ver [PESQUISA_GITHUB.md](PESQUISA_GITHUB.md).

## Bugs e armadilhas do app oficial (não copiar)

- `sendGPS` (`18/06`) apaga o bit de sinal das coordenadas; no Brasil, onde latitude e
  longitude são negativas, o relógio recebe valores errados. O relógio mundial (`26/01`)
  usa sinal-magnitude corretamente.
- `sendRequestHrv` manda key `15` (temperatura); o comando certo de VFC é `06/16`.
- Clima de vários dias com nome de cidade com menos de 5 bytes estoura o `arraycopy`: o
  último dia e a cidade vão zerados.
- Textos são cortados no meio de caracteres UTF-8; alguns tamanhos são lidos com sinal.
- Lembretes `02/3C` e `02/4A` somam os bytes do intervalo em vez de deslocá-los.
- A repetição do sedentário usa bits invertidos (dia 1 = bit 7); a do alarme e a da água,
  dia 1 = bit 0.

## Testes no relógio: o que falta e como fazer

O "Testar tudo" do app já confirmou 73 comandos (✓ em [COMANDOS.md](COMANDOS.md)). A tabela de sensores diz o que o firmware **declara**; para confirmar quais sensores **medem** de verdade,
são estes os testes, todos de leitura ou ação reversível. Pelas regras do
[CLAUDE.md](../CLAUDE.md), cada comando precisa ser mostrado e receber "ok" antes de ir
ao relógio. Uma conexão por vez: fechar o Podsfine antes.

| # | Enviar | Esperar | Responde a |
|---|---|---|---|
| 1 | `11/00 00` | `11/00` com % no último byte | a bateria real é 0? (comparar com a tela) |
| 2 | `06/04 01` (medir FC), com o relógio no pulso | `03/0F` estados e `03/2A [01][bpm]`; histórico em `03/00` | o PPG mede FC |
| 3 | `06/06 01` (medir SpO2) | `03/12`, `03/2A [02][%]` ou só ACK | SpO2 existe? (bit incerto) |
| 4 | `06/05 01` (medir PA) | `03/15`, `03/01` | PA estimada |
| 5 | `06/12 01` (estresse) | `03/29`, `03/07` | estresse |
| 6 | `06/15 01` (temperatura) | ACK sem dados (esperado) | confirma ausência |
| 7 | `02/02 01`, depois `02/02 00` | `04/00` ao vivo enquanto anda | acelerômetro em tempo real (já visto) |
| 8 | `01/00 01` (sync) | `01/02` … `04/01`, `04/10`, `03/00` … `01/03` | histórico de passos, sono e FC |
| 9 | `02/06 01` | configurações TLV | estado atual (já visto) |
| 10 | `06/08` | lista de alarmes | leitura de alarmes |

Os payloads exatos (`01` = iniciar, `00` = parar) estão em
[comandos/ENVIADOS_1.md](comandos/ENVIADOS_1.md) e no `comandos.json`. Confira cada um
lá antes de incluí-lo no app.

## Privacidade

O app oficial envia para servidores:
- MAC do relógio, dados de saúde (inclusive ciclo menstrual) e treinos;
- localização (clima e "guardião") e logs;
- um ID do relógio, que vai para a GoMore;
- áudio e texto, que vão para a IA da elejo.

Ele também permite HTTP sem TLS para qualquer host, e o firmware de OTA não tem assinatura
nem hash. Detalhes em [comandos/SISTEMA_OTA_REDE.md](comandos/SISTEMA_OTA_REDE.md).
Payloads que contêm a licença GoMore (`04/19`), coordenadas (`18/06`) ou o código de
vínculo (`08/00`) não aparecem nesta documentação.

## Assets do APK que podem ajudar o app

- `assets/preview/` tem 493 prévias PNG de mostradores, em base64. O nome de cada
  arquivo é `md5((faceCode + ".png").toLowerCase())`, então dá para mostrar a imagem do
  mostrador instalado a partir do código lido do relógio (`0B/01`). Neste relógio o
  byte 17 dos recursos é `00` (sem troca de mostrador), então o uso é limitado. Os
  arquivos são do fabricante: ficam só em `private/`.
- `assets/sportRecord.json`: exemplo de registro de treino do app.
