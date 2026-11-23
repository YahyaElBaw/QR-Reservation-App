import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Receipt, PlusCircle, CheckCircle, Lock, RotateCcw } from 'lucide-react-native';
import { useTheme } from '../../../src/theme/useTheme';
import { api } from '../../../src/services/api';
import { useLiveUpdates } from '../../../src/services/live';
import { getOrCreateDeviceId } from '../../../src/utils/deviceId';
import { StatusBadge } from '../../../src/components/ui/StatusBadge';
import { MoneyText } from '../../../src/components/ui/MoneyText';
import { Button } from '../../../src/components/ui/Button';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import type { TicketItem } from '../../../src/types';

export default function CustomerTicketScreen() {
  const { qrToken } = useLocalSearchParams<{ qrToken: string }>();
  const router = useRouter();
  const { c, radius, fonts, shadow } = useTheme();

  const [deviceId, setDeviceId] = useState<string>('');

  useEffect(() => {
    getOrCreateDeviceId().then(setDeviceId).catch(() => {});
  }, []);

  const {
    data: ticket,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['publicTicket', qrToken, deviceId],
    queryFn: () => api.publicTicket(qrToken as string, deviceId),
    enabled: !!qrToken,
    refetchInterval: 5000, // 5s fallback polling per 00_SHARED_CONTEXT.md
  });

  // Socket.IO realtime listener for room table:<qrToken>
  useLiveUpdates({
    qrToken: qrToken as string,
    onEvent: () => {
      refetch();
    },
  });

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: c.bg }]}>
        <ActivityIndicator size="large" color={c.primary500} />
        <Text style={[styles.loadingText, { color: c.textMuted, fontFamily: fonts.body }]}>
          Récupération de votre ticket...
        </Text>
      </View>
    );
  }

  if (!ticket) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: c.bg }]}>
        <EmptyState
          icon={<Receipt size={40} color={c.textFaint} />}
          title="Aucune commande active"
          description="Vous n'avez pas encore passé de commande sur cette table."
          actionLabel="Voir le menu"
          onAction={() => router.replace(`/(customer)/table/${qrToken}`)}
        />
      </View>
    );
  }

  const isClosed = ticket.status === 'CLOSED';
  const isPaid = ticket.status === 'PAID';
  const isLocked = isClosed || isPaid;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: c.bg }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={false} onRefresh={() => { refetch(); }} colors={[c.primary500]} />
      }
    >
      {/* Ticket Header Card */}
      <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border, borderRadius: radius.lg }]}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={[styles.ticketNumber, { color: c.primary900, fontFamily: fonts.displaySemi }]}>
              Ticket #{ticket.ticketNumber}
            </Text>
            <Text style={[styles.tableSub, { color: c.textMuted, fontFamily: fonts.body }]}>
              Table active
            </Text>
          </View>
          <StatusBadge status={ticket.status} type="ticket" size="md" />
        </View>

        {/* Locked banner if PAID or CLOSED */}
        {isLocked && (
          <View
            style={[
              styles.lockedBanner,
              {
                backgroundColor: isPaid ? c.accent100 : c.surfaceAlt,
                borderRadius: radius.md,
              },
            ]}
          >
            {isPaid ? (
              <CheckCircle size={20} color={c.onAccent} style={{ marginRight: 8 }} />
            ) : (
              <Lock size={20} color={c.textMuted} style={{ marginRight: 8 }} />
            )}
            <Text
              style={[
                styles.lockedText,
                {
                  color: isPaid ? c.onAccent : c.textMuted,
                  fontFamily: fonts.bodyMedium,
                },
              ]}
            >
              {isPaid
                ? 'Cette commande a été payée. Le serveur va bientôt clôturer la table.'
                : 'Cette table a été clôturée. Merci pour votre visite !'}
            </Text>
          </View>
        )}

        {/* Items List */}
        <View style={styles.itemsSection}>
          <Text style={[styles.sectionTitle, { color: c.textMuted, fontFamily: fonts.bodyMedium }]}>
            Articles commandés ({ticket.items?.length || 0})
          </Text>

          {ticket.items && ticket.items.length > 0 ? (
            ticket.items.map((item: TicketItem) => (
              <View
                key={item._id}
                style={[styles.itemRow, { borderBottomColor: c.border }]}
              >
                <View style={styles.itemMain}>
                  <Text style={[styles.itemName, { color: c.text, fontFamily: fonts.bodyBold }]}>
                    {item.productName}
                  </Text>
                  <Text style={[styles.itemQtyPrice, { color: c.textMuted, fontFamily: fonts.body }]}>
                    {item.quantity} x {Number(item.unitPrice).toFixed(3)} TND
                  </Text>
                  {item.note ? (
                    <Text style={[styles.itemNote, { color: c.accent500, fontFamily: fonts.body }]}>
                      Note: {item.note}
                    </Text>
                  ) : null}
                </View>

                <MoneyText amount={item.subtotal} size="md" color={c.text} />
              </View>
            ))
          ) : (
            <Text style={{ color: c.textMuted, paddingVertical: 12 }}>
              Aucun article dans ce ticket.
            </Text>
          )}
        </View>

        {/* Total Summary Block */}
        <View style={[styles.totalBlock, { backgroundColor: c.surfaceAlt, borderRadius: radius.md }]}>
          <Text style={[styles.totalLabel, { color: c.textMuted, fontFamily: fonts.bodyMedium }]}>
            Total TTC :
          </Text>
          <MoneyText amount={ticket.total} size="display" color={c.primary900} />
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actions}>
        {!isLocked ? (
          <Button
            title="Ajouter d'autres articles"
            variant="primary"
            size="lg"
            icon={<PlusCircle size={20} color="#FFFFFF" />}
            onPress={() => router.push(`/(customer)/table/${qrToken}`)}
          />
        ) : (
          <Button
            title="Nouvelle commande"
            variant="highlight"
            size="lg"
            icon={<RotateCcw size={20} color={c.onAccent} />}
            onPress={() => router.replace('/(customer)/scan')}
          />
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
  },
  card: {
    borderWidth: 1,
    padding: 18,
    marginBottom: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  ticketNumber: {
    fontSize: 22,
    fontWeight: '700',
  },
  tableSub: {
    fontSize: 13,
    marginTop: 2,
  },
  lockedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 16,
  },
  lockedText: {
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  itemsSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 13,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  itemMain: {
    flex: 1,
    marginRight: 10,
  },
  itemName: {
    fontSize: 15,
    marginBottom: 2,
  },
  itemQtyPrice: {
    fontSize: 13,
  },
  itemNote: {
    fontSize: 12,
    marginTop: 2,
  },
  totalBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 16,
  },
  actions: {
    gap: 12,
  },
});
