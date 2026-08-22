import { timeManager } from "../../../systems/time/TimeManager";

export function tickTimeSync(dtSec: number): void {
  timeManager.tick(dtSec);
}

export function resetTimeSync(): void {}
