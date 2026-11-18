import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
  StyleProp,
} from 'react-native';
import { useTheme } from '../../theme/useTheme';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'highlight';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  onPress: () => void;
  title: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
}

export const Button: React.FC<ButtonProps> = ({
  onPress,
  title,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  style,
  textStyle,
  accessibilityLabel,
}) => {
  const { c, radius, fonts } = useTheme();

  const getVariantStyles = (): { container: ViewStyle; text: TextStyle; spinnerColor: string } => {
    if (disabled) {
      return {
        container: {
          backgroundColor: c.surfaceAlt,
          borderColor: c.border,
          borderWidth: 1,
        },
        text: { color: c.textFaint },
        spinnerColor: c.textFaint,
      };
    }

    switch (variant) {
      case 'primary':
        return {
          container: { backgroundColor: c.primary500 },
          text: { color: c.onPrimary },
          spinnerColor: c.onPrimary,
        };
      case 'secondary':
        return {
          container: {
            backgroundColor: c.primary50,
            borderColor: c.primary100,
            borderWidth: 1,
          },
          text: { color: c.primary700 },
          spinnerColor: c.primary700,
        };
      case 'highlight':
        return {
          container: { backgroundColor: c.accent500 },
          text: { color: c.onAccent },
          spinnerColor: c.onAccent,
        };
      case 'danger':
        return {
          container: { backgroundColor: c.danger500 },
          text: { color: '#FFFFFF' },
          spinnerColor: '#FFFFFF',
        };
      case 'ghost':
        return {
          container: { backgroundColor: 'transparent' },
          text: { color: c.primary600 },
          spinnerColor: c.primary600,
        };
    }
  };

  const getSizeStyles = (): { height: number; paddingHorizontal: number; fontSize: number } => {
    switch (size) {
      case 'sm':
        return { height: 36, paddingHorizontal: 12, fontSize: 13 };
      case 'lg':
        return { height: 56, paddingHorizontal: 24, fontSize: 17 };
      case 'md':
      default:
        return { height: 48, paddingHorizontal: 18, fontSize: 15 };
    }
  };

  const vStyles = getVariantStyles();
  const sStyles = getSizeStyles();

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      style={[
        styles.base,
        {
          borderRadius: radius.md,
          height: sStyles.height,
          paddingHorizontal: sStyles.paddingHorizontal,
          minHeight: 48, // ensure min touch target
        },
        vStyles.container,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={vStyles.spinnerColor} />
      ) : (
        <>
          {icon && <>{icon}</>}
          <Text
            style={[
              styles.text,
              {
                fontSize: sStyles.fontSize,
                fontFamily: fonts.bodyBold,
                marginLeft: icon ? 8 : 0,
              },
              vStyles.text,
              textStyle,
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: '700',
    textAlign: 'center',
  },
});
