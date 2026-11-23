import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  TextInput,
  StyleSheet,
  Platform,
} from 'react-native';
import { X, Heart, Star, Plus, Minus, Utensils, ShoppingBag, Lock } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../theme/useTheme';
import { MoneyText } from './ui/MoneyText';
import type { Product } from '../types';

interface ProductDetailModalProps {
  product: Product | null;
  visible: boolean;
  onClose: () => void;
  onAddToCart: (product: Product, quantity: number, note?: string) => void;
  initialQuantity?: number;
  disabled?: boolean;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  visible,
  onClose,
  onAddToCart,
  initialQuantity = 1,
  disabled = false,
}) => {
  const { c, radius, fonts, shadow } = useTheme();
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    if (visible) {
      setQuantity(initialQuantity > 0 ? initialQuantity : 1);
      setNote('');
    }
  }, [visible, initialQuantity]);

  if (!product) return null;

  const imageUrl = product.imageUrl
    ? product.imageUrl.includes('res.cloudinary.com')
      ? product.imageUrl.replace('/upload/', '/upload/c_fill,ar_16:11,w_900,q_auto,f_auto/')
      : product.imageUrl
    : null;

  const totalAmount = product.price * quantity;

  const handleIncrement = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } catch {}
    setQuantity((q) => q + 1);
  };

  const handleDecrement = () => {
    if (quantity <= 1) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } catch {}
    setQuantity((q) => q - 1);
  };

  const handleToggleFavorite = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    } catch {}
    setIsFavorite(!isFavorite);
  };

  const handleAdd = () => {
    if (disabled || !product.available) return;
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch {}
    onAddToCart(product, quantity, note.trim() || undefined);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={[styles.overlay, { backgroundColor: c.overlay }]}>
        <View
          style={[
            styles.container,
            {
              backgroundColor: c.surface,
              borderTopLeftRadius: radius.xl,
              borderTopRightRadius: radius.xl,
            },
          ]}
        >
          {/* Top Hero Photo */}
          <View style={[styles.heroPhotoWrapper, { backgroundColor: c.surfaceAlt }]}>
            {imageUrl ? (
              <Image
                source={{ uri: imageUrl }}
                style={styles.heroPhoto}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Utensils size={48} color={c.textFaint} strokeWidth={1.5} />
              </View>
            )}

            {/* Floating Top Header Buttons */}
            <View style={styles.floatingHeader}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={onClose}
                style={[
                  styles.roundIconBtn,
                  shadow[1],
                  { backgroundColor: 'rgba(0,0,0,0.5)' },
                ]}
                accessibilityLabel="Fermer"
              >
                <X size={20} color="#FFFFFF" strokeWidth={2.5} />
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleToggleFavorite}
                style={[
                  styles.roundIconBtn,
                  shadow[1],
                  { backgroundColor: 'rgba(0,0,0,0.5)' },
                ]}
                accessibilityLabel="Ajouter aux favoris"
              >
                <Heart
                  size={20}
                  color={isFavorite ? '#EF4444' : '#FFFFFF'}
                  fill={isFavorite ? '#EF4444' : 'none'}
                  strokeWidth={2}
                />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView
            style={styles.contentScroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Title & Price Header */}
            <View style={styles.titleSection}>
              <View style={styles.titleRow}>
                <Text
                  style={[
                    styles.dishTitle,
                    { color: c.text, fontFamily: fonts.display },
                  ]}
                >
                  {product.name}
                </Text>
                <MoneyText amount={product.price} size="lg" color={c.primary700} />
              </View>

              {/* Rating & Popular badge */}
              <View style={styles.metaRow}>
                <View style={styles.ratingBadge}>
                  <Star size={14} color="#F59E0B" fill="#F59E0B" />
                  <Text style={[styles.ratingText, { color: c.text, fontFamily: fonts.bodyBold }]}>
                    4.9
                  </Text>
                  <Text style={[styles.reviewsCount, { color: c.textMuted, fontFamily: fonts.body }]}>
                    (120+ avis)
                  </Text>
                </View>

                {product.available ? (
                  <View style={[styles.badgePill, { backgroundColor: c.success100 }]}>
                    <Text style={[styles.badgeText, { color: c.success500, fontFamily: fonts.bodyBold }]}>
                      Disponible
                    </Text>
                  </View>
                ) : (
                  <View style={[styles.badgePill, { backgroundColor: c.danger100 }]}>
                    <Text style={[styles.badgeText, { color: c.danger500, fontFamily: fonts.bodyBold }]}>
                      Épuisé
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Description */}
            {product.description ? (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: c.text, fontFamily: fonts.bodyBold }]}>
                  Description
                </Text>
                <Text style={[styles.descriptionText, { color: c.textMuted, fontFamily: fonts.body }]}>
                  {product.description}
                </Text>
              </View>
            ) : null}

            {/* Special Instructions Note Input */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: c.text, fontFamily: fonts.bodyBold }]}>
                Instructions spéciales (optionnel)
              </Text>
              <TextInput
                style={[
                  styles.noteInput,
                  {
                    backgroundColor: c.surfaceAlt,
                    borderColor: c.border,
                    color: c.text,
                    fontFamily: fonts.body,
                    borderRadius: radius.md,
                  },
                ]}
                placeholder={disabled ? "Commande désactivée sur cette table" : "Ex : sans sauce, très chaud, bien cuit..."}
                placeholderTextColor={c.textFaint}
                value={note}
                onChangeText={setNote}
                editable={!disabled}
                maxLength={140}
                multiline
                numberOfLines={2}
              />
            </View>
          </ScrollView>

          {/* Sticky Bottom Actions Bar (like right screen in screenshot) */}
          <View
            style={[
              styles.bottomActionBar,
              shadow[2],
              {
                backgroundColor: c.surface,
                borderTopColor: c.border,
                borderTopWidth: 1,
              },
            ]}
          >
            {disabled ? (
              <View
                style={[
                  styles.disabledActionBar,
                  {
                    backgroundColor: c.surfaceAlt,
                    borderRadius: radius.full,
                    borderColor: c.border,
                    borderWidth: 1,
                  },
                ]}
              >
                <Lock size={16} color={c.textMuted} style={{ marginRight: 8 }} />
                <Text style={[styles.disabledActionText, { color: c.textMuted, fontFamily: fonts.bodyMedium }]}>
                  Table occupée • Commande désactivée
                </Text>
              </View>
            ) : (
              <>
                {/* Stepper capsule */}
                <View
                  style={[
                    styles.stepperContainer,
                    {
                      backgroundColor: c.surfaceAlt,
                      borderRadius: radius.full,
                      borderColor: c.border,
                    },
                  ]}
                >
                  <TouchableOpacity
                    onPress={handleDecrement}
                    disabled={quantity <= 1}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={[styles.stepperBtn, quantity <= 1 && styles.stepperBtnDisabled]}
                    accessibilityLabel="Diminuer la quantité"
                  >
                    <Minus size={18} color={quantity <= 1 ? c.textFaint : c.text} strokeWidth={2.5} />
                  </TouchableOpacity>

                  <Text style={[styles.stepperValue, { color: c.text, fontFamily: fonts.bodyBold }]}>
                    {quantity}
                  </Text>

                  <TouchableOpacity
                    onPress={handleIncrement}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={styles.stepperBtn}
                    accessibilityLabel="Augmenter la quantité"
                  >
                    <Plus size={18} color={c.text} strokeWidth={2.5} />
                  </TouchableOpacity>
                </View>

                {/* Glowing Accent Add to Cart Button */}
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={handleAdd}
                  disabled={!product.available}
                  style={[
                    styles.addCartBtn,
                    shadow[2],
                    {
                      backgroundColor: product.available ? c.primary700 : c.surfaceAlt,
                      borderRadius: radius.full,
                    },
                  ]}
                >
                  <ShoppingBag size={18} color={product.available ? '#FFFFFF' : c.textFaint} style={{ marginRight: 8 }} />
                  <Text
                    style={[
                      styles.addCartBtnText,
                      {
                        color: product.available ? '#FFFFFF' : c.textFaint,
                        fontFamily: fonts.bodyBold,
                      },
                    ]}
                  >
                    Ajouter • {totalAmount.toFixed(3)} TND
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  container: {
    maxHeight: '90%',
    width: '100%',
    overflow: 'hidden',
  },
  heroPhotoWrapper: {
    width: '100%',
    height: 240,
    position: 'relative',
  },
  heroPhoto: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingHeader: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 16 : 14,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  roundIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentScroll: {
    flexGrow: 0,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 24,
  },
  titleSection: {
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  dishTitle: {
    fontSize: 22,
    flex: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 14,
  },
  reviewsCount: {
    fontSize: 13,
  },
  badgePill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 12,
  },
  section: {
    marginTop: 14,
  },
  sectionTitle: {
    fontSize: 14.5,
    marginBottom: 6,
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 20,
  },
  noteInput: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13.5,
    textAlignVertical: 'top',
    minHeight: 60,
  },
  bottomActionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    gap: 14,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  stepperBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnDisabled: {
    opacity: 0.35,
  },
  stepperValue: {
    fontSize: 16,
    paddingHorizontal: 8,
    minWidth: 24,
    textAlign: 'center',
  },
  addCartBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    paddingHorizontal: 16,
  },
  addCartBtnText: {
    fontSize: 15,
  },
  disabledActionBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    paddingHorizontal: 16,
  },
  disabledActionText: {
    fontSize: 14,
  },
});
