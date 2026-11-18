import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Receipt, Search, ChevronRight } from 'lucide-react-native';
import { useTheme } from '../../../src/theme/useTheme';
import { api } from '../../../src/services/api';
import { useAuthStore } from '../../../src/stores/authStore';
import { useLiveUpdates } from '../../../src/services/live';
import { StatusBadge } from '../../../src/components/ui/StatusBadge';
import { MoneyText } from '../../../src/components/ui/MoneyText';
import { Input } from '../../../src/components/ui/Input';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import type { Ticket } from '../../../src/types';

export default function StaffTicketsScreen() {
  const router = useRouter();
  const { c, radius, fonts } = useTheme();
  const { token } = useAuthStore();

  const [filter, setFilter] = useState<'OPEN' | 'PAID' | 'ALL'>('OPEN');
  const [search, setSearch] = useState('');

  const {
    data: tickets = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['staffTickets', filter],
    queryFn: async () => {
      const params = filter === 'ALL' ? undefined : { status: filter };
      return api.tickets(params);
    },
    refetchInterval: 5000,
  });

  // Live Socket.IO staff room
  useLiveUpdates({
    token,
    onEvent: (event) => {
      if (['ticket.created', 'ticket.updated', 'ticket.closed'].includes(event)) {
        refetch();
      }
    },
  });

  const filteredTickets = tickets.filter((t: Ticket) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      t.ticketNumber.toLowerCase().includes(q) ||
      (t.tableId && String(t.tableId).toLowerCase().includes(q))
    );
  });

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      {/* Filter Tabs */}
      <View style={[styles.filtersRow, { backgroundColor: c.surface, borderBottomColor: c.border }]}>
        <TouchableOpacity
          onPress={() => setFilter('OPEN')}
          style={[
            styles.filterTab,
            filter === 'OPEN' && [styles.filterTabActive, { borderBottomColor: c.primary500 }],
          ]}
        >
          <Text
            style={[
              styles.filterText,
              {
                color: filter === 'OPEN' ? c.primary500 : c.textMuted,
                fontFamily: filter === 'OPEN' ? fonts.bodyBold : fonts.bodyMedium,
              },
            ]}
          >
            Ouverts
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setFilter('PAID')}
          style={[
            styles.filterTab,
            filter === 'PAID' && [styles.filterTabActive, { borderBottomColor: c.primary500 }],
          ]}
        >
          <Text
            style={[
              styles.filterText,
              {
                color: filter === 'PAID' ? c.primary500 : c.textMuted,
                fontFamily: filter === 'PAID' ? fonts.bodyBold : fonts.bodyMedium,
              },
            ]}
          >
            Payés
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setFilter('ALL')}
          style={[
            styles.filterTab,
            filter === 'ALL' && [styles.filterTabActive, { borderBottomColor: c.primary500 }],
          ]}
        >
          <Text
            style={[
              styles.filterText,
              {
                color: filter === 'ALL' ? c.primary500 : c.textMuted,
                fontFamily: filter === 'ALL' ? fonts.bodyBold : fonts.bodyMedium,
              },
            ]}
          >
            Tous
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search Input */}
      <View style={styles.searchWrapper}>
        <Input
          placeholder="Rechercher par numéro de ticket..."
          value={search}
          onChangeText={setSearch}
          leftIcon={<Search size={18} color={c.textFaint} />}
          containerStyle={{ marginBottom: 8 }}
        />
      </View>

      {/* Tickets List */}
      {isLoading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={c.primary500} />
        </View>
      ) : (
        <FlatList
          data={filteredTickets}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={false} onRefresh={() => { refetch(); }} colors={[c.primary500]} />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => router.push(`/(staff)/ticket/${item._id}`)}
              style={[
                styles.ticketCard,
                {
                  backgroundColor: c.surface,
                  borderColor: c.border,
                  borderRadius: radius.lg,
                },
              ]}
            >
              <View style={styles.cardTop}>
                <View>
                  <Text style={[styles.ticketNum, { color: c.text, fontFamily: fonts.displaySemi }]}>
                    Ticket #{item.ticketNumber}
                  </Text>
                  <Text style={[styles.itemCount, { color: c.textMuted, fontFamily: fonts.body }]}>
                    {item.items?.length || 0} article(s)
                  </Text>
                </View>
                <StatusBadge status={item.status} type="ticket" size="sm" />
              </View>

              <View style={[styles.cardBottom, { borderTopColor: c.surfaceAlt }]}>
                <View>
                  <Text style={[styles.totalLabel, { color: c.textMuted, fontFamily: fonts.body }]}>
                    Total
                  </Text>
                  <MoneyText amount={item.total} size="md" color={c.primary900} />
                </View>
                <ChevronRight size={20} color={c.textMuted} />
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <EmptyState
              icon={<Receipt size={36} color={c.textFaint} />}
              title="Aucun ticket trouvé"
              description="Aucun ticket ne correspond au filtre ou à votre recherche."
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  filtersRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  filterTabActive: {
    borderBottomWidth: 2,
  },
  filterText: {
    fontSize: 14,
  },
  searchWrapper: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  loadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: 16,
    paddingTop: 4,
    paddingBottom: 30,
  },
  ticketCard: {
    padding: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  ticketNum: {
    fontSize: 17,
    fontWeight: '600',
  },
  itemCount: {
    fontSize: 13,
    marginTop: 2,
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
  },
  totalLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
  },
});
