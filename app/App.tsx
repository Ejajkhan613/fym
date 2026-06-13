import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { AuthScreens } from './src/features/auth/AuthScreens';
import { MainShell } from './src/navigation/MainShell';
import { colors } from './src/theme/colors';
import type { AuthSession } from './src/types/domain';
import { readStoredSession, removeStoredSession, writeStoredSession } from './src/storage/sessionStorage';

export default function App() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isBooting, setIsBooting] = useState(true);

  useEffect(() => {
    let mounted = true;

    readStoredSession()
      .then((storedSession) => {
        if (mounted) {
          setSession(storedSession);
        }
      })
      .finally(() => {
        if (mounted) {
          setIsBooting(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  async function handleAuthenticated(nextSession: AuthSession) {
    setSession(nextSession);
    await writeStoredSession(nextSession);
  }

  async function handleLogout() {
    setSession(null);
    await removeStoredSession();
  }

  async function handleSessionChanged(nextSession: AuthSession) {
    setSession(nextSession);
    await writeStoredSession(nextSession);
  }

  if (isBooting) {
    return (
      <View style={styles.loading}>
        <StatusBar style="dark" />
        <ActivityIndicator color={colors.primary} />
        <Text style={styles.loadingText}>Loading FYM</Text>
      </View>
    );
  }

  if (!session) {
    return <AuthScreens onAuthenticated={handleAuthenticated} />;
  }

  return (
    <MainShell
      session={session}
      onSessionChange={handleSessionChanged}
      onLogout={handleLogout}
    />
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: colors.muted,
    fontSize: 15,
    fontWeight: '600',
  },
});
