import { MIN } from './constants';

export const SLEEP_CYCLE_MIN = 90;

export interface WakeSuggestion {
  wakeAt: number;
  /** completed 90-minute cycles at that time */
  cycles: number;
  /** true if the time lies inside the requested span and ends a cycle */
  aligned: boolean;
}

/**
 * Pick the wake time inside [spanStart, spanEnd] that ends a 90-minute sleep cycle counted from
 * the expected sleep onset (7.8). The latest matching cycle end wins. If the span contains no
 * cycle end, the end of the span is returned with `aligned: false`.
 */
export function suggestWakeTime(sleepOnset: number, spanStart: number, spanEnd: number): WakeSuggestion {
  const cycleMs = SLEEP_CYCLE_MIN * MIN;
  const first = Math.max(1, Math.ceil((spanStart - sleepOnset) / cycleMs));
  const last = Math.floor((spanEnd - sleepOnset) / cycleMs);
  if (last >= first) {
    return { wakeAt: sleepOnset + last * cycleMs, cycles: last, aligned: true };
  }
  const cycles = Math.max(0, Math.round((spanEnd - sleepOnset) / cycleMs));
  return { wakeAt: spanEnd, cycles, aligned: false };
}
