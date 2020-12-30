import * as MRE from '@microsoft/mixed-reality-extension-sdk';

import App from './app';
import { DiceGroup } from './diceGroup';
import { RollView } from './rollView';

const historyHighlight = new MRE.Color3(0xb9/0xff, 0x7f/0xff, 0xaf/0xff);

class HistoryEntry {
	public readonly timestamp: Date;
	private rollView: RollView;

	public constructor(public user: MRE.UserLike, public roll: DiceGroup[]) {
		this.timestamp = new Date();
	}

	public toString() {
		const total = this.roll.reduce((sum, dg) => sum + dg.total, 0);
		const rollStr = this.roll.map(dg => dg.toString()).join(' + ');
		return `<color ${historyHighlight.toHexString()}>${this.user.name}</color>` +
			` rolled <color ${historyHighlight.toHexString()}>${total}</color> (${rollStr})`;
	}

	public toRollView(history: RollHistory): RollView {
		if (this.rollView && this.rollView.root.parentId !== history.root.id) {
			this.rollView.destroy();
			this.rollView = null;
		}

		if (!this.rollView) {
			this.rollView = new RollView(history.app, this.roll, {
				parentId: history.root.id,
				transform: { local: { scale: { x: 0.7, y: 0.7, z: 0.7 }}}
			});
			this.rollView.labelText = this.user.name;
			this.rollView.labelTextColor = historyHighlight;
		}

		return this.rollView;
	}

	public destroy() {
		if (this.rollView) {
			this.rollView.root.destroy();
			this.rollView = null;
		}
	}
};

export class RollHistory {
	private _root: MRE.Actor;
	public get root() { return this._root; }

	private log: HistoryEntry[] = [];

	public constructor(public app: App, actorProps?: Partial<MRE.ActorLike>) {
		this._root = MRE.Actor.Create(this.app.context, { actor: {
			name: "HistoryRoot",
			...actorProps
		}});
	}

	public addRollToHistory(user: MRE.User, roll: DiceGroup[]) {
		if (roll.some(dg => !dg.hasRollResults)) {
			throw new Error("Cannot add unrolled dice to history");
		}

		this.log.push(new HistoryEntry(user, roll));

		const displayLines = this.log.slice(Math.max(0, this.log.length - 10));
		const layout = new MRE.PlanarGridLayout(this.root, MRE.BoxAlignment.TopCenter, MRE.BoxAlignment.MiddleCenter);
		const oldEntries = [...this.root.children];
		let nextRow = 0;
		for (const entry of displayLines) {
			const rv = entry.toRollView(this);
			layout.addCell({
				row: nextRow++, column: 0, width: 1, height: 0.08,
				contents: rv.root
			});

			const entryIndex = oldEntries.indexOf(rv.root);
			if (entryIndex >= 0) {
				oldEntries.splice(entryIndex, 1);
			}
		}
		layout.applyLayout();

		for (const child of oldEntries) {
			child.destroy();
		}
	}
}
