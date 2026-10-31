import React, { useState } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY } from '../../theme/tokens';

export interface UpgradeModalProps {
  visible: boolean;
  onClose: () => void;
  onSendOtp: (email: string) => Promise<string>;
  onVerifyOtp: (email: string, token: string) => Promise<void>;
}

export function UpgradeModal({ visible, onClose, onSendOtp, onVerifyOtp }: UpgradeModalProps) {
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const resetForm = () => {
    setStep('email');
    setEmail('');
    setToken('');
    setError(null);
    setInfoMessage(null);
    setLoading(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSendEmail = async () => {
    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Please provide a valid email address.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const msg = await onSendOtp(trimmed);
      setInfoMessage(msg);
      setStep('otp');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    const trimmedToken = token.trim();
    if (!trimmedToken) {
      setError('Please enter the verification code.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await onVerifyOtp(email.trim(), trimmedToken);
      handleClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
      testID="auth.upgrade.modal"
    >
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <Text style={styles.title} allowFontScaling>
            {step === 'email' ? 'UPGRADE DOSSIER' : 'ENTER VERIFICATION CODE'}
          </Text>
          <Text style={styles.description} allowFontScaling>
            {step === 'email'
              ? 'Link your anonymous detective credentials to a permanent email. Your case progress, XP, and rank will be preserved.'
              : `We sent a one-time verification token to ${email.trim()}.`}
          </Text>

          {error && (
            <View style={styles.errorBanner} testID="auth.upgrade.error">
              <Text style={styles.errorText} allowFontScaling>
                {error}
              </Text>
            </View>
          )}

          {infoMessage && step === 'otp' && (
            <View style={styles.infoBanner}>
              <Text style={styles.infoText} allowFontScaling>
                {infoMessage}
              </Text>
            </View>
          )}

          {step === 'email' ? (
            <View style={styles.inputGroup}>
              <Text style={styles.label} allowFontScaling>
                Bureau Contact Email
              </Text>
              <TextInput
                style={styles.input}
                placeholder="agent@vesper.org"
                placeholderTextColor={COLORS.muted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                accessibilityLabel="Email input for account upgrade"
                testID="auth.email.input"
              />
              <TouchableOpacity
                style={[styles.button, styles.primaryButton, loading && styles.disabledButton]}
                onPress={handleSendEmail}
                disabled={loading}
                accessibilityRole="button"
                accessibilityLabel="Send verification code"
                testID="auth.email.submit"
              >
                {loading ? (
                  <ActivityIndicator color={COLORS.bg} size="small" />
                ) : (
                  <Text style={styles.primaryButtonText} allowFontScaling>
                    SEND VERIFICATION CODE
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.inputGroup}>
              <Text style={styles.label} allowFontScaling>
                6-Digit Security Token
              </Text>
              <TextInput
                style={styles.input}
                placeholder="123456"
                placeholderTextColor={COLORS.muted}
                value={token}
                onChangeText={setToken}
                keyboardType="number-pad"
                maxLength={8}
                autoCapitalize="none"
                accessibilityLabel="Verification token input"
                testID="auth.otp.input"
              />
              <TouchableOpacity
                style={[styles.button, styles.primaryButton, loading && styles.disabledButton]}
                onPress={handleVerifyOtp}
                disabled={loading}
                accessibilityRole="button"
                accessibilityLabel="Verify token and link account"
                testID="auth.otp.submit"
              >
                {loading ? (
                  <ActivityIndicator color={COLORS.bg} size="small" />
                ) : (
                  <Text style={styles.primaryButtonText} allowFontScaling>
                    CONFIRM &amp; LINK ACCOUNT
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleClose}
            accessibilityRole="button"
            accessibilityLabel="Close upgrade window"
            testID="auth.upgrade.close"
          >
            <Text style={styles.cancelButtonText} allowFontScaling>
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 5, 8, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.md,
  },
  dialog: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: COLORS.surface,
    borderColor: COLORS.surfaceBorder,
    borderWidth: 1,
    borderRadius: 8,
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  title: {
    ...TYPOGRAPHY.h2,
    color: COLORS.accent,
    letterSpacing: 0.8,
  },
  description: {
    ...TYPOGRAPHY.body,
    color: COLORS.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  inputGroup: {
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  label: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text,
    fontWeight: '600',
  },
  input: {
    backgroundColor: COLORS.surfaceElevated,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 10,
    color: COLORS.text,
    fontSize: 15,
  },
  button: {
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: COLORS.accent,
  },
  primaryButtonText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.bg,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  disabledButton: {
    opacity: 0.6,
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: SPACING.xs,
  },
  cancelButtonText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.muted,
  },
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: COLORS.danger,
    borderWidth: 1,
    borderRadius: 4,
    padding: SPACING.sm,
  },
  errorText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.danger,
  },
  infoBanner: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderColor: 'rgba(59, 130, 246, 0.4)',
    borderWidth: 1,
    borderRadius: 4,
    padding: SPACING.sm,
  },
  infoText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text,
  },
});
