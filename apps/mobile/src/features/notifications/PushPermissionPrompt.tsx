import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY } from '../../theme/tokens';

export interface PushPermissionPromptProps {
  onEnable: () => Promise<boolean>;
  onDismiss: () => Promise<void>;
}

export function PushPermissionPrompt({
  onEnable,
  onDismiss,
}: PushPermissionPromptProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleEnable = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onEnable();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDismiss = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onDismiss();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.overlay} testID="push.prompt.modal">
      <View style={styles.card}>
        {/* Header Category */}
        <View style={styles.categoryRow}>
          <Text style={styles.categoryBadge} allowFontScaling>
            CLASSIFIED DISPATCH SERVICE
          </Text>
          <Text style={styles.optInNotice} allowFontScaling>
            OPT-IN ONLY
          </Text>
        </View>

        {/* Title & Body */}
        <Text style={styles.title} allowFontScaling>
          ENABLE DAILY MYSTERY DISPATCHES?
        </Text>

        <Text style={styles.body} allowFontScaling>
          You have closed 2 investigations. Receive a confidential reminder at 09:00
          local time when today’s bureau case is decrypted.
        </Text>

        {/* Features / Guarantees */}
        <View style={styles.featureList}>
          <View style={styles.featureItem}>
            <Text style={styles.featureBullet} allowFontScaling>
              ✓
            </Text>
            <Text style={styles.featureText} allowFontScaling>
              Zero Spoilers: alerts never disclose clues, culprits, or evidence
            </Text>
          </View>

          <View style={styles.featureItem}>
            <Text style={styles.featureBullet} allowFontScaling>
              ✓
            </Text>
            <Text style={styles.featureText} allowFontScaling>
              Streak Protection: timely dispatches help maintain solve momentum
            </Text>
          </View>

          <View style={styles.featureItem}>
            <Text style={styles.featureBullet} allowFontScaling>
              ✓
            </Text>
            <Text style={styles.featureText} allowFontScaling>
              One-Tap Opt-Out: easily disable alerts anytime in your Dossier
            </Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.enableButton, isSubmitting && styles.buttonDisabled]}
            onPress={handleEnable}
            disabled={isSubmitting}
            accessibilityRole="button"
            accessibilityLabel="Enable daily dispatch notifications"
            testID="push.prompt.enable"
          >
            {isSubmitting ? (
              <ActivityIndicator color={COLORS.bg} size="small" />
            ) : (
              <Text style={styles.enableButtonText} allowFontScaling>
                ENABLE DISPATCH ALERTS
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.dismissButton}
            onPress={handleDismiss}
            disabled={isSubmitting}
            accessibilityRole="button"
            accessibilityLabel="Dismiss dispatch notifications for now"
            testID="push.prompt.dismiss"
          >
            <Text style={styles.dismissButtonText} allowFontScaling>
              NOT NOW
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.md,
    zIndex: 1000,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.accent,
    borderWidth: 1,
    borderRadius: 8,
    padding: SPACING.lg,
    width: '100%',
    maxWidth: 420,
    gap: SPACING.sm,
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryBadge: {
    ...TYPOGRAPHY.caption,
    color: COLORS.accent,
    fontWeight: '700',
    letterSpacing: 0.8,
    fontSize: 10,
  },
  optInNotice: {
    ...TYPOGRAPHY.monospace,
    color: COLORS.muted,
    fontSize: 9,
  },
  title: {
    ...TYPOGRAPHY.h2,
    color: COLORS.text,
    fontSize: 18,
    marginTop: 2,
  },
  body: {
    ...TYPOGRAPHY.body,
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  featureList: {
    backgroundColor: COLORS.surfaceElevated,
    padding: SPACING.sm,
    borderRadius: 6,
    gap: SPACING.xs,
    marginVertical: SPACING.xs,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.xs,
  },
  featureBullet: {
    color: COLORS.accent,
    fontWeight: '700',
    fontSize: 12,
  },
  featureText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text,
    fontSize: 11,
    flex: 1,
  },
  actionRow: {
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  enableButton: {
    backgroundColor: COLORS.accent,
    paddingVertical: SPACING.md,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  enableButtonText: {
    ...TYPOGRAPHY.body,
    color: COLORS.bg,
    fontWeight: '700',
    fontSize: 13,
    letterSpacing: 0.8,
  },
  dismissButton: {
    paddingVertical: SPACING.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismissButtonText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.muted,
    fontSize: 12,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
