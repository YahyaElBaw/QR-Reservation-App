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
  variant?: 'box' | 'gridBox';
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onAddToCart,
  onRemoveFromCart,
  onPressCard,
  quantityInCart = 0,
  disabled = false,
  variant = 'gridBox',
}) => {
  const { c, radius, fonts, shadow } = useTheme();

  // Cloudinary transform or original
  const imageUrl = product.imageUrl
    ? product.imageUrl.includes('res.cloudinary.com')
      ? product.imageUrl.replace('/upload/', '/upload/c_fill,ar_4:3,w_600,q_auto,f_auto/')
      : product.imageUrl
    : null;

  const isAvailable = product.available;
  const isSelected = quantityInCart > 0;
  const isGrid = variant === 'gridBox';

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

  return (
    <TouchableOpacity
      activeOpacity={onPressCard ? 0.92 : 1}
      onPress={handleCardPress}
      style={[
        styles.boxCard,
        shadow[1],
        {
          backgroundColor: c.surface,
          borderColor: isSelected ? c.primary500 : c.border,
          borderWidth: isSelected ? 1.5 : 1,
          borderRadius: radius.xl,
          opacity: isAvailable ? 1 : 0.65,
        },
        isGrid && styles.gridCard,
      ]}
    >
      {/* 1. Large Food Photo on Top of the Box */}
      <View
        style={[
          styles.photoContainer,
          {
            height: isGrid ? 122 : 175,
            backgroundColor: c.surfaceAlt,
            borderTopLeftRadius: radius.xl - 1,
            borderTopRightRadius: radius.xl - 1,
          },
        ]}
      >
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={[
              styles.photo,
              !isAvailable && styles.grayscale,
            ]}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.placeholderContainer}>
            <Utensils size={isGrid ? 28 : 40} color={c.textFaint} strokeWidth={1.5} />
            <Text
              numberOfLines={1}
              style={[styles.placeholderText, { color: c.textFaint, fontFamily: fonts.body }]}
            >
              {product.name}
            </Text>
          </View>
        )}

        {/* Top Badges: Out of stock ribbon or Cart indicator */}
        <View style={styles.photoOverlayBadges}>
          {!isAvailable && (
            <View style={[styles.outOfStockPill, { backgroundColor: c.danger500, borderRadius: radius.sm }]}>
              <Text style={[styles.outOfStockText, { fontFamily: fonts.bodyBold }]}>
                Épuisé
              </Text>
            </View>
          )}

          {isSelected && (
            <View
              style={[
                styles.cartQtyPill,
                shadow[1],
                {
                  backgroundColor: c.primary700,
                  borderRadius: radius.full,
                },
              ]}
            >
              <Check size={11} color="#FFFFFF" strokeWidth={3} style={{ marginRight: 2 }} />
              <Text style={[styles.cartQtyPillText, { fontFamily: fonts.bodyBold }]}>
                {quantityInCart} {isGrid ? '' : 'au panier'}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* 2. Box Content: Dish Name, Description, and Actions */}
      <View style={[styles.boxBody, isGrid && styles.gridBody]}>
        {/* Name and Description */}
        <View style={styles.textContainer}>
          <Text
            numberOfLines={2}
            style={[
              styles.dishName,
              {
                color: c.text,
                fontFamily: fonts.display,
                fontSize: isGrid ? 14 : 17,
              },
            ]}
          >
            {product.name}
          </Text>

          {product.description ? (
            <Text
              numberOfLines={isGrid ? 1 : 2}
              style={[
                styles.dishDescription,
                {
                  color: c.textMuted,
                  fontFamily: fonts.body,
                  fontSize: isGrid ? 11.5 : 13,
                  lineHeight: isGrid ? 16 : 18.5,
                },
              ]}
            >
              {product.description}
            </Text>
          ) : null}
        </View>

        {/* Bottom Row: Price + Modern Tactile Stepper / Button */}
        <View style={[styles.bottomRow, isGrid && styles.gridBottomRow]}>
          <View style={styles.priceContainer}>
            <MoneyText
              amount={product.price}
              size={isGrid ? 'sm' : 'md'}
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
                    borderRadius: radius.full,
                  },
                ]}
              >
                <TouchableOpacity
                  activeOpacity={0.65}
                  onPress={handleRemove}
                  style={styles.stepperActionBtn}
                  accessibilityLabel={`Diminuer ${product.name}`}
                >
                  <Minus size={isGrid ? 12 : 14} color={c.primary700} strokeWidth={2.5} />
                </TouchableOpacity>

                <Text
                  style={[
                    styles.stepperNumber,
                    {
                      color: c.primary900,
                      fontFamily: fonts.bodyBold,
                      fontSize: isGrid ? 12 : 14,
                    },
                  ]}
                >
                  {quantityInCart}
                </Text>

                <TouchableOpacity
                  activeOpacity={0.65}
                  onPress={handleAdd}
                  style={[styles.stepperActionBtn, styles.stepperAddBtn, { backgroundColor: c.primary500 }]}
                  accessibilityLabel={`Augmenter ${product.name}`}
                >
                  <Plus size={isGrid ? 12 : 14} color="#FFFFFF" strokeWidth={2.5} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleAdd}
                accessibilityRole="button"
                accessibilityLabel={`Ajouter ${product.name} au panier`}
                style={[
                  styles.addPillBtn,
                  shadow[1],
                  {
                    backgroundColor: c.primary500,
                    borderRadius: radius.full,
                  },
                ]}
              >
                <Plus size={isGrid ? 15 : 17} color={c.onPrimary} strokeWidth={2.5} />
                {!isGrid && (
                  <Text style={[styles.addBtnLabel, { color: c.onPrimary, fontFamily: fonts.bodyBold }]}>
                    Ajouter
                  </Text>
                )}
              </TouchableOpacity>
            )
          ) : disabled ? (
            <View
              style={[
                styles.disabledAction,
                { backgroundColor: c.surfaceAlt, borderRadius: radius.full },
              ]}
            >
              <Lock size={14} color={c.textFaint} />
            </View>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  boxCard: {
    marginBottom: 16,
    overflow: 'hidden',
  },
  gridCard: {
    flex: 1,
    marginHorizontal: 5,
    marginBottom: 12,
  },
  photoContainer: {
    width: '100%',
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
    padding: 12,
  },
  placeholderText: {
    fontSize: 11,
    marginTop: 4,
    textAlign: 'center',
  },
  photoOverlayBadges: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  outOfStockPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  outOfStockText: {
    color: '#FFFFFF',
    fontSize: 10.5,
    textTransform: 'uppercase',
  },
  cartQtyPill: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  cartQtyPillText: {
    color: '#FFFFFF',
    fontSize: 11,
  },
  boxBody: {
    padding: 14,
  },
  gridBody: {
    padding: 10,
    paddingTop: 8,
  },
  textContainer: {
    marginBottom: 8,
    minHeight: 46,
    justifyContent: 'flex-start',
  },
  dishName: {
    marginBottom: 2,
    letterSpacing: -0.2,
  },
  dishDescription: {
    marginTop: 1,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  gridBottomRow: {
    marginTop: 2,
  },
  priceContainer: {
    flexShrink: 1,
  },
  stepperCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 3,
    paddingVertical: 2,
  },
  stepperActionBtn: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  stepperAddBtn: {
    marginLeft: 2,
  },
  stepperNumber: {
    paddingHorizontal: 6,
    minWidth: 18,
    textAlign: 'center',
  },
  addPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    minWidth: 32,
    minHeight: 32,
  },
  addBtnLabel: {
    fontSize: 13,
    marginLeft: 4,
  },
  disabledAction: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
