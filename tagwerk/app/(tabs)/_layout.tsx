import { Tabs } from 'expo-router';
import { CalendarClock, Home, MoonStar, MoreHorizontal, ListChecks } from 'lucide-react-native';
import React from 'react';
import { t } from '@/i18n';
import { useTheme } from '@/ui/theme';

export default function TabsLayout() {
  const { colors } = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border, height: 64, paddingTop: 6 },
        tabBarLabelStyle: { fontFamily: 'Manrope_600SemiBold', fontSize: 10 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t('tabs.today'), tabBarIcon: ({ color }) => <Home size={22} color={color} /> }} />
      <Tabs.Screen name="sleep" options={{ title: t('tabs.sleep'), tabBarIcon: ({ color }) => <MoonStar size={22} color={color} /> }} />
      <Tabs.Screen name="schedule" options={{ title: t('tabs.schedule'), tabBarIcon: ({ color }) => <CalendarClock size={22} color={color} /> }} />
      <Tabs.Screen name="habits" options={{ title: t('tabs.habits'), tabBarIcon: ({ color }) => <ListChecks size={22} color={color} /> }} />
      <Tabs.Screen name="more" options={{ title: t('tabs.more'), tabBarIcon: ({ color }) => <MoreHorizontal size={22} color={color} /> }} />
    </Tabs>
  );
}
