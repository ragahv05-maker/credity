import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { IssuerDashboardScreen } from '../screens/issuer-dashboard-screen';
import { ActivityScreen } from '../screens/activity-screen';
import { SettingsScreen } from '../screens/settings-screen';
import { useTheme } from '../theme/ThemeContext';
import { createBottomTabOptions } from './tab-style';

interface Props {
  onSwitchRole: () => void;
  onLogout: () => Promise<void>;
}

const Tab = createBottomTabNavigator();

export function IssuerTabs({ onSwitchRole, onLogout }: Props) {
  const { colors } = useTheme();
  return (
    <Tab.Navigator screenOptions={createBottomTabOptions(colors.issuer, colors)}>
      <Tab.Screen name="Dashboard" options={{ title: 'Dashboard' }}>
        {() => <IssuerDashboardScreen onSwitchRole={onSwitchRole} onLogout={onLogout} />}
      </Tab.Screen>
      <Tab.Screen name="Activity" component={ActivityScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}
