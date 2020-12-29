import * as MRE from '@microsoft/mixed-reality-extension-sdk';

import { Die, DieType } from './die';
import { DiceGroup } from './diceGroup';
import { DropController } from './dropController';
import App from './app';

/** Display, form, and roll a collection of dice. */
export class RollController {
	private _root: MRE.Actor;
	public get root() { return this._root; }

	private activeRoll: DiceGroup[] = [];

	private rollRoot: MRE.Actor;
	private rollDisplay: Die[] = [];
	private dropControllers = new Map<DieType, DropController>();
	private rollResults: MRE.Actor;
	private rollButton: MRE.Actor;

	private dieSelectorRoot: MRE.Actor;
	private dieSelectors: Die[] = [];

	public constructor(private app: App, actorProps?: Partial<MRE.ActorLike>) {
		this._root = MRE.Actor.Create(this.app.context, { actor: {
			name: "RollManager",
			...actorProps
		}});
		this.buildDiceSelection();
	}

	private buildDiceSelection() {
		this.dieSelectorRoot = MRE.Actor.Create(this.app.context, { actor: {
			name: "DieSelectorRoot",
			parentId: this.root.id
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
		let dg = this.activeRoll.find(dg => dg.type === die);
		if (!dg) {
			this.activeRoll.push(dg = new DiceGroup(die, 1, 0, 0));
		} else {
			dg.count++;
		}

		this.refreshActiveRollDisplay();
	}

	private refreshActiveRollDisplay() {
		if (!this.rollRoot) {
			this.rollRoot = MRE.Actor.Create(this.app.context, { actor: {
				name: "ActiveRollRoot",
				parentId: this.root.id,
				transform: { local: { position: { y: 0.1 }}}
			}});
		}

		if (!this.rollButton) {
			this.rollButton = MRE.Actor.Create(this.app.context, { actor: {
				name: "RollButton",
				parentId: this.rollRoot.id,
				text: {
					enabled: this.activeRoll.length > 0,
					contents: "ROLL",
					height: 0.05,
					anchor: MRE.TextAnchorLocation.MiddleCenter,
					justify: MRE.TextJustify.Center
				},
				collider: {
					geometry: { shape: MRE.ColliderType.Box, size: { x: 0.2, y: 0.1, z: 0.01 }}
				}
			}});
			this.rollButton.setBehavior(MRE.ButtonBehavior).onButton('pressed', () => this.roll());
		} else {
			this.rollButton.text.enabled = this.activeRoll.length > 0;
		}

		const rollTotal = this.activeRoll.reduce((sum, dg) => sum + (dg.hasRollResults ? dg.total : 0), 0);
		if (!this.rollResults) {
			this.rollResults = MRE.Actor.Create(this.app.context, { actor: {
				name: "RollResults",
				parentId: this.rollRoot.id,
				text: {
					contents: rollTotal > 0 ? `= ${rollTotal}` : "= ??",
					height: 0.05,
					anchor: MRE.TextAnchorLocation.MiddleCenter,
					justify: MRE.TextJustify.Center
				}
			}});
		} else {
			this.rollResults.text.contents = rollTotal > 0 ? `= ${rollTotal}` : "= ??";
		}

		const oldDice = this.rollDisplay;
		this.rollDisplay = [];

		const layout = new MRE.PlanarGridLayout(this.rollRoot,
			MRE.BoxAlignment.MiddleCenter, MRE.BoxAlignment.MiddleCenter);
		layout.addCell({ row: 0, column: 0, width: 0.2, height: 0.1, contents: this.rollButton });

		let x = 1;

		this.activeRoll.sort(sortDiceGroups);
		for (const dg of this.activeRoll) {
			if (dg.type !== DieType.D1 && !this.dropControllers.has(dg.type)) {
				this.dropControllers.set(dg.type, new DropController(this.app, dg, this.rollRoot));
			}

			for (let i = 0; i < dg.count; i++) {
				const reusedDieIndex = oldDice.findIndex(d => d.type === dg.type);
				let d: Die;

				// reuse old die
				if (reusedDieIndex >= 0) {
					d = oldDice.splice(reusedDieIndex, 1)[0];
				// add a new die (unless constant)
				} else if (dg.type !== DieType.D1 || i === 0){
					d = new Die({
						app: this.app, type: dg.type, text: dg.type,
						actor: { parentId: this.rollRoot.id }
					});
					d.on('click', () => {
						dg.count = Math.max(0, dg.count - 1);
						this.refreshActiveRollDisplay();
					});
				} else {
					break;
				}

				if (dg.type === DieType.D1) {
					d.text = '+' + dg.count;
				} else {
					this.dropControllers.get(dg.type).addDice(d);
				}

				this.rollDisplay.push(d);
				layout.addCell({ row: 0, column: x++, width: 0.1, height: 0.1, contents: d.root });
			}
		}

		layout.addCell({ row: 0, column: x++, width: 0.2, height: 0.1, contents: this.rollResults });
		layout.applyLayout();

		for (const dc of this.dropControllers.values()) {
			dc.update();
		}

		for (const d of oldDice) {
			d.root.destroy();
		}
	}

	private roll() {
		const dice = [...this.rollDisplay];
		for (const dg of this.activeRoll) {
			dg.roll();
			for (let i = 0; i < dg.results.length; i++) {
				const d = dice.splice(0, 1)[0];
				if (dg.type === DieType.D1) {
					d.text = '+' + dg.count;
					d.textColor = MRE.Color3.White();
					break;
				} else {
					d.text = dg.results[i].toString();
					d.textColor = dg.contributingResults.includes(i) ? MRE.Color3.White() : MRE.Color3.Gray();
				}
			}
		}

		//this.rollHistory.push(this.activeRoll);
		//this.activeRoll = this.activeRoll.map(dg => new DiceGroup(dg));
		//this.activeRoll = [];
		this.refreshActiveRollDisplay();
	}
}

function sortDiceGroups(a: DiceGroup, b: DiceGroup) {
	const rankings = Object.values(DieType);
	const aRank = rankings.indexOf(a.type), bRank = rankings.indexOf(b.type);
	if (aRank < bRank) {
		return -1;
	} else if (aRank > bRank) {
		return 1;
	} else {
		return 0;
	}
}
