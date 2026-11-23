import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { LayoutGrid } from 'lucide-react-native';
import { useTheme } from '../../../src/theme/useTheme';
import { api } from '../../../src/services/api';
import { useAuthStore } from '../../../src/stores/authStore';
import { useLiveUpdates } from '../../../src/services/live';
import { StatusBadge } from '../../../src/components/ui/StatusBadge';
import { MoneyText } from '../../../src/components/ui/MoneyText';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import type { RestaurantTable, Ticket } from '../../../src/types';

const { width } = Dimensions.get('window');
const cardWidth = (width - 48) / 2;

export default function StaffTablesScreen() {
  const router = useRouter();
  const { c, radius, fonts } = useTheme();
  const { token } = useAuthStore();

  const {
    data: tables = [],
    isLoading: tablesLoading,
    refetch: refetchTables,
  } = useQuery({
    queryKey: ['staffTables'],
    queryFn: () => api.tables(),
    refetchInterval: 5000,
  });

  const {
    data: openTickets = [],
    refetch: refetchTickets,
  } = useQuery({
    queryKey: ['staffOpenTickets'],
    queryFn: () => api.tickets({ status: 'OPEN' }),
    refetchInterval: 5000,
  });

  useLiveUpdates({
    token,
    onEvent: () => {
      refetchTables();
      refetchTickets();
    },
  });

  const onRefresh = async () => {
    await Promise.all([refetchTables(), refetchTickets()]);
  };

  const tableTicketsMap = React.useMemo(() => {
    const map = new Map<string, Ticket>();
    openTickets.forEach((t: Ticket) => {
      // In ticket, tableId can be string id or object with _id
      const tId = typeof t.tableId === 'object' && t.tableId !== null ? (t.tableId as any)._id : t.tableId;
      map.set(String(tId), t);
    });
    return map;
  }, [openTickets]);

  if (tablesLoading) {
    return (
      <View style={[styles.center, { backgroundColor: c.bg }]}>
        <ActivityIndicator size="large" color={c.primary500} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      <FlatList
        data={tables}
        keyExtractor={(item) => item._id}
        numColumns={2}
        contentContainerStyle={styles.gridContent}
        columnWrapperStyle={styles.columnWrapper}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={onRefresh} colors={[c.primary500]} />
        }
        renderItem={({ item }: { item: RestaurantTable }) => {
          const activeTicket = tableTicketsMap.get(item._id);
          const isOccupied = item.status === 'RESERVED';

          return (
            <TouchableOpacity
              activeOpacity={0.7}
              disabled={!activeTicket}
              onPress={() => {
                if (activeTicket) {
                  router.push(`/(staff)/ticket/${activeTicket._id}`);
                }
              }}
              style={[
                styles.tableTile,
                {
                  width: cardWidth,
                  backgroundColor: c.surface,
                  borderColor: isOccupied ? c.warning500 : c.border,
                  borderRadius: radius.lg,
                },
              ]}
            >
              <View style={styles.tileHeader}>
                <Text style={[styles.tableNumber, { color: c.primary900, fontFamily: fonts.display }]}>
                  Table {item.number}
                </Text>
                <StatusBadge status={item.status} type="table" size="sm" />
              </View>

              <View style={styles.tileFooter}>
                {activeTicket ? (
                  <View>
                    <Text style={[styles.ticketBadge, { color: c.textMuted, fontFamily: fonts.body }]}>
                      Ticket #{activeTicket.ticketNumber}
                    </Text>
                    <MoneyText amount={activeTicket.total} size="md" color={c.accent500} />
                  </View>
                ) : (
                  <Text style={[styles.availableNote, { color: c.textFaint, fontFamily: fonts.body }]}>
                    Prête pour clients
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <EmptyState
            icon={<LayoutGrid size={36} color={c.textFaint} />}
            title="Aucune table configurée"
            description="Les tables créées dans le back-office apparaîtront ici."
          />
        }
      />
    </View>
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
  gridContent: {
    padding: 16,
    paddingBottom: 30,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  tableTile: {
    minHeight: 130,
    padding: 14,
    borderWidth: 1.5,
    justifyContent: 'space-between',
  },
  tileHeader: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 6,
  },
  tableNumber: {
    fontSize: 22,
    fontWeight: '700',
  },
  tileFooter: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  ticketBadge: {
    fontSize: 12,
    marginBottom: 2,
  },
  availableNote: {
    fontSize: 12,
  },
});
