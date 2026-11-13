# Sabatinho Fit — interface compartilhada

Implementação em `core/ui/fitness.js`, `app.js` e `style.css`, usada por web,
Android/Capacitor e desktop/Electron. Orientações de `CLAUDE.md` preservadas:
nenhuma mudança no protocolo, catálogo, bloqueios ou autorização de escrita BLE.

## Direção visual

Oceano (#126d86), céu (#edf3f8), tinta (#17334c), branco (#ffffff),
rosa de sinal (#b82c50). Tema escuro: fundo #102033, superfície #192d43,
texto #edf5fc e oceano #79d3e1. Onest para navegação e conteúdo;
a fonte condensada existente fica nos instrumentos técnicos.

Layout: navegação lateral no desktop, barra rolável no celular. Tela Hoje
com progresso circular à esquerda, distância/energia e acesso à saúde à direita;
coluna única no celular. Alinhamento à esquerda e números centrados apenas na meta.
A assinatura visual é a trilha circular; não há fotos decorativas nem dados fictícios.

Referências externas consultadas em 13/11/2026:
- [Garmin Connect](https://connect.garmin.com/): organização de atividade e saúde.
- [Garmin: saúde e bem-estar](https://www.garmin.com/en-US/blog/fitness/unlocking-the-potential-of-garmin-connect/): contexto das métricas.
- [W3C: animação de interações](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions): preferência por movimento reduzido.

## Comportamento

- Hoje recebe o quadro DF 04/00 já interpretado pelo núcleo: passos, km e kcal.
  Zero é um valor válido; respostas inconsistentes não substituem o último valor válido.
- A meta é pessoal e local, sem modificar a meta do relógio. Pode ser editada de
  500 a 100.000 passos; não representa uma recomendação de saúde.
- Valores são da sessão atual, com hora de recebimento; sem sincronização aparece “—”.
- Saúde mantém frequência cardíaca, pressão, estresse, SpO₂, temperatura, HRV,
  histórico por meia hora e atividade por hora. Sensores não declarados são identificados.
  Sono e outras métricas sem interpretação validada não são fabricados.
- Temas claro/escuro/sistema e redução de animações são salvos localmente.
  A preferência do sistema por movimento reduzido é sempre respeitada.
- Abas têm painel associado, foco visível e navegação por setas, Home e End.
- Ferramentas técnicas permanecem acessíveis; o registro lateral fica fora das
  telas fitness. Nenhuma conexão BLE foi iniciada na validação visual.

## Validação

62 testes do núcleo; builds web e desktop; APK Android debug com Java 21 e SDK local.
Verificação visual e axe-core em Chromium: temas claro/escuro, larguras 320,
390 e 1440 px nas telas principais; todas as abas em 390 e 1440 px.
Teste de interação: persistência de meta e seleção por teclado. Eventos sintéticos
verificam unidades, zero, descarte de ACK e dados inconsistentes. Auditoria automática
não equivale a certificação WCAG nem a teste com leitor de tela humano.

APK: `apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk`.
Instalado via ADB no Realme RMX2144 após autorização explícita do usuário em
13/11/2026. Validação observada na WebView real: abertura do painel Hoje, troca
para tema claro, redução de movimento, navegação para Saúde (6 canais), retorno
a Hoje e ausência de overflow horizontal. Capturas locais em
`/tmp/sabatinho-adb-new.png` e `/tmp/sabatinho-adb-light.png`.
Nenhum comando BLE foi enviado nessa revisão; medições ao vivo não foram repetidas.

### Fechamento da revisão

- Anel de progresso oculto enquanto não houver passos, inclusive no zero válido.
- Ao voltar ao aplicativo em outro dia, data e estado vazio são atualizados;
  valores da sessão anterior não são apresentados como atividade de hoje.
- Revalidação: 62/62 testes do núcleo, build desktop e APK Android concluídos.
- Auditoria atual em Chromium: Hoje, Saúde e Relógio em 320, 390 e 1440 px,
  claro/escuro, sem violações detectadas pelo axe-core nas regras WCAG A/AA
  executadas e sem overflow horizontal. Meta persistida e navegação por teclado
  verificadas. Eventos sintéticos validam também a mudança de dia.
- Escopo de métricas: todos os decodificadores de saúde e atividade já validados
  do núcleo permanecem disponíveis. Não foi acrescentada estimativa de sono ou
  sensor que o protocolo deste relógio ainda não oferece de forma validada.
