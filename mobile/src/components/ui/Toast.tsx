import React, { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet, View } from 'react-native';
import { CheckCircle2, AlertTriangle, AlertCircle, Info } from 'lucide-react-native';
import { useTheme } from '../../theme/useTheme';

export type ToastType = 'success' | 'warning' | 'danger' | 'info';

interface ToastProps {
  visible: boolean;
  message: string;
  type?: ToastType;
  onDismiss: () => void;
  duration?: number;
}

export const Toast: React.FC<ToastProps> = ({
  visible,
  message,
  type = 'info',
  onDismiss,
  duration = 4000,
}) => {
  const { c, radius, fonts, shadow } = useTheme();
  const translateY = useRef(new Animated.Value(100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();

      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: 100,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start(() => onDismiss());
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible, duration, onDismiss, opacity, translateY]);

  if (!visible) return null;

  const getTypeConfig = () => {
    switch (type) {
      case 'success':
        return {
          bg: c.surface,
          border: c.success500,
          textColor: c.text,
          icon: <CheckCircle2 size={18} color={c.success500} />,
        };
      case 'warning':
        return {
          bg: c.surface,
          border: c.warning500,
          textColor: c.text,
          icon: <AlertTriangle size={18} color={c.warning500} />,
        };
      case 'danger':
        return {
          bg: c.surface,
          border: c.danger500,
          textColor: c.text,
          icon: <AlertCircle size={18} color={c.danger500} />,
        };
      case 'info':
      default:
        return {
          bg: c.surface,
          border: c.primary500,
          textColor: c.text,
          icon: <Info size={18} color={c.primary500} />,
        };
    }
  };

  const config = getTypeConfig();

  return (
    <Animated.View
      style={[
        styles.container,
        shadow[2],
        {
          borderRadius: radius.md,
          backgroundColor: config.bg,
          borderLeftColor: config.border,
          borderLeftWidth: 4,
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      <View style={styles.iconContainer}>{config.icon}</View>
      <Text
        style={[
          styles.text,
          {
            color: config.textColor,
            fontFamily: fonts.bodyMedium,
          },
        ]}
        numberOfLines={2}
      >
        {message}
      </Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    zIndex: 9999,
  },
  iconContainer: {
    marginRight: 10,
  },
  text: {
    fontSize: 14,
    flex: 1,
  },
});
