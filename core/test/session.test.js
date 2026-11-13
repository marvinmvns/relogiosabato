import test from 'node:test';
import assert from 'node:assert/strict';
import { Session } from '../session.js';
import { buildFrame, parseFrame } from '../protocol.js';

const FAST = { notifyDelay: 0, handshakeDelay: 0, reconnectAfterDrop: 20, reconnectAfterFail: 20, reconnectScanMs: 5 };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Bluetooth simulado: responde a cada DF com um DF do mesmo cmd/key (versão 4).
function fakeBle({ answer = true, failConnects = 0, battery = 50, scan = true } = {}) {
  const st = { sent: [], connects: 0, scans: 0, drop: null, failConnects };
  let notify;
  const ble = {
    st,
    initialize: async () => {},
    requestDevice: async () => ({ id: 'AA', name: 'TF37Pro' }),
    connect: async (_id, onDisconnect) => {
      st.connects++;
      if (st.failConnects > 0) { st.failConnects--; throw new Error('Connection failed with status 133 (GATT_ERROR).'); }
      st.drop = onDisconnect;
    },
    disconnect: async () => {},
    getServices: async () => [],
    startNotifications: async (_id, _s, c, cb) => { if (c.includes('2aac')) notify = cb; },
    read: async () => Uint8Array.of(battery),
    writeWithoutResponse: async (_id, _s, _c, frame) => {
      const f = parseFrame(frame);
      st.sent.push(f);
      if (answer && f.kind === 'DF') setTimeout(() => notify(buildFrame(f.cmd, f.key, [0x01], 4)), 5);
    },
  };
  if (scan) ble.scan = async (_f, cb) => { st.scans++; cb({ id: 'AA' }); };
  return ble;
}
const recorder = { add: async (e) => e };
const dfs = (ble) => ble.st.sent.filter((f) => f.kind === 'DF').map((f) => `${f.cmd}/${f.key}`);

test('ao conectar, manda as três leituras do app oficial: 14/00, 00/00 e F3/00', async () => {
  const ble = fakeBle();
  const s = new Session({ ble, recorder, timing: FAST });
  await s.connect();
  assert.deepEqual(dfs(ble), ['20/0', '0/0', '243/0']);
  assert.equal(s.connected, true);
  assert.equal(s.version, 4);
  await s.disconnect();
});

test('sem resposta ao handshake, a conexão continua (só registra)', async () => {
  const ble = fakeBle({ answer: false });
  const notes = [];
  const s = new Session({ ble, recorder: { add: async (e) => { notes.push(e.note); return e; } }, timing: FAST });
  await s.connect();
  assert.equal(s.connected, true);
  assert.ok(notes.some((n) => n?.includes('sem resposta a 14/00')));
  await s.disconnect();
});

test('queda sem pedido do usuário: reconecta sozinho e refaz o handshake', async () => {
  const ble = fakeBle();
  const s = new Session({ ble, recorder, timing: FAST });
  await s.connect();
  ble.st.failConnects = 2; // as duas primeiras tentativas falham (GATT 133)
  ble.st.drop();
  assert.equal(s.connected, false);
  for (let i = 0; i < 100 && !s.connected; i++) await sleep(10);
  assert.equal(s.connected, true);
  assert.equal(ble.st.connects, 4); // 1 inicial + 2 falhas + 1 sucesso
  assert.ok(ble.st.scans >= 1, 'tentativas pares fazem uma busca antes');
  assert.deepEqual(dfs(ble).slice(-3), ['20/0', '0/0', '243/0']);
  await s.disconnect();
});

test('"Desconectar" do usuário desliga a reconexão automática', async () => {
  const ble = fakeBle();
  const s = new Session({ ble, recorder, timing: FAST });
  await s.connect();
  await s.disconnect();
  await sleep(80);
  assert.equal(s.connected, false);
  assert.equal(ble.st.connects, 1);
});

test('bateria baixa: não reconecta sozinho', async () => {
  const ble = fakeBle({ battery: 9 });
  const s = new Session({ ble, recorder, timing: FAST });
  await s.connect();
  ble.st.drop();
  await sleep(80);
  assert.equal(s.connected, false);
  assert.equal(ble.st.connects, 1);
});
