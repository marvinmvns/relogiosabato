// Gera docs/COMANDOS.md a partir de core/commands.js (o mesmo catálogo que o app usa).
// Uso: node tools/gen_comandos_md.mjs docs/COMANDOS.md
import { writeFileSync } from 'node:fs';
import { COMMANDS, RESPONSES } from '../core/commands.js';
import { defaults } from '../core/session.js';

const GROUPS = {
  leitura: 'Leituras', saude: 'Saúde e medições', acao: 'Ações', notificacao: 'Notificações', config: 'Configurações',
  mostrador: 'Mostradores', midia: 'Mídia e câmera', fone: 'Fones', ai: 'IA e voz', sistema: 'Sistema',
  vinculo: 'Vínculo', ota: 'Atualização (OTA)',
};
const hx = (n) => n.toString(16).padStart(2, '0').toUpperCase();
const cell = (s) => String(s ?? '').replace(/\|/g, '/').replace(/\n/g, ' ');

const lines = [
  '# Catálogo de comandos do TF37 Pro',
  '',
  'Gerado por `tools/gen_comandos_md.mjs` a partir de `core/commands.js`, que por sua vez vem de',
  '`tools/gen_catalog.py` (leitura textual do `CommandUtils.java` do Podsfine 1.2.3). Não editar à mão.',
  '',
  'Evidência: **análise estática**, exceto os comandos marcados ✓, que o relógio real confirmou',
  '(ACK `FD` com status 0 ou resposta `DF`) no "Testar tudo" de 2026-11-12.',
  '',
  'Riscos: **seguro** (leitura ou ação transitória), **altera-config** (muda configuração persistente),',
  '**perigoso** (OTA, fábrica, vínculo, apagar dados, transferência, códigos pessoais, desligar: nunca enviado).',
  '',
  `Total: ${COMMANDS.length} comandos; ${COMMANDS.filter((c) => c.implemented).length} com codificador; `
    + `${COMMANDS.filter((c) => c.risk === 'perigoso').length} perigosos.`,
  '',
];

const CONFIRMED = new Set(process.env.CONFIRMED ? process.env.CONFIRMED.split(',') : []);

for (const [g, title] of Object.entries(GROUPS)) {
  const items = COMMANDS.filter((c) => c.group === g);
  if (!items.length) continue;
  lines.push(`## ${title} (${items.length})`, '', '| cmd/key | Comando | Método | Risco | Payload padrão | Descrição |', '|---|---|---|---|---|---|');
  for (const c of items) {
    let payload = '—';
    if (c.encode) {
      try { payload = c.encode(defaults(c)).map(hx).join(' ') || '(vazio)'; } catch (e) { payload = `erro: ${e.message}`; }
    }
    lines.push(`| ${hx(c.cmd)}/${hx(c.key)} | ${cell(c.label)}${CONFIRMED.has(c.id) ? ' ✓' : ''} | \`${c.method}\` | ${c.risk} | ${cell(payload)} | ${cell(c.description)} |`);
  }
  lines.push('');
}

lines.push('## Respostas interpretadas pelo app', '', '| cmd/key | Nome | Formato |', '|---|---|---|');
for (const r of RESPONSES) lines.push(`| ${hx(r.cmd)}/${hx(r.key)} | ${cell(r.name)} | ${cell(r.description)} |`);
lines.push('', '## OTA (só documentado)', '',
  'O Podsfine atualiza o firmware por `ble/ota/*` (`OTAUtils`, `Cus5610OTAUtils`, `MultipleOTAUtils`).',
  'Neste relógio o bloco de recursos marca a variante 5610, então o OTA usaria o serviço `1106`',
  '(`1107` notificação, `1108` escrita), depois de `20/02` (iniciar). A resposta de `20/02`: 1 bateria',
  'baixa, 2 música tocando, 3 em chamada; outro valor, a atualização começa. Nada disso é implementado',
  'ou enviado pelo Relógio Sabatinho.', '');

writeFileSync(process.argv[2], lines.join('\n'));
console.log(`${process.argv[2]}: ${COMMANDS.length} comandos`);
