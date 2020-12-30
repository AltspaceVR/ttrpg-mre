import * as MRE from '@microsoft/mixed-reality-extension-sdk';

import App from './app';
import { DiceGroup } from './diceGroup';

export class RollHistory {
	private _root: MRE.Actor;
	public get root() { return this._root; }

	private lines: string[] = [];

	public constructor(private app: App, actorProps?: Partial<MRE.ActorLike>) {
		this._root = MRE.Actor.Create(this.app.context, { actor: {
			name: "HistoryRoot",
			...actorProps,
			text: {
				height: 0.1,
				anchor: MRE.TextAnchorLocation.BottomCenter,
				justify: MRE.TextJustify.Center
			}
		}});
	}

	public addRollToHistory(user: MRE.User, roll: DiceGroup[]) {
		if (roll.some(dg => !dg.hasRollResults)) {
			throw new Error("Cannot add unrolled dice to history");
		}

		const total = roll.reduce((sum, dg) => sum + dg.total, 0);
		const rollStr = roll.map(dg => dg.toString()).join(' + ');
		const logLine = `<b>${user.name}</b> rolled <b>${total}</b> (${rollStr})`;
		this.lines.push(logLine);

		const displayLines = this.lines.slice(this.lines.length - 10);
		this.root.text.contents = displayLines.join('\n');
	}
}
