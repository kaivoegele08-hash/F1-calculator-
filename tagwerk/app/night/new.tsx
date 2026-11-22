import { Stack } from 'expo-router';
import React from 'react';
import { t } from '@/i18n';
import { NightEditor } from '@/ui/NightEditor';

export default function NewNight() {
  return (
    <>
      <Stack.Screen options={{ title: t('night.newTitle') }} />
      <NightEditor />
    </>
  );
}
