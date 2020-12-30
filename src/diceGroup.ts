import { DieType } from './die';

/** A homogeneous group of dice, with drop high/low logic. */
export class DiceGroup {
	private _type: DieType;
	/** That type of dice are in this group. All dice are of the same type. */
	public get type() { return this._type; }
	public set type(value) {
		if (this.hasRollResults) {
			throw new Error("Cannot change dice after rolling");
		}
		this._type = value;
	}

	private _count: number;
	/** The number of dice in this group. */
	public get count() { return this._count; }
	public set count(value) {
		if (this.hasRollResults) {
			throw new Error("Cannot change dice after rolling");
		}
		this._count = value;
	}

	private _dropHighest: number;
	/** When rolling, do not include this number of the highest rolls in the total. */
	public get dropHighest() { return this._dropHighest; }
	public set dropHighest(value) {
		if (this.hasRollResults) {
			throw new Error("Cannot change dice after rolling");
		} else if (value >= this.count - this.dropLowest) {
			throw new Error("Cannot drop all dice");
		}
		this._dropHighest = value;
	}

	private _dropLowest: number;
	/** When rolling, do not include this number of the lowest rolls in the total. */
	public get dropLowest() { return this._dropLowest; }
	public set dropLowest(value) {
		if (this.hasRollResults) {
			throw new Error("Cannot change dice after rolling");
		} else if (value >= this.count - this.dropHighest) {
			throw new Error("Cannot drop all dice");
		}
		this._dropLowest = value;
	}

	/** Whether this group has been rolled. Rolled groups become locked and can no longer be changed. */
	public get hasRollResults() { return !!this.results; }

	private _results: number[] = null;
	/** An array of the raw dice rolls. Will be null if the group has not been rolled. */
	public get results() { return this._results; }

	private _contributingResults: number[] = null;
	/**
	 * An array of indices into {@link results} indicating which rolls were included in the {@link total}.
	 * Will be null if the group has not been rolled.
	 */
	public get contributingResults() { return this._contributingResults; }

	private _total: number = 0;
	/** The total of all rolled dice, with dropped dice excluded. */
	public get total() { return this._total; }

	public constructor(type: DieType, count: number, dropHighest: number, dropLowest: number);
	public constructor(toClone: DiceGroup);
	public constructor(typeOrClone: DieType | DiceGroup, count = 0, dropHighest = 0, dropLowest = 0) {
		if (typeof typeOrClone === 'object') {
			const toClone = typeOrClone as DiceGroup;
			this.type = toClone.type;
			this.count = toClone.count;
			this.dropHighest = toClone.dropHighest;
			this.dropLowest = toClone.dropLowest;
		} else {
			this.type = typeOrClone as DieType;
			this.count = count;
			this.dropHighest = dropHighest;
			this.dropLowest = dropLowest;
		}
	}

	/**
	 * Roll the dice, generating {@link results}, {@link contributingResults}, and {@link total},
	 * and lock this group from further editing.
	 */
	public roll(): void {
		if (this.hasRollResults) {
			throw new Error("Dice groups are read-only after rolling. Copy to a new group to reroll.");
		}

		// generate dice roll values
		this._results = [];
		for (let i = 0; i < this.count; i++) {
			this._results.push(DiceGroup.roll(this.type));
		}

		// apply drops
		const contribs = this._results.map((_, i) => i).sort((a, b) => {
			if (this._results[a] < this._results[b]) {
				return -1;
			} else if (this._results[a] > this._results[b]) {
				return 1;
			} else {
				return 0;
			}
		});
		this._contributingResults = contribs.slice(this.dropLowest, contribs.length - this.dropHighest);

		// calculate total
		this._total = this._contributingResults.reduce((sum, i) => sum + this._results[i], 0);
	}

	private static roll(type: DieType): number {
		switch (type) {
			case DieType.D1:   return 1;
			case DieType.D4:   return Math.floor(4 * Math.random()) + 1;
			case DieType.D6:   return Math.floor(6 * Math.random()) + 1;
			case DieType.D8:   return Math.floor(8 * Math.random()) + 1;
			case DieType.D10:  return Math.floor(10 * Math.random()) + 1;
			case DieType.D12:  return Math.floor(12 * Math.random()) + 1;
			case DieType.D20:  return Math.floor(20 * Math.random()) + 1;
			case DieType.D100: return Math.floor(100 * Math.random()) + 1;
			default:           return 0;
		}
	}

	public toString(): string {
		let str = this.type === DieType.D1 ? this.count.toString() : this.count + this.type;
		if (this.dropLowest > 0) {
			str += "dl" + this.dropLowest;
		}
		if (this.dropHighest > 0) {
			str += "dh" + this.dropHighest;
		}
		return str;
	}
}
