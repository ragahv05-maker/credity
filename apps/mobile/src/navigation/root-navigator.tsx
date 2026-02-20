import React from 'react';
import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthScreen } from '../screens/auth-screen';
import { ForgotPasswordScreen } from '../screens/forgot-password-screen';
import { HomeShellScreen } from '../screens/home-shell-screen';
import { RoleSelectScreen } from '../screens/role-select-screen';
import { useSessionStore } from '../store/session-store';
import { useTheme } from '../theme/ThemeContext';
import type { AppRole } from '../types';

const Stack = createNativeStackNavigator();

function RoleFlow() {
  const activeRole = useSessionStore((s) => s.activeRole);
  const sessions = useSessionStore((s) => s.sessions);
  const setActiveRole = useSessionStore((s) => s.setActiveRole);

  if (!activeRole) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="RoleSelect">
          {() => <RoleSelectScreen onSelectRole={(role: AppRole) => setActiveRole(role)} />}
        </Stack.Screen>
      </Stack.Navigator>
    );
  }

  const activeSession = sessions[activeRole];
  if (!activeSession.accessToken) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Auth" component={AuthScreen} />
        <Stack.Screen
          name="ForgotPassword"
          component={ForgotPasswordScreen}
          options={{ headerShown: true, title: 'Reset Password', headerBackTitle: 'Back' }}
        />
      </Stack.Navigator>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home" component={HomeShellScreen} />
    </Stack.Navigator>
  );
}

export function RootNavigator() {
  const { isDark } = useTheme();
  return (
    <NavigationContainer theme={isDark ? DarkTheme : DefaultTheme}>
      <RoleFlow />
    </NavigationContainer>
  );
}
