import { Stack } from 'expo-router';
import type { AudioPlayer } from 'expo-audio';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { fadeVolume, NOISE_LABELS, type NoiseKind } from '@/lib/noise';
import { startSound } from '@/services/sounds';
import { t } from '@/i18n';
import { AppText, Button, Card, Chip, Notice, Screen } from '@/ui/components/primitives';
import { spacing } from '@/ui/theme';

const KINDS = Object.keys(NOISE_LABELS) as NoiseKind[];
const TIMERS = [15, 30, 60];

export default function SoundsScreen() {
  const [kind, setKind] = useState<NoiseKind>('rain');
  const [minutes, setMinutes] = useState(30);
  const [playing, setPlaying] = useState(false);
  const [left, setLeft] = useState(0);
  const [error, setError] = useState(false);
  const player = useRef<AudioPlayer | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = useCallback(() => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    try {
      player.current?.pause();
      player.current?.remove();
    } catch {
      /* already released */
    }
    player.current = null;
    setPlaying(false);
    setLeft(0);
  }, []);

  useEffect(() => stop, [stop]);

  const start = async () => {
    stop();
    setError(false);
    try {
      const p = await startSound(kind);
      player.current = p;
      setPlaying(true);
      const endAt = Date.now() + minutes * 60_000;
      timer.current = setInterval(() => {
        const rem = (endAt - Date.now()) / 1000;
        setLeft(Math.max(0, Math.round(rem)));
        if (player.current) player.current.volume = fadeVolume(rem);
        if (rem <= 0) stop();
      }, 1000);
    } catch {
      setError(true);
      stop();
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: t('more.sounds') }} />
      <Screen>
        <Card>
          <AppText variant="h3">Geräusch</AppText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2), marginTop: spacing(2) }}>
            {KINDS.map((k) => (
              <Chip key={k} label={NOISE_LABELS[k]} active={kind === k} onPress={() => setKind(k)} />
            ))}
          </View>
        </Card>
        <Card>
          <AppText variant="h3">Timer</AppText>
          <View style={{ flexDirection: 'row', gap: spacing(2), marginTop: spacing(2) }}>
            {TIMERS.map((m) => (
              <Chip key={m} label={`${m} min`} active={minutes === m} onPress={() => setMinutes(m)} />
            ))}
          </View>
          <AppText variant="caption" muted style={{ marginTop: spacing(2) }}>
            Die Lautstärke blendet in den letzten 20 Sekunden aus.
          </AppText>
        </Card>
        {playing ? (
          <>
            <AppText variant="number" style={{ textAlign: 'center' }}>
              {String(Math.floor(left / 60)).padStart(2, '0')}:{String(left % 60).padStart(2, '0')}
            </AppText>
            <Button label="Stopp" variant="secondary" onPress={stop} />
          </>
        ) : (
          <Button label="Abspielen" onPress={start} />
        )}
        {error && <Notice tone="warn">Das Geräusch konnte nicht abgespielt werden.</Notice>}
        <AppText variant="caption" muted>
          Die Geräusche werden auf deinem Gerät erzeugt, es wird nichts geladen.
        </AppText>
      </Screen>
    </>
  );
}
