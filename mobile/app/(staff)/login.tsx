import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Lock, User as UserIcon, ShieldCheck, AlertCircle } from 'lucide-react-native';
import { useTheme } from '../../src/theme/useTheme';
import { useAuthStore } from '../../src/stores/authStore';
import { Input } from '../../src/components/ui/Input';
import { Button } from '../../src/components/ui/Button';

export default function StaffLoginScreen() {
  const router = useRouter();
  const { c, radius, fonts, shadow } = useTheme();
  const { login, isLoading, error } = useAuthStore();

  const [username, setUsername] = useState('caissier');
  const [password, setPassword] = useState('caissier123');

  const handleLogin = async () => {
    if (!username || !password) return;
    const ok = await login(username, password);
    if (ok) {
      router.replace('/(staff)/(tabs)/tickets');
    }
  };

  const setDemoCredentials = (role: 'admin' | 'caissier' | 'contoiriste') => {
    switch (role) {
      case 'admin':
        setUsername('admin');
        setPassword('admin123');
        break;
      case 'caissier':
        setUsername('caissier');
        setPassword('caissier123');
        break;
      case 'contoiriste':
        setUsername('contoiriste');
        setPassword('contoiriste123');
        break;
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={[styles.container, { backgroundColor: c.bg }]}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View
            style={[
              styles.iconCircle,
              shadow[1],
              { backgroundColor: c.primary500, borderRadius: radius.xl },
            ]}
          >
            <ShieldCheck size={36} color="#FFFFFF" />
          </View>
          <Text style={[styles.title, { color: c.primary900, fontFamily: fonts.display }]}>
            Espace Équipe
          </Text>
          <Text style={[styles.subtitle, { color: c.textMuted, fontFamily: fonts.body }]}>
            Connectez-vous avec votre compte restaurant pour accéder à votre poste.
          </Text>
        </View>

        {/* Error message */}
        {error && (
          <View style={[styles.errorBox, { backgroundColor: c.danger100, borderColor: c.danger500 }]}>
            <AlertCircle size={18} color={c.danger500} style={{ marginRight: 8 }} />
            <Text style={[styles.errorText, { color: c.danger500, fontFamily: fonts.bodyMedium }]}>
              {error}
            </Text>
          </View>
        )}

        {/* Form */}
        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border, borderRadius: radius.lg }]}>
          <Input
            label="Nom d'utilisateur"
            placeholder="Ex: caissier"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
            leftIcon={<UserIcon size={18} color={c.textFaint} />}
          />

          <Input
            label="Mot de passe"
            placeholder="••••••••"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            leftIcon={<Lock size={18} color={c.textFaint} />}
          />

          <Button
            title="Se connecter"
            variant="primary"
            size="lg"
            loading={isLoading}
            onPress={handleLogin}
            style={styles.submitBtn}
          />
        </View>

        {/* Demo Fast Logins */}
        <View style={styles.demoSection}>
          <Text style={[styles.demoTitle, { color: c.textMuted, fontFamily: fonts.bodyMedium }]}>
            Comptes de test (clic rapide) :
          </Text>
          <View style={styles.demoButtons}>
            <TouchableOpacity
              onPress={() => setDemoCredentials('caissier')}
              style={[styles.demoChip, { backgroundColor: c.surface, borderColor: c.border, borderRadius: radius.md }]}
            >
              <Text style={[styles.demoChipText, { color: c.primary700, fontFamily: fonts.bodyBold }]}>
                Caissier
              </Text>
              <Text style={[styles.demoChipSub, { color: c.textMuted }]}>
                caissier / caissier123
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setDemoCredentials('contoiriste')}
              style={[styles.demoChip, { backgroundColor: c.surface, borderColor: c.border, borderRadius: radius.md }]}
            >
              <Text style={[styles.demoChipText, { color: c.primary700, fontFamily: fonts.bodyBold }]}>
                Contoiriste
              </Text>
              <Text style={[styles.demoChipSub, { color: c.textMuted }]}>
                contoiriste / contoiriste123
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setDemoCredentials('admin')}
              style={[styles.demoChip, { backgroundColor: c.surface, borderColor: c.border, borderRadius: radius.md }]}
            >
              <Text style={[styles.demoChipText, { color: c.primary700, fontFamily: fonts.bodyBold }]}>
                Admin
              </Text>
              <Text style={[styles.demoChipSub, { color: c.textMuted }]}>
                admin / admin123
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 24,
    paddingTop: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconCircle: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 290,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    flex: 1,
  },
  card: {
    padding: 20,
    borderWidth: 1,
    marginBottom: 24,
  },
  submitBtn: {
    marginTop: 8,
  },
  demoSection: {
    marginTop: 8,
  },
  demoTitle: {
    fontSize: 13,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  demoButtons: {
    gap: 10,
  },
  demoChip: {
    padding: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  demoChipText: {
    fontSize: 14,
  },
  demoChipSub: {
    fontSize: 12,
  },
});
