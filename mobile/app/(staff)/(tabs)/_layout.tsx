import React from 'react';
import { Tabs } from 'expo-router';
import { Receipt, LayoutGrid, CheckSquare, BarChart3 } from 'lucide-react-native';
import { useTheme } from '../../../src/theme/useTheme';
import { useAuthStore } from '../../../src/stores/authStore';

export default function StaffTabsLayout() {
  const { c, fonts } = useTheme();
  const { user } = useAuthStore();

  const role = user?.role || 'CAISSIER';
  const isAdmin = role === 'ADMIN';
  const isCaissier = role === 'CAISSIER' || isAdmin;
  const isContoiriste = role === 'CONTOIRISTE' || isAdmin;

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: c.surface,
        },
        headerTitleStyle: {
          fontFamily: fonts.displaySemi,
          fontSize: 18,
          color: c.text,
        },
        headerShadowVisible: false,
        tabBarStyle: {
          backgroundColor: c.surface,
          borderTopColor: c.border,
          height: 60,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor: c.primary500,
        tabBarInactiveTintColor: c.textMuted,
        tabBarLabelStyle: {
          fontFamily: fonts.bodyMedium,
          fontSize: 12,
        },
      }}
    >
      <Tabs.Screen
        name="tickets"
        options={{
          title: 'Tickets',
          tabBarLabel: 'Tickets',
          tabBarIcon: ({ color, size }) => <Receipt size={size} color={color} />,
          href: isCaissier ? '/(staff)/(tabs)/tickets' : null,
        }}
      />

      <Tabs.Screen
        name="tables"
        options={{
          title: 'Tables',
          tabBarLabel: 'Tables',
          tabBarIcon: ({ color, size }) => <LayoutGrid size={size} color={color} />,
          href: '/(staff)/(tabs)/tables',
        }}
      />

      <Tabs.Screen
        name="availability"
        options={{
          title: 'Disponibilité',
          tabBarLabel: 'Produits',
          tabBarIcon: ({ color, size }) => <CheckSquare size={size} color={color} />,
          href: isContoiriste ? '/(staff)/(tabs)/availability' : null,
        }}
      />

      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Statistiques',
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({ color, size }) => <BarChart3 size={size} color={color} />,
          href: isAdmin ? '/(staff)/(tabs)/dashboard' : null,
        }}
      />
    </Tabs>
  );
}
