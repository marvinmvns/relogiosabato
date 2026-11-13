# Sabatinho Neon — redesign cyberpunk

Substitui a direção visual de `DESIGN_FIT.md`, rejeitada pelo usuário. O pedido
é uma transformação estética com assets 3D e animações tecnológicas, mantendo
as métricas e a segurança do protocolo existentes.

## Direção e implementação

Grafite #090b12, superfícies #121722, ciano #71efff, violeta #bfa4ff e texto
#eff6ff. Onest nos controles e Big Shoulders Display nos títulos e números.
Neon é o tema inicial desta versão; claro, escuro e sistema continuam disponíveis.
Layout: relógio orbital e chamada principal; progresso diário compacto; duas
peças para distância/energia; acesso à saúde com coração 3D. Saúde reúne seis
cartões com objetos próprios. Botões, navegação e ferramentas técnicas usam os
mesmos tokens. Direção conduzida com a skill frontend-design.

- `core/ui/cyber.css`: sistema visual responsivo, iluminação, recortes e movimento.
- `core/ui/assets/neon-models.js`: malhas autorais para relógio, coração, marcador,
  raio, molécula, termômetro, manômetro, sinal de HRV e órbitas de estresse.
- `core/ui/neon-3d.js`: Three.js local, importado sob demanda. Nenhum CDN ou
  download de modelo em execução. Um contexto WebGL compartilhado com os canvases.
- Movimento limitado a 24 fps e às peças visíveis; suspenso com o app oculto.
  Botão de pausa no painel e preferência do sistema por movimento reduzido.
- Peças decorativas não simulam leituras: valores vêm exclusivamente do núcleo.
  Sem WebGL, os símbolos alternativos preservam a navegação e os dados.
- Licença MIT do Three.js distribuída em `public/three-LICENSE.txt` dos três apps.

Em checkout novo, executar `npm ci --prefix core` além das dependências de cada
app. A biblioteca 3D acrescenta aproximadamente 135 kB gzip, carregados à parte.

## Verificação observada — 13/11/2026

- 62 testes do núcleo aprovados; builds Android e desktop concluídos.
- Auditoria axe: Hoje, Saúde e Relógio em 320/390/1440 px, temas Neon/claro/escuro,
  sem violações nas regras WCAG A/AA executadas e sem overflow horizontal.
- Comparação dos pixels do canvas confirma animação, pausa, persistência e
  respeito a `prefers-reduced-motion` (não apenas existência dos elementos).
- APK instalado no Realme RMX2144 por ADB. WebView com dez peças/canvases,
  tema Neon ativo, movimento confirmado por frames diferentes.
- A captura CDP da WebView omite os canvases em alguns frames; a captura física
  via `adb exec-out screencap -p` confirma a composição real com o relógio 3D.
- Não foram enviados comandos BLE nem iniciadas medições nesta revisão.

A auditoria automática não equivale a certificação WCAG nem avaliação humana
com leitor de tela. Os modelos de relógio são representações artísticas.
