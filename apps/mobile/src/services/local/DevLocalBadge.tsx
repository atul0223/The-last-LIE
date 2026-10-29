import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS, TYPOGRAPHY } from '../../theme/tokens';
import { isLocalServiceActive } from '../config';

export function DevLocalBadge() {
  if (!isLocalServiceActive()) {
    return null;
  }

  return (
    <View style={styles.badge} testID="dev-local-badge">
      <View style={styles.dot} />
      <Text style={styles.text} allowFontScaling>
        DEV · LOCAL
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(229, 169, 59, 0.15)',
    borderColor: COLORS.accent,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.accent,
  },
  text: {
    ...TYPOGRAPHY.caption,
    color: COLORS.accent,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
});
