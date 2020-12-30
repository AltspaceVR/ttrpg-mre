import * as MRE from '@microsoft/mixed-reality-extension-sdk';
import { resolve } from 'path';

import App from './app';

process.on('uncaughtException', ex => MRE.log.error('app', "Uncaught exception:", ex));
process.on('unhandledRejection', ex => MRE.log.error('app', "Unhandled rejection:", ex));
process.on('SIGTERM', () => process.exit(0));
process.on('SIGABRT', () => process.exit(0));

const webhost = new MRE.WebHost({
	baseDir: resolve(__dirname, '..', 'public')
});

webhost.adapter.onConnection((context, params) => new App(context, params));
