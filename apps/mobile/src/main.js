import '@fontsource/bricolage-grotesque/400.css';
import '@fontsource/bricolage-grotesque/600.css';
import '@fontsource/bricolage-grotesque/700.css';
import '@fontsource/bricolage-grotesque/800.css';
import '../../../core/ui/style.css';
import { mountApp } from '../../../core/ui/app.js';
import { COMMANDS, RESPONSES } from '../../../core/commands.js';
import { ble, createStore } from './platform.js';

mountApp({
  root: document.getElementById('app'),
  ble,
  store: createStore(),
  platform: { name: 'Android', canScan: true, canShare: true },
  commands: COMMANDS,
  responses: RESPONSES,
});
