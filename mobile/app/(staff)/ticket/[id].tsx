import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Modal,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Receipt,
  Plus,
  Trash2,
  CreditCard,
  Banknote,
  CheckCircle,
  Lock,
  X,
} from 'lucide-react-native';
import { useTheme } from '../../../src/theme/useTheme';
import { api } from '../../../src/services/api';
import { useAuthStore } from '../../../src/stores/authStore';
import { useLiveUpdates } from '../../../src/services/live';
import { StatusBadge } from '../../../src/components/ui/StatusBadge';
import { MoneyText } from '../../../src/components/ui/MoneyText';
import { Button } from '../../../src/components/ui/Button';
import { QuantityStepper } from '../../../src/components/ui/QuantityStepper';
import type { Ticket, TicketItem, Product, PaymentMethod } from '../../../src/types';

export default function StaffTicketDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { c, radius, fonts, shadow } = useTheme();
  const { user, token } = useAuthStore();
  const queryClient = useQueryClient();

  const [payModalVisible, setPayModalVisible] = useState(false);
  const [addItemModalVisible, setAddItemModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [addQty, setAddQty] = useState(1);

  const role = user?.role || 'CAISSIER';
  const canPay = role === 'CAISSIER' || role === 'ADMIN';
  const canEditItems = role === 'CONTOIRISTE' || role === 'ADMIN';

  const {
    data: ticket,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['staffTicket', id],
    queryFn: () => api.ticket(id as string),
    enabled: !!id,
    refetchInterval: 5000,
  });

  const { data: products = [] } = useQuery({
    queryKey: ['staffProductsAvailable'],
    queryFn: () => api.products(),
    enabled: addItemModalVisible,
  });

  useLiveUpdates({
    token,
    onEvent: (event) => {
      if (['ticket.updated', 'ticket.closed'].includes(event)) {
        refetch();
      }
    },
  });

  // Mutations
  const updateItemMutation = useMutation({
    mutationFn: ({ itemId, quantity }: { itemId: string; quantity: number }) =>
      api.updateTicketItem(id as string, itemId, quantity),
    onSuccess: () => {
      refetch();
      queryClient.invalidateQueries({ queryKey: ['staffTickets'] });
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: (itemId: string) => api.deleteTicketItem(id as string, itemId),
    onSuccess: () => {
      refetch();
      queryClient.invalidateQueries({ queryKey: ['staffTickets'] });
    },
  });

  const addItemMutation = useMutation({
    mutationFn: (payload: { productId: string; quantity: number }) =>
      api.addTicketItem(id as string, payload),
    onSuccess: () => {
      setAddItemModalVisible(false);
      setSelectedProduct(null);
      setAddQty(1);
      refetch();
      queryClient.invalidateQueries({ queryKey: ['staffTickets'] });
    },
  });

  const payMutation = useMutation({
    mutationFn: (method: PaymentMethod) => api.payTicket(id as string, method),
    onSuccess: () => {
      setPayModalVisible(false);
      refetch();
      queryClient.invalidateQueries({ queryKey: ['staffTickets'] });
      queryClient.invalidateQueries({ queryKey: ['staffTables'] });
    },
  });

  const closeMutation = useMutation({
    mutationFn: () => api.closeTicket(id as string),
    onSuccess: () => {
      refetch();
      queryClient.invalidateQueries({ queryKey: ['staffTickets'] });
      queryClient.invalidateQueries({ queryKey: ['staffTables'] });
      Alert.alert('Succès', 'Le ticket a été clôturé et la table est de nouveau disponible.');
    },
  });

  const handleDeleteItem = (item: TicketItem) => {
    Alert.alert(
      'Supprimer la ligne',
      `Voulez-vous retirer "${item.productName}" de la commande ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => deleteItemMutation.mutate(item._id),
        },
      ],
    );
  };

  if (isLoading || !ticket) {
    return (
      <View style={[styles.center, { backgroundColor: c.bg }]}>
        <ActivityIndicator size="large" color={c.primary500} />
      </View>
    );
  }

  const isClosed = ticket.status === 'CLOSED';
  const isPaid = ticket.status === 'PAID';
  const isOpen = ticket.status === 'OPEN';

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: c.bg }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={false} onRefresh={() => { refetch(); }} colors={[c.primary500]} />
      }
    >
      {/* Header card */}
      <View style={[styles.headerCard, { backgroundColor: c.surface, borderColor: c.border, borderRadius: radius.lg }]}>
        <View style={styles.topRow}>
          <View>
            <Text style={[styles.ticketNumber, { color: c.primary900, fontFamily: fonts.displaySemi }]}>
              Ticket #{ticket.ticketNumber}
            </Text>
            <Text style={[styles.tableInfo, { color: c.textMuted, fontFamily: fonts.body }]}>
              Table {typeof ticket.tableId === 'object' && ticket.tableId !== null ? (ticket.tableId as any).number : ticket.tableId}
            </Text>
          </View>
          <StatusBadge status={ticket.status} type="ticket" size="md" />
        </View>

        {ticket.paymentMethod && (
          <View style={[styles.methodBadge, { backgroundColor: c.accent100, borderRadius: radius.sm }]}>
            <Text style={[styles.methodText, { color: c.onAccent, fontFamily: fonts.bodyBold }]}>
              Payé par : {ticket.paymentMethod}
            </Text>
          </View>
        )}
      </View>

      {/* Items Section */}
      <View style={[styles.itemsCard, { backgroundColor: c.surface, borderColor: c.border, borderRadius: radius.lg }]}>
        <View style={styles.itemsHeader}>
          <Text style={[styles.sectionTitle, { color: c.text, fontFamily: fonts.displaySemi }]}>
            Articles ({ticket.items?.length || 0})
          </Text>

          {isOpen && canEditItems && (
            <TouchableOpacity
              onPress={() => setAddItemModalVisible(true)}
              style={[styles.addBtn, { backgroundColor: c.primary50, borderColor: c.primary100 }]}
            >
              <Plus size={16} color={c.primary700} style={{ marginRight: 4 }} />
              <Text style={{ fontSize: 13, color: c.primary700, fontWeight: '600' }}>
                Ajouter
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {ticket.items && ticket.items.length > 0 ? (
          ticket.items.map((item: TicketItem) => (
            <View
              key={item._id}
              style={[styles.itemRow, { borderBottomColor: c.surfaceAlt }]}
            >
              <View style={styles.itemLeft}>
                <Text style={[styles.itemName, { color: c.text, fontFamily: fonts.bodyBold }]}>
                  {item.productName}
                </Text>
                <Text style={[styles.itemUnitPrice, { color: c.textMuted, fontFamily: fonts.body }]}>
                  {Number(item.unitPrice).toFixed(3)} TND / unité
                </Text>
                {item.note ? (
                  <Text style={[styles.itemNote, { color: c.accent500 }]}>
                    Note: {item.note}
                  </Text>
                ) : null}
              </View>

              <View style={styles.itemRight}>
                {isOpen && canEditItems ? (
                  <View style={styles.stepperWrapper}>
                    <QuantityStepper
                      quantity={item.quantity}
                      onIncrement={() =>
                        updateItemMutation.mutate({ itemId: item._id, quantity: item.quantity + 1 })
                      }
                      onDecrement={() => {
                        if (item.quantity > 1) {
                          updateItemMutation.mutate({
                            itemId: item._id,
                            quantity: item.quantity - 1,
                          });
                        } else {
                          handleDeleteItem(item);
                        }
                      }}
                      showTrashOnMin
                    />
                  </View>
                ) : (
                  <Text style={[styles.qtyLabel, { color: c.textMuted, fontFamily: fonts.bodyBold }]}>
                    x{item.quantity}
                  </Text>
                )}

                <View style={styles.subtotalBlock}>
                  <MoneyText amount={item.subtotal} size="sm" color={c.text} />
                </View>

                {isOpen && canEditItems && (
                  <TouchableOpacity
                    onPress={() => handleDeleteItem(item)}
                    style={styles.deleteBtn}
                  >
                    <Trash2 size={16} color={c.danger500} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))
        ) : (
          <Text style={{ color: c.textMuted, paddingVertical: 12 }}>
            Aucun article dans ce ticket.
          </Text>
        )}

        {/* Total */}
        <View style={[styles.totalBar, { backgroundColor: c.surfaceAlt, borderRadius: radius.md }]}>
          <Text style={[styles.totalLabel, { color: c.textMuted, fontFamily: fonts.bodyMedium }]}>
            Total de la commande :
          </Text>
          <MoneyText amount={ticket.total} size="lg" color={c.primary900} />
        </View>
      </View>

      {/* Staff Action Buttons */}
      <View style={styles.actions}>
        {isOpen && canPay && (
          <Button
            title="Encaisser le ticket"
            variant="highlight"
            size="lg"
            icon={<Banknote size={20} color={c.onAccent} />}
            onPress={() => setPayModalVisible(true)}
          />
        )}

        {isPaid && canPay && (
          <Button
            title="Clôturer le ticket et libérer la table"
            variant="primary"
            size="lg"
            loading={closeMutation.isPending}
            icon={<Lock size={20} color="#FFFFFF" />}
            onPress={() => closeMutation.mutate()}
          />
        )}
      </View>

      {/* Payment Selection Modal */}
      <Modal
        visible={payModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPayModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalContent, { backgroundColor: c.surface, borderRadius: radius.lg }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: c.text, fontFamily: fonts.displaySemi }]}>
                Mode de Paiement
              </Text>
              <TouchableOpacity onPress={() => setPayModalVisible(false)}>
                <X size={20} color={c.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalDesc, { color: c.textMuted, fontFamily: fonts.body }]}>
              Montant à encaisser : {Number(ticket.total).toFixed(3)} TND
            </Text>

            <View style={styles.methodsList}>
              <TouchableOpacity
                onPress={() => payMutation.mutate('CASH')}
                style={[styles.methodBtn, { backgroundColor: c.surfaceAlt, borderColor: c.border, borderRadius: radius.md }]}
              >
                <Banknote size={24} color={c.primary500} />
                <Text style={[styles.methodBtnText, { color: c.text, fontFamily: fonts.bodyBold }]}>
                  Espèces (CASH)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => payMutation.mutate('CARD')}
                style={[styles.methodBtn, { backgroundColor: c.surfaceAlt, borderColor: c.border, borderRadius: radius.md }]}
              >
                <CreditCard size={24} color={c.primary500} />
                <Text style={[styles.methodBtnText, { color: c.text, fontFamily: fonts.bodyBold }]}>
                  Carte Bancaire (CARD)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => payMutation.mutate('OTHER')}
                style={[styles.methodBtn, { backgroundColor: c.surfaceAlt, borderColor: c.border, borderRadius: radius.md }]}
              >
                <CheckCircle size={24} color={c.primary500} />
                <Text style={[styles.methodBtnText, { color: c.text, fontFamily: fonts.bodyBold }]}>
                  Autre moyen (OTHER)
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Product Modal */}
      <Modal
        visible={addItemModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAddItemModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalContentLarge, { backgroundColor: c.surface, borderRadius: radius.lg }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: c.text, fontFamily: fonts.displaySemi }]}>
                Ajouter un produit au ticket
              </Text>
              <TouchableOpacity onPress={() => setAddItemModalVisible(false)}>
                <X size={20} color={c.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 300 }}>
              {products
                .filter((p) => p.available)
                .map((prod) => {
                  const isSelected = selectedProduct?._id === prod._id;
                  return (
                    <TouchableOpacity
                      key={prod._id}
                      onPress={() => setSelectedProduct(prod)}
                      style={[
                        styles.productPickRow,
                        {
                          backgroundColor: isSelected ? c.primary50 : c.surface,
                          borderColor: isSelected ? c.primary500 : c.surfaceAlt,
                          borderRadius: radius.sm,
                        },
                      ]}
                    >
                      <View>
                        <Text style={[styles.pickName, { color: c.text, fontFamily: fonts.bodyBold }]}>
                          {prod.name}
                        </Text>
                        <MoneyText amount={prod.price} size="sm" color={c.textMuted} />
                      </View>
                      {isSelected && <CheckCircle size={18} color={c.primary500} />}
                    </TouchableOpacity>
                  );
                })}
            </ScrollView>

            {selectedProduct && (
              <View style={styles.addQtySection}>
                <Text style={[styles.qtyPrompt, { color: c.text, fontFamily: fonts.bodyMedium }]}>
                  Quantité :
                </Text>
                <QuantityStepper
                  quantity={addQty}
                  onIncrement={() => setAddQty(addQty + 1)}
                  onDecrement={() => setAddQty(Math.max(1, addQty - 1))}
                  min={1}
                />
              </View>
            )}

            <Button
              title="Valider l'ajout"
              variant="primary"
              size="md"
              disabled={!selectedProduct}
              loading={addItemMutation.isPending}
              onPress={() => {
                if (selectedProduct) {
                  addItemMutation.mutate({
                    productId: selectedProduct._id,
                    quantity: addQty,
                  });
                }
              }}
              style={{ marginTop: 14 }}
            />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  headerCard: {
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  ticketNumber: {
    fontSize: 22,
    fontWeight: '700',
  },
  tableInfo: {
    fontSize: 14,
    marginTop: 2,
  },
  methodBadge: {
    marginTop: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  methodText: {
    fontSize: 12,
  },
  itemsCard: {
    padding: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  itemsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  itemLeft: {
    flex: 1,
    marginRight: 8,
  },
  itemName: {
    fontSize: 15,
  },
  itemUnitPrice: {
    fontSize: 12,
    marginTop: 2,
  },
  itemNote: {
    fontSize: 11,
    marginTop: 2,
  },
  itemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepperWrapper: {
    transform: [{ scale: 0.85 }],
  },
  qtyLabel: {
    fontSize: 14,
    marginRight: 4,
  },
  subtotalBlock: {
    minWidth: 64,
    alignItems: 'flex-end',
  },
  deleteBtn: {
    padding: 6,
    marginLeft: 4,
  },
  totalBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    marginTop: 14,
  },
  totalLabel: {
    fontSize: 15,
  },
  actions: {
    gap: 12,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    padding: 20,
  },
  modalContentLarge: {
    width: '100%',
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 18,
  },
  modalDesc: {
    fontSize: 14,
    marginBottom: 16,
  },
  methodsList: {
    gap: 12,
  },
  methodBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderWidth: 1,
    gap: 12,
  },
  methodBtnText: {
    fontSize: 15,
  },
  productPickRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  pickName: {
    fontSize: 14,
  },
  addQtySection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  qtyPrompt: {
    fontSize: 14,
  },
});
