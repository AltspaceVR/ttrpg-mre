import * as MRE from '@microsoft/mixed-reality-extension-sdk';

import { Die, DieType } from './die';
import { Dice, DiceGroup } from './diceGroup';
import { DropController } from './dropController';
import App from './app';
import { getAsset } from './assets';
import { RollView } from './rollView';

/** Display, form, and roll a collection of dice. */
export class RollController {
	private _root: MRE.Actor;
	public get root() { return this._root; }

	public closeButton: MRE.Actor;

	private activeRoll = new Dice();

	private dropControllers = new Map<DieType, DropController>();

	private dieSelectorRoot: MRE.Actor;
	private dieSelectors: Die[] = [];
	private rollView: RollView;

	public constructor(private app: App, private user: MRE.User, actorProps?: Partial<MRE.ActorLike>) {
		this._root = MRE.Actor.Create(this.app.context, { actor: {
			name: "RollManager",
			exclusiveToUser: this.user.id,
			grabbable: true,
			...actorProps
		}});

		getAsset(this.app.context, 'grabHandle').then(handleAsset => {
			this.root.appearance.mesh = handleAsset.mesh;
			this.root.setCollider(MRE.ColliderType.Auto, false);
		});

		this.buildDiceSelection();

		this.rollView = new RollView(this.app, this.activeRoll, {
			parentId: this.root.id,
			transform: { local: { position: { y: 0.2 }}}
		});

		this.rollView.on('refreshed', () => {
			for (const dc of this.dropControllers.values()) {
				dc.update();
			}
		});

		this.rollView.on('labelPressed', () => this.rollButtonPressed());

		this.rollView.on('diePressed', (user, dieIndex) => {
			const dg = this.activeRoll.get(this.rollView.rollDisplay[dieIndex].type);
			if (dg.hasRollResults) {
				this.rollButtonPressed();
			} else {
				dg.count = Math.max(0, dg.count - 1);
				this.refresh();
			}
		});
	}

	public destroy() {
		this.rollView.destroy();
		for (const d of this.dieSelectors) {
			d.destroy();
		}
		this.closeButton.destroy();
		this.root.destroy();
	}

	private buildDiceSelection() {
		this.dieSelectorRoot = MRE.Actor.Create(this.app.context, { actor: {
			name: "DieSelectorRoot",
			parentId: this.root.id,
			transform: { local: { position: { y: 0.1 }}}
		}});

		const selectorLayout = new MRE.PlanarGridLayout(this.dieSelectorRoot,
			MRE.BoxAlignment.MiddleCenter, MRE.BoxAlignment.MiddleCenter);

		let x = 0;
		for (const type of Object.values(DieType)) {
			// create the die
			const die = new Die({ app: this.app, type, text: type, actor: { parentId: this.dieSelectorRoot.id } });
			this.dieSelectors.push(die);

			selectorLayout.addCell({ row: 0, column: x++, width: 0.1, height: 0.1, contents: die.root });

			// wire up the click handler
			die.on('click', () => this.addDie(type));
		}
		selectorLayout.applyLayout();
	}

	private addDie(die: DieType) {
		if (this.activeRoll.hasRollResults || this.activeRoll.count >= 15) {
			return;
		}

		let dg = this.activeRoll.get(die);
		if (!dg) {
			this.activeRoll.groups.push(dg = new DiceGroup(die, 1, 0, 0));
		} else {
			dg.count++;
		}

		this.refresh();
	}

	private refresh() {
		for (const dg of this.activeRoll.groups) {
			if (dg.type !== DieType.D1 && !this.dropControllers.has(dg.type)) {
				this.dropControllers.set(dg.type, new DropController(this.app, dg, this.rollView.root));
			} else if (dg.count === 0 && this.dropControllers.has(dg.type)) {
				this.dropControllers.get(dg.type).destroy();
				this.dropControllers.delete(dg.type);
			}
		}

		this.rollView.refresh();
		this.rollView.labelText = (this.activeRoll.hasRollResults) ? "RESET" : "ROLL";

		for (const d of this.rollView.rollDisplay) {
			if (d.type !== DieType.D1) {
				this.dropControllers.get(d.type).addDice(d);
			}
		}
	}

	private rollButtonPressed() {
		if (this.activeRoll.count > 0 && !this.activeRoll.hasRollResults) {
			// roll the dice
			for (const dg of this.activeRoll.groups) {
				dg.roll();
			}
			this.app.history.addRollToHistory(this.user, this.activeRoll.clone());
		} else if (this.activeRoll.count > 0) {
			for (const dc of this.dropControllers.values()) {
				dc.destroy();
			}
			this.dropControllers.clear();
			this.activeRoll.clear();
		}

		this.refresh();
	}
}

