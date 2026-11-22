import { useRouter } from 'expo-router';
import React from 'react';
import { ENGINE_VERSION } from '@/engine/constants';
import { t } from '@/i18n';
import { AppText, Card, Row, Screen, SectionTitle } from '@/ui/components/primitives';
import Constants from 'expo-constants';

export default function MoreScreen() {
  const router = useRouter();
  return (
    <Screen>
      <AppText variant="title">{t('more.title')}</AppText>
      <SectionTitle>{t('more.library')}</SectionTitle>
      <Card style={{ paddingVertical: 4 }}>
        <Row title={t('more.library')} subtitle="Kurze Artikel zu Schlaf und Energie" onPress={() => router.push('/library')} last />
      </Card>
      <SectionTitle>{t('more.tools')}</SectionTitle>
      <Card style={{ paddingVertical: 4 }}>
        <Row title={t('more.sounds')} subtitle="Regen, Rauschen, Wellen, Ventilator" onPress={() => router.push('/tools/sounds')} />
        <Row title={t('more.breathing')} subtitle="Animierter Atemkreis" onPress={() => router.push('/tools/breathing')} />
        <Row title={t('more.cantSleep')} subtitle="Was jetzt hilft" onPress={() => router.push('/tools/cant-sleep')} last />
      </Card>
      <SectionTitle>{t('more.settings')}</SectionTitle>
      <Card style={{ paddingVertical: 4 }}>
        <Row title={t('more.settings')} subtitle="Profil, Erinnerungen, Daten" onPress={() => router.push('/settings')} />
        <Row title={t('settings.about')} onPress={() => router.push('/settings/about')} last />
      </Card>
      <AppText variant="caption" muted style={{ textAlign: 'center' }}>
        Tagwerk {Constants.expoConfig?.version ?? '1.0.0'} · Engine {ENGINE_VERSION}
      </AppText>
    </Screen>
  );
}
