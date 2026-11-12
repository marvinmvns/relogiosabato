// Relógio Sabatinho — processo principal do Electron (Linux, Windows, macOS).
// Bluetooth: Web Bluetooth do Chromium; aqui só tratamos a escolha do aparelho.
// Arquivos: registros em <Documentos>/RelogioSabatinho/sessoes.
const { app, BrowserWindow, ipcMain, shell } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');

// No Linux o Web Bluetooth do Chromium ainda fica atrás de flag.
app.commandLine.appendSwitch('enable-experimental-web-platform-features');
app.commandLine.appendSwitch('enable-features', 'WebBluetooth');

const sessionsDir = () => path.join(app.getPath('documents'), 'RelogioSabatinho', 'sessoes');
let currentFile = null;
let pendingChoice = null; // callback do select-bluetooth-device

function safeName(name) {
  if (!/^[\w.-]+$/.test(name)) throw new Error('nome de arquivo inválido');
  return name;
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 380,
    title: 'Relógio Sabatinho',
    backgroundColor: '#12142a',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  // Chamado várias vezes enquanto o Chromium encontra aparelhos.
  win.webContents.on('select-bluetooth-device', (event, devices, callback) => {
    event.preventDefault();
    pendingChoice = callback;
    win.webContents.send('bt-devices', devices.map((d) => ({ id: d.deviceId, name: d.deviceName || '' })));
  });

  // Links externos abrem no navegador do sistema.
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  win.loadFile(path.join(__dirname, 'dist', 'index.html'));
  return win;
}

ipcMain.on('bt-choose', (_e, id) => {
  if (pendingChoice) {
    pendingChoice(id || '');
    pendingChoice = null;
  }
});

ipcMain.handle('store-start', async (_e, name) => {
  await fs.mkdir(sessionsDir(), { recursive: true });
  currentFile = path.join(sessionsDir(), `${safeName(name)}.jsonl`);
  await fs.writeFile(currentFile, '');
  return currentFile;
});

ipcMain.handle('store-append', async (_e, text) => {
  if (!currentFile) throw new Error('sessão não iniciada');
  await fs.appendFile(currentFile, text);
});

ipcMain.handle('store-write', async (_e, name, text) => {
  const file = path.join(sessionsDir(), safeName(name));
  await fs.writeFile(file, text);
  return file;
});

ipcMain.handle('open-folder', async () => {
  await fs.mkdir(sessionsDir(), { recursive: true });
  return shell.openPath(sessionsDir());
});

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
