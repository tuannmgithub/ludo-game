import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, Text, Animated, StyleSheet } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { useGameStore } from '../store/gameStore';
import { guestAuth } from '../lib/api';
import { storage } from '../lib/storage';

// Keep splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

function Toast() {
  const { toastMessage, toastType, clearToast } = useGameStore();
  const opacity = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (toastMessage) {
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.delay(2500),
        Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start(() => clearToast());
    }
  }, [toastMessage]);

  if (!toastMessage) return null;

  const bgColor =
    toastType === 'error'
      ? '#ef4444'
      : toastType === 'success'
      ? '#22c55e'
      : toastType === 'warning'
      ? '#eab308'
      : '#3b82f6';

  return (
    <Animated.View style={[styles.toast, { backgroundColor: bgColor, opacity }]}>
      <Text style={styles.toastText}>{toastMessage}</Text>
    </Animated.View>
  );
}

export default function RootLayout() {
  const { setMyPlayerId, setGuestToken, setUsername } = useGameStore();
  const [appReady, setAppReady] = React.useState(false);

  useEffect(() => {
    async function init() {
      try {
        // Try to load existing credentials
        const stored = await storage.getCredentials();
        if (stored) {
          setMyPlayerId(stored.playerId);
          setGuestToken(stored.guestToken);
          setUsername(stored.username);
        } else {
          // Create new guest credentials
          const creds = await guestAuth();
          setMyPlayerId(creds.playerId);
          setGuestToken(creds.guestToken);
          setUsername(creds.username);
          await storage.setCredentials(creds);
        }
      } catch (err) {
        // Still allow app to launch even if auth fails
        console.warn('Auth init failed:', err);
      } finally {
        setAppReady(true);
        await SplashScreen.hideAsync();
      }
    }
    init();
  }, []);

  if (!appReady) return null;

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#16213e' },
          headerTintColor: '#ffffff',
          headerTitleStyle: { fontWeight: 'bold' },
          contentStyle: { backgroundColor: '#1a1a2e' },
        }}
      >
        <Stack.Screen name="index" options={{ title: 'Cờ Cá Ngựa', headerShown: false }} />
        <Stack.Screen
          name="game/[roomCode]"
          options={{ title: 'Trò Chơi', headerBackTitle: 'Thoát' }}
        />
      </Stack>
      <Toast />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  toast: {
    position: 'absolute',
    bottom: 90,
    left: 16,
    right: 16,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    zIndex: 9999,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  toastText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});
