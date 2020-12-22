import * as MRE from '@microsoft/mixed-reality-extension-sdk';

export default class App {
	constructor(public context: MRE.Context, public params: MRE.ParameterSet) {
		context.onStarted(() => this.onStarted());
		context.onUserJoined(user => this.onUserJoined(user));
		context.onUserLeft(user => this.onUserLeft(user));
		context.onStopped(() => this.onStopped());
	}

	private onStarted() {

	}

	private onStopped() {

	}

	private onUserJoined(user: MRE.User) {

	}

	private onUserLeft(user: MRE.User) {

	}
}
