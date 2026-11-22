import { create } from 'zustand';
import { createStore } from '@/data/db';
import {
  DEMO_SCENARIOS,
  demoProfile,
  generateDemoSessions,
  type DemoScenarioId,
} from '@/data/demo/generator';
import { applyImport, type ParseResult } from '@/data/exchange';
import type { AppProfile, DataStore, Habit, HabitKey, HabitLog, HabitStatus } from '@/data/types';
import { defaultHabits } from '@/content/habits';
import { learnChronotype, chronotypeFromAnswers, type ChronotypeAnswers } from '@/engine/chronotype';
import { estimateSleepNeed } from '@/engine/sleepNeed';
import { dateKey } from '@/engine/time';
import type { Profile, SleepSession, WorkSchedule } from '@/engine/types';
import { getHealthProvider } from '@/integrations/health';
import { syncHealth, type SyncResult } from '@/services/sync';
import { setLang, type Lang } from '@/i18n';
import type { ThemePref } from '@/ui/theme';

export const dataStore: DataStore = createStore();

export interface Settings {
  theme: ThemePref;
  lang: Lang;
  demoScenario: DemoScenarioId | null;
  morningCheck: boolean;
  calendarOptIn: boolean;
  tipHistory: Record<string, string[]>;
  lastSync: number | null;
}

const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  lang: 'de',
  demoScenario: null,
  morningCheck: false,
  calendarOptIn: false,
  tipHistory: {},
  lastSync: null,
};

export function deviceTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Berlin';
  } catch {
    return 'Europe/Berlin';
  }
}

export const DEFAULT_WORK: WorkSchedule = {
  workDays: [1, 2, 3, 4, 5],
  workStart: '09:00',
  workEnd: '17:00',
  shiftMode: false,
};

export function newProfile(over: Partial<AppProfile> = {}): AppProfile {
  return {
    createdAt: Date.now(),
    name: null,
    birthYear: null,
    sleepNeedMinutesManual: null,
    sleepNeedMinutesEstimated: null,
    chronotype: 'intermediate',
    chronotypeScore: 0,
    circadianPhaseOffsetMin: 0,
    chronotypeUpdatedAt: null,
    targetWakeTime: null,
    workSchedule: DEFAULT_WORK,
    caffeineCutoffHours: 8,
    timezone: deviceTimezone(),
    onboardingCompletedAt: null,
    ...over,
  };
}

export interface OnboardingInput {
  name: string | null;
  birthYear: number | null;
  answers: ChronotypeAnswers;
  workSchedule: WorkSchedule;
  targetWakeTime: string | null;
  caffeineCutoffHours: number;
  habitReminders: Partial<Record<HabitKey, boolean>>;
  morningCheck: boolean;
}

interface AppState {
  ready: boolean;
  profile: AppProfile | null;
  sessions: SleepSession[];
  habits: Habit[];
  habitLogs: HabitLog[];
  settings: Settings;
  syncing: boolean;

  init: () => Promise<void>;
  reload: () => Promise<void>;
  setSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => Promise<void>;
  saveProfile: (patch: Partial<AppProfile>) => Promise<void>;
  applyOnboarding: (input: OnboardingInput) => Promise<void>;
  finishOnboarding: () => Promise<void>;
  saveNight: (n: { id?: string; startAt: number; endAt: number; isNap: boolean }) => Promise<string>;
  deleteNight: (id: string) => Promise<void>;
  saveHabit: (h: Habit) => Promise<void>;
  logHabit: (key: HabitKey, date: string, status: HabitStatus | null) => Promise<void>;
  loadDemo: (scenario: DemoScenarioId) => Promise<void>;
  syncNow: () => Promise<SyncResult>;
  updateEstimates: (force?: boolean) => Promise<void>;
  importBundle: (parsed: Extract<ParseResult, { ok: true }>) => Promise<void>;
  wipeAll: () => Promise<void>;
}

const parseJson = <T,>(s: string | null, fallback: T): T => {
  if (!s) return fallback;
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
};

async function loadSettings(): Promise<Settings> {
  const g = dataStore.getSetting.bind(dataStore);
  const theme = (await g('theme')) as ThemePref | null;
  const lang = (await g('lang')) as Lang | null;
  const demo = (await g('demo_scenario')) as DemoScenarioId | null;
  return {
    theme: theme ?? DEFAULT_SETTINGS.theme,
    lang: lang ?? DEFAULT_SETTINGS.lang,
    demoScenario: demo && DEMO_SCENARIOS.some((s) => s.id === demo) ? demo : null,
    morningCheck: (await g('morning_check')) === '1',
    calendarOptIn: (await g('calendar_optin')) === '1',
    tipHistory: parseJson(await g('tip_history'), {}),
    lastSync: parseJson<number | null>(await g('last_sync'), null),
  };
}

const SETTING_KEYS: Record<keyof Settings, string> = {
  theme: 'theme',
  lang: 'lang',
  demoScenario: 'demo_scenario',
  morningCheck: 'morning_check',
  calendarOptIn: 'calendar_optin',
  tipHistory: 'tip_history',
  lastSync: 'last_sync',
};

function serializeSetting(key: keyof Settings, value: unknown): string {
  if (key === 'morningCheck' || key === 'calendarOptIn') return value ? '1' : '0';
  if (key === 'tipHistory' || key === 'lastSync') return JSON.stringify(value);
  return String(value ?? '');
}

export const useApp = create<AppState>((set, get) => ({
  ready: false,
  profile: null,
  sessions: [],
  habits: [],
  habitLogs: [],
  settings: DEFAULT_SETTINGS,
  syncing: false,

  async init() {
    if (get().ready) return;
    try {
      let habits = await dataStore.listHabits();
      if (habits.length === 0) {
        for (const h of defaultHabits()) await dataStore.saveHabit(h);
        habits = await dataStore.listHabits();
      }
      const settings = await loadSettings();
      setLang(settings.lang);
      set({
        profile: await dataStore.getProfile(),
        sessions: await dataStore.listSessions(),
        habits,
        habitLogs: await dataStore.listHabitLogs(),
        settings,
        ready: true,
      });
    } catch {
      // The app must never crash because storage failed, start with an empty state.
      set({ ready: true });
    }
  },

  async reload() {
    set({
      profile: await dataStore.getProfile(),
      sessions: await dataStore.listSessions(),
      habits: await dataStore.listHabits(),
      habitLogs: await dataStore.listHabitLogs(),
    });
  },

  async setSetting(key, value) {
    await dataStore.setSetting(SETTING_KEYS[key], serializeSetting(key, value));
    if (key === 'lang') setLang(value as Lang);
    set({ settings: { ...get().settings, [key]: value } });
  },

  async saveProfile(patch) {
    const cur = get().profile ?? newProfile();
    const next = { ...cur, ...patch };
    await dataStore.saveProfile(next);
    await dataStore.clearSummaries();
    set({ profile: next });
  },

  async applyOnboarding(input) {
    const res = chronotypeFromAnswers(input.answers);
    const cur = get().profile ?? newProfile();
    const profile: AppProfile = {
      ...cur,
      name: input.name,
      birthYear: input.birthYear,
      chronotype: res.chronotype,
      chronotypeScore: res.score,
      circadianPhaseOffsetMin: res.offsetMin,
      chronotypeUpdatedAt: Date.now(),
      workSchedule: input.workSchedule,
      targetWakeTime: input.targetWakeTime,
      caffeineCutoffHours: input.caffeineCutoffHours,
      timezone: deviceTimezone(),
    };
    await dataStore.saveProfile(profile);
    const habits = get().habits.length ? get().habits : defaultHabits();
    for (const h of habits) {
      const wanted = input.habitReminders[h.key];
      const next: Habit =
        wanted === undefined ? h : { ...h, enabled: wanted || h.enabled, reminderEnabled: wanted };
      await dataStore.saveHabit(next);
    }
    await get().setSetting('morningCheck', input.morningCheck);
    await dataStore.clearSummaries();
    await get().reload();
  },

  async finishOnboarding() {
    const p = get().profile;
    if (!p) return;
    await get().updateEstimates(true);
    await get().saveProfile({ onboardingCompletedAt: Date.now() });
  },

  async saveNight(n) {
    const existing = n.id ? await dataStore.getSession(n.id) : null;
    const tz = get().profile?.timezone ?? deviceTimezone();
    const session: SleepSession = existing
      ? { ...existing, startAt: n.startAt, endAt: n.endAt, isNap: n.isNap, asleepMinutes: null, userEdited: true }
      : {
          id: `manual-${n.startAt}-${n.endAt}`,
          startAt: n.startAt,
          endAt: n.endAt,
          asleepMinutes: null,
          source: 'manual',
          sourceDetail: null,
          confidence: 1,
          isNap: n.isNap,
          timezone: tz,
          userEdited: true,
        };
    await dataStore.upsertSessions([session]);
    await dataStore.clearSummaries();
    set({ sessions: await dataStore.listSessions() });
    await get().updateEstimates();
    return session.id;
  },

  async deleteNight(id) {
    await dataStore.deleteSession(id);
    await dataStore.clearSummaries();
    set({ sessions: await dataStore.listSessions() });
  },

  async saveHabit(h) {
    await dataStore.saveHabit(h);
    set({ habits: await dataStore.listHabits() });
  },

  async logHabit(key, date, status) {
    if (status === null) await dataStore.removeHabitLog(key, date);
    else await dataStore.setHabitLog({ habitKey: key, date, status, at: Date.now() });
    set({ habitLogs: await dataStore.listHabitLogs() });
  },

  async loadDemo(scenario) {
    const tz = get().profile?.timezone ?? deviceTimezone();
    const now = Date.now();
    await dataStore.clearSessions('demo');
    const sessions = generateDemoSessions({ scenario, lastWakeKey: dateKey(now, tz), tz, nights: 90 });
    // Only keep nights that already ended.
    await dataStore.upsertSessions(sessions.filter((s) => s.endAt <= now));
    const existing = get().profile;
    const dp = demoProfile(scenario, tz, now) as Profile;
    const base = existing ? { ...existing } : newProfile();
    await dataStore.saveProfile({
      ...base,
      chronotype: dp.chronotype,
      chronotypeScore: dp.chronotypeScore,
      circadianPhaseOffsetMin: dp.circadianPhaseOffsetMin,
      workSchedule: dp.workSchedule,
      targetWakeTime: dp.targetWakeTime ?? null,
      sleepNeedMinutesEstimated: dp.sleepNeedMinutesEstimated ?? null,
      name: base.name ?? 'Demo',
      onboardingCompletedAt: base.onboardingCompletedAt ?? null,
    });
    await dataStore.clearSummaries();
    await get().setSetting('demoScenario', scenario);
    await get().reload();
  },

  async syncNow() {
    if (get().syncing) return { imported: 0, status: 'ok' };
    set({ syncing: true });
    try {
      const tz = get().profile?.timezone ?? deviceTimezone();
      const provider = getHealthProvider(tz, get().settings.demoScenario ?? 'rested');
      const res = await syncHealth(dataStore, provider, tz);
      if (res.status === 'ok') await get().setSetting('lastSync', Date.now());
      await get().reload();
      if (res.imported > 0) await get().updateEstimates();
      return res;
    } finally {
      set({ syncing: false });
    }
  },

  async updateEstimates(force = false) {
    const { profile, sessions } = get();
    if (!profile) return;
    const now = Date.now();
    const today = dateKey(now, profile.timezone);
    const last = await dataStore.getSetting('need_updated_day');
    let next: AppProfile = profile;
    if (force || last !== today) {
      const need = estimateSleepNeed(sessions, profile, now);
      if (need.basis === 'estimated') next = { ...next, sleepNeedMinutesEstimated: need.minutes };
      await dataStore.setSetting('need_updated_day', today);
    }
    const learned = learnChronotype(sessions, next, now, next.chronotypeUpdatedAt ?? undefined);
    if (learned && learned.changed) {
      next = {
        ...next,
        circadianPhaseOffsetMin: learned.offsetMin,
        chronotype: learned.chronotype,
        chronotypeScore: learned.score,
        chronotypeUpdatedAt: now,
      };
    }
    if (next !== profile) {
      await dataStore.saveProfile(next);
      await dataStore.clearSummaries();
      set({ profile: next });
    }
  },

  async importBundle(parsed) {
    await applyImport(dataStore, parsed.bundle);
    await get().reload();
    await get().updateEstimates(true);
  },

  async wipeAll() {
    await dataStore.wipe();
    for (const h of defaultHabits()) await dataStore.saveHabit(h);
    setLang('de');
    set({
      profile: null,
      sessions: [],
      habits: await dataStore.listHabits(),
      habitLogs: [],
      settings: DEFAULT_SETTINGS,
    });
  },
}));
