import * as Calendar from 'expo-calendar';
import { Platform } from 'react-native';
import { t } from '@/i18n';
import type { DayPlan } from '@/engine/dayPlan';
import { EXPORT_KINDS, type CalendarItem } from './calendarLogic';

const supported = () => Platform.OS === 'ios' || Platform.OS === 'android';
const OWN_CALENDAR = 'Tagwerk';

export async function requestCalendarAccess(): Promise<boolean> {
  if (!supported()) return false;
  try {
    return (await Calendar.requestCalendarPermissions()).granted;
  } catch {
    return false;
  }
}

export async function hasCalendarAccess(): Promise<boolean> {
  if (!supported()) return false;
  try {
    return (await Calendar.getCalendarPermissions()).granted;
  } catch {
    return false;
  }
}

/** Events of the user's calendars (without the Tagwerk calendar) in a time range. */
export async function loadEvents(from: number, to: number): Promise<CalendarItem[]> {
  if (!(await hasCalendarAccess())) return [];
  try {
    const cals = (await Calendar.getCalendars(Calendar.EntityTypes.EVENT)).filter((c) => c.title !== OWN_CALENDAR);
    const out: CalendarItem[] = [];
    for (const c of cals) {
      const events = await c.listEvents(new Date(from), new Date(to));
      for (const e of events) {
        out.push({
          id: e.id,
          title: e.title,
          start: new Date(e.startDate).getTime(),
          end: new Date(e.endDate).getTime(),
          allDay: e.allDay,
        });
      }
    }
    return out.sort((a, b) => a.start - b.start);
  } catch {
    return [];
  }
}

async function getOrCreateOwnCalendar() {
  const cals = await Calendar.getCalendars(Calendar.EntityTypes.EVENT);
  const existing = cals.find((c) => c.title === OWN_CALENDAR);
  if (existing) return existing;
  const details = {
    title: OWN_CALENDAR,
    name: OWN_CALENDAR,
    color: '#FFB547',
    entityType: Calendar.EntityTypes.EVENT,
    accessLevel: Calendar.CalendarAccessLevel.OWNER,
    ownerAccount: 'local',
  };
  if (Platform.OS === 'ios') {
    const def = Calendar.getDefaultCalendarSync();
    Object.assign(details, { source: def.source, sourceId: def.source?.id });
  } else {
    Object.assign(details, { source: { isLocalAccount: true, name: OWN_CALENDAR, type: 'LOCAL' } });
  }
  return Calendar.createCalendar(details);
}

/** Write the day's energy windows into a dedicated "Tagwerk" calendar (opt-in). Returns the event count. */
export async function exportWindowsToCalendar(plan: DayPlan): Promise<number> {
  if (!(await requestCalendarAccess())) return 0;
  try {
    const cal = await getOrCreateOwnCalendar();
    const existing = await cal.listEvents(new Date(plan.wakeAt - 3_600_000), new Date(plan.bedtime.bedtime + 3 * 3_600_000));
    const taken = new Set(existing.map((e) => `${e.title}|${new Date(e.startDate).getTime()}`));
    let n = 0;
    for (const w of plan.windows) {
      if (!EXPORT_KINDS.includes(w.kind)) continue;
      const title = t(`windows.${w.kind}`);
      if (taken.has(`${title}|${w.start}`)) continue;
      await cal.createEvent({
        title,
        startDate: new Date(w.start),
        endDate: new Date(w.end),
        notes: t(`windowText.${w.kind}`),
        allDay: false,
      });
      n++;
    }
    return n;
  } catch {
    return 0;
  }
}
