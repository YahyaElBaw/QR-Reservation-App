import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { LogOut } from 'lucide-react-native';
import { useTheme } from '../../src/theme/useTheme';
import { useAuthStore } from '../../src/stores/authStore';

export default function StaffLayout() {
  const router = useRouter();
  const { c, fonts } = useTheme();
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    router.replace('/');
  };

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: c.surface,
        },
        headerTintColor: c.primary700,
        headerTitleStyle: {
          fontFamily: fonts.displaySemi,
          fontSize: 17,
          color: c.text,
        },
        headerShadowVisible: false,
        contentStyle: {
          backgroundColor: c.bg,
        },
        headerRight: () =>
          user ? (
            <View style={styles.headerRight}>
              <View style={styles.userBadge}>
                <Text style={[styles.userName, { color: c.text, fontFamily: fonts.bodyBold }]}>
                  {user.name}
                </Text>
                <Text style={[styles.userRole, { color: c.primary600, fontFamily: fonts.bodyMedium }]}>
                  {user.role}
                </Text>
              </View>
              <TouchableOpacity
                onPress={handleLogout}
                style={[styles.logoutBtn, { backgroundColor: c.surfaceAlt }]}
                accessibilityRole="button"
                accessibilityLabel="Déconnexion"
              >
                <LogOut size={16} color={c.danger500} />
              </TouchableOpacity>
            </View>
          ) : null,
      }}
    >
      <Stack.Screen
        name="login"
        options={{
          title: 'Connexion Personnel',
          headerBackTitle: 'Accueil',
          headerRight: () => null,
        }}
      />
      <Stack.Screen
        name="(tabs)"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="ticket/[id]"
        options={{
          title: 'Détail du Ticket',
          headerBackTitle: 'Retour',
        }}
      />
    </Stack>
  );
}

const styles = StyleSheet.create({
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  userBadge: {
    alignItems: 'flex-end',
  },
  userName: {
    fontSize: 13,
  },
  userRole: {
    fontSize: 11,
    textTransform: 'uppercase',
  },
  logoutBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
