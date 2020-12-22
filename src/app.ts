import * as MRE from '@microsoft/mixed-reality-extension-sdk';
import { Die, DieType } from './die';

export default class App {
	private diceAssets: MRE.AssetContainer;

	constructor(public context: MRE.Context, public params: MRE.ParameterSet) {
		context.onStarted(() => this.onStarted());
		context.onUserJoined(user => this.onUserJoined(user));
		context.onUserLeft(user => this.onUserLeft(user));
		context.onStopped(() => this.onStopped());
	}

	private async onStarted() {
		let x = 0;
		for (const type of Object.values(DieType)) {
			new Die({
				app: this,
				type,
				label: type,
				actor: {
					transform: { local: { position: { x }}}
				}
			});
			x += 0.15;
		}
	}

	private onStopped() {

	}

	private onUserJoined(user: MRE.User) {

	}

	private onUserLeft(user: MRE.User) {

	}
}
