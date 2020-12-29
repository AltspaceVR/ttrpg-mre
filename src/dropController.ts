import * as MRE from '@microsoft/mixed-reality-extension-sdk';

import App from './app';
import { getAssets } from './assets';
import { Die, DieType } from './die';
import { DiceGroup } from './diceGroup';

export class DropController {
	private dice: Die[] = [];
	private leftHandle: MRE.Actor;
	private rightHandle: MRE.Actor;

	public constructor(private app: App, private diceGroup: DiceGroup, private diceRoot: MRE.Actor) {
		getAssets(this.app.context, 'leftHandle', 'rightHandle')
		.then(([leftHandleAsset, rightHandleAsset]) => {
			this.leftHandle = MRE.Actor.CreateFromPrefab(this.app.context, {
				prefab: leftHandleAsset.prefab,
				actor: {
					name: "LeftHandle",
					parentId: this.diceRoot.id,
					transform: { local: { scale: { x: 0.1, y: 0.1, z: 0.1 }}}
				}
			});
			this.rightHandle = MRE.Actor.CreateFromPrefab(this.app.context, {
				prefab: rightHandleAsset.prefab,
				actor: {
					name: "RightHandle",
					parentId: this.diceRoot.id,
					transform: { local: { scale: { x: 0.1, y: 0.1, z: 0.1 }}}
				}
			});

			this.update();
		})
		.catch(ex => MRE.log.error('app', ex));
	}

	public addDice(...dice: Die[]) {
		if (!dice.every(d => d.type === this.diceGroup.type)) {
			throw new Error(`Cannot add odd dice to a group of ${this.diceGroup.type}s`);
		}

		this.dice.push(...dice);
	}

	public update() {
		if (!this.leftHandle || !this.rightHandle) return;

		if (this.dice.length > 0) {
			this.leftHandle.appearance.enabled = true;
			this.leftHandle.transform.local.position.x
				= this.dice[this.diceGroup.dropHighest].root.transform.local.position.x;

			this.rightHandle.appearance.enabled = true;
			this.rightHandle.transform.local.position.x
				= this.dice[this.dice.length - this.diceGroup.dropLowest - 1].root.transform.local.position.x;
		} else {
			this.leftHandle.appearance.enabled = false;
			this.rightHandle.appearance.enabled = false;
		}
	}
}
