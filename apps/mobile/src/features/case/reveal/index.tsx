import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { CaseSlotProps } from '../slots';
import { COLORS, SPACING, TYPOGRAPHY } from '../../../theme/tokens';

export default function RevealSlot({ sessionId }: CaseSlotProps) {
  return (
    <View style={styles.container} testID="case.reveal.placeholder">
      <Text style={styles.badge} allowFontScaling>
        SLOT // REVEAL (WP-13)
      </Text>
      <Text style={styles.title} allowFontScaling>
        Case Reveal &amp; Truth
      </Text>
      <Text style={styles.caption} allowFontScaling>
        Session ID: {sessionId}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: SPACING.md,
    gap: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  badge: {
    ...TYPOGRAPHY.caption,
    color: COLORS.accent,
    fontWeight: '700',
  },
  title: {
    ...TYPOGRAPHY.h2,
    color: COLORS.text,
  },
  caption: {
    ...TYPOGRAPHY.monospace,
    color: COLORS.muted,
  },
});
