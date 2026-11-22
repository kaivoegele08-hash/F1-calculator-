import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  useFonts,
} from '@expo-google-fonts/manrope';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useMemo, useRef } from 'react';
import { AppState, useColorScheme, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { registerBackgroundSync } from '@/services/background';
import { useApp } from '@/state/app';
import { useReminderScheduling } from '@/state/useReminders';
import { darkColors, lightColors, resolveMode, ThemeContext } from '@/ui/theme';

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({ Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold });
  const ready = useApp((s) => s.ready);
  const init = useApp((s) => s.init);
  const profile = useApp((s) => s.profile);
  const pref = useApp((s) => s.settings.theme);
  const system = useColorScheme();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    init();
  }, [init]);

  const mode = resolveMode(pref, system);
  const theme = useMemo(() => ({ mode, colors: mode === 'dark' ? darkColors : lightColors }), [mode]);

  const onboarded = !!profile?.onboardingCompletedAt;
  const inOnboarding = segments[0] === 'onboarding';
  useEffect(() => {
    if (!ready) return;
    if (!onboarded && !inOnboarding) router.replace('/onboarding');
    if (onboarded && inOnboarding) router.replace('/');
  }, [ready, onboarded, inOnboarding, router]);

  // Sync on returning to the foreground.
  const syncNow = useApp((s) => s.syncNow);
  const lastActive = useRef(0);
  useEffect(() => {
    if (!ready || !onboarded) return;
    syncNow().catch(() => undefined);
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'active' && Date.now() - lastActive.current > 60_000) syncNow().catch(() => undefined);
      if (st !== 'active') lastActive.current = Date.now();
    });
    return () => sub.remove();
  }, [ready, onboarded, syncNow]);

  useReminderScheduling(ready && onboarded);
  useEffect(() => {
    if (ready && onboarded) registerBackgroundSync();
  }, [ready, onboarded]);

  if (!(fontsLoaded || fontError) || !ready) {
    return <View style={{ flex: 1, backgroundColor: darkColors.bg }} />;
  }

  return (
    <ThemeContext.Provider value={theme}>
      <SafeAreaProvider>
        <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: theme.colors.bg },
            headerTintColor: theme.colors.text,
            headerTitleStyle: { fontFamily: 'Manrope_600SemiBold' },
            contentStyle: { backgroundColor: theme.colors.bg },
            headerShadowVisible: false,
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="onboarding/index" options={{ headerShown: false, gestureEnabled: false }} />
        </Stack>
      </SafeAreaProvider>
    </ThemeContext.Provider>
  );
}
