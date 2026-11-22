import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Platform, ScrollView, View, type ScrollViewInstance } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatClock, formatDuration } from '@/engine/time';
import type { DayPlan } from '@/engine/dayPlan';
import { t } from '@/i18n';
import { exportWindowsToCalendar, hasCalendarAccess, loadEvents } from '@/services/calendar';
import { findConflicts, type CalendarItem } from '@/services/calendarLogic';
import { useApp } from '@/state/app';
import { useDayPlan, useTomorrowPlan } from '@/state/hooks';
import { TimelineRow } from '@/ui/components/TimelineRow';
import { AppText, Button, Card, Notice, Segmented } from '@/ui/components/primitives';
import { spacing, useTheme } from '@/ui/theme';
import type { DayWindow } from '@/engine/types';

type Which = 'today' | 'tomorrow';

export default function ScheduleScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const profile = useApp((s) => s.profile);
  const optIn = useApp((s) => s.settings.calendarOptIn);
  const { plan: today, now } = useDayPlan();
  const tomorrowPlan = useTomorrowPlan();
  const [which, setWhich] = useState<Which>('today');
  const [events, setEvents] = useState<CalendarItem[]>([]);
  const scroller = useRef<ScrollViewInstance>(null);
  const nowY = useRef<number | null>(null);
  const tz = profile?.timezone ?? 'Europe/Berlin';
  const plan: DayPlan | null = which === 'today' ? today : tomorrowPlan;

  useEffect(() => {
    let live = true;
    (async () => {
      if (!plan || !optIn || Platform.OS === 'web' || !(await hasCalendarAccess())) return setEvents([]);
      const ev = await loadEvents(plan.wakeAt, plan.bedtime.bedtime);
      if (live) setEvents(ev);
    })();
    return () => {
      live = false;
    };
  }, [plan, optIn]);

  const conflicts = useMemo(() => (plan ? findConflicts(events, plan.windows, tz) : []), [plan, events, tz]);

  const items = useMemo(() => {
    if (!plan) return [];
    const wins = plan.windows.map((w) => ({ type: 'window' as const, at: w.start, w }));
    const evs = events.filter((e) => !e.allDay).map((e) => ({ type: 'event' as const, at: e.start, e }));
    return [...wins, ...evs].sort((a, b) => a.at - b.at);
  }, [plan, events]);

  useEffect(() => {
    if (which === 'today' && nowY.current != null) scroller.current?.scrollTo({ y: Math.max(0, nowY.current - 120), animated: true });
  }, [which, plan?.date, items.length]);

  if (!profile || !plan) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;

  const currentIdx = (() => {
    if (which !== 'today') return -1;
    let idx = -1;
    items.forEach((it, i) => {
      if (it.type === 'window' && it.w.start <= now && (it.w.point ? it.w.start + 30 * 60_000 : it.w.end) > now) idx = idx === -1 ? i : idx;
    });
    return idx;
  })();

  const doExport = async () => {
    if (Platform.OS === 'web') return Alert.alert(t('schedule.calendar'), 'Im Browser nicht verfügbar.');
    const n = await exportWindowsToCalendar(plan);
    Alert.alert(t('schedule.calendar'), n > 0 ? `${n} Einträge im Kalender „Tagwerk“ angelegt.` : 'Keine neuen Einträge angelegt (Zugriff verweigert oder schon vorhanden).');
  };

  const conflictFor = (w: DayWindow) => conflicts.find((c) => c.window === w)?.message ?? null;

  return (
    <ScrollView
      ref={scroller}
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: spacing(4), paddingTop: insets.top + spacing(3), gap: spacing(3), paddingBottom: spacing(10) }}
    >
      <AppText variant="title">{t('schedule.title')}</AppText>
      <Segmented<Which>
        value={which}
        onChange={setWhich}
        options={[
          { value: 'today', label: t('schedule.today') },
          { value: 'tomorrow', label: t('schedule.tomorrow') },
        ]}
      />
      {which === 'tomorrow' && <Notice>{t('schedule.tomorrowNote')}</Notice>}
      {plan.bedtime.hint === 'too_early' && <Notice tone="warn">{t('schedule.tooEarly')}</Notice>}
      <AppText variant="caption" muted>
        {formatClock(plan.wakeAt, tz)} → {formatClock(plan.bedtime.bedtime, tz)} · {t('windows.bedtime')} {formatClock(plan.bedtime.bedtime, tz)} ({formatDuration(plan.needMinutes)} Bedarf)
      </AppText>

      {items.map((it, i) =>
        it.type === 'window' ? (
          <View
            key={`${it.w.kind}-${it.w.start}`}
            onLayout={(e) => {
              if (i === currentIdx) {
                nowY.current = e.nativeEvent.layout.y;
                scroller.current?.scrollTo({ y: Math.max(0, e.nativeEvent.layout.y - 120), animated: false });
              }
            }}
          >
            <TimelineRow window={it.w} tz={tz} isNow={i === currentIdx} isPast={which === 'today' && (it.w.point ? it.w.start : it.w.end) < now && i !== currentIdx} extra={conflictFor(it.w)} />
          </View>
        ) : (
          <Card key={`ev-${it.e.id}-${it.e.start}`} style={{ backgroundColor: colors.surface2, opacity: 0.8 }}>
            <AppText variant="caption" muted>
              {formatClock(it.e.start, tz)}–{formatClock(it.e.end, tz)} · Kalender
            </AppText>
            <AppText variant="h3">{it.e.title}</AppText>
          </Card>
        ),
      )}

      <Button label={t('schedule.calendar')} variant="secondary" onPress={doExport} />
    </ScrollView>
  );
}
