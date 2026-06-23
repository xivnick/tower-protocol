import { useCallback, useSyncExternalStore } from "react";

let combatClockNow = Date.now();
let combatClockIntervalId: number | null = null;
const combatClockListeners = new Set<() => void>();

function subscribeToCombatClock(listener: () => void) {
  combatClockListeners.add(listener);
  if (combatClockIntervalId === null) {
    combatClockNow = Date.now();
    combatClockIntervalId = window.setInterval(() => {
      combatClockNow = Date.now();
      combatClockListeners.forEach((notify) => notify());
    }, 100);
  }

  return () => {
    combatClockListeners.delete(listener);
    if (combatClockListeners.size === 0 && combatClockIntervalId !== null) {
      window.clearInterval(combatClockIntervalId);
      combatClockIntervalId = null;
    }
  };
}

export function useCombatClock(isActive: boolean) {
  const subscribe = useCallback((listener: () => void) => (isActive ? subscribeToCombatClock(listener) : () => {}), [isActive]);
  return useSyncExternalStore(subscribe, () => combatClockNow, () => combatClockNow);
}
