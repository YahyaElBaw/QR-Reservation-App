import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Receipt, CheckCircle } from 'lucide-react-native';
import { useTheme } from '../theme/useTheme';
import { BottomSheetModal } from './ui/BottomSheetModal';
import { StatusBadge } from './ui/StatusBadge';
import { MoneyText } from './ui/MoneyText';
import { Button } from './ui/Button';
import type { Ticket, TicketItem } from '../types';

interface TicketModalProps {
  visible: boolean;
  onClose: () => void;
  ticket: Ticket | null;
  tableNumber?: number;
}

export const TicketModal: React.FC<TicketModalProps> = ({
  visible,
  onClose,
  ticket,
  tableNumber,
}) => {
  const { c, radius, fonts } = useTheme();

  if (!ticket) return null;

  const isPaid = ticket.status === 'PAID';
  const totalItemsCount = (ticket.items || []).reduce((sum, item) => sum + item.quantity, 0);

  return (
    <BottomSheetModal
      visible={visible}
      onClose={onClose}
      title={`Addition • Table ${tableNumber ?? ''}`}
    >
      <View style={styles.container}>
        {/* Ticket Meta Header */}
        <View style={[styles.ticketHeader, { backgroundColor: c.surfaceAlt, borderRadius: radius.md, borderColor: c.border }]}>
          <View style={styles.ticketMetaLeft}>
            <View style={styles.ticketNumberRow}>
              <Receipt size={16} color={c.primary700} style={{ marginRight: 6 }} />
              <Text style={[styles.ticketNumberText, { color: c.primary900, fontFamily: fonts.displaySemi }]}>
                Ticket #{ticket.ticketNumber}
              </Text>
            </View>
            <Text style={[styles.itemsCountText, { color: c.textMuted, fontFamily: fonts.body }]}>
              {totalItemsCount} {totalItemsCount === 1 ? 'article commandé' : 'articles commandés'}
            </Text>
          </View>
          <StatusBadge status={ticket.status} type="ticket" size="sm" />
        </View>

        {/* Paid or Closed notice if applicable */}
        {isPaid && (
          <View style={[styles.noticeBanner, { backgroundColor: c.accent100, borderColor: c.accent500 }]}>
            <CheckCircle size={16} color={c.onAccent} style={{ marginRight: 8, marginTop: 1 }} />
            <Text style={[styles.noticeText, { color: c.onAccent, fontFamily: fonts.bodyMedium }]}>
              Cette commande a été réglée en caisse. Merci de votre visite !
            </Text>
          </View>
        )}

        {/* Scrollable list of ordered items */}
        <ScrollView style={styles.itemsList} showsVerticalScrollIndicator={false}>
          {ticket.items && ticket.items.length > 0 ? (
            ticket.items.map((item: TicketItem) => (
              <View
                key={item._id}
                style={[styles.itemRow, { borderBottomColor: c.border }]}
              >
                <View style={styles.itemInfo}>
                  <Text
                    numberOfLines={1}
                    style={[styles.itemName, { color: c.text, fontFamily: fonts.bodyBold }]}
                  >
                    {item.productName}
                  </Text>
                  <Text style={[styles.itemQtyPrice, { color: c.textMuted, fontFamily: fonts.body }]}>
                    {item.quantity} x {Number(item.unitPrice).toFixed(3)} TND
                  </Text>
                  {item.note ? (
                    <Text style={[styles.itemNote, { color: c.accent500, fontFamily: fonts.body }]}>
                      Note : {item.note}
                    </Text>
                  ) : null}
                </View>

                <View style={styles.subtotalWrapper}>
                  <MoneyText amount={item.subtotal} size="sm" color={c.text} />
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyItemsBox}>
              <Text style={[styles.emptyItemsText, { color: c.textMuted, fontFamily: fonts.body }]}>
                Aucun article dans ce ticket.
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Total Summary Footer */}
        <View style={[styles.footer, { borderTopColor: c.border }]}>
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { color: c.textMuted, fontFamily: fonts.bodyMedium }]}>
              Total à payer :
            </Text>
            <MoneyText amount={ticket.total} size="lg" color={c.primary900} />
          </View>

          <Button
            title="Fermer"
            variant="secondary"
            size="md"
            onPress={onClose}
            style={{ marginTop: 12 }}
          />
        </View>
      </View>
    </BottomSheetModal>
  );
};

const styles = StyleSheet.create({
  container: {
    maxHeight: 460,
  },
  ticketHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    marginBottom: 10,
  },
  ticketMetaLeft: {
    gap: 2,
  },
  ticketNumberRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ticketNumberText: {
    fontSize: 15,
  },
  itemsCountText: {
    fontSize: 12,
  },
  noticeBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 10,
  },
  noticeText: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 16,
  },
  itemsList: {
    maxHeight: 250,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  itemInfo: {
    flex: 1,
    marginRight: 12,
  },
  itemName: {
    fontSize: 14,
    marginBottom: 2,
  },
  itemQtyPrice: {
    fontSize: 12,
  },
  itemNote: {
    fontSize: 11.5,
    marginTop: 2,
    fontStyle: 'italic',
  },
  subtotalWrapper: {
    alignItems: 'flex-end',
  },
  emptyItemsBox: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyItemsText: {
    fontSize: 13,
  },
  footer: {
    borderTopWidth: 1,
    paddingTop: 12,
    marginTop: 8,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  totalLabel: {
    fontSize: 14,
  },
});
