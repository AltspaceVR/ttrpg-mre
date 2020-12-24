import * as MRE from '@microsoft/mixed-reality-extension-sdk';
import { Die, DieType } from './die';
import { DiceGroup } from './diceGroup';
import App from './app';

/** Display, form, and roll a collection of dice. */
export class RollManager {
	private _root: MRE.Actor;
	public get root() { return this._root; }

	private activeRoll: DiceGroup[] = [];
	private activeRollRoot: MRE.Actor;
	private activeRollDisplay: Die[] = [];
	private rollResults: MRE.Actor;
	private rollButton: MRE.Actor;

	private rollHistory: Array<DiceGroup[]> = [];

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
			die.onClick(() => this.addDie(type));
		}
		selectorLayout.applyLayout();
	}

	private addDie(die: DieType) {
		const dg = this.activeRoll.find(dg => dg.type === die);
		if (!dg) {
			this.activeRoll.push(new DiceGroup(die, 1, 0, 0));
		} else {
			dg.count++;
		}

		this.refreshActiveRollDisplay();
	}

	private refreshActiveRollDisplay() {
		if (!this.activeRollRoot) {
			this.activeRollRoot = MRE.Actor.Create(this.app.context, { actor: {
				name: "ActiveRollRoot",
				parentId: this.root.id,
				transform: { local: { position: { y: 0.1 }}}
			}});
		}

		if (!this.rollButton) {
			this.rollButton = MRE.Actor.Create(this.app.context, { actor: {
				name: "RollButton",
				parentId: this.activeRollRoot.id,
				text: {
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
		}

		if (!this.rollResults) {
			this.rollResults = MRE.Actor.Create(this.app.context, { actor: {
				name: "RollResults",
				parentId: this.activeRollRoot.id,
				text: {
					contents: "= ??",
					height: 0.05,
					anchor: MRE.TextAnchorLocation.MiddleCenter,
					justify: MRE.TextJustify.Center
				}
			}});
		}

		const oldDice = this.activeRollDisplay;
		this.activeRollDisplay = [];

		const layout = new MRE.PlanarGridLayout(this.activeRollRoot,
			MRE.BoxAlignment.MiddleCenter, MRE.BoxAlignment.MiddleCenter);
		layout.addCell({ row: 0, column: 0, width: 0.2, height: 0.1, contents: this.rollButton });

		let x = 1;

		this.activeRoll.sort(RollManager.sortDiceGroups);
		for (const dg of this.activeRoll) {
			for (let i = 0; i < dg.count; i++) {
				const reusedDieIndex = oldDice.findIndex(d => d.type === dg.type);
				let d: Die;
				if (reusedDieIndex >= 0) {
					d = oldDice.splice(reusedDieIndex, 1)[0];
				} else {
					d = new Die({
						app: this.app, type: dg.type,
						actor: { parentId: this.activeRollRoot.id }
					});
				}

				this.activeRollDisplay.push(d);
				layout.addCell({ row: 0, column: x++, width: 0.1, height: 0.1, contents: d.root });
			}
		}

		layout.addCell({ row: 0, column: x++, width: 0.2, height: 0.1, contents: this.rollResults });
		layout.applyLayout();

		for (const d of oldDice) {
			d.root.destroy();
		}
	}

	private roll() {
		const dice = [...this.activeRollDisplay];
		let total = 0;
		for (const dg of this.activeRoll) {
			dg.roll();
			for (let i = 0; i < dg.results.length; i++) {
				const d = dice.splice(0, 1)[0];
				d.text = dg.results[i].toString();
				d.textColor = dg.contributingResults.includes(i) ? MRE.Color3.White() : MRE.Color3.Gray();
			}
			total += dg.total;
		}
		this.rollResults.text.contents = '= ' + total;

		this.rollHistory.push(this.activeRoll);
		this.activeRoll = this.activeRoll.map(dg => new DiceGroup(dg));
		this.refreshActiveRollDisplay();
	}

	private static sortDiceGroups(a: DiceGroup, b: DiceGroup) {
		const rankings = Object.values(DieType);
		const aRank = rankings.indexOf(a.type), bRank = rankings.indexOf(b.type);
		if (bRank < aRank) {
			return -1;
		} else if (bRank > aRank) {
			return 1;
		} else {
			return 0;
		}
	}
}
