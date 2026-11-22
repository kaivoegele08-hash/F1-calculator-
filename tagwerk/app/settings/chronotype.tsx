import { Stack, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { chronotypeFromAnswers, type ChronotypeAnswers } from '@/engine/chronotype';
import { t } from '@/i18n';
import { useApp } from '@/state/app';
import { AppText, Button, Card, Screen } from '@/ui/components/primitives';
import { ChronotypeForm, DEFAULT_ANSWERS } from '@/ui/forms';

export default function ChronotypeSettings() {
  const router = useRouter();
  const profile = useApp((s) => s.profile);
  const saveProfile = useApp((s) => s.saveProfile);
  const [answers, setAnswers] = useState<ChronotypeAnswers>({ ...DEFAULT_ANSWERS, workDaysPerWeek: profile?.workSchedule.workDays.length ?? 5 });
  const res = chronotypeFromAnswers(answers);
  return (
    <>
      <Stack.Screen options={{ title: t('settings.chronotype') }} />
      <Screen>
        <ChronotypeForm value={answers} onChange={setAnswers} />
        <Card>
          <AppText variant="h3">{t(`sleep.${res.chronotype}`)}</AppText>
          <AppText variant="caption" muted>
            {t('sleep.socialJetlag')}: {res.socialJetlagHours.toFixed(1)} h
          </AppText>
        </Card>
        <Button
          label={t('common.save')}
          onPress={async () => {
            await saveProfile({ chronotype: res.chronotype, chronotypeScore: res.score, circadianPhaseOffsetMin: res.offsetMin, chronotypeUpdatedAt: Date.now() });
            router.back();
          }}
        />
      </Screen>
    </>
  );
}
