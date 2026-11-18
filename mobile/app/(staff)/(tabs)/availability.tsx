import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  Switch,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Utensils, Search, CheckSquare } from 'lucide-react-native';
import { useTheme } from '../../../src/theme/useTheme';
import { api } from '../../../src/services/api';
import { CategoryChips } from '../../../src/components/ui/CategoryChips';
import { Input } from '../../../src/components/ui/Input';
import { MoneyText } from '../../../src/components/ui/MoneyText';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import type { Product, Category } from '../../../src/types';

export default function StaffAvailabilityScreen() {
  const { c, radius, fonts } = useTheme();
  const queryClient = useQueryClient();

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const {
    data: products = [],
    isLoading: productsLoading,
    refetch: refetchProducts,
  } = useQuery({
    queryKey: ['staffProducts'],
    queryFn: () => api.products(),
  });

  const {
    data: categories = [],
    isLoading: categoriesLoading,
  } = useQuery({
    queryKey: ['staffCategories'],
    queryFn: () => api.publicCategories(),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, available }: { id: string; available: boolean }) => {
      return api.updateProductAvailability(id, available);
    },
    onMutate: async ({ id, available }) => {
      await queryClient.cancelQueries({ queryKey: ['staffProducts'] });
      const previous = queryClient.getQueryData<Product[]>(['staffProducts']);
      if (previous) {
        queryClient.setQueryData<Product[]>(
          ['staffProducts'],
          previous.map((p) => (p._id === id ? { ...p, available } : p)),
        );
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['staffProducts'], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['staffProducts'] });
      queryClient.invalidateQueries({ queryKey: ['publicProducts'] });
    },
  });

  const filteredProducts = useMemo(() => {
    let list = products;
    if (selectedCategory) {
      list = list.filter((p) => p.categoryId === selectedCategory);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.description && p.description.toLowerCase().includes(q)),
      );
    }
    return list;
  }, [products, selectedCategory, search]);

  if (productsLoading || categoriesLoading) {
    return (
      <View style={[styles.center, { backgroundColor: c.bg }]}>
        <ActivityIndicator size="large" color={c.primary500} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      <CategoryChips
        categories={categories}
        selectedId={selectedCategory}
        onSelect={setSelectedCategory}
      />

      <View style={styles.searchWrapper}>
        <Input
          placeholder="Rechercher un produit..."
          value={search}
          onChangeText={setSearch}
          leftIcon={<Search size={18} color={c.textFaint} />}
          containerStyle={{ marginBottom: 8 }}
        />
      </View>

      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={() => { refetchProducts(); }} colors={[c.primary500]} />
        }
        renderItem={({ item }) => {
          return (
            <View
              style={[
                styles.itemRow,
                {
                  backgroundColor: c.surface,
                  borderColor: c.border,
                  borderRadius: radius.md,
                },
              ]}
            >
              <View style={[styles.thumbnail, { backgroundColor: c.surfaceAlt, borderRadius: radius.sm }]}>
                {item.imageUrl ? (
                  <Image source={{ uri: item.imageUrl }} style={styles.image} resizeMode="cover" />
                ) : (
                  <Utensils size={20} color={c.textFaint} />
                )}
              </View>

              <View style={styles.info}>
                <Text
                  numberOfLines={1}
                  style={[styles.name, { color: c.text, fontFamily: fonts.bodyBold }]}
                >
                  {item.name}
                </Text>
                <MoneyText amount={item.price} size="sm" color={c.textMuted} />
              </View>

              <View style={styles.toggleWrapper}>
                <Text
                  style={[
                    styles.toggleLabel,
                    {
                      color: item.available ? c.success500 : c.danger500,
                      fontFamily: fonts.bodyMedium,
                    },
                  ]}
                >
                  {item.available ? 'En stock' : 'Épuisé'}
                </Text>
                <Switch
                  value={item.available}
                  onValueChange={(val) => toggleMutation.mutate({ id: item._id, available: val })}
                  trackColor={{ false: c.danger100, true: c.success100 }}
                  thumbColor={item.available ? c.success500 : c.danger500}
                />
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <EmptyState
            icon={<CheckSquare size={36} color={c.textFaint} />}
            title="Aucun produit trouvé"
            description="Essayez un autre mot-clé ou catégorie."
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
  searchWrapper: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  listContent: {
    padding: 16,
    paddingTop: 4,
    paddingBottom: 30,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  thumbnail: {
    width: 48,
    height: 48,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  info: {
    flex: 1,
    marginLeft: 12,
  },
  name: {
    fontSize: 15,
    marginBottom: 2,
  },
  toggleWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toggleLabel: {
    fontSize: 12,
  },
});
