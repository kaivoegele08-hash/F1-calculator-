import { Stack, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { t } from '@/i18n';
import { useApp } from '@/state/app';
import { Button, Screen } from '@/ui/components/primitives';
import { WorkForm } from '@/ui/forms';

export default function ScheduleSettings() {
  const router = useRouter();
  const profile = useApp((s) => s.profile);
  const saveProfile = useApp((s) => s.saveProfile);
  const [work, setWork] = useState(profile?.workSchedule ?? { workDays: [1, 2, 3, 4, 5], workStart: '09:00', workEnd: '17:00', shiftMode: false });
  return (
    <>
      <Stack.Screen options={{ title: t('settings.schedule') }} />
      <Screen>
        <WorkForm value={work} onChange={setWork} />
        <Button label={t('common.save')} onPress={async () => { await saveProfile({ workSchedule: work }); router.back(); }} />
      </Screen>
    </>
  );
}
