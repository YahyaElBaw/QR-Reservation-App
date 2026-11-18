import React from 'react';
import { Stack } from 'expo-router';
import { useTheme } from '../../src/theme/useTheme';

export default function CustomerLayout() {
  const { c, fonts } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: c.surface,
        },
        headerTintColor: c.primary700,
        headerTitleStyle: {
          fontFamily: fonts.displaySemi,
          fontSize: 18,
          color: c.text,
        },
        headerShadowVisible: false,
        contentStyle: {
          backgroundColor: c.bg,
        },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen
        name="scan"
        options={{
          title: 'Scanner la Table',
          headerBackTitle: 'Accueil',
        }}
      />
      <Stack.Screen
        name="table/[qrToken]"
        options={{
          title: 'Menu de la Table',
          headerBackTitle: 'Scan',
        }}
      />
      <Stack.Screen
        name="ticket/[qrToken]"
        options={{
          title: 'Suivi de Commande',
          headerBackTitle: 'Menu',
        }}
      />
    </Stack>
  );
}
