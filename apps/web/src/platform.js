// Adaptadores do painel web: Bluetooth pelo Web Bluetooth do navegador (lista nativa)
// e registro em memória, baixado como arquivo quando o usuário pede.
const entries = new Map(); // id -> { device, server, chars: Map }

async function characteristic(id, service, uuid) {
  const e = entries.get(id);
  const key = `${service}|${uuid}`;
  if (!e.chars.has(key)) {
    const s = await e.server.getPrimaryService(service);
    e.chars.set(key, await s.getCharacteristic(uuid));
  }
  return e.chars.get(key);
}

const toBytes = (dv) => new Uint8Array(dv.buffer.slice(dv.byteOffset, dv.byteOffset + dv.byteLength));

export const ble = {
  async initialize() {
    if (!window.isSecureContext) throw new Error('abra o painel em https ou em localhost');
    if (!navigator.bluetooth) throw new Error('este navegador não tem Web Bluetooth (use Chrome ou Edge)');
    if (navigator.bluetooth.getAvailability && !(await navigator.bluetooth.getAvailability())) {
      throw new Error('Bluetooth desligado ou sem adaptador');
    }
  },

  async requestDevice({ namePrefix, optionalServices }) {
    const device = await navigator.bluetooth.requestDevice(
      namePrefix ? { filters: [{ namePrefix }], optionalServices } : { acceptAllDevices: true, optionalServices },
    );
    entries.set(device.id, { device, server: null, chars: new Map() });
    return { id: device.id, name: device.name };
  },

  async connect(id, onDisconnect) {
    const e = entries.get(id);
    e.device.addEventListener('gattserverdisconnected', () => onDisconnect(id), { once: true });
    e.server = await e.device.gatt.connect();
    e.chars.clear();
  },

  async disconnect(id) {
    entries.get(id)?.device.gatt.disconnect();
  },

  async getServices(id) {
    const e = entries.get(id);
    const out = [];
    for (const s of await e.server.getPrimaryServices()) {
      const chars = await s.getCharacteristics().catch(() => []);
      out.push({
        uuid: s.uuid,
        characteristics: chars.map((c) => ({
          uuid: c.uuid,
          properties: Object.entries({
            read: c.properties.read, write: c.properties.write, writeWithoutResponse: c.properties.writeWithoutResponse,
            notify: c.properties.notify, indicate: c.properties.indicate,
          }).filter(([, v]) => v).map(([k]) => k),
        })),
      });
    }
    return out;
  },

  async startNotifications(id, service, uuid, cb) {
    const c = await characteristic(id, service, uuid);
    c.addEventListener('characteristicvaluechanged', (ev) => cb(toBytes(ev.target.value)));
    await c.startNotifications();
  },

  async read(id, service, uuid) {
    const c = await characteristic(id, service, uuid);
    return toBytes(await c.readValue());
  },

  async writeWithoutResponse(id, service, uuid, bytes) {
    const c = await characteristic(id, service, uuid);
    await c.writeValueWithoutResponse(Uint8Array.from(bytes));
  },
};

function download(name, text) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function createStore() {
  let session = 'sessao';
  const lines = [];
  return {
    async start(name) {
      session = name;
      lines.length = 0;
      return 'memória desta aba (toque em "Exportar registro" para baixar o .jsonl)';
    },
    async append(text) { lines.push(text); },
    async writeFile(name, text) { download(name, text); return `downloads (${name})`; },
    async share() { download(`${session}.jsonl`, lines.join('')); },
  };
}
