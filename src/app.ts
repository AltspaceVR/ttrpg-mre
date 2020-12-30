import * as MRE from '@microsoft/mixed-reality-extension-sdk';
import { getAsset, cleanUpSession as cleanUpAssets } from './assets';
import { Die, DieType } from './die';
import { RollController } from './rollController';

export default class App {
	private bag: MRE.Actor;
	private rollers = new Map<MRE.Guid, RollController>();

	public rollManager: RollController;

	constructor(public context: MRE.Context, public params: MRE.ParameterSet) {
		context.onStarted(() => this.onStarted());
		context.onUserJoined(user => this.onUserJoined(user));
		context.onUserLeft(user => this.onUserLeft(user));
		context.onStopped(() => this.onStopped());

		getAsset(this.context, 'Dicebag').then(bagAsset => {
			this.bag = MRE.Actor.CreateFromPrefab(this.context, {
				prefab: bagAsset.prefab,
				actor: {
					name: "Dicebag",
					transform: { local: { scale: { x: 0.1, y: 0.1, z: 0.1 }}},
					collider: { geometry: { shape: MRE.ColliderType.Auto }}
				}
			});

			this.bag.setBehavior(MRE.ButtonBehavior).onClick(user => {
				if (!this.rollers.has(user.id)) {
					this.rollers.set(user.id, new RollController(this, user, {
						transform: { local: { position: { y: 0.15 }}}
					}));
				}
			});
		});
	}

	private async onStarted() {

	}

	private onStopped() {
		cleanUpAssets(this.context);
	}

	private onUserJoined(user: MRE.User) {

	}

	private onUserLeft(user: MRE.User) {

	}
}
