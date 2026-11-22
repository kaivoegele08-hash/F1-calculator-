import { Stack, useRouter } from 'expo-router';
import React from 'react';
import { ENGINE_VERSION } from '@/engine/constants';
import { t } from '@/i18n';
import { useApp } from '@/state/app';
import { AppText, Card, Row, Screen, Segmented, SectionTitle } from '@/ui/components/primitives';
import type { ThemePref } from '@/ui/theme';
import type { Lang } from '@/i18n';

export default function SettingsIndex() {
  const router = useRouter();
  const settings = useApp((s) => s.settings);
  const setSetting = useApp((s) => s.setSetting);
  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: t('settings.title') }} />
      <Screen>
        <Card style={{ paddingVertical: 4 }}>
          <Row title={t('settings.profile')} onPress={() => router.push('/settings/profile')} />
          <Row title={t('settings.sleepNeed')} onPress={() => router.push('/settings/sleep-need')} />
          <Row title={t('settings.chronotype')} onPress={() => router.push('/settings/chronotype')} />
          <Row title={t('settings.schedule')} onPress={() => router.push('/settings/schedule')} />
          <Row title={t('settings.notifications')} onPress={() => router.push('/settings/notifications')} />
          <Row title="Sanfter Wecker" onPress={() => router.push('/settings/alarm')} />
          <Row title={t('settings.calendar')} onPress={() => router.push('/settings/calendar')} />
          <Row title={t('settings.data')} subtitle={`${t('settings.sources')}, Export, Import, Demo`} onPress={() => router.push('/settings/data')} />
          <Row title={t('settings.about')} onPress={() => router.push('/settings/about')} last />
        </Card>
        <SectionTitle>{t('settings.appearance')}</SectionTitle>
        <Segmented<ThemePref>
          value={settings.theme}
          onChange={(v) => setSetting('theme', v)}
          options={[
            { value: 'system', label: t('settings.themeSystem') },
            { value: 'dark', label: t('settings.themeDark') },
            { value: 'light', label: t('settings.themeLight') },
          ]}
        />
        <SectionTitle>{t('settings.language')}</SectionTitle>
        <Segmented<Lang>
          value={settings.lang}
          onChange={(v) => setSetting('lang', v)}
          options={[
            { value: 'de', label: 'Deutsch' },
            { value: 'en', label: 'English' },
          ]}
        />
        <AppText variant="caption" muted style={{ textAlign: 'center' }}>
          {t('common.version')} 1.0.0 · Engine {ENGINE_VERSION}
        </AppText>
      </Screen>
    </>
  );
}
