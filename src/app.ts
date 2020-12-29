import * as MRE from '@microsoft/mixed-reality-extension-sdk';
import { cleanUpSession as cleanUpAssets } from './assets';
import { Die, DieType } from './die';
import { RollController } from './rollController';

export default class App {
	public rollManager: RollController;

	constructor(public context: MRE.Context, public params: MRE.ParameterSet) {
		context.onStarted(() => this.onStarted());
		context.onUserJoined(user => this.onUserJoined(user));
		context.onUserLeft(user => this.onUserLeft(user));
		context.onStopped(() => this.onStopped());
	}

	private async onStarted() {

	}

	private onStopped() {
		cleanUpAssets(this.context);
	}

	private onUserJoined(user: MRE.User) {
		this.rollManager = new RollController(this);
	}

	private onUserLeft(user: MRE.User) {

	}
}
