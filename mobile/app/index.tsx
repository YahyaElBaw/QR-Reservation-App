import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { QrCode, Shield, UtensilsCrossed } from 'lucide-react-native';
import { useTheme } from '../src/theme/useTheme';
import { Button } from '../src/components/ui/Button';

export default function WelcomeScreen() {
  const router = useRouter();
  const { c, fonts, shadow } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]}>
      <View style={styles.content}>
        {/* Brand Hero */}
        <View style={styles.heroSection}>
          <View
            style={[
              styles.logoBadge,
              shadow[2],
              {
                backgroundColor: c.primary500,
              },
            ]}
          >
            <UtensilsCrossed size={48} color="#FFFFFF" strokeWidth={2} />
          </View>

          <Text style={[styles.brandTitle, { color: c.primary900, fontFamily: fonts.display }]}>
            QR Resto
          </Text>

          <Text style={[styles.brandSubtitle, { color: c.textMuted, fontFamily: fonts.body }]}>
            Commandez vos plats et boissons directement depuis votre table, sans attente.
          </Text>
        </View>

        {/* Feature Highlights */}
        <View style={[styles.featuresCard, { backgroundColor: c.surface, borderColor: c.border }]}>
          <View style={styles.featureItem}>
            <View style={[styles.featureDot, { backgroundColor: c.primary500 }]} />
            <Text style={[styles.featureText, { color: c.text, fontFamily: fonts.body }]}>
              Scannez le QR code placé sur votre table
            </Text>
          </View>
          <View style={styles.featureItem}>
            <View style={[styles.featureDot, { backgroundColor: c.primary500 }]} />
            <Text style={[styles.featureText, { color: c.text, fontFamily: fonts.body }]}>
              Consultez le menu en direct avec les prix en TND
            </Text>
          </View>
          <View style={styles.featureItem}>
            <View style={[styles.featureDot, { backgroundColor: c.accent500 }]} />
            <Text style={[styles.featureText, { color: c.text, fontFamily: fonts.body }]}>
              Suivez l'état de votre commande en temps réel
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsSection}>
          <Button
            title="Scanner le QR de la table"
            variant="primary"
            size="lg"
            icon={<QrCode size={22} color="#FFFFFF" />}
            onPress={() => router.push('/(customer)/scan')}
            style={styles.primaryBtn}
          />

          <Button
            title="Espace Personnel (Staff Login)"
            variant="secondary"
            size="md"
            icon={<Shield size={18} color={c.primary700} />}
            onPress={() => router.push('/(staff)/login')}
            style={styles.secondaryBtn}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    paddingVertical: 24,
  },
  heroSection: {
    alignItems: 'center',
    marginTop: 40,
  },
  logoBadge: {
    width: 96,
    height: 96,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  brandTitle: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  brandSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 300,
  },
  featuresCard: {
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    gap: 14,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  featureText: {
    fontSize: 14,
    flex: 1,
  },
  actionsSection: {
    gap: 12,
    marginBottom: 12,
  },
  primaryBtn: {
    width: '100%',
  },
  secondaryBtn: {
    width: '100%',
  },
});
