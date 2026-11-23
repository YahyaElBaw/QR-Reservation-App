import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Inbox } from 'lucide-react-native';
import { useTheme } from '../../theme/useTheme';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}) => {
  const { c, fonts } = useTheme();

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        {icon || <Inbox size={36} color={c.textFaint} strokeWidth={1.75} />}
      </View>
      <Text style={[styles.title, { color: c.text, fontFamily: fonts.displaySemi }]}>
        {title}
      </Text>
      {description && (
        <Text style={[styles.description, { color: c.textMuted, fontFamily: fonts.body }]}>
          {description}
        </Text>
      )}
      {actionLabel && onAction && (
        <View style={styles.action}>
          <Button title={actionLabel} onPress={onAction} variant="secondary" size="sm" />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginBottom: 16,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 6,
  },
  description: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
    maxWidth: 280,
  },
  action: {
    marginTop: 8,
  },
});
