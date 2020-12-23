import { Die, DieType } from './die';
import { DiceGroup } from './diceGroup';

/** A heterogeneous group of dice that are rolled together. */
export class Roll {
	private diceGroups = new Map<DieType, DiceGroup>();

	public addDie(die: DieType) {
		if (!this.diceGroups.has(die)) {
			this.diceGroups.set(die, new DiceGroup(die, 1, 0, 0));
		} else {
			this.diceGroups.get(die).count++;
		}
	}
}
