import React from 'react';
import { Text, TextStyle, StyleProp, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/useTheme';
import { formatMoney } from '../../utils/formatMoney';

interface MoneyTextProps {
  amount: number | undefined | null;
  size?: 'sm' | 'md' | 'lg' | 'display';
  color?: string;
  style?: StyleProp<TextStyle>;
}

export const MoneyText: React.FC<MoneyTextProps> = ({
  amount,
  size = 'md',
  color,
  style,
}) => {
  const { c, fonts } = useTheme();

  const getFontSize = () => {
    switch (size) {
      case 'sm':
        return 14;
      case 'lg':
        return 22;
      case 'display':
        return 28;
      case 'md':
      default:
        return 18;
    }
  };

  return (
    <Text
      style={[
        styles.text,
        {
          fontSize: getFontSize(),
          color: color || c.text,
          fontFamily: fonts.bodyBold,
        },
        style,
      ]}
    >
      {formatMoney(amount)}
    </Text>
  );
};

const styles = StyleSheet.create({
  text: {
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
  },
});
