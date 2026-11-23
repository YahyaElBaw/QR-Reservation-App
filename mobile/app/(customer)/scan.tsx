import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Flashlight, FlashlightOff, Keyboard, AlertCircle, X } from 'lucide-react-native';
import { useTheme } from '../../src/theme/useTheme';
import { Button } from '../../src/components/ui/Button';
import { parseTableQrToken } from '../../src/utils/qrParser';
import { setApiBaseUrl } from '../../src/services/api';
import { setSocketBaseUrl } from '../../src/services/live';

export default function ScanScreen() {
  const router = useRouter();
  const { c, radius, fonts } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Manual fallback modal
  const [manualModalVisible, setManualModalVisible] = useState(false);
  const [manualCode, setManualCode] = useState('');

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (scanned) return;

    const result = parseTableQrToken(data);
    if (result.valid && result.qrToken) {
      if (result.networkApiUrl) {
        setApiBaseUrl(result.networkApiUrl);
      }
      if (result.networkSocketUrl) {
        setSocketBaseUrl(result.networkSocketUrl);
      }
      setScanned(true);
      router.replace(`/(customer)/table/${result.qrToken}`);
    } else {
      setScanned(true);
      setErrorMessage(result.error || 'Code QR non reconnu pour ce restaurant.');
    }
  };

  const handleManualSubmit = () => {
    if (!manualCode.trim()) return;
    const result = parseTableQrToken(manualCode.trim());
    if (result.valid && result.qrToken) {
      if (result.networkApiUrl) {
        setApiBaseUrl(result.networkApiUrl);
      }
      if (result.networkSocketUrl) {
        setSocketBaseUrl(result.networkSocketUrl);
      }
      setManualModalVisible(false);
      router.replace(`/(customer)/table/${result.qrToken}`);
    } else {
      setErrorMessage('Format invalide. Exemple: TBL-TABLE1 ou TBL-XXXX ou numéro de table');
    }
  };

  if (!permission) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: c.bg }]}>
        <Text style={[styles.infoText, { color: c.textMuted, fontFamily: fonts.body }]}>
          Vérification des autorisations caméra...
        </Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: c.bg }]}>
        <AlertCircle size={48} color={c.warning500} style={styles.iconMargin} />
        <Text style={[styles.title, { color: c.text, fontFamily: fonts.displaySemi }]}>
          Accès à la caméra requis
        </Text>
        <Text style={[styles.desc, { color: c.textMuted, fontFamily: fonts.body }]}>
          Pour scanner le QR code de la table, l'application a besoin d'accéder à votre appareil photo.
        </Text>
        <Button
          title="Autoriser la caméra"
          variant="primary"
          onPress={requestPermission}
          style={styles.permissionBtn}
        />
        <Button
          title="Saisir le code manuellement"
          variant="secondary"
          onPress={() => setManualModalVisible(true)}
          style={styles.secondaryBtn}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing="back"
        enableTorch={torch}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      />

      {/* Target scanning overlay */}
      <View style={styles.overlay}>
        <View style={styles.headerNotice}>
          <Text style={[styles.instruction, { fontFamily: fonts.bodyMedium }]}>
            Pointez votre appareil vers le QR code de la table
          </Text>
        </View>

        <View style={styles.finderContainer}>
          <View style={[styles.finderBox, { borderColor: c.primary500 }]}>
            {/* Corner accents */}
            <View style={[styles.cornerTL, { borderColor: c.accent500 }]} />
            <View style={[styles.cornerTR, { borderColor: c.accent500 }]} />
            <View style={[styles.cornerBL, { borderColor: c.accent500 }]} />
            <View style={[styles.cornerBR, { borderColor: c.accent500 }]} />
          </View>
        </View>

        {/* Bottom controls */}
        <View style={styles.controlsRow}>
          <TouchableOpacity
            style={[styles.circleButton, { backgroundColor: 'rgba(11,47,87,0.75)' }]}
            onPress={() => setTorch(!torch)}
            accessibilityRole="button"
            accessibilityLabel="Activer le flash"
          >
            {torch ? (
              <FlashlightOff size={24} color="#FFFFFF" />
            ) : (
              <Flashlight size={24} color="#FFFFFF" />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.manualButton, { backgroundColor: c.surface }]}
            onPress={() => setManualModalVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="Saisir le code table manuellement"
          >
            <Keyboard size={20} color={c.primary700} style={{ marginRight: 8 }} />
            <Text style={[styles.manualButtonText, { color: c.primary700, fontFamily: fonts.bodyBold }]}>
              Saisie manuelle
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Error alert modal */}
      {errorMessage && (
        <View style={[styles.errorCard, { backgroundColor: c.surface, borderColor: c.danger500 }]}>
          <View style={styles.errorHeader}>
            <AlertCircle size={20} color={c.danger500} style={{ marginRight: 8 }} />
            <Text style={[styles.errorTitle, { color: c.danger500, fontFamily: fonts.bodyBold }]}>
              Code QR invalide
            </Text>
          </View>
          <Text style={[styles.errorDesc, { color: c.text, fontFamily: fonts.body }]}>
            {errorMessage}
          </Text>
          <Button
            title="Réessayer"
            variant="primary"
            size="sm"
            onPress={() => {
              setErrorMessage(null);
              setScanned(false);
            }}
            style={{ marginTop: 12 }}
          />
        </View>
      )}

      {/* Manual Input Modal */}
      <Modal
        visible={manualModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setManualModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalContent, { backgroundColor: c.surface, borderRadius: radius.lg }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: c.text, fontFamily: fonts.displaySemi }]}>
                Code de la Table
              </Text>
              <TouchableOpacity onPress={() => setManualModalVisible(false)}>
                <X size={20} color={c.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalDesc, { color: c.textMuted, fontFamily: fonts.body }]}>
              Entrez l'identifiant inscrit sous le QR code (ex: TBL-TABLE1 ou le numéro de table).
            </Text>

            <TextInput
              style={[
                styles.modalInput,
                {
                  color: c.text,
                  backgroundColor: c.surfaceAlt,
                  borderColor: c.border,
                  borderRadius: radius.md,
                  fontFamily: fonts.body,
                },
              ]}
              placeholder="TBL-..."
              placeholderTextColor={c.textFaint}
              autoCapitalize="characters"
              value={manualCode}
              onChangeText={setManualCode}
            />

            <View style={styles.quickSelect}>
              <Text style={[styles.quickLabel, { color: c.textMuted, fontFamily: fonts.bodyMedium }]}>
                Tables de démonstration :
              </Text>
              <View style={styles.quickChips}>
                {['TBL-TABLE1', 'TBL-TABLE2', 'TBL-TABLE3'].map((code) => (
                  <TouchableOpacity
                    key={code}
                    onPress={() => setManualCode(code)}
                    style={[styles.quickChip, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}
                  >
                    <Text style={{ fontSize: 12, color: c.primary700, fontWeight: '600' }}>
                      {code}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <Button
              title="Accéder au menu"
              variant="primary"
              size="md"
              onPress={handleManualSubmit}
              style={{ marginTop: 16 }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  centerContainer: {
    flex: 1,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconMargin: {
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  desc: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  permissionBtn: {
    width: '100%',
    marginBottom: 12,
  },
  secondaryBtn: {
    width: '100%',
  },
  infoText: {
    fontSize: 15,
  },
  camera: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  headerNotice: {
    backgroundColor: 'rgba(11,47,87,0.75)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignSelf: 'center',
  },
  instruction: {
    color: '#FFFFFF',
    fontSize: 14,
    textAlign: 'center',
  },
  finderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  finderBox: {
    width: 250,
    height: 250,
    borderWidth: 1,
    position: 'relative',
  },
  cornerTL: {
    position: 'absolute',
    top: -2,
    left: -2,
    width: 28,
    height: 28,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  cornerTR: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 28,
    height: 28,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  cornerBL: {
    position: 'absolute',
    bottom: -2,
    left: -2,
    width: 28,
    height: 28,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  cornerBR: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 28,
    height: 28,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  circleButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  manualButton: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    paddingHorizontal: 18,
    borderRadius: 25,
  },
  manualButtonText: {
    fontSize: 15,
  },
  errorCard: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    elevation: 8,
  },
  errorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  errorTitle: {
    fontSize: 16,
  },
  errorDesc: {
    fontSize: 14,
    lineHeight: 20,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 18,
  },
  modalDesc: {
    fontSize: 13,
    marginBottom: 16,
    lineHeight: 18,
  },
  modalInput: {
    height: 48,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 16,
    marginBottom: 12,
  },
  quickSelect: {
    marginTop: 4,
  },
  quickLabel: {
    fontSize: 12,
    marginBottom: 6,
  },
  quickChips: {
    flexDirection: 'row',
    gap: 8,
  },
  quickChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
});
