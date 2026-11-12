import '@fontsource/onest/400.css';
import '@fontsource/onest/500.css';
import '@fontsource/onest/600.css';
import '@fontsource/onest/700.css';
import '@fontsource/big-shoulders-display/800';
import '../../../core/ui/style.css';
import { mountApp } from '../../../core/ui/app.js';
import { COMMANDS, RESPONSES } from '../../../core/commands.js';
import { ble, createStore, platformName, openFolder } from './platform.js';

mountApp({
  root: document.getElementById('app'),
  ble,
  store: createStore(),
  platform: { name: platformName, canScan: false, canShare: false, openFolder },
  commands: COMMANDS,
  responses: RESPONSES,
});
