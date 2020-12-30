import * as MRE from '@microsoft/mixed-reality-extension-sdk';
import { getAsset, cleanUpSession as cleanUpAssets } from './assets';
import { RollController } from './rollController';
import { RollHistory } from './rollHistory';

export default class App {
	private bag: MRE.Actor;
	private rollers = new Map<MRE.Guid, RollController>();
	public history: RollHistory;

	constructor(public context: MRE.Context, public params: MRE.ParameterSet) {
		context.onUserLeft(u => {
			if (this.rollers.has(u.id)) {
				const rc = this.rollers.get(u.id);
				rc.root.destroy();
				this.rollers.delete(u.id);
			}
		});
		context.onStopped(() => cleanUpAssets(this.context));

		this.history = new RollHistory(this, {
			transform: { local: { position: { y: 0.1, z: 0.1 }}}
		});

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
}
