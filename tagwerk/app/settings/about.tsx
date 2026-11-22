import { Stack } from 'expo-router';
import React from 'react';
import { ENGINE_VERSION } from '@/engine/constants';
import { t } from '@/i18n';
import { AppText, Card, Notice, Screen } from '@/ui/components/primitives';

export default function About() {
  return (
    <>
      <Stack.Screen options={{ title: t('settings.about') }} />
      <Screen>
        <Notice tone="warn">{t('disclaimer')}</Notice>
        <Card>
          <AppText variant="h3">Datenschutz</AppText>
          <AppText style={{ marginTop: 6 }}>{t('privacy')}</AppText>
        </Card>
        <Card>
          <AppText variant="h3">Modell</AppText>
          <AppText style={{ marginTop: 6 }} muted>
            Tagwerk kombiniert ein Zwei-Prozess-Modell der Schlafregulation (Schlafdruck und innere Uhr) mit einer gewichteten Schlafschuld über 14 Nächte. Alle Werte sind Modellschätzungen.
          </AppText>
        </Card>
        <Card>
          <AppText variant="h3">Impressum</AppText>
          <AppText style={{ marginTop: 6 }} muted>
            Tagwerk ist ein unabhängiges Projekt. Anbieterangaben bitte vor einer Veröffentlichung ergänzen.
          </AppText>
        </Card>
        <AppText variant="caption" muted style={{ textAlign: 'center' }}>
          {t('common.version')} 1.0.0 · Engine {ENGINE_VERSION}
        </AppText>
      </Screen>
    </>
  );
}
