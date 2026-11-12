# Relógio Sabatinho: documento técnico

Aplicativo e protocolo do relógio/pulseira **TF37 Pro** (app oficial Podsfine,
`com.lianhezhuli.podsFine` 1.2.3). Estudo pessoal de interoperabilidade.

Níveis de evidência usados aqui: **confirmado** (visto em captura ou no relógio real),
**análise estática** (código descompilado do Podsfine) e **hipótese**.

## 1. Visão geral

```
                ┌────────────── core/ (JavaScript puro, testado em Node) ─────────────┐
                │ protocol.js  quadros DF/FD, checksum, ACK, remontagem, hora          │
                │ commands.js  catálogo de comandos extraído do Podsfine (+ parsers)   │
                │ measure.js   decodificadores de medição (FC, passos, histórico)      │
                │ session.js   conexão, notificações, ACK, envio, espera de resposta   │
                │ recorder.js  registro JSONL de tudo                                  │
                │ suite.js     "Testar tudo" e relatório                               │
                │ ui/          interface compartilhada (HTML/CSS/JS)                   │
                └──────────────────────────────┬──────────────────────────────────────┘
                     adaptadores ble + store   │
          ┌─────────────────────────────┬──────┴─────────────────────┬──────────────────────┐
  apps/mobile (Android e iOS,           apps/desktop (Electron 45)    apps/web (painel, navegador)
  Capacitor 8)                          ble: Web Bluetooth do         ble: Web Bluetooth (lista
  ble: @capacitor-community/            Chromium + lista própria      nativa do Chrome/Edge)
  bluetooth-le                          store: arquivos via IPC       store: memória da aba,
  store: @capacitor/filesystem + share  (Node fs)                     baixada como .jsonl
  (Android: External; iOS: Documentos)
```

`mountApp` aceita `extraTabs` (`{ id, label, icon, mount(section, ctx) }`). O painel web
usa isso para acrescentar **Depurar** (`core/ui/debug.js`: GATT, decodificador e montador
de quadros, leitor de `.jsonl`) e **Protocolo** (`core/ui/docs.js`, alimentado por
`docs/comandos/comandos.json`). O montador de quadros só calcula bytes e checksum: o único
caminho de envio continua sendo a aba Comandos, com as mesmas travas.

Visual (`core/ui/style.css`): monitor de sinais vitais. Papel milimetrado de ECG no
mostrador e nos gráficos, Big Shoulders Display para títulos e números grandes, Onest para
o texto. Cores com significado fixo: vermelho = relógio, azul = app, âmbar = altera
configuração, vinho = bloqueado, verde = passou.

O núcleo não conhece a plataforma. Cada app fornece dois adaptadores:

| Adaptador | Métodos |
|---|---|
| `ble` | `initialize`, `requestDevice`, `connect`, `disconnect`, `getServices`, `startNotifications`, `read`, `writeWithoutResponse`, `scan` (opcional) |
| `store` | `start(nome)`, `append(texto)`, `writeFile(nome, texto)`, `share` (opcional) |

## 2. Hardware e identidade (confirmado)

| Item | Valor |
|---|---|
| Modelo | TF37PRO, "Smart Band", FCC ID `2BD94-TF37PRO`, Shenzhen Hongsheng wang Technology |
| Firmware | `V1.8`, projeto `Z16_TF37Pro_HSW[TF37Pro]_Style1_Podsfine` (resposta `02/17`) |
| Chip | **Bluetrum AB569X** (autoidentificação na resposta `20/01`) |
| Nome BLE | `TF37Pro` |
| Anúncio | manufacturer data, company `0x314C`: endereço do relógio + `00 01 07` (modo normal termina em `00:01`; em DFU, `56:10`) |
| Recursos (`00/00`) | G-sensor, frequência cardíaca, sedentarismo, 24h, protocolo de mensagem novo, alarme, unidades, relato de bateria; plataforma 10 |

## 3. GATT

| Serviço | Característica | Handle (valor) | Uso |
|---|---|---|---|
| `18AC` | `2AAD` write / write-without-response | `0x000A` | app → relógio (comandos e ACKs) |
| `18AC` | `2AAC` read / notify | `0x0007` | relógio → app |
| `1106` | `1108` write | — | **Transferência de arquivos D5/D6 (mostradores, contatos, álbum). Nunca escrever.** |
| `18A8` | `2AA9` write / `2AA8` notify | — | Firmware (`Cus5610OTAUtils`). Só existe em modo DFU, depois de `20/02`. Nunca escrever. |
| `1106` | `1107` notify | — | OTA: o app só escuta |
| `180F` | `2A19` read / notify | `0x0002`+1 | bateria padrão (lê `0x00` neste relógio) |

MTU: o Podsfine pede `0xF7` e depois `0x64` (100). Escrita sem resposta.

## 4. Quadros DF/FD (confirmado: 374 quadros em captura + sessões do app)

```
DF  LEN_H LEN_L  SUM  CMD  VER  KEY  PLEN_H PLEN_L  PAYLOAD…
 0    1     2     3    4    5    6     7      8       9…
LEN  = tamanho do payload + 5          (total = LEN + 4)
SUM  = soma de todos os outros bytes do quadro, módulo 256
VER  = 0x04 neste relógio (o app começa com 0x00 e adota o valor recebido)

ACK: FD 00 06 SUM CMD VER KEY 00 01 STATUS      (STATUS 0 = ok, 3 = checksum inválido)
```

- O app confirma **todo** quadro DF recebido com um ACK `FD`, como o Podsfine.
- Quadros maiores que o MTU chegam em vários pedaços: o primeiro começa com `DF` e
  declara o tamanho total; os seguintes são continuação. `Reassembler` junta.
- Diferenças em relação ao HryFine documentado em `develmts/Jieli-watch-research`:
  mesmo formato, mas outro canal GATT, ACK com 10 bytes e OTA em `20/xx` em vez de `13/xx`.

Exemplo real (identidade, versão 0, como o app oficial envia):

```
df 00 05 d7 f3 00 00 00 00
            └─ CMD F3, KEY 00, payload vazio; SUM = df+00+05+f3+00+00+00+00 = 0x1d7 → d7
```

## 5. Comandos

O catálogo completo, com layout de payload, risco e resposta de cada comando, está em
[COMANDOS.md](COMANDOS.md) e em código em `core/commands.js` (extraído de
`ble/utils/CommandUtils.java`). Classes de risco:

| Risco | Exemplos | No app |
|---|---|---|
| seguro | leituras, encontrar relógio, medições, câmera, notificação de teste | enviado; entra no "Testar tudo" |
| altera-config | hora, idioma, unidades, alarmes, perfil, não perturbe | enviado só por ação manual ou com a opção ligada |
| perigoso | `20/02` iniciar OTA, `02/09` reset de fábrica, `08/xx` vínculo, reinício (`06/0A`), desligar (`06/09`), apagar dados, transferências, códigos pessoais; e qualquer método com restart/shut/delete/reset/format/bind no nome | **nunca enviado**: bloqueado por `risk` e por `isBlocked` no protocolo |

## 6. Medições (análise estática, parcialmente confirmado)

Inteiros multibyte são big-endian. Datas de 2 bytes (`BleUtils.getDateBean`):
`ano = 2000 + ((b0 & 0x7f) >> 1)`, `mês = ((b0 & 1) << 3) + (b1 >> 5)`, `dia = b1 & 31`.

| Quadro | Conteúdo | Unidades |
|---|---|---|
| `06/04` + `01`/`00` | iniciar/parar medição de frequência cardíaca (`06/06` SpO2, `06/05` pressão, `06/12` estresse) | — |
| `03/0F` | estado da medição de FC: `1` medindo, `0` parado (`03/12` SpO2, `03/15` pressão, `03/29` estresse) | — |
| `03/2A` | **valor ao vivo**: `[tipo, valor]`; tipo 1 = FC, 2 = SpO2 | bpm, % |
| `03/00` | histórico de FC: data(2) qtd(2) + registros de 8 bytes `seg(4) modo(1) auto(1) ?(1) bpm(1)`; o app descarta < 30 bpm | segundos do dia, bpm |
| `04/00` | hoje: passos(4) distância(4) calorias(4) | passos, **metros**, **cal** (÷1000 = kcal) |
| `04/01` | por hora: data(2) qtd(2) + 24 registros de 12 bytes (passos, distância, calorias) | idem |
| `04/02` | sono: data(2) qtd(2) início(2) + segmentos | minutos |
| `02/03` + `01`/`00` | liga/desliga o **envio automático** de dados de saúde (não é medição) | — |

Correção registrada: o `04/00` da captura (`…00 54`) é **84 cal**, não 84 bpm, como
chegamos a supor antes de ler `handleSportData`.

## 7. Registro (JSONL)

Uma linha por evento, em ordem, gravada à medida que acontece:

| Campo | Significado |
|---|---|
| `t`, `seq` | horário UTC e sequência |
| `dir` | `rx` (veio do relógio) ou `tx` (o app enviou) |
| `channel` | `2AAC-bruto` (pedaço como chegou), `2AAC` (quadro remontado), `2AAD`, `2A19`, `1107-OTA`, `anuncio` |
| `kind`, `cmd`, `key`, `version`, `status` | campos do quadro |
| `valid` | checksum e tamanho conferem |
| `hex`, `payload` | bytes |
| `summary`, `text`, `parsed` | resumo, interpretação e campos decodificados pelo catálogo |
| `type` | `sessao`, `evento`, `erro`, `gatt`, `anuncio`, `medicao`, `teste`, `suite` |

Onde fica:

- Android: `Android/data/com.relogiosabatinho.app/files/sessoes/` (puxar com `adb pull` ou botão Exportar).
- Desktop: `Documentos/RelogioSabatinho/sessoes/` (botão Abrir pasta).
- Cada "Testar tudo" também grava `<sessão>-relatorio.md` e `<sessão>-relatorio.json`.

## 8. "Testar tudo"

`core/suite.js` percorre o catálogo na ordem leituras → saúde → ações → notificações →
mídia → configurações. Para cada comando: envia, espera até 3 s por ACK `FD` do mesmo
`cmd/key` ou resposta `DF` do mesmo `cmd`, e classifica em **passou**, **recusou**
(ACK ≠ 0), **sem resposta**, **erro**, **bloqueado** (perigoso) ou **pulado** (altera
configuração com a opção desligada). Comandos que ligam medição contínua ficam 20 s
ligados contando pacotes.

### Regravação de configurações (testa sem alterar)

`core/settings.js` interpreta a resposta `02/06` (`BleDataUtils.handleSettingInfo`):
bloco fixo + campos com etiqueta. Valores reais do TF37 Pro em 2026-11-12:

| Campo | Posição no payload | Valor |
|---|---|---|
| perfil (sexo, altura, peso, idade…) | 0–5 | `01 aa 41 19 01 02` (não interpretado) |
| meta de passos | 6–9 (u32) | 5000 |
| levantar o pulso para acender | 11 | 0 (desligado) |
| idioma | 12 | 0 |
| idiomas suportados | 13–16 (ou 13–17 se os recursos pedirem 5 bytes) | `80 00 00 00` |
| envio automático de esporte / saúde | 17 / 18 | 0 / 1 |
| etiqueta `04` sono | 6 bytes | ligado, 22:00–08:00 |
| etiqueta `05` pulso de uso | 2 bytes | 1 |
| etiqueta `06` FC automática | 9 bytes | ligada, a cada 30 min, 00:00–23:59 |
| etiqueta `07` sedentarismo | 9 bytes | desligado, 45 min, 8h–22h, repetição `0xF8` |
| etiqueta `08`, `0A` (notificações por app) | 2, 12 bytes | 1; onze apps ligados |
| etiqueta `33` | 9 bytes (deduzido) | `03 c3 ff ff 00 00 00 00`, sem interpretação |
| etiqueta `0D` unidades | 3 bytes | distância 0, temperatura 0 |
| etiquetas `19`, `1A`, `1B` | 9, 9, 2 bytes | lidas e ignoradas |

O app oficial para de ler na etiqueta `0x33`, que ele não conhece. Com tamanho 9, as
etiquetas seguintes fecham exatamente no fim do payload, por isso o leitor do Relógio
Sabatinho segue adiante e também obtém as unidades.

Os payloads de `sendSleepSetting` (02/07), `sendHrAutoTestSetting` (02/0B),
`sendSedentaryRemind` (02/0C) e `setDND` (02/11) são idênticos ao bloco das etiquetas
`04`, `06`, `07` e `0C` (sem o byte da etiqueta). O teste confere isso com a resposta real.

No "Testar tudo", `handBright`, `setLanguage`, `setStepTarget`, `setRealtimeSport`,
`setRealtimeHealth`, `sendWearing`, `sendSleepSetting`, `sendHrAutoTestSetting`,
`sendSedentaryRemind` e `setDND` (este só se a etiqueta `0C` vier na resposta) são enviados
com **o valor lido**. No fim, a suíte lê `02/06` de novo e confere que nada mudou (teste
"Configurações inalteradas após regravar").

Com a opção "incluir comandos que alteram configurações", os demais comandos de
configuração rodam com valores de teste e alteram o relógio de verdade. A suíte lê `02/06`
antes e, no fim, devolve tudo o que conseguiu ler (os campos acima, mais unidades e tempo
de tela). Depois confere com uma nova leitura (teste "Configurações iguais às de antes da
suíte"). O que o relógio não informa em `02/06` (formato 24 h, fuso, perfil de som,
interruptores de notificação) fica com o valor de teste.

### Execução completa de 2026-11-12 (com configurações)

Com a opção de configurações ligada: 216 itens, **128 passou**, 4 sem resposta, 54 pulados
(payload complexo ainda não implementado) e 30 bloqueados. Os 50 comandos de configuração
codificados foram aceitos (só `sendChatGptQuziEnd`, 1E/03, ficou sem resposta). As 6
restaurações passaram e a releitura de `02/06` saiu idêntica à de antes. Uma segunda
execução, no modo seguro, confirmou `sendSleepSetting`, `sendHrAutoTestSetting` e
`sendSedentaryRemind` regravando o valor lido. Somando as execuções, 128 dos 141 comandos
codificados foram confirmados; dos 13 restantes, 11 são perigosos e ficam bloqueados.

A medição de FC (`06/04`) apareceu como "sem resposta" porque o relógio estava terminando
uma sincronização de passos e só confirmou com `FD 06/04 00` depois de 6 s. Em seguida
mandou `03/0F` = 1 (medindo) e `03/0F` = 2 (falhou: fora do pulso). A suíte agora aceita um
ACK atrasado dentro da janela de medição, desde que chegue antes do "desligar" (que usa o
mesmo cmd/key).

### Mais regravações (2026-11-12, tarde)

Além de 02/06, a suíte agora lê antes de começar e regrava depois:

| Leitura | Gravação | Formato | Valor real no TF37 Pro |
|---|---|---|---|
| 02/06 etiquetas `19`, `1A`, `1B` | 02/43 estresse, 02/4B pressão, 02/4C sono científico | liga, 0, intervalo u16, início u16, fim u16 (o sono científico tem 1 byte) | ligados, a cada 60 min, 00:00–23:59 |
| 03/08 → 03/09 | 03/0A limites de FC | 03/09: liga, máx, mín, passo, atual (alto e baixo); 03/0A: liga e atual de cada | alto desligado em 120 (110–150), baixo desligado em 45 (40–50) |
| 02/3C, 3E, 40, 42, 4A | 02/3B, 3D, 3F, 41, 49 lembretes | resposta = payload de gravação (`NotifyWriteUtils`) | todos desligados |
| 22/00 | 02/21 água | resposta = payload de gravação | desligado |
| 06/08 | 02/10 alarmes | resposta = payload de gravação (5 bytes por alarme) | `a0 00`: máximo 10, nenhum alarme |

Alarmes e lembretes são **sempre** regravados com o valor lido, mesmo com "incluir
configurações", para nunca apagar o que a pessoa configurou. Se a leitura não vier, o
comando é pulado. Oxigênio (`11`), temperatura (`1C`) e HRV (`1D`) automáticos não aparecem
em 02/06 neste relógio, então ficam pulados. Remédios (02/32) e ciclo menstrual (19/01)
ficaram de fora: o primeiro byte que o app grava em 02/32 é sempre 1, mas o relógio informa
0 nesse campo, e o formato da leitura menstrual não está claro.

**Incidente das unidades.** A execução com configurações de 15:13 enviou `setUnit 01 01`.
Naquela versão, o leitor de 02/06 ainda parava na etiqueta `0x33` e não conhecia as
unidades, então não as restaurou. A leitura das 15:52 mostrou `0d 01 01`. As unidades foram
devolvidas para `00 00` às 16:06 (ACK 0), e uma nova leitura confirmou `0d 00 00`. Ficaram
com os valores de teste, sem leitura para restaurar: formato 24 h (1), fuso (−3), perfil de
som (0), interruptores de notificação (1), carrossel (1), tempo de tela (0), qualidade de
imagem (0), tela sempre acesa (0) e não perturbe o dia todo (0).

Total: 155 comandos codificados, **139 confirmados** no relógio real (63 de configuração).
Faltam `setDND` (sem leitura), os três automáticos que o relógio não informa e
`sendChatGptQuziEnd` (sem resposta). Restam 36 comandos não perigosos sem codificador.

### Última execução completa (16:12, modo seguro)

210 itens: 89 passou, 4 sem resposta, 86 pulados, 30 bloqueados e 1 "erro". O "erro" era a
verificação final: a releitura de 03/09 (limites de FC) não chegou, e a comparação antiga
tratava o campo ausente como mudança. Todos os outros campos relidos estavam iguais. Agora
a comparação é feita campo a campo (`compareSettings`): campo ausente na releitura aparece
como "não relido" e só valor diferente conta como mudança. Os pedidos de 03/08 e 02/06
tentam duas vezes. Os 4 "sem resposta" (02/3E, 02/02, 19/03, 02/0A) passaram em execuções
anteriores: o relógio às vezes demora mais de 3 s enquanto sincroniza.

### Incidente de 2026-11-12: desconexão após a notificação no protocolo antigo

Na segunda execução, logo depois de `sendMsg` (`0A/00` no protocolo **antigo**, sem byte de
tipo), o relógio parou de responder: `sendMsgNewProtocol` e `sendDeleteMsg` ficaram sem
resposta e o link caiu por timeout de supervisão (`reason 8`) 10 s depois. O relógio voltou
a anunciar normalmente (modo normal, não DFU). Ele declara o protocolo de mensagem novo, e a
bateria estava abaixo de 10%, então a causa não é certa. Por precaução `sendMsg` passou a
**perigoso**, e a suíte agora para quando o relógio desconecta.

## 9. Compilar

Requisitos: Node 22+ (testado com 24), JDK 21, Android SDK 36.

```sh
node --test core/test/*.test.js                         # protocolo, medições, catálogo, UI
cd apps/mobile && npm ci && npm run android             # APK debug
adb install -r apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk
cd apps/desktop && npm ci && npm start                  # roda no desktop
npm run dist:linux | dist:win | dist:mac                # pacotes (cada um no seu sistema)
cd apps/web && npm ci && npm run dev                    # painel em http://127.0.0.1:5173
npm run build                                           # dist/ estático (servir em https)
cd apps/mobile && npm run ios                           # sincroniza o projeto Xcode
```

Versões fixadas (publicadas há pelo menos duas semanas na data do build): Capacitor
8.6.0, bluetooth-le 8.3.0, filesystem 8.1.5, share 8.0.3, Vite 8.3.5, Electron 45.1.0,
electron-builder 26.18.1, @capacitor/ios 8.6.0, Onest 5.3.0, Big Shoulders Display 5.3.0.

Notas de plataforma:

- **Android 11**: o scan BLE exige permissão de localização, pedida ao conectar. Falhas
  `GATT 133`/`reason 62` são comuns; o app tenta conectar até 4 vezes.
- **Linux (desktop)**: Web Bluetooth do Chromium precisa de BlueZ e da flag
  `enable-experimental-web-platform-features` (já ligada em `main.cjs`).
- **Windows**: Web Bluetooth funciona com adaptador BLE e Windows 10+.
- **macOS**: requer a permissão de Bluetooth (`NSBluetoothAlwaysUsageDescription` já
  declarada) e assinatura para distribuição.
- **iOS**: o projeto Xcode está em `apps/mobile/ios` (Swift Package Manager, sem
  CocoaPods). `Info.plist` já declara `NSBluetoothAlwaysUsageDescription` e expõe a pasta
  Documentos no app Arquivos (`UIFileSharingEnabled`). Compilar e assinar exige macOS com
  Xcode e uma conta Apple; nesta máquina (Linux) ele só foi gerado, não compilado.
- **Painel web**: Chrome ou Edge (computador ou Android), em https ou localhost. Safari e
  iOS não têm Web Bluetooth. O registro fica na memória da aba até "Exportar registro".
- O relógio aceita **uma conexão por vez**: feche o Podsfine antes.
- `npm audit` aponta vulnerabilidades moderadas na cadeia do electron-builder
  (ferramenta de build, não empacotada no app).

## 10. Segurança e limites

- Nada é escrito no canal de OTA `1108`; `20/02`, `02/09` e `08/xx` são bloqueados em
  duas camadas (catálogo e protocolo).
- Material do fabricante (APK, código descompilado, capturas) fica em `private/`, fora
  do git.
- O comando `04/19` carrega uma string que parece um token do app oficial: o catálogo
  documenta a estrutura, nunca um valor real.
- Código-fonte do firmware não é recuperável; ver [PROXIMOS_PASSOS.md](PROXIMOS_PASSOS.md)
  para os caminhos de firmware (binário) e seus riscos.
