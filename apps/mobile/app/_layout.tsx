import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { COLORS } from '../src/theme/tokens';
import { AnalyticsProvider } from '../src/lib/analytics';
import { SentryProvider } from '../src/lib/sentry';

const queryClient = new QueryClient();

export default function RootLayout() {
  return (
    <SentryProvider>
      <AnalyticsProvider>
        <GestureHandlerRootView style={styles.root}>
          <SafeAreaProvider>
            <QueryClientProvider client={queryClient}>
              <View style={styles.container}>
                <StatusBar style="light" />
                <Stack
                  screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: COLORS.bg },
                  }}
                >
                  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                </Stack>
              </View>
            </QueryClientProvider>
          </SafeAreaProvider>
        </GestureHandlerRootView>
      </AnalyticsProvider>
    </SentryProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
});
