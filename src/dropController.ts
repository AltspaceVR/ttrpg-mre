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
					transform: { local: { scale: { x: 0.1, y: 0.1, z: 0.1 }}},
					grabbable: true,
					subscriptions: ['transform']
				}
			});
			this.rightHandle = MRE.Actor.CreateFromPrefab(this.app.context, {
				prefab: rightHandleAsset.prefab,
				actor: {
					name: "RightHandle",
					parentId: this.diceRoot.id,
					transform: { local: { scale: { x: 0.1, y: 0.1, z: 0.1 }}},
					grabbable: true,
					subscriptions: ['transform']
				}
			});

			// note: the drop position is not yet updated on grab end, so the callbacks are delayed
			this.leftHandle.onGrab('begin', () => this.onHandlePickup(this.leftHandle));
			this.leftHandle.onGrab('end', () => setTimeout(() => this.onHandleDrop(this.leftHandle), 150));
			this.rightHandle.onGrab('begin', () => this.onHandlePickup(this.rightHandle));
			this.rightHandle.onGrab('end', () => setTimeout(() => this.onHandleDrop(this.rightHandle), 150));

			this.update();
		})
		.catch(ex => MRE.log.error('app', ex));
	}

	public addDice(...dice: Die[]) {
		if (!dice.every(d => d.type === this.diceGroup.type)) {
			throw new Error(`Cannot add odd dice to a group of ${this.diceGroup.type}s`);
		}

		this.dice.push(...dice.filter(d => !this.dice.includes(d)));
	}

	public update() {
		if (!this.leftHandle || !this.rightHandle) return;

		if (this.dice.length > 0 && !this.diceGroup.hasRollResults) {
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

	public destroy() {
		this.leftHandle.destroy();
		this.rightHandle.destroy();
	}

	private handlePos: MRE.Vector3;
	private handleRot: MRE.Quaternion;

	private onHandlePickup(handle: MRE.Actor) {
		this.handlePos = handle.transform.local.position.clone();
		this.handleRot = handle.transform.local.rotation.clone();
	}

	private onHandleDrop(handle: MRE.Actor) {
		// find closest die
		let minDistance = Infinity;
		let closestDie: Die;
		let closestDieIndex: number;
		for (let i = 0; i < this.dice.length; i++) {
			const d = this.dice[i];
			const dist = MRE.Vector3.Distance(d.root.transform.local.position, handle.transform.local.position);
			MRE.log.debug('app',
				`Die ${i}: ${d.root.transform.local.position} to ${handle.transform.local.position} is ${dist}`);
			if (dist < minDistance) {
				minDistance = dist;
				closestDie = d;
				closestDieIndex = i;
			}
		}
		MRE.log.debug('app', `Closest die: ${closestDieIndex}`);

		try {
			// set drop-highest value
			if (handle === this.leftHandle) {
				this.diceGroup.dropHighest = closestDieIndex;
			} else if (handle === this.rightHandle) {
				this.diceGroup.dropLowest = this.diceGroup.count - closestDieIndex - 1;
			} else {
				throw new Error("Unrecognized drag handle");
			}
		} catch (err) {
			MRE.log.error('app', err);
			handle.transform.local.position = this.handlePos;
			handle.transform.local.rotation = this.handleRot;
			return;
		}

		handle.transform.local.position = closestDie.root.transform.local.position;
		handle.transform.local.rotation = this.handleRot;
	}
}
