import { Stack, useRouter } from 'expo-router';
import React from 'react';
import { t } from '@/i18n';
import { AppText, Button, Card, Screen } from '@/ui/components/primitives';

const STEPS = [
  ['Nicht auf die Uhr schauen', 'Das erhöht nur den Druck. Dreh den Wecker weg.'],
  ['Atmen', 'Probier die Atemübung 4-7-8 für ein paar Runden.'],
  ['Gedanken ablegen', 'Schreib kreisende Gedanken oder To-dos auf einen Zettel. Was aufgeschrieben ist, musst du nicht mehr merken.'],
  ['Nach etwa 20 Minuten aufstehen', 'Setz dich bei schwachem Licht hin und mach etwas Ruhiges, zum Beispiel lesen. Geh zurück ins Bett, wenn du müde wirst.'],
  ['Kein Alkohol, kein Handy', 'Beides hält dich wacher, auch wenn es sich kurz anders anfühlt.'],
  ['Morgen gelassen bleiben', 'Eine schlechte Nacht ist kein Drama. Steh zur gewohnten Zeit auf, geh ans Licht und schlaf am Abend wieder normal.'],
] as const;

export default function CantSleep() {
  const router = useRouter();
  return (
    <>
      <Stack.Screen options={{ title: t('more.cantSleep') }} />
      <Screen>
        <AppText muted>Kein Stress, das passiert jedem. Das hilft jetzt:</AppText>
        {STEPS.map(([title, text], i) => (
          <Card key={title}>
            <AppText variant="h3">{i + 1}. {title}</AppText>
            <AppText variant="caption" muted style={{ marginTop: 4 }}>{text}</AppText>
          </Card>
        ))}
        <Button label={t('more.breathing')} onPress={() => router.push('/tools/breathing')} />
        <Button label={t('more.sounds')} variant="secondary" onPress={() => router.push('/tools/sounds')} />
        <AppText variant="caption" muted>{t('disclaimer')}</AppText>
      </Screen>
    </>
  );
}
