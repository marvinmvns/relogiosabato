// Adaptadores do Android (Capacitor): Bluetooth via @capacitor-community/bluetooth-le
// e arquivos via @capacitor/filesystem + @capacitor/share.
import { BleClient, numbersToDataView, dataViewToNumbers } from '@capacitor-community/bluetooth-le';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { hex } from '../../../core/protocol.js';

const APP_ID = 'com.relogiosabatinho.app';
const DIR = 'sessoes';
const toBytes = (v) => Uint8Array.from(dataViewToNumbers(v));

export const ble = {
  initialize: () => BleClient.initialize({ androidNeverForLocation: false }),

  async requestDevice({ namePrefix, optionalServices }) {
    const d = await BleClient.requestDevice({ namePrefix, optionalServices });
    return { id: d.deviceId, name: d.name };
  },

  connect: (id, onDisconnect) => BleClient.connect(id, onDisconnect, { timeout: 15000 }),
  disconnect: (id) => BleClient.disconnect(id),

  async getServices(id) {
    const services = await BleClient.getServices(id);
    return services.map((s) => ({
      uuid: s.uuid,
      characteristics: s.characteristics.map((c) => ({
        uuid: c.uuid,
        properties: Object.keys(c.properties).filter((k) => c.properties[k]),
      })),
    }));
  },

  startNotifications: (id, service, characteristic, cb) =>
    BleClient.startNotifications(id, service, characteristic, (v) => cb(toBytes(v))),

  read: async (id, service, characteristic) => toBytes(await BleClient.read(id, service, characteristic)),

  writeWithoutResponse: (id, service, characteristic, bytes) =>
    BleClient.writeWithoutResponse(id, service, characteristic, numbersToDataView(Array.from(bytes))),

  async scan({ namePrefix }, cb, ms) {
    await BleClient.requestLEScan({ namePrefix }, (r) => {
      const manufacturerData = {};
      for (const [k, v] of Object.entries(r.manufacturerData || {})) manufacturerData[k] = hex(dataViewToNumbers(v));
      cb({ id: r.device.deviceId, name: r.localName || r.device.name, rssi: r.rssi, manufacturerData, uuids: r.uuids });
    });
    await new Promise((res) => setTimeout(res, ms));
    await BleClient.stopLEScan();
  },
};

export function createStore() {
  let path = null;
  return {
    async start(name) {
      try {
        await Filesystem.mkdir({ path: DIR, directory: Directory.External, recursive: true });
      } catch (_e) { /* já existe */ }
      path = `${DIR}/${name}.jsonl`;
      await Filesystem.writeFile({ path, directory: Directory.External, data: '', encoding: Encoding.UTF8 });
      return `Android/data/${APP_ID}/files/${path}`;
    },
    append: (text) => Filesystem.appendFile({ path, directory: Directory.External, data: text, encoding: Encoding.UTF8 }),
    async writeFile(name, text) {
      await Filesystem.writeFile({ path: `${DIR}/${name}`, directory: Directory.External, data: text, encoding: Encoding.UTF8 });
      return `Android/data/${APP_ID}/files/${DIR}/${name}`;
    },
    async share() {
      const { uri } = await Filesystem.getUri({ path, directory: Directory.External });
      await Share.share({ title: 'Registro do Relógio Sabatinho', url: uri, dialogTitle: 'Exportar registro' });
    },
  };
}
