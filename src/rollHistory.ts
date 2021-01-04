import * as MRE from '@microsoft/mixed-reality-extension-sdk';

import App from './app';
import { Dice, DiceGroup } from './diceGroup';
import { RollView } from './rollView';

const highlights = new Map<MRE.Guid, MRE.Color3>();

class HistoryEntry {
	public readonly timestamp: Date;
	private rollView: RollView;

	public constructor(public user: MRE.UserLike, public roll: Dice) {
		this.timestamp = new Date();
		if (!highlights.has(user.id)) {
			highlights.set(user.id, new MRE.Color3(
				(0x7f + 0x80 * Math.random()) / 0xff,
				(0x7f + 0x80 * Math.random()) / 0xff,
				(0x7f + 0x80 * Math.random()) / 0xff,
			));
		}
	}

	public toString() {
		return `<color ${highlights.get(this.user.id).toHexString()}>${this.user.name}</color>` +
			` rolled <color ${highlights.get(this.user.id).toHexString()}>${this.roll.rollTotal}</color>` +
			` (${this.roll.toString()})`;
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
			this.rollView.labelTextColor = highlights.get(this.user.id);
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

	public addRollToHistory(user: MRE.User, roll: Dice) {
		if (!roll.hasRollResults) {
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
