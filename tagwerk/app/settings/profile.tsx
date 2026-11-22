import { Stack, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { View } from 'react-native';
import { t } from '@/i18n';
import { useApp } from '@/state/app';
import { AppText, Button, Card, Chip, Screen } from '@/ui/components/primitives';
import { CAFFEINE_OPTIONS, TargetWakeForm, TextField } from '@/ui/forms';
import { spacing } from '@/ui/theme';

export default function ProfileSettings() {
  const router = useRouter();
  const profile = useApp((s) => s.profile);
  const saveProfile = useApp((s) => s.saveProfile);
  const [name, setName] = useState(profile?.name ?? '');
  const [year, setYear] = useState(profile?.birthYear ? String(profile.birthYear) : '');
  const [wake, setWake] = useState<string | null>(profile?.targetWakeTime ?? null);
  const [cutoff, setCutoff] = useState(profile?.caffeineCutoffHours ?? 8);
  const [noCaffeine, setNoCaffeine] = useState(false);
  const y = parseInt(year, 10);
  const yearOk = year === '' || (y >= 1900 && y <= new Date().getFullYear());
  return (
    <>
      <Stack.Screen options={{ title: t('settings.profile') }} />
      <Screen>
        <Card style={{ gap: spacing(4) }}>
          <TextField label={t('onboarding.name')} value={name} onChangeText={setName} maxLength={30} />
          <TextField label={t('onboarding.birthYear')} value={year} onChangeText={(v) => setYear(v.replace(/\D/g, ''))} keyboardType="number-pad" maxLength={4} />
        </Card>
        <TargetWakeForm value={wake} onChange={setWake} />
        <Card style={{ gap: spacing(3) }}>
          <AppText variant="h3">{t('settings.caffeine')}</AppText>
          <View style={{ flexDirection: 'row', gap: spacing(2), flexWrap: 'wrap' }}>
            {CAFFEINE_OPTIONS.map((h) => (
              <Chip key={h} label={`${h} h`} active={!noCaffeine && cutoff === h} onPress={() => { setNoCaffeine(false); setCutoff(h); }} />
            ))}
          </View>
        </Card>
        <Button
          label={t('common.save')}
          disabled={!yearOk}
          onPress={async () => {
            await saveProfile({ name: name.trim() || null, birthYear: year ? y : null, targetWakeTime: wake, caffeineCutoffHours: cutoff });
            router.back();
          }}
        />
      </Screen>
    </>
  );
}
