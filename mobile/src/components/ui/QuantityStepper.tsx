import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Minus, Plus, Trash2 } from 'lucide-react-native';
import { useTheme } from '../../theme/useTheme';

interface QuantityStepperProps {
  quantity: number;
  onIncrement: () => void;
  onDecrement: () => void;
  min?: number;
  max?: number;
  showTrashOnMin?: boolean;
}

export const QuantityStepper: React.FC<QuantityStepperProps> = ({
  quantity,
  onIncrement,
  onDecrement,
  min = 0,
  max = 99,
  showTrashOnMin = false,
}) => {
  const { c, radius, fonts } = useTheme();

  const isMin = quantity <= min;
  const isMax = quantity >= max;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: c.surfaceAlt,
          borderRadius: radius.full,
          borderColor: c.border,
          borderWidth: 1,
        },
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onDecrement}
        disabled={isMin && !showTrashOnMin}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityRole="button"
        accessibilityLabel="Diminuer la quantité"
        style={styles.button}
      >
        {isMin && showTrashOnMin ? (
          <Trash2 size={16} color={c.danger500} strokeWidth={2} />
        ) : (
          <Minus size={16} color={isMin ? c.textFaint : c.text} strokeWidth={2.2} />
        )}
      </TouchableOpacity>

      <Text
        style={[
          styles.quantity,
          {
            color: c.text,
            fontFamily: fonts.bodyBold,
          },
        ]}
      >
        {quantity}
      </Text>

      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onIncrement}
        disabled={isMax}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityRole="button"
        accessibilityLabel="Augmenter la quantité"
        style={styles.button}
      >
        <Plus size={16} color={isMax ? c.textFaint : c.text} strokeWidth={2.2} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 2,
    height: 40,
  },
  button: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantity: {
    minWidth: 28,
    textAlign: 'center',
    fontSize: 15,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
  },
});
