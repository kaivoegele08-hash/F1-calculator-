import { Stack, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { ARTICLE_BY_SLUG, parseBody } from '@/content/library';
import { t } from '@/i18n';
import { AppText, Card, Screen } from '@/ui/components/primitives';
import { spacing, useTheme } from '@/ui/theme';

export default function ArticleScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { colors } = useTheme();
  const article = ARTICLE_BY_SLUG[slug ?? ''];
  if (!article) return <Screen><AppText muted>{t('empty.generic')}</AppText></Screen>;
  const blocks = parseBody(article.body);
  return (
    <>
      <Stack.Screen options={{ title: '' }} />
      <Screen>
        <AppText variant="title" accessibilityRole="header">{article.title}</AppText>
        <AppText variant="caption" muted>{article.minutes} Min. Lesezeit</AppText>
        {blocks.map((b, i) =>
          b.type === 'h' ? (
            <AppText key={i} variant="h2" accessibilityRole="header" style={{ marginTop: spacing(2) }}>{b.text}</AppText>
          ) : b.type === 'li' ? (
            <View key={i} style={{ flexDirection: 'row', gap: spacing(2) }}>
              <AppText color={colors.accent}>•</AppText>
              <AppText style={{ flex: 1 }}>{b.text}</AppText>
            </View>
          ) : (
            <AppText key={i}>{b.text}</AppText>
          ),
        )}
        <Card>
          <AppText variant="caption" muted>{article.sources}</AppText>
        </Card>
        <AppText variant="caption" muted>{t('disclaimer')}</AppText>
      </Screen>
    </>
  );
}
