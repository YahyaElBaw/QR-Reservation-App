import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ShoppingBag, ChevronRight } from 'lucide-react-native';
import { useTheme } from '../theme/useTheme';
import { MoneyText } from './ui/MoneyText';

interface FloatingCartBarProps {
  itemCount: number;
  totalAmount: number;
  onPress: () => void;
}

export const FloatingCartBar: React.FC<FloatingCartBarProps> = ({
  itemCount,
  totalAmount,
  onPress,
}) => {
  const { c, radius, fonts, shadow } = useTheme();

  if (itemCount === 0) return null;

  return (
    <View style={styles.wrapper}>
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`Voir le panier : ${itemCount} article(s)`}
        style={[
          styles.container,
          shadow[2],
          {
            backgroundColor: c.primary700,
            borderRadius: radius.lg,
          },
        ]}
      >
        <View style={styles.left}>
          <View style={[styles.iconPill, { backgroundColor: c.primary600, borderRadius: radius.full }]}>
            <ShoppingBag size={18} color="#FFFFFF" />
          </View>
          <Text style={[styles.countText, { fontFamily: fonts.bodyBold }]}>
            {itemCount} {itemCount === 1 ? 'article' : 'articles'}
          </Text>
        </View>

        <View style={styles.right}>
          <MoneyText amount={totalAmount} size="md" color={c.accent500} />
          <ChevronRight size={18} color="#FFFFFF" style={styles.arrow} />
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    zIndex: 100,
  },
  container: {
    height: 56,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconPill: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  countText: {
    color: '#FFFFFF',
    fontSize: 15,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  arrow: {
    marginLeft: 6,
  },
});
