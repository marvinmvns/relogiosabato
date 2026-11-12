// Ponte mínima entre a interface e o processo principal.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('sabatinho', {
  store: {
    start: (name) => ipcRenderer.invoke('store-start', name),
    append: (text) => ipcRenderer.invoke('store-append', text),
    writeFile: (name, text) => ipcRenderer.invoke('store-write', name, text),
  },
  openFolder: () => ipcRenderer.invoke('open-folder'),
  onBluetoothDevices: (cb) => {
    const listener = (_e, devices) => cb(devices);
    ipcRenderer.on('bt-devices', listener);
    return () => ipcRenderer.removeListener('bt-devices', listener);
  },
  chooseBluetoothDevice: (id) => ipcRenderer.send('bt-choose', id),
  platform: process.platform,
});
