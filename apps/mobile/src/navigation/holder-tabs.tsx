import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ConnectionsScreen } from '../screens/connections-screen';
import { CredentialsScreen } from '../screens/credentials-screen';
import { LivenessScreen } from '../screens/liveness-screen';
import { SettingsScreen } from '../screens/settings-screen';
import { TrustScoreScreen } from '../screens/trust-score-screen';
import { useTheme } from '../theme/ThemeContext';
import { createBottomTabOptions } from './tab-style';

interface Props {
  onSwitchRole: () => void;
  onLogout: () => Promise<void>;
}

type HolderTabParamList = {
  TrustScore: undefined;
  Credentials: undefined;
  Connections: undefined;
  Settings: undefined;
};

type HolderStackParamList = {
  HolderTabRoot: undefined;
  Liveness: undefined;
};

const Tab = createBottomTabNavigator<HolderTabParamList>();
const Stack = createNativeStackNavigator<HolderStackParamList>();

function tabIcon(routeName: keyof HolderTabParamList): keyof typeof Ionicons.glyphMap {
  if (routeName === 'TrustScore') return 'shield-checkmark';
  if (routeName === 'Credentials') return 'wallet';
  if (routeName === 'Settings') return 'settings';
  return 'link';
}

function HolderTabNavigator() {
  const { colors } = useTheme();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        ...createBottomTabOptions(colors.holder, colors),
        tabBarIcon: ({ color, size }) => (
          <Ionicons name={tabIcon(route.name as keyof HolderTabParamList)} color={color} size={size} />
        ),
      })}
    >
      <Tab.Screen
        name="TrustScore"
        component={TrustScoreScreen}
        options={{ title: 'Home' }}
      />
      <Tab.Screen
        name="Credentials"
        component={CredentialsScreen}
        options={{ title: 'Credentials' }}
      />
      <Tab.Screen
        name="Connections"
        component={ConnectionsScreen}
        options={{ title: 'Connections' }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: 'Settings' }}
      />
    </Tab.Navigator>
  );
}

export function HolderTabs({ onSwitchRole, onLogout }: Props) {
  void onSwitchRole;
  void onLogout;

  return (
    <Stack.Navigator>
      <Stack.Screen
        name="HolderTabRoot"
        component={HolderTabNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Liveness"
        component={LivenessScreen}
        options={{ title: 'Verify Identity' }}
      />
    </Stack.Navigator>
  );
}
