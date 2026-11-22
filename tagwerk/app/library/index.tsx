import { Stack, useRouter } from 'expo-router';
import React from 'react';
import { ARTICLES } from '@/content/library';
import { t } from '@/i18n';
import { AppText, Card, Screen } from '@/ui/components/primitives';

export default function LibraryIndex() {
  const router = useRouter();
  return (
    <>
      <Stack.Screen options={{ title: t('more.library') }} />
      <Screen>
        {ARTICLES.map((a) => (
          <Card key={a.slug} onPress={() => router.push(`/library/${a.slug}`)} accessibilityLabel={a.title}>
            <AppText variant="h3">{a.title}</AppText>
            <AppText variant="caption" muted style={{ marginTop: 4 }}>
              {a.teaser} · {a.minutes} Min.
            </AppText>
          </Card>
        ))}
      </Screen>
    </>
  );
}
