import { timeManager } from "../../../systems/time/TimeManager";
import { useWorldStore } from "../../../store/worldStore";

let lastSync = 0;

export function tickTimeSync(dtSec: number): void {
  timeManager.tick(dtSec);

  const now = Date.now();
  if (now - lastSync >= 1000) {
    lastSync = now;
    useWorldStore.getState().syncClock(timeManager.getNow());
  }
}

export function resetTimeSync(): void {
  lastSync = 0;
  useWorldStore.getState().syncClock(timeManager.getNow());
}
