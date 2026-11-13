import test from 'node:test';
import assert from 'node:assert/strict';
import { Session } from '../session.js';
import { buildFrame, parseFrame } from '../protocol.js';

// Bluetooth simulado: responde a cada DF com um DF do mesmo cmd/key (versão 4).
function fakeBle({ answer = true } = {}) {
  const sent = [];
  let notify;
  return {
    sent,
    initialize: async () => {},
    requestDevice: async () => ({ id: 'AA', name: 'TF37Pro' }),
    connect: async () => {},
    disconnect: async () => {},
    getServices: async () => [],
    startNotifications: async (_id, _s, c, cb) => { if (c.includes('2aac')) notify = cb; },
    read: async () => Uint8Array.of(50),
    writeWithoutResponse: async (_id, _s, _c, frame) => {
      const f = parseFrame(frame);
      sent.push(f);
      if (answer && f.kind === 'DF') setTimeout(() => notify(buildFrame(f.cmd, f.key, [0x01], 4)), 5);
    },
  };
}
const recorder = { add: async (e) => e };

test('ao conectar, envia 00/00 e 11/00 para o relógio não derrubar a conexão', async () => {
  const ble = fakeBle();
  const s = new Session({ ble, recorder });
  await s.connect();
  const dfs = ble.sent.filter((f) => f.kind === 'DF').map((f) => `${f.cmd}/${f.key}`);
  assert.deepEqual(dfs, ['0/0', '17/0']);
  assert.equal(s.connected, true);
  assert.equal(s.version, 4);
});

test('sem resposta ao handshake, a conexão continua (só registra)', async () => {
  const ble = fakeBle({ answer: false });
  const notes = [];
  const s = new Session({ ble, recorder: { add: async (e) => { notes.push(e.note); return e; } } });
  await s.connect();
  assert.equal(s.connected, true);
  assert.ok(notes.some((n) => n?.includes('sem resposta a 00/00')));
});
