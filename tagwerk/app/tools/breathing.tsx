import { Stack } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { breathState, BREATH } from '@/lib/noise';
import { t } from '@/i18n';
import { AppText, Button, Card, Screen } from '@/ui/components/primitives';
import { useTheme } from '@/ui/theme';

const LABEL = { inhale: 'Einatmen', hold: 'Halten', exhale: 'Ausatmen' } as const;
const SIZE = 240;

export default function BreathingScreen() {
  const { colors } = useTheme();
  const reduce = useReducedMotion();
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!running) return;
    const start = Date.now();
    const id = setInterval(() => setElapsed(Date.now() - start), 100);
    return () => clearInterval(id);
  }, [running]);

  const st = breathState(running ? elapsed : 0);
  const scale = running && !reduce ? st.scale : 0.75;
  return (
    <>
      <Stack.Screen options={{ title: t('more.breathing') }} />
      <Screen>
        <Card style={{ alignItems: 'center', gap: 16 }}>
          <AppText muted style={{ textAlign: 'center' }}>
            Atme {BREATH.inhale} Sekunden ein, halte {BREATH.hold} Sekunden und atme {BREATH.exhale} Sekunden aus.
          </AppText>
          <View style={{ height: SIZE + 20, width: SIZE + 20, alignItems: 'center', justifyContent: 'center' }}>
            <View
              accessible
              accessibilityLabel={running ? `${LABEL[st.phase]}, noch ${Math.ceil(st.remaining)} Sekunden` : 'Atemübung bereit'}
              style={{
                width: SIZE,
                height: SIZE,
                borderRadius: SIZE / 2,
                backgroundColor: colors.accent2,
                opacity: 0.35 + 0.5 * scale,
                transform: [{ scale }],
              }}
            />
            <View style={{ position: 'absolute', alignItems: 'center' }}>
              <AppText variant="h2">{running ? LABEL[st.phase] : 'Bereit'}</AppText>
              {running && <AppText variant="number">{Math.ceil(st.remaining)}</AppText>}
            </View>
          </View>
          {running && <AppText variant="caption" muted>Runde {st.cycle + 1}</AppText>}
        </Card>
        <Button
          label={running ? 'Stopp' : 'Start'}
          onPress={() => {
            setElapsed(0);
            setRunning((r) => !r);
          }}
        />
      </Screen>
    </>
  );
}
