import React from 'react';
import {
  ScrollView,
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  StyleProp,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme/useTheme';
import type { Category } from '../../types';

interface CategoryChipsProps {
  categories: Category[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  style?: StyleProp<ViewStyle>;
}

const getCategoryIcon = (name: string): string => {
  const n = name.toLowerCase();
  if (n.includes('chaud') || n.includes('café') || n.includes('thé')) return '☕';
  if (n.includes('fraîch') || n.includes('boisson') || n.includes('jus') || n.includes('eau')) return '🥤';
  if (n.includes('plat') || n.includes('pizza') || n.includes('spaghetti') || n.includes('salade')) return '🍕';
  if (n.includes('dessert') || n.includes('crêpe') || n.includes('tiramisu') || n.includes('makroudh')) return '🍰';
  return '🍽️';
};

export const CategoryChips: React.FC<CategoryChipsProps> = ({
  categories,
  selectedId,
  onSelect,
  style,
}) => {
  const { c, radius, fonts, shadow } = useTheme();

  const handleSelect = (id: string | null) => {
    try {
      Haptics.selectionAsync().catch(() => {});
    } catch {}
    onSelect(id);
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
      style={style}
    >
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => handleSelect(null)}
        style={[
          styles.chip,
          selectedId === null && shadow[1],
          {
            borderRadius: radius.full,
            backgroundColor: selectedId === null ? c.primary700 : c.surface,
            borderColor: selectedId === null ? c.primary700 : c.border,
          },
        ]}
      >
        <Text style={styles.chipIcon}>🍽️</Text>
        <Text
          style={[
            styles.chipText,
            {
              color: selectedId === null ? '#FFFFFF' : c.text,
              fontFamily: selectedId === null ? fonts.bodyBold : fonts.bodyMedium,
            },
          ]}
        >
          Tout le menu
        </Text>
      </TouchableOpacity>

      {categories.map((cat) => {
        const isSelected = selectedId === cat._id;
        const icon = getCategoryIcon(cat.name);
        return (
          <TouchableOpacity
            key={cat._id}
            activeOpacity={0.8}
            onPress={() => handleSelect(cat._id)}
            style={[
              styles.chip,
              isSelected && shadow[1],
              {
                borderRadius: radius.full,
                backgroundColor: isSelected ? c.primary700 : c.surface,
                borderColor: isSelected ? c.primary700 : c.border,
              },
            ]}
          >
            <Text style={styles.chipIcon}>{icon}</Text>
            <Text
              style={[
                styles.chipText,
                {
                  color: isSelected ? '#FFFFFF' : c.text,
                  fontFamily: isSelected ? fonts.bodyBold : fonts.bodyMedium,
                },
              ]}
            >
              {cat.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    gap: 6,
  },
  chipIcon: {
    fontSize: 15,
  },
  chipText: {
    fontSize: 13.5,
  },
});
