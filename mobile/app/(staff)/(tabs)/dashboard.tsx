import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import {
  DollarSign,
  Receipt,
  TrendingUp,
  LayoutGrid,
  Award,
} from 'lucide-react-native';
import { useTheme } from '../../../src/theme/useTheme';
import { api } from '../../../src/services/api';
import { MoneyText } from '../../../src/components/ui/MoneyText';
import type { Stats } from '../../../src/types';

export default function StaffDashboardScreen() {
  const { c, radius, fonts, shadow } = useTheme();

  const {
    data: stats,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['staffDashboardStats'],
    queryFn: () => api.stats(),
  });

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: c.bg }]}>
        <ActivityIndicator size="large" color={c.primary500} />
      </View>
    );
  }

  const s = stats || {
    salesTotal: 0,
    ticketsCount: 0,
    avgTicket: 0,
    openTickets: 0,
    tablesOccupied: 0,
    salesByDay: [],
    topProducts: [],
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: c.bg }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={false} onRefresh={() => { refetch(); }} colors={[c.primary500]} />
      }
    >
      <Text style={[styles.heading, { color: c.primary900, fontFamily: fonts.displaySemi }]}>
        Indicateurs clés du restaurant
      </Text>

      {/* KPI Cards Grid */}
      <View style={styles.kpiGrid}>
        {/* Sales Total */}
        <View
          style={[
            styles.kpiCard,
            shadow[1],
            {
              backgroundColor: c.surface,
              borderColor: c.border,
              borderRadius: radius.lg,
            },
          ]}
        >
          <View style={[styles.kpiIcon, { backgroundColor: c.primary100 }]}>
            <DollarSign size={20} color={c.primary500} />
          </View>
          <Text style={[styles.kpiLabel, { color: c.textMuted, fontFamily: fonts.bodyMedium }]}>
            Chiffre d'affaires
          </Text>
          <MoneyText amount={s.salesTotal} size="lg" color={c.primary900} />
        </View>

        {/* Tickets Count */}
        <View
          style={[
            styles.kpiCard,
            shadow[1],
            {
              backgroundColor: c.surface,
              borderColor: c.border,
              borderRadius: radius.lg,
            },
          ]}
        >
          <View style={[styles.kpiIcon, { backgroundColor: c.info100 }]}>
            <Receipt size={20} color={c.info500} />
          </View>
          <Text style={[styles.kpiLabel, { color: c.textMuted, fontFamily: fonts.bodyMedium }]}>
            Tickets clôturés
          </Text>
          <Text style={[styles.kpiValue, { color: c.text, fontFamily: fonts.displaySemi }]}>
            {s.ticketsCount}
          </Text>
        </View>

        {/* Average Ticket */}
        <View
          style={[
            styles.kpiCard,
            shadow[1],
            {
              backgroundColor: c.surface,
              borderColor: c.border,
              borderRadius: radius.lg,
            },
          ]}
        >
          <View style={[styles.kpiIcon, { backgroundColor: c.accent100 }]}>
            <TrendingUp size={20} color={c.onAccent} />
          </View>
          <Text style={[styles.kpiLabel, { color: c.textMuted, fontFamily: fonts.bodyMedium }]}>
            Ticket moyen
          </Text>
          <MoneyText amount={s.avgTicket} size="lg" color={c.accent500} />
        </View>

        {/* Occupied Tables */}
        <View
          style={[
            styles.kpiCard,
            shadow[1],
            {
              backgroundColor: c.surface,
              borderColor: c.border,
              borderRadius: radius.lg,
            },
          ]}
        >
          <View style={[styles.kpiIcon, { backgroundColor: c.warning100 }]}>
            <LayoutGrid size={20} color={c.warning500} />
          </View>
          <Text style={[styles.kpiLabel, { color: c.textMuted, fontFamily: fonts.bodyMedium }]}>
            Tables occupées
          </Text>
          <Text style={[styles.kpiValue, { color: c.text, fontFamily: fonts.displaySemi }]}>
            {s.tablesOccupied}
          </Text>
        </View>
      </View>

      {/* Top Selling Products */}
      <View
        style={[
          styles.topSection,
          {
            backgroundColor: c.surface,
            borderColor: c.border,
            borderRadius: radius.lg,
          },
        ]}
      >
        <View style={styles.topHeader}>
          <Award size={20} color={c.primary500} style={{ marginRight: 8 }} />
          <Text style={[styles.topTitle, { color: c.text, fontFamily: fonts.displaySemi }]}>
            Meilleures ventes
          </Text>
        </View>

        {s.topProducts && s.topProducts.length > 0 ? (
          s.topProducts.map((p, idx) => (
            <View
              key={idx}
              style={[
                styles.topRow,
                { borderBottomColor: idx === s.topProducts.length - 1 ? 'transparent' : c.surfaceAlt },
              ]}
            >
              <View style={styles.topRank}>
                <Text style={[styles.rankNumber, { color: c.primary700, fontFamily: fonts.bodyBold }]}>
                  #{idx + 1}
                </Text>
                <Text style={[styles.prodName, { color: c.text, fontFamily: fonts.bodyMedium }]}>
                  {p.productName}
                </Text>
              </View>
              <Text style={[styles.prodQty, { color: c.textMuted, fontFamily: fonts.bodyBold }]}>
                {p.quantity} vendus
              </Text>
            </View>
          ))
        ) : (
          <Text style={[styles.noTop, { color: c.textMuted, fontFamily: fonts.body }]}>
            Aucune vente enregistrée pour le moment.
          </Text>
        )}
      </View>
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
  heading: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  kpiCard: {
    width: '48%',
    padding: 16,
    borderWidth: 1,
  },
  kpiIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  kpiLabel: {
    fontSize: 12,
    marginBottom: 6,
  },
  kpiValue: {
    fontSize: 22,
    fontWeight: '700',
  },
  topSection: {
    padding: 18,
    borderWidth: 1,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  topTitle: {
    fontSize: 17,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  topRank: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rankNumber: {
    width: 28,
    fontSize: 14,
  },
  prodName: {
    fontSize: 14,
  },
  prodQty: {
    fontSize: 13,
  },
  noTop: {
    fontSize: 14,
    paddingVertical: 8,
  },
});
