import { render, screen } from '@testing-library/react-native';
import React from 'react';
import { computeDayPlan } from '@/engine/dayPlan';
import { constantNights, makeProfile, TZ } from '@/engine/__tests__/fixtures';
import { localTimeToMs } from '@/engine/time';
import { DebtGauge, angleFor } from '../components/DebtGauge';
import { curveAccessibilityLabel, EnergyCurve } from '../components/EnergyCurve';
import { Heatmap } from '../components/Heatmap';
import { TimelineRow } from '../components/TimelineRow';
import { TimeStepper } from '../components/TimeStepper';
import { SleepBarChart } from '../components/Charts';
import { contrastRatio, darkColors, lightColors } from '../theme';

const now = localTimeToMs('2025-05-14', '10:00', TZ);
const plan = computeDayPlan({ sessions: constantNights('2025-05-14', 20, 450), profile: makeProfile(), now });

jest.mock('expo-haptics', () => ({ selectionAsync: jest.fn(async () => undefined) }));

describe('components', () => {
  it('EnergyCurve exposes an accessibility label with the current energy and phase', async () => {
    await render(<EnergyCurve plan={plan} now={now} tz={TZ} />);
    const el = screen.getByRole('image');
    expect(el.props.accessibilityLabel).toMatch(/^Energie aktuell \d+ von 100\./);
    expect(curveAccessibilityLabel(plan, now, TZ)).toContain('von 100');
  });

  it('DebtGauge labels the debt and level', async () => {
    await render(<DebtGauge minutes={400} level="medium" />);
    expect(screen.getByRole('image').props.accessibilityLabel).toBe('Schlafschuld 6 h 40 min, Spürbar. Hol in den nächsten Nächten etwas auf.');
    expect(screen.getByText('6 h 40 min')).toBeTruthy();
  });

  it('DebtGauge shows an insufficient data state with a range', async () => {
    await render(<DebtGauge minutes={0} level="low" insufficient range={[240, 420]} />);
    expect(screen.getByText('Zu wenig Daten')).toBeTruthy();
    expect(screen.getByText('wahrscheinlich 4 h bis 7 h')).toBeTruthy();
  });

  it('gauge angle runs from left to right and clamps', () => {
    expect(angleFor(0)).toBeCloseTo(Math.PI);
    expect(angleFor(600)).toBeCloseTo(Math.PI / 2);
    expect(angleFor(5000)).toBeCloseTo(0);
    expect(angleFor(-5)).toBeCloseTo(Math.PI);
  });

  it('TimelineRow renders time, title and description', async () => {
    const w = plan.windows.find((x) => x.kind === 'afternoon_dip')!;
    const { toJSON } = await render(<TimelineRow window={w} tz={TZ} isNow extra="Dein Termin um 14:30 liegt im Nachmittagstief." />);
    expect(screen.getByText('Nachmittagstief')).toBeTruthy();
    expect(screen.getByText(/Dein Termin um 14:30/)).toBeTruthy();
    expect(toJSON()).toMatchSnapshot();
  });

  it('TimelineRow renders point events without a duration bar', async () => {
    const w = plan.windows.find((x) => x.kind === 'caffeine_stop')!;
    await render(<TimelineRow window={w} tz={TZ} isPast />);
    expect(screen.getByText('Koffein-Stopp')).toBeTruthy();
  });

  it('TimeStepper shows the value', async () => {
    await render(<TimeStepper value="07:05" onChange={() => undefined} label="Aufstehen" />);
    expect(screen.getByText('07:05')).toBeTruthy();
    expect(screen.getByLabelText('Stunde später')).toBeTruthy();
  });

  it('Heatmap summarises the last 4 weeks', async () => {
    await render(<Heatmap today="2025-05-14" logs={[{ habitKey: 'bedtime', date: '2025-05-14', status: 'done', at: 1 }]} />);
    expect(screen.getByRole('image').props.accessibilityLabel).toBe('Letzte 4 Wochen: 1 von 28 Tagen erledigt');
  });

  it('SleepBarChart has a summary label', async () => {
    await render(<SleepBarChart nights={[{ date: '2025-05-13', minutes: 400 }]} need={480} />);
    expect(screen.getByRole('image').props.accessibilityLabel).toContain('Bedarf 8 h');
  });

  it('theme colours meet the 4.5:1 contrast for text on every surface', () => {
    for (const c of [darkColors, lightColors]) {
      for (const fg of ['text', 'textMuted', 'accent', 'accent2', 'good', 'warn', 'bad', 'melatonin'] as const) {
        for (const bg of ['bg', 'surface', 'surface2'] as const) {
          expect(contrastRatio(c[fg], c[bg])).toBeGreaterThanOrEqual(4.5);
        }
      }
      expect(contrastRatio(c.onAccent, c.accent)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(c.onAccent, c.good)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(c.onAccent, c.warn)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(c.onBad, c.bad)).toBeGreaterThanOrEqual(4.5);
    }
  });
});
