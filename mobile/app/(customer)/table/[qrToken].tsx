import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Modal,
  TextInput,
  Image,
  useWindowDimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Receipt, Search, AlertCircle, Wifi, X, Lock, QrCode, RefreshCw } from 'lucide-react-native';
import { useTheme } from '../../../src/theme/useTheme';
import { api, API_BASE_URL, setApiBaseUrl } from '../../../src/services/api';
import { setSocketBaseUrl, useLiveUpdates } from '../../../src/services/live';
import { useCartStore } from '../../../src/stores/cartStore';
import { getOrCreateDeviceId } from '../../../src/utils/deviceId';
import { CategoryChips } from '../../../src/components/ui/CategoryChips';
import { Input } from '../../../src/components/ui/Input';
import { Button } from '../../../src/components/ui/Button';
import { ProductCard } from '../../../src/components/ProductCard';
import { ProductDetailModal } from '../../../src/components/ProductDetailModal';
import { FloatingCartBar } from '../../../src/components/FloatingCartBar';
import { CartModal } from '../../../src/components/CartModal';
import { TicketModal } from '../../../src/components/TicketModal';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { StatusBadge } from '../../../src/components/ui/StatusBadge';
import type { Product, Category, Ticket } from '../../../src/types';

export default function TableMenuScreen() {
  const { qrToken } = useLocalSearchParams<{ qrToken: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const { c, radius, fonts, shadow } = useTheme();
  const { width: screenWidth } = useWindowDimensions();

  // Exactly 2 cards per row calculated dynamically
  const cardWidth = Math.floor((screenWidth - 24 - 10) / 2);

  const [deviceId, setDeviceId] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [cartModalOpen, setCartModalOpen] = useState(false);
  const [ticketModalOpen, setTicketModalOpen] = useState(false);
  const [serverModalOpen, setServerModalOpen] = useState(false);
  const [customServerIp, setCustomServerIp] = useState('172.16.27.169');
  const [selectedProductForDetail, setSelectedProductForDetail] = useState<Product | null>(null);

  const carts = useCartStore((s) => s.carts);
  const { addItem, updateQuantity } = useCartStore();

  useEffect(() => {
    getOrCreateDeviceId().then(setDeviceId).catch(() => {});
  }, []);

  // Queries
  const {
    data: tableData,
    isLoading: tableLoading,
    error: tableError,
    refetch: refetchTable,
  } = useQuery({
    queryKey: ['publicTable', qrToken, deviceId],
    queryFn: () => api.publicTable(qrToken as string, deviceId),
    enabled: !!qrToken,
  });

  const {
    data: categories = [],
    isLoading: categoriesLoading,
    refetch: refetchCategories,
  } = useQuery({
    queryKey: ['publicCategories'],
    queryFn: () => api.publicCategories(),
  });

  const {
    data: products = [],
    isLoading: productsLoading,
    refetch: refetchProducts,
  } = useQuery({
    queryKey: ['publicProducts'],
    queryFn: () => api.publicProducts(),
  });

  const onRefresh = async () => {
    await Promise.all([refetchTable(), refetchCategories(), refetchProducts()]);
  };

  // Real-time Socket.IO room updates for this table
  useLiveUpdates({
    qrToken: qrToken as string,
    onEvent: () => {
      void onRefresh();
    },
  });

  const filteredProducts = useMemo(() => {
    const list = Array.isArray(products) ? products : [];
    let res = list;
    if (selectedCategory) {
      res = res.filter((p) => String(p.categoryId) === String(selectedCategory));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      res = res.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.description && p.description.toLowerCase().includes(q)),
      );
    }
    return res;
  }, [products, selectedCategory, searchQuery]);

  const currentCartItems = useMemo(() => {
    return qrToken && carts[qrToken as string] ? carts[qrToken as string] : [];
  }, [carts, qrToken]);

  const cartCount = useMemo(() => {
    return currentCartItems.reduce((sum, item) => sum + item.quantity, 0);
  }, [currentCartItems]);

  const cartTotal = useMemo(() => {
    return currentCartItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  }, [currentCartItems]);

  const getProductCartQty = (productId: string) => {
    const item = currentCartItems.find((i) => i.product._id === productId);
    return item ? item.quantity : 0;
  };

  useEffect(() => {
    if (tableData?.table) {
      navigation.setOptions({
        title: `Table ${tableData.table.number}`,
      });
    }
  }, [tableData, navigation]);

  const handleApplyServerIp = () => {
    if (!customServerIp.trim()) return;
    const cleanIp = customServerIp.trim().replace(/^https?:\/\//, '').replace(/:.*$/, '');
    setApiBaseUrl(`http://${cleanIp}:3000/api/v1`);
    setSocketBaseUrl(`http://${cleanIp}:3000`);
    setServerModalOpen(false);
    onRefresh();
  };

  if (tableLoading || categoriesLoading || productsLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: c.bg }]}>
        <ActivityIndicator size="large" color={c.primary500} />
        <Text style={[styles.loadingText, { color: c.textMuted, fontFamily: fonts.body }]}>
          Connexion à la table {qrToken}...
        </Text>
      </View>
    );
  }

  if (tableError || !tableData) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: c.bg }]}>
        <EmptyState
          icon={<AlertCircle size={40} color={c.danger500} />}
          title="Table introuvable ou serveur hors de portée"
          description={`Impossible de joindre le serveur (${API_BASE_URL}). Assurez-vous d'être connecté au même Wi-Fi.`}
          actionLabel="Scanner à nouveau"
          onAction={() => router.replace('/(customer)/scan')}
        />
        <Button
          title="Configurer l'IP serveur (Wi-Fi)"
          variant="secondary"
          size="sm"
          icon={<Wifi size={16} color={c.primary700} />}
          onPress={() => setServerModalOpen(true)}
          style={{ marginTop: 12 }}
        />

        {/* Server IP Config Modal */}
        <Modal visible={serverModalOpen} transparent animationType="fade">
          <View style={styles.modalBackdrop}>
            <View style={[styles.serverModalContent, { backgroundColor: c.surface, borderRadius: radius.lg }]}>
              <View style={styles.serverModalHeader}>
                <Text style={[styles.serverModalTitle, { color: c.text, fontFamily: fonts.displaySemi }]}>
                  Adresse IP du serveur
                </Text>
                <TouchableOpacity onPress={() => setServerModalOpen(false)}>
                  <X size={20} color={c.textMuted} />
                </TouchableOpacity>
              </View>
              <Text style={[styles.serverModalDesc, { color: c.textMuted, fontFamily: fonts.body }]}>
                Entrez l'IP locale de votre ordinateur hôte pour connecter votre téléphone :
              </Text>
              <TextInput
                style={[
                  styles.serverInput,
                  {
                    color: c.text,
                    backgroundColor: c.surfaceAlt,
                    borderColor: c.border,
                    borderRadius: radius.md,
                    fontFamily: fonts.body,
                  },
                ]}
                placeholder="192.168.1.22"
                value={customServerIp}
                onChangeText={setCustomServerIp}
                keyboardType="numbers-and-punctuation"
              />
              <Button
                title="Se connecter au serveur"
                variant="primary"
                size="md"
                onPress={handleApplyServerIp}
                style={{ marginTop: 10 }}
              />
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  const { table, activeTicket, lockedToOtherDevice } = tableData;

  // 404 Full Screen: If table is closed / occupied by another device -> Clean 404 screen (nothing else shown)
  if (lockedToOtherDevice) {
    return (
      <View style={[styles.errorPageContainer, { backgroundColor: c.bg }]}>
        <View style={styles.errorPageContent}>
          {/* Big 404 Display */}
          <Text style={[styles.error404Text, { color: c.border, fontFamily: fonts.display }]}>
            404
          </Text>

          {/* Minimalist Lock Icon */}
          <View style={[styles.errorIconCircle, shadow[1], { backgroundColor: c.surface, borderColor: c.border }]}>
            <Lock size={30} color={c.warning500} strokeWidth={2.2} />
          </View>

          {/* Heading */}
          <Text style={[styles.errorTitle, { color: c.text, fontFamily: fonts.displaySemi }]}>
            Table {table.number} Fermée
          </Text>

          {/* Short minimalist message */}
          <Text style={[styles.errorDescription, { color: c.textMuted, fontFamily: fonts.body }]}>
            Cette table est actuellement fermée ou occupée par un autre client. Aucune commande ne peut être passée depuis cet appareil.
          </Text>

          {/* Action buttons */}
          <View style={styles.errorActions}>
            <Button
              title="Scanner une autre table"
              variant="primary"
              size="md"
              icon={<QrCode size={16} color="#FFFFFF" />}
              onPress={() => router.replace('/(customer)/scan')}
            />

            <Button
              title="Actualiser"
              variant="ghost"
              size="sm"
              icon={<RefreshCw size={14} color={c.textMuted} />}
              onPress={onRefresh}
              style={{ marginTop: 8 }}
            />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      {/* Table Header Bar */}
      <View style={[styles.tableHeader, { backgroundColor: c.surface, borderBottomColor: c.border }]}>
        <View style={styles.tableInfo}>
          <Text style={[styles.restaurantBadge, { color: c.primary700, fontFamily: fonts.display }]}>
            RESTAURANT MÉDINA
          </Text>
          <View style={styles.tableNumberRow}>
            <Text style={[styles.tableTitle, { color: c.text, fontFamily: fonts.display }]}>
              Table {table.number}
            </Text>
            <StatusBadge status={table.status} type="table" size="sm" />
          </View>
        </View>

        {activeTicket && (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setTicketModalOpen(true)}
            style={[
              styles.topBarTicketBtn,
              shadow[1],
              { backgroundColor: c.primary50, borderColor: c.primary100 },
            ]}
          >
            <View style={[styles.topBarTicketIconBox, { backgroundColor: c.primary100 }]}>
              <Receipt size={15} color={c.primary700} />
            </View>
            <View style={styles.topBarTicketTextCol}>
              <Text style={[styles.topBarTicketTitle, { color: c.primary900, fontFamily: fonts.bodyBold }]}>
                Ticket #{activeTicket.ticketNumber}
              </Text>
              <Text style={[styles.topBarTicketTotal, { color: c.primary700, fontFamily: fonts.bodyMedium }]}>
                {Number(activeTicket.total).toFixed(3)} TND
              </Text>
            </View>
          </TouchableOpacity>
        )}
      </View>

      {/* Hero Welcome Banner */}
      <View style={styles.heroSection}>
        <Text style={[styles.heroGreeting, { color: c.textMuted, fontFamily: fonts.bodyMedium }]}>
          Bonjour & Bienvenue 👋
        </Text>
        <Text style={[styles.heroHeadline, { color: c.text, fontFamily: fonts.display }]}>
          Good Food, <Text style={{ color: c.primary700 }}>Good Mood !</Text>
        </Text>
      </View>

      {/* Search Input with quick clear */}
      <View style={styles.searchWrapper}>
        <View style={styles.searchInner}>
          <Input
            placeholder="Rechercher un plat, boisson, dessert..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            leftIcon={<Search size={18} color={c.textFaint} />}
            containerStyle={styles.searchInputContainer}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              style={styles.clearSearchBtn}
              accessibilityLabel="Effacer la recherche"
            >
              <X size={16} color={c.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Category Chips Carousel */}
      <CategoryChips
        categories={categories}
        selectedId={selectedCategory}
        onSelect={setSelectedCategory}
      />

      {/* Subheader Toolbar: Dish Count */}
      <View style={styles.toolbarRow}>
        <Text style={[styles.toolbarCount, { color: c.textMuted, fontFamily: fonts.bodyMedium }]}>
          {filteredProducts.length} {filteredProducts.length === 1 ? 'produit' : 'produits'}
        </Text>
      </View>

      {/* Product List: STRICTLY 2 cards per row */}
      <FlatList
        key="menu-grid-2col"
        data={filteredProducts}
        keyExtractor={(item) => item._id}
        numColumns={2}
        keyboardShouldPersistTaps="handled"
        columnWrapperStyle={styles.gridColumnWrapper}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: cartCount > 0 && !lockedToOtherDevice ? 110 : 30 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={onRefresh} colors={[c.primary500]} />
        }
        renderItem={({ item }) => (
          <ProductCard
            product={item}
            cardWidth={cardWidth}
            onPressCard={(p) => setSelectedProductForDetail(p)}
            onAddToCart={(prod) => addItem(qrToken as string, prod)}
            onRemoveFromCart={(prod) => updateQuantity(qrToken as string, prod._id, -1)}
            quantityInCart={getProductCartQty(item._id)}
            disabled={lockedToOtherDevice}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            title="Aucun produit trouvé"
            description="Essayez un autre mot-clé ou sélectionnez une autre catégorie."
          />
        }
      />

      {/* Product Detail Modal */}
      <ProductDetailModal
        product={selectedProductForDetail}
        visible={!!selectedProductForDetail}
        initialQuantity={selectedProductForDetail ? getProductCartQty(selectedProductForDetail._id) : 1}
        onClose={() => setSelectedProductForDetail(null)}
        disabled={lockedToOtherDevice}
        onAddToCart={(prod, qty, note) => {
          addItem(qrToken as string, prod, qty, note);
        }}
      />

      {/* Floating Cart Bar (only visible when cart is non-empty and device is not locked) */}
      {!lockedToOtherDevice && (
        <FloatingCartBar
          itemCount={cartCount}
          totalAmount={cartTotal}
          onPress={() => setCartModalOpen(true)}
        />
      )}

      {/* Cart Modal */}
      <CartModal
        visible={cartModalOpen}
        onClose={() => setCartModalOpen(false)}
        qrToken={qrToken as string}
        onOrderPlaced={() => {
          setCartModalOpen(false);
          setTicketModalOpen(true);
          onRefresh();
        }}
      />

      {/* Ticket Modal */}
      <TicketModal
        visible={ticketModalOpen}
        onClose={() => setTicketModalOpen(false)}
        ticket={activeTicket}
        tableNumber={table.number}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  tableInfo: {
    gap: 2,
  },
  restaurantBadge: {
    fontSize: 10.5,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  tableNumberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tableTitle: {
    fontSize: 22,
    letterSpacing: -0.3,
  },
  topBarTicketBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
  },
  topBarTicketIconBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTicketTextCol: {
    alignItems: 'flex-start',
  },
  topBarTicketTitle: {
    fontSize: 12,
    lineHeight: 14,
  },
  topBarTicketTotal: {
    fontSize: 11.5,
    lineHeight: 13,
  },
  errorPageContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorPageContent: {
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    justifyContent: 'center',
  },
  error404Text: {
    fontSize: 88,
    lineHeight: 96,
    letterSpacing: -2,
    opacity: 0.3,
    marginBottom: -12,
  },
  errorIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 21,
    letterSpacing: -0.3,
    textAlign: 'center',
    marginBottom: 8,
  },
  errorDescription: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  errorActions: {
    width: '100%',
    alignItems: 'center',
  },

  heroSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  heroGreeting: {
    fontSize: 13,
    marginBottom: 2,
  },
  heroHeadline: {
    fontSize: 24,
    letterSpacing: -0.4,
  },
  searchWrapper: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 0,
  },
  searchInner: {
    position: 'relative',
    justifyContent: 'center',
  },
  searchInputContainer: {
    marginBottom: 4,
  },
  clearSearchBtn: {
    position: 'absolute',
    right: 14,
    top: 14,
    padding: 4,
    zIndex: 10,
  },
  toolbarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  toolbarCount: {
    fontSize: 13,
  },
  layoutToggle: {
    flexDirection: 'row',
    padding: 3,
    alignItems: 'center',
  },
  toggleBtn: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleBtnActive: {
    shadowColor: '#0B2F57',
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  gridColumnWrapper: {
    paddingHorizontal: 12,
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  listContent: {
    paddingTop: 4,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  serverModalContent: {
    width: '100%',
    padding: 20,
  },
  serverModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  serverModalTitle: {
    fontSize: 18,
  },
  serverModalDesc: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  serverInput: {
    height: 48,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 16,
    marginBottom: 6,
  },
});
