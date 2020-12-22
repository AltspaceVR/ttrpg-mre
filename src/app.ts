import * as MRE from '@microsoft/mixed-reality-extension-sdk';

export default class App {
	private diceAssets: MRE.AssetContainer;

	constructor(public context: MRE.Context, public params: MRE.ParameterSet) {
		context.onStarted(() => this.onStarted());
		context.onUserJoined(user => this.onUserJoined(user));
		context.onUserLeft(user => this.onUserLeft(user));
		context.onStopped(() => this.onStopped());
	}

	private async onStarted() {
		this.diceAssets = new MRE.AssetContainer(this.context);
		await this.diceAssets.loadGltf('./dice.glb');

		let x = 0;

		for (let i = 0; i < this.diceAssets.prefabs.length; i++) {
			const prefab = this.diceAssets.prefabs[i];
			MRE.Actor.CreateFromPrefab(this.context, {
				prefab,
				actor: {
					transform: {
						local: {
							position: { x },
							scale: { x: 0.1, y: 0.1, z: 0.1 }
						}
					}
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
