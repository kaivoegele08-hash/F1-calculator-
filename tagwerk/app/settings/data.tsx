import { Stack, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Platform, View } from 'react-native';
import { DEMO_SCENARIOS, type DemoScenarioId } from '@/data/demo/generator';
import { parseBundle, previewImport } from '@/data/exchange';
import { dataStore, useApp } from '@/state/app';
import { pickJson, shareJson } from '@/integrations/files';
import { t } from '@/i18n';
import { AppText, Button, Card, Chip, Notice, Screen, SectionTitle } from '@/ui/components/primitives';
import { spacing } from '@/ui/theme';
import { dateKey } from '@/engine/time';

function confirm(title: string, message: string): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(typeof window !== 'undefined' && window.confirm(`${title}\n\n${message}`));
  }
  return new Promise((resolve) =>
    Alert.alert(title, message, [
      { text: t('common.cancel'), style: 'cancel', onPress: () => resolve(false) },
      { text: t('common.delete'), style: 'destructive', onPress: () => resolve(true) },
    ]),
  );
}

export default function DataSettings() {
  const router = useRouter();
  const importBundle = useApp((s) => s.importBundle);
  const wipeAll = useApp((s) => s.wipeAll);
  const loadDemo = useApp((s) => s.loadDemo);
  const syncNow = useApp((s) => s.syncNow);
  const scenario = useApp((s) => s.settings.demoScenario);
  const lastSync = useApp((s) => s.settings.lastSync);
  const tz = useApp((s) => s.profile?.timezone ?? 'Europe/Berlin');
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState<{ bundle: ReturnType<typeof parseBundle> & { ok: true }; text: string } | null>(null);

  const doExport = async () => {
    const bundle = await dataStore.exportAll();
    const res = await shareJson(`tagwerk-${dateKey(Date.now(), tz)}.json`, JSON.stringify(bundle, null, 2));
    setMessage(res === 'unavailable' ? 'Teilen ist auf diesem Gerät nicht verfügbar.' : t('settings.exportDone'));
  };

  const startImport = async () => {
    setMessage(null);
    const text = await pickJson();
    if (text == null) return;
    const parsed = parseBundle(text);
    if (!parsed.ok) return setMessage(parsed.error);
    const preview = previewImport(parsed.bundle, await dataStore.listSessions());
    setPending({ bundle: parsed as ReturnType<typeof parseBundle> & { ok: true }, text: t('settings.importPreview', { n: preview.nightsFound, d: preview.duplicatesSkipped }) });
  };

  const applyImport = async () => {
    if (!pending) return;
    await importBundle(pending.bundle);
    setPending(null);
    setMessage(t('settings.importDone'));
  };

  const deleteAll = async () => {
    if (!(await confirm(t('settings.deleteConfirm1'), ''))) return;
    if (!(await confirm(t('settings.deleteConfirm1'), t('settings.deleteConfirm2')))) return;
    await wipeAll();
    router.replace('/onboarding');
  };

  const sync = async () => {
    const r = await syncNow();
    setMessage(r.status === 'ok' ? t('settings.syncDone', { n: r.imported }) : r.status === 'denied' ? 'Kein Zugriff auf Gesundheitsdaten.' : 'Keine Datenquelle verfügbar.');
  };

  return (
    <>
      <Stack.Screen options={{ title: t('settings.data') }} />
      <Screen>
        {message && <Notice>{message}</Notice>}
        <SectionTitle>{t('settings.sources')}</SectionTitle>
        <Card style={{ gap: spacing(3) }}>
          <AppText variant="caption" muted>
            {Platform.OS === 'web' ? 'Browser: Demo-Daten' : Platform.OS === 'ios' ? 'Apple Health' : 'Health Connect'}
            {lastSync ? ` · zuletzt ${new Date(lastSync).toLocaleString('de-DE')}` : ''}
          </AppText>
          <Button label={t('settings.sync')} variant="secondary" onPress={sync} />
        </Card>
        <SectionTitle>{t('settings.demo')}</SectionTitle>
        <Card style={{ gap: spacing(3) }}>
          <AppText variant="caption" muted>Lade realistische Beispieldaten, um die App auszuprobieren. Echte Nächte bleiben erhalten.</AppText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2) }}>
            {DEMO_SCENARIOS.map((s) => (
              <Chip key={s.id} label={s.label} active={scenario === s.id} onPress={() => loadDemo(s.id as DemoScenarioId)} />
            ))}
          </View>
        </Card>
        <SectionTitle>{t('settings.data')}</SectionTitle>
        <Button label={t('settings.export')} variant="secondary" onPress={doExport} />
        <Button label={t('settings.import')} variant="secondary" onPress={startImport} />
        {pending && (
          <Card style={{ gap: spacing(3) }}>
            <AppText variant="h3">{pending.text}</AppText>
            <View style={{ flexDirection: 'row', gap: spacing(2) }}>
              <Button style={{ flex: 1 }} label="Importieren" onPress={applyImport} />
              <Button style={{ flex: 1 }} label={t('common.cancel')} variant="secondary" onPress={() => setPending(null)} />
            </View>
          </Card>
        )}
        <Button label={t('settings.deleteAll')} variant="danger" onPress={deleteAll} />
      </Screen>
    </>
  );
}
