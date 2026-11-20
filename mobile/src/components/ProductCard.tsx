import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Plus, Minus, Utensils, Lock, Check } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../theme/useTheme';
import { MoneyText } from './ui/MoneyText';
import type { Product } from '../types';

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
  onRemoveFromCart?: (product: Product) => void;
  onPressCard?: (product: Product) => void;
  quantityInCart?: number;
  disabled?: boolean;
  cardWidth?: number;
  variant?: 'box' | 'gridBox';
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onAddToCart,
  onRemoveFromCart,
  onPressCard,
  quantityInCart = 0,
  disabled = false,
  cardWidth,
}) => {
  const { c, radius, fonts, shadow } = useTheme();

  // Cloudinary transform or original
  const imageUrl = product.imageUrl
    ? product.imageUrl.includes('res.cloudinary.com')
      ? product.imageUrl.replace('/upload/', '/upload/c_fill,ar_4:3,w_450,q_auto,f_auto/')
      : product.imageUrl
    : null;

  const isAvailable = product.available;
  const isSelected = quantityInCart > 0;

  const handleAdd = (e?: any) => {
    e?.stopPropagation?.();
    if (disabled || !isAvailable) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } catch {}
    onAddToCart(product);
  };

  const handleRemove = (e?: any) => {
    e?.stopPropagation?.();
    if (disabled || !onRemoveFromCart) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } catch {}
    onRemoveFromCart(product);
  };

  const handleCardPress = () => {
    if (onPressCard) {
      try {
        Haptics.selectionAsync().catch(() => {});
      } catch {}
      onPressCard(product);
    }
  };

  const cardRadius = 16;

  return (
    <TouchableOpacity
      activeOpacity={onPressCard ? 0.88 : 1}
      onPress={handleCardPress}
      style={[
        styles.card,
        shadow[1],
        {
          backgroundColor: c.surface,
          borderColor: isSelected ? c.primary500 : c.border,
          borderWidth: isSelected ? 1.5 : 1,
          borderRadius: cardRadius,
          opacity: isAvailable ? 1 : 0.65,
        },
        cardWidth ? { width: cardWidth, maxWidth: cardWidth } : styles.defaultWidth,
      ]}
    >
      {/* 1. Food Photo on top */}
      <View
        style={[
          styles.photoWrapper,
          {
            backgroundColor: c.surfaceAlt,
            borderTopLeftRadius: cardRadius - 1,
            borderTopRightRadius: cardRadius - 1,
          },
        ]}
      >
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={[styles.photo, !isAvailable && styles.grayscale]}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.placeholderContainer}>
            <Utensils size={24} color={c.textFaint} strokeWidth={1.5} />
            <Text
              numberOfLines={1}
              style={[
                styles.placeholderText,
                { color: c.textFaint, fontFamily: fonts.body },
              ]}
            >
              {product.name}
            </Text>
          </View>
        )}

        {/* Top Badges */}
        <View style={styles.badgeOverlay}>
          {!isAvailable && (
            <View style={[styles.badgePill, { backgroundColor: c.danger500 }]}>
              <Text style={[styles.badgeText, { fontFamily: fonts.bodyBold }]}>
                Épuisé
              </Text>
            </View>
          )}

          {isSelected && (
            <View
              style={[
                styles.badgePill,
                styles.cartPill,
                shadow[1],
                { backgroundColor: c.primary700 },
              ]}
            >
              <Check size={10} color="#FFFFFF" strokeWidth={3} style={{ marginRight: 2 }} />
              <Text style={[styles.badgeText, { fontFamily: fonts.bodyBold }]}>
                {quantityInCart}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* 2. Content: Dish Name, Description, and Bottom Actions */}
      <View style={styles.cardBody}>
        {/* Title & Description */}
        <View style={styles.infoWrapper}>
          <Text
            numberOfLines={1}
            style={[
              styles.dishTitle,
              {
                color: c.text,
                fontFamily: fonts.displaySemi,
              },
            ]}
          >
            {product.name}
          </Text>

          {product.description ? (
            <Text
              numberOfLines={1}
              style={[
                styles.dishDesc,
                {
                  color: c.textMuted,
                  fontFamily: fonts.body,
                },
              ]}
            >
              {product.description}
            </Text>
          ) : null}
        </View>

        {/* Price & Action Button */}
        <View style={styles.actionRow}>
          <View style={styles.priceContainer}>
            <MoneyText
              amount={product.price}
              size="xs"
              color={c.primary900}
            />
          </View>

          {isAvailable && !disabled ? (
            isSelected && onRemoveFromCart ? (
              <View
                style={[
                  styles.stepperCapsule,
                  {
                    backgroundColor: c.primary50,
                    borderColor: c.primary100,
                  },
                ]}
              >
                <TouchableOpacity
                  activeOpacity={0.65}
                  onPress={handleRemove}
                  style={styles.stepperBtn}
                  accessibilityLabel={`Diminuer ${product.name}`}
                >
                  <Minus size={11} color={c.primary700} strokeWidth={2.5} />
                </TouchableOpacity>

                <Text
                  style={[
                    styles.stepperValue,
                    {
                      color: c.primary900,
                      fontFamily: fonts.bodyBold,
                    },
                  ]}
                >
                  {quantityInCart}
                </Text>

                <TouchableOpacity
                  activeOpacity={0.65}
                  onPress={handleAdd}
                  style={[styles.stepperBtn, styles.stepperAddBtn, { backgroundColor: '#F97316' }]}
                  accessibilityLabel={`Augmenter ${product.name}`}
                >
                  <Plus size={11} color="#FFFFFF" strokeWidth={2.5} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleAdd}
                accessibilityRole="button"
                accessibilityLabel={`Ajouter ${product.name} au panier`}
                style={[
                  styles.roundAddBtn,
                  shadow[1],
                  {
                    backgroundColor: '#F97316',
                  },
                ]}
              >
                <Plus size={15} color="#FFFFFF" strokeWidth={2.8} />
              </TouchableOpacity>
            )
          ) : disabled ? (
            <View
              style={[
                styles.lockBtn,
                { backgroundColor: c.surfaceAlt },
              ]}
            >
              <Lock size={12} color={c.textFaint} />
            </View>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 10,
    overflow: 'hidden',
  },
  defaultWidth: {
    width: '48.2%',
    maxWidth: '48.2%',
  },
  photoWrapper: {
    width: '100%',
    height: 98,
    position: 'relative',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  grayscale: {
    opacity: 0.45,
  },
  placeholderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
  },
  placeholderText: {
    fontSize: 10,
    marginTop: 2,
    textAlign: 'center',
  },
  badgeOverlay: {
    position: 'absolute',
    top: 6,
    left: 6,
    right: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badgePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  cartPill: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9.5,
  },
  cardBody: {
    paddingHorizontal: 8,
    paddingTop: 6,
    paddingBottom: 8,
  },
  infoWrapper: {
    minHeight: 30,
    marginBottom: 4,
    justifyContent: 'flex-start',
  },
  dishTitle: {
    fontSize: 13,
    letterSpacing: -0.2,
    marginBottom: 1,
  },
  dishDesc: {
    fontSize: 10.5,
    lineHeight: 14,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  priceContainer: {
    flexShrink: 1,
  },
  roundAddBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 2,
    paddingVertical: 1,
  },
  stepperBtn: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperAddBtn: {
    marginLeft: 1,
  },
  stepperValue: {
    fontSize: 11,
    paddingHorizontal: 4,
    minWidth: 14,
    textAlign: 'center',
  },
  lockBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
