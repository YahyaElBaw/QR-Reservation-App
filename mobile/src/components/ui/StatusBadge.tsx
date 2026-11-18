import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CheckCircle2, Users, Receipt, Banknote, Lock, AlertCircle } from 'lucide-react-native';
import { useTheme } from '../../theme/useTheme';
import { tableStatusUI, ticketStatusUI, Tone } from '../../theme/statusMap';
import type { TableStatus, TicketStatus } from '../../types';

interface StatusBadgeProps {
  status: TableStatus | TicketStatus | string;
  type?: 'table' | 'ticket';
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  type = 'ticket',
  size = 'md',
}) => {
  const { c, radius, fonts } = useTheme();

  let label = status;
  let tone: Tone = 'neutral';
  let iconName = 'receipt';

  if (type === 'table') {
    const tableInfo = tableStatusUI[status as TableStatus];
    if (tableInfo) {
      label = tableInfo.label;
      tone = tableInfo.tone;
      iconName = tableInfo.icon;
    }
  } else {
    const ticketInfo = ticketStatusUI[status as TicketStatus];
    if (ticketInfo) {
      label = ticketInfo.label;
      tone = ticketInfo.tone;
      iconName = ticketInfo.icon;
    }
  }

  const getToneStyle = () => {
    switch (tone) {
      case 'success':
        return { bg: c.success100, text: c.success500, iconColor: c.success500 };
      case 'warning':
        return { bg: c.warning100, text: c.warning500, iconColor: c.warning500 };
      case 'info':
        return { bg: c.info100, text: c.info500, iconColor: c.info500 };
      case 'accent':
        return { bg: c.accent100, text: c.onAccent, iconColor: c.onAccent };
      case 'danger':
        return { bg: c.danger100, text: c.danger500, iconColor: c.danger500 };
      case 'neutral':
      default:
        return { bg: c.surfaceAlt, text: c.textMuted, iconColor: c.textMuted };
    }
  };

  const colorsConfig = getToneStyle();
  const iconSize = size === 'sm' ? 14 : 16;
  const fontSize = size === 'sm' ? 11 : 13;

  const renderIcon = () => {
    switch (iconName) {
      case 'circle-check':
        return <CheckCircle2 size={iconSize} color={colorsConfig.iconColor} strokeWidth={2} />;
      case 'users':
        return <Users size={iconSize} color={colorsConfig.iconColor} strokeWidth={2} />;
      case 'receipt':
        return <Receipt size={iconSize} color={colorsConfig.iconColor} strokeWidth={2} />;
      case 'banknote':
        return <Banknote size={iconSize} color={colorsConfig.iconColor} strokeWidth={2} />;
      case 'lock':
        return <Lock size={iconSize} color={colorsConfig.iconColor} strokeWidth={2} />;
      default:
        return <AlertCircle size={iconSize} color={colorsConfig.iconColor} strokeWidth={2} />;
    }
  };

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: colorsConfig.bg,
          borderRadius: radius.full,
          paddingVertical: size === 'sm' ? 4 : 6,
          paddingHorizontal: size === 'sm' ? 8 : 12,
        },
      ]}
    >
      <View style={styles.iconContainer}>{renderIcon()}</View>
      <Text
        style={[
          styles.text,
          {
            color: colorsConfig.text,
            fontSize,
            fontFamily: fonts.bodyMedium,
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  iconContainer: {
    marginRight: 6,
  },
  text: {
    fontWeight: '600',
    textTransform: 'capitalize',
  },
});
