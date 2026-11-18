import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useTheme } from '../theme/useTheme';
import { useCartStore } from '../stores/cartStore';
import { api } from '../services/api';
import { getOrCreateDeviceId } from '../utils/deviceId';
import { BottomSheetModal } from './ui/BottomSheetModal';
import { QuantityStepper } from './ui/QuantityStepper';
import { MoneyText } from './ui/MoneyText';
import { Button } from './ui/Button';
import type { CartItem, Ticket } from '../types';

interface CartModalProps {
  visible: boolean;
  onClose: () => void;
  qrToken: string;
  onOrderPlaced: (ticket: Ticket) => void;
}

export const CartModal: React.FC<CartModalProps> = ({
  visible,
  onClose,
  qrToken,
  onOrderPlaced,
}) => {
  const { c, fonts } = useTheme();
  const { getItems, getTotalAmount, updateQuantity, removeItem, clearCart } = useCartStore();
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const items = getItems(qrToken);
  const total = getTotalAmount(qrToken);

  const handlePlaceOrder = async () => {
    if (items.length === 0) return;
    setSubmitting(true);
    setErrorMsg(null);

    try {
      const deviceId = await getOrCreateDeviceId();
      const payload = {
        deviceId,
        items: items.map((i) => ({
          productId: i.product._id,
          quantity: i.quantity,
          note: i.note,
        })),
      };

      const ticket = await api.publicOrder(qrToken, payload);
      clearCart(qrToken);
      onClose();
      onOrderPlaced(ticket);
    } catch (err: unknown) {
      const errObj = err as { code?: string; message?: string };
      if (errObj.code === 'PRODUCT_UNAVAILABLE') {
        setErrorMsg('Un ou plusieurs articles ne sont plus disponibles. Veuillez ajuster votre panier.');
      } else {
        setErrorMsg(errObj.message || 'Impossible d’envoyer la commande. Vérifiez votre connexion.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <BottomSheetModal visible={visible} onClose={onClose} title="Mon Panier">
      {items.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: c.textMuted, fontFamily: fonts.body }]}>
            Votre panier est actuellement vide.
          </Text>
        </View>
      ) : (
        <View style={styles.content}>
          {errorMsg && (
            <View style={[styles.errorBox, { backgroundColor: c.danger100, borderColor: c.danger500 }]}>
              <Text style={[styles.errorText, { color: c.danger500, fontFamily: fonts.bodyMedium }]}>
                {errorMsg}
              </Text>
            </View>
          )}

          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {items.map((item: CartItem) => {
              const itemTotal = item.product.price * item.quantity;
              return (
                <View
                  key={item.product._id}
                  style={[styles.itemRow, { borderBottomColor: c.border }]}
                >
                  <View style={styles.itemInfo}>
                    <Text
                      numberOfLines={1}
                      style={[styles.itemName, { color: c.text, fontFamily: fonts.bodyBold }]}
                    >
                      {item.product.name}
                    </Text>
                    <MoneyText amount={item.product.price} size="sm" color={c.textMuted} />
                  </View>

                  <View style={styles.itemActions}>
                    <QuantityStepper
                      quantity={item.quantity}
                      onIncrement={() => updateQuantity(qrToken, item.product._id, 1)}
                      onDecrement={() => updateQuantity(qrToken, item.product._id, -1)}
                      showTrashOnMin
                    />
                    <View style={styles.subtotalContainer}>
                      <MoneyText amount={itemTotal} size="sm" color={c.text} />
                    </View>
                  </View>
                </View>
              );
            })}
          </ScrollView>

          {/* Total & Checkout */}
          <View style={[styles.footer, { borderTopColor: c.border }]}>
            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { color: c.textMuted, fontFamily: fonts.bodyMedium }]}>
                Total de la commande :
              </Text>
              <MoneyText amount={total} size="lg" color={c.accent500} />
            </View>

            <Button
              title="Passer la commande"
              variant="highlight"
              size="lg"
              loading={submitting}
              onPress={handlePlaceOrder}
              style={styles.checkoutBtn}
            />
          </View>
        </View>
      )}
    </BottomSheetModal>
  );
};

const styles = StyleSheet.create({
  content: {
    maxHeight: 460,
  },
  emptyContainer: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
  },
  errorBox: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 13,
  },
  list: {
    maxHeight: 260,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  itemInfo: {
    flex: 1,
    marginRight: 10,
  },
  itemName: {
    fontSize: 15,
    marginBottom: 2,
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  subtotalContainer: {
    minWidth: 70,
    alignItems: 'flex-end',
    marginLeft: 10,
  },
  footer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 16,
  },
  checkoutBtn: {
    width: '100%',
  },
});
