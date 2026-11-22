import { parseBundle } from '@/data/exchange';
import { MemoryStore } from '@/data/memoryStore';
import { localTimeToMs } from '@/engine/time';
import { t } from '@/i18n';
import { dataStore, useApp, newProfile } from '../app';

jest.mock('@/data/db', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { MemoryStore: Store } = require('@/data/memoryStore');
  return { createStore: () => new Store() };
});
jest.mock('@/integrations/health', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { MockHealthProvider } = require('@/integrations/health/mock');
  return { getHealthProvider: (tz: string) => new MockHealthProvider(tz, 'rested') };
});


const TZ = 'Europe/Berlin';
const answers = { freeSleepStart: '00:30', freeWake: '08:30', workBed: '23:00', workWake: '07:00', peak: 'evening' as const, workDaysPerWeek: 5 };

beforeEach(async () => {
  await dataStore.wipe();
  useApp.setState({ ready: false, profile: null, sessions: [], habits: [], habitLogs: [] });
});

describe('app store', () => {
  it('uses the in-memory store in tests', () => {
    expect(dataStore).toBeInstanceOf(MemoryStore);
  });

  it('initialises with default habits and survives empty storage', async () => {
    await useApp.getState().init();
    const s = useApp.getState();
    expect(s.ready).toBe(true);
    expect(s.habits.length).toBe(9);
    expect(s.profile).toBeNull();
    expect(s.settings.theme).toBe('system');
  });

  it('loads a demo scenario and creates a profile without finishing onboarding', async () => {
    await useApp.getState().init();
    await useApp.getState().loadDemo('exam_week');
    const s = useApp.getState();
    expect(s.sessions.length).toBeGreaterThan(60);
    expect(s.settings.demoScenario).toBe('exam_week');
    expect(s.profile?.onboardingCompletedAt).toBeNull();
    await useApp.getState().loadDemo('rested');
    expect(useApp.getState().settings.demoScenario).toBe('rested');
  });

  it('runs the onboarding flow: chronotype, habits and completion', async () => {
    await useApp.getState().init();
    await useApp.getState().syncNow();
    expect(useApp.getState().sessions.length).toBeGreaterThan(50);
    await useApp.getState().applyOnboarding({
      name: 'Zelda',
      birthYear: 1995,
      answers,
      workSchedule: { workDays: [1, 2, 3, 4, 5], workStart: '09:00', workEnd: '17:00', shiftMode: false },
      targetWakeTime: '07:00',
      caffeineCutoffHours: 10,
      habitReminders: { morning_light: true, powernap: false },
      morningCheck: true,
    });
    let p = useApp.getState().profile!;
    expect(p.name).toBe('Zelda');
    expect(p.caffeineCutoffHours).toBe(10);
    expect(p.chronotype).toBe('intermediate');
    expect(useApp.getState().settings.morningCheck).toBe(true);
    expect(useApp.getState().habits.find((h) => h.key === 'powernap')?.reminderEnabled).toBe(false);
    expect(p.onboardingCompletedAt).toBeNull();
    await useApp.getState().finishOnboarding();
    p = useApp.getState().profile!;
    expect(p.onboardingCompletedAt).not.toBeNull();
    expect(p.sleepNeedMinutesEstimated).not.toBeNull();
  });

  it('adds, edits and deletes a night and keeps edited nights flagged', async () => {
    await useApp.getState().init();
    await useApp.getState().saveProfile(newProfile());
    const start = localTimeToMs('2025-05-13', '23:00', TZ);
    const end = localTimeToMs('2025-05-14', '07:00', TZ);
    const id = await useApp.getState().saveNight({ startAt: start, endAt: end, isNap: false });
    let s = useApp.getState();
    expect(s.sessions).toHaveLength(1);
    expect(s.sessions[0].source).toBe('manual');
    expect(s.sessions[0].userEdited).toBe(true);
    await useApp.getState().saveNight({ id, startAt: start, endAt: end + 30 * 60_000, isNap: false });
    s = useApp.getState();
    expect(s.sessions).toHaveLength(1);
    expect(s.sessions[0].endAt).toBe(end + 30 * 60_000);
    await useApp.getState().deleteNight(id);
    expect(useApp.getState().sessions).toHaveLength(0);
  });

  it('logs habits and can clear a log', async () => {
    await useApp.getState().init();
    await useApp.getState().logHabit('bedtime', '2025-05-14', 'done');
    expect(useApp.getState().habitLogs).toHaveLength(1);
    await useApp.getState().logHabit('bedtime', '2025-05-14', 'skipped');
    expect(useApp.getState().habitLogs[0].status).toBe('skipped');
    await useApp.getState().logHabit('bedtime', '2025-05-14', null);
    expect(useApp.getState().habitLogs).toHaveLength(0);
    const h = useApp.getState().habits[0];
    await useApp.getState().saveHabit({ ...h, enabled: !h.enabled });
    expect(useApp.getState().habits.find((x) => x.key === h.key)?.enabled).toBe(!h.enabled);
  });

  it('persists settings and switches language', async () => {
    await useApp.getState().init();
    await useApp.getState().setSetting('theme', 'dark');
    await useApp.getState().setSetting('lang', 'en');
    await useApp.getState().setSetting('calendarOptIn', true);
    await useApp.getState().setSetting('tipHistory', { '2025-05-14': ['nap'] });
    expect(await dataStore.getSetting('theme')).toBe('dark');
    expect(await dataStore.getSetting('calendar_optin')).toBe('1');
    expect(t('tabs.today')).toBe('Today');
    await useApp.getState().setSetting('lang', 'de');
    expect(t('tabs.today')).toBe('Heute');
    useApp.setState({ ready: false });
    await useApp.getState().init();
    expect(useApp.getState().settings.theme).toBe('dark');
    expect(useApp.getState().settings.tipHistory['2025-05-14']).toEqual(['nap']);
  });

  it('exports, wipes and imports data again', async () => {
    await useApp.getState().init();
    await useApp.getState().loadDemo('rested');
    const json = JSON.stringify(await dataStore.exportAll());
    await useApp.getState().wipeAll();
    expect(useApp.getState().sessions).toHaveLength(0);
    expect(useApp.getState().profile).toBeNull();
    expect(useApp.getState().habits).toHaveLength(9);
    const parsed = parseBundle(json);
    if (!parsed.ok) throw new Error(parsed.error);
    await useApp.getState().importBundle(parsed);
    expect(useApp.getState().sessions.length).toBeGreaterThan(60);
    expect(useApp.getState().profile).not.toBeNull();
  });

  it('updateEstimates only re-estimates once a day unless forced', async () => {
    await useApp.getState().init();
    await useApp.getState().loadDemo('rested');
    await useApp.getState().updateEstimates(true);
    const first = useApp.getState().profile!.sleepNeedMinutesEstimated;
    await useApp.getState().updateEstimates();
    expect(useApp.getState().profile!.sleepNeedMinutesEstimated).toBe(first);
  });

  it('does nothing when there is no profile', async () => {
    await useApp.getState().init();
    await useApp.getState().updateEstimates(true);
    await useApp.getState().finishOnboarding();
    expect(useApp.getState().profile).toBeNull();
  });
});
