// Adaptadores do desktop (Electron): Bluetooth via Web Bluetooth e arquivos via IPC.
const api = window.sabatinho;
const entries = new Map(); // id -> { device, server, chars: Map }

/** Janela de escolha do aparelho, alimentada pelo evento select-bluetooth-device. */
function showChooser(namePrefix) {
  const dlg = document.createElement('div');
  dlg.className = 'sheet-backdrop open';
  const box = document.createElement('section');
  box.className = 'sheet open';
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  box.innerHTML = `<h3>Escolha o relógio</h3>
    <p>Procurando aparelhos Bluetooth${namePrefix ? ` com nome "${namePrefix}…"` : ''}. O relógio precisa estar desconectado do celular.</p>
    <ul class="cmd-list" id="btList"><li class="cmd-group">Procurando…</li></ul>
    <div class="actions" style="margin-top:12px"><button class="btn quiet" id="btCancel">Cancelar</button></div>`;
  document.body.append(dlg, box);
  const close = (id) => {
    off();
    api.chooseBluetoothDevice(id);
    dlg.remove();
    box.remove();
  };
  const off = api.onBluetoothDevices((devices) => {
    const list = box.querySelector('#btList');
    const shown = devices.filter((d) => !namePrefix || (d.name || '').startsWith(namePrefix));
    list.innerHTML = shown.length ? '' : '<li class="cmd-group">Procurando…</li>';
    for (const d of shown) {
      const li = document.createElement('li');
      li.innerHTML = `<button class="cmd"><span class="name"></span><span class="code"></span><span class="desc">toque para conectar</span></button>`;
      li.querySelector('.name').textContent = d.name || '(sem nome)';
      li.querySelector('.code').textContent = d.id.slice(-8);
      li.firstElementChild.onclick = () => close(d.id);
      list.appendChild(li);
    }
  });
  box.querySelector('#btCancel').onclick = () => close('');
}

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
    if (!navigator.bluetooth) throw new Error('Web Bluetooth indisponível neste sistema');
    if (navigator.bluetooth.getAvailability && !(await navigator.bluetooth.getAvailability())) {
      throw new Error('Bluetooth desligado ou sem adaptador');
    }
  },

  async requestDevice({ namePrefix, optionalServices }) {
    showChooser(namePrefix);
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

export function createStore() {
  return {
    start: (name) => api.store.start(name),
    append: (text) => api.store.append(text),
    writeFile: (name, text) => api.store.writeFile(name, text),
  };
}

export const platformName = { linux: 'Linux', win32: 'Windows', darwin: 'macOS' }[api.platform] || api.platform;
export const openFolder = () => api.openFolder();
