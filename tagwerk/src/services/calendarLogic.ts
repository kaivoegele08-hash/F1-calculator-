import type { DayWindow, WindowKind } from '@/engine/types';
import { formatClock } from '@/engine/time';
import { t } from '@/i18n';

export interface CalendarItem {
  id: string;
  title: string;
  start: number;
  end: number;
  allDay?: boolean;
}

export interface Conflict {
  event: CalendarItem;
  window: DayWindow;
  message: string;
}

const CONFLICT_KINDS: WindowKind[] = ['afternoon_dip', 'grogginess'];

/** Meetings that fall into the afternoon dip or the groggy phase deserve a warning. */
export function findConflicts(events: CalendarItem[], windows: DayWindow[], tz: string): Conflict[] {
  const out: Conflict[] = [];
  for (const ev of events) {
    if (ev.allDay) continue;
    for (const w of windows) {
      if (!CONFLICT_KINDS.includes(w.kind) || w.point) continue;
      const overlap = Math.min(ev.end, w.end) - Math.max(ev.start, w.start);
      if (overlap > 0 && overlap >= Math.min(ev.end - ev.start, w.end - w.start) * 0.5) {
        out.push({
          event: ev,
          window: w,
          message: t('schedule.conflict', { time: formatClock(ev.start, tz), window: t(`windows.${w.kind}`) }),
        });
        break;
      }
    }
  }
  return out;
}

/** Windows worth putting into a calendar. */
export const EXPORT_KINDS: WindowKind[] = ['morning_peak', 'afternoon_dip', 'evening_peak', 'melatonin'];
