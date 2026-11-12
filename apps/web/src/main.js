import '@fontsource/onest/400.css';
import '@fontsource/onest/500.css';
import '@fontsource/onest/600.css';
import '@fontsource/onest/700.css';
import '@fontsource/big-shoulders-display/800';
import '../../../core/ui/style.css';
import { mountApp } from '../../../core/ui/app.js';
import { mountDebug } from '../../../core/ui/debug.js';
import { mountDocs } from '../../../core/ui/docs.js';
import { COMMANDS, RESPONSES } from '../../../core/commands.js';
import docs from '../../../docs/comandos/comandos.json';
import { ble, createStore } from './platform.js';

const ICON_DEBUG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 9l-4 3 4 3M16 9l4 3-4 3M13 6l-2 12"/></svg>';
const ICON_DOCS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 5a2 2 0 0 1 2-2h12v16H6a2 2 0 0 0-2 2zM4 21V5M8 7h6"/></svg>';

mountApp({
  root: document.getElementById('app'),
  ble,
  store: createStore(),
  platform: { name: 'Web', canScan: false, canShare: true },
  commands: COMMANDS,
  responses: RESPONSES,
  extraTabs: [
    { id: 'depurar', label: 'Depurar', icon: ICON_DEBUG, mount: (el, ctx) => mountDebug(el, ctx) },
    { id: 'protocolo', label: 'Protocolo', icon: ICON_DOCS, mount: (el, ctx) => mountDocs(el, { docs, commands: ctx.commands }) },
  ],
});
