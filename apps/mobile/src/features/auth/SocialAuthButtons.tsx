import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY } from '../../theme/tokens';
import { socialAuthEnabled } from '../../lib/supabase';

export interface SocialAuthButtonsProps {
  onApplePress?: () => void;
  onGooglePress?: () => void;
}

export function SocialAuthButtons({ onApplePress, onGooglePress }: SocialAuthButtonsProps) {
  const flags = socialAuthEnabled();

  if (!flags.apple && !flags.google) {
    return null;
  }

  return (
    <View style={styles.container} testID="auth.social.container">
      <View style={styles.dividerRow}>
        <View style={styles.divider} />
        <Text style={styles.dividerText} allowFontScaling>
          OR CONNECT WITH
        </Text>
        <View style={styles.divider} />
      </View>

      <View style={styles.buttonRow}>
        {flags.apple && (
          <TouchableOpacity
            style={[styles.socialButton, styles.appleButton]}
            onPress={onApplePress}
            accessibilityRole="button"
            accessibilityLabel="Sign in with Apple"
            testID="auth.social.apple"
          >
            <Text style={styles.appleButtonText} allowFontScaling>
              Sign in with Apple
            </Text>
          </TouchableOpacity>
        )}

        {flags.google && (
          <TouchableOpacity
            style={[styles.socialButton, styles.googleButton]}
            onPress={onGooglePress}
            accessibilityRole="button"
            accessibilityLabel="Sign in with Google"
            testID="auth.social.google"
          >
            <Text style={styles.googleButtonText} allowFontScaling>
              Sign in with Google
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: SPACING.md,
    marginTop: SPACING.sm,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.surfaceBorder,
  },
  dividerText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.muted,
    fontSize: 10,
    letterSpacing: 0.8,
  },
  buttonRow: {
    gap: SPACING.sm,
  },
  socialButton: {
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  appleButton: {
    backgroundColor: '#000000',
    borderColor: '#333333',
  },
  appleButtonText: {
    ...TYPOGRAPHY.caption,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  googleButton: {
    backgroundColor: COLORS.surfaceElevated,
    borderColor: COLORS.surfaceBorder,
  },
  googleButtonText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text,
    fontWeight: '700',
  },
});
