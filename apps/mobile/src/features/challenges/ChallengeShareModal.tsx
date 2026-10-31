import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  ScrollView,
  Share,
} from 'react-native';
import { ResultCard } from './ResultCard';
import { COLORS, SPACING, TYPOGRAPHY } from '../../theme/tokens';
import { formatChallengeUrl } from './codeFormat';

export interface ChallengeShareContentProps {
  onClose?: () => void;
  challengeCode: string;
  caseTitle: string;
  score: number;
  xpEarned?: number;
  detectiveHandle?: string;
  rankTitle?: string;
}

export interface ChallengeShareModalProps extends ChallengeShareContentProps {
  visible: boolean;
  onClose: () => void;
}

export function ChallengeShareContent({
  onClose,
  challengeCode,
  caseTitle,
  score,
  xpEarned,
  detectiveHandle = 'Field Operative',
  rankTitle = 'Investigator',
}: ChallengeShareContentProps) {
  const [copied, setCopied] = useState(false);
  const challengeUrl = formatChallengeUrl(challengeCode);

  const handleShare = useCallback(async () => {
    try {
      await Share.share({
        title: `The Last Lie: ${caseTitle}`,
        message: `I resolved "${caseTitle}" with ${score} PTS. Can you beat my deduction? Play now without an account: ${challengeUrl}`,
        url: challengeUrl,
      });
    } catch {
      // Ignored if user dismissed share sheet
    }
  }, [caseTitle, score, challengeUrl]);

  const handleCopy = useCallback(() => {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(challengeUrl).catch(() => {});
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }, [challengeUrl]);

  return (
    <View style={styles.sheetContainer} testID="challenge.share.content">
      {/* Header */}
      <View style={styles.sheetHeader}>
        <Text style={styles.sheetTitle} allowFontScaling>
          CHALLENGE A FRIEND
        </Text>
        {onClose && (
          <TouchableOpacity
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close share dialog"
            testID="challenge.share.close_button"
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.closeText} allowFontScaling>
              ✕
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.scrollContent} contentContainerStyle={styles.scrollInner}>
        <Text style={styles.instructionsText} allowFontScaling>
          Send this spoiler-free challenge dossier to friends. They can solve the identical case
          in any web browser with no account needed!
        </Text>

        {/* Spoiler-Free Result Card */}
        <ResultCard
          caseTitle={caseTitle}
          score={score}
          xpEarned={xpEarned}
          detectiveHandle={detectiveHandle}
          rankTitle={rankTitle}
          challengeCode={challengeCode}
        />

        {/* Link Box */}
        <View style={styles.linkCard}>
          <Text style={styles.linkHeader} allowFontScaling>
            CHALLENGE LINK
          </Text>
          <Text
            style={styles.urlText}
            allowFontScaling
            selectable={true}
            testID="challenge.share.url_text"
          >
            {challengeUrl}
          </Text>
        </View>

        {/* Actions */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.shareButton}
            onPress={handleShare}
            accessibilityRole="button"
            accessibilityLabel="Share challenge via system share sheet"
            testID="challenge.share.button"
          >
            <Text style={styles.shareButtonText} allowFontScaling>
              SHARE CHALLENGE
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.copyButton, copied && styles.copyButtonActive]}
            onPress={handleCopy}
            accessibilityRole="button"
            accessibilityLabel="Copy challenge link to clipboard"
            testID="challenge.share.copy_button"
          >
            <Text
              style={[styles.copyButtonText, copied && styles.copyButtonTextActive]}
              allowFontScaling
            >
              {copied ? '✓ COPIED' : 'COPY LINK'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

export function ChallengeShareModal({
  visible,
  onClose,
  ...rest
}: ChallengeShareModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
      testID="challenge.share.modal"
    >
      <View style={styles.backdrop}>
        <ChallengeShareContent {...rest} onClose={onClose} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: COLORS.bg,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderTopWidth: 2,
    borderColor: COLORS.accent,
    maxHeight: '90%',
    paddingBottom: SPACING.xl,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceBorder,
  },
  sheetTitle: {
    ...TYPOGRAPHY.h2,
    color: COLORS.text,
    fontSize: 16,
    letterSpacing: 1,
  },
  closeText: {
    ...TYPOGRAPHY.h2,
    color: COLORS.muted,
    fontSize: 18,
    paddingHorizontal: SPACING.xs,
  },
  scrollContent: {
    flexGrow: 0,
  },
  scrollInner: {
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  instructionsText: {
    ...TYPOGRAPHY.body,
    fontSize: 13,
    color: COLORS.muted,
    lineHeight: 18,
  },
  linkCard: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.surfaceBorder,
    borderWidth: 1,
    borderRadius: 6,
    padding: SPACING.md,
    gap: 4,
  },
  linkHeader: {
    ...TYPOGRAPHY.caption,
    color: COLORS.accent,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  urlText: {
    ...TYPOGRAPHY.monospace,
    color: COLORS.text,
    fontSize: 13,
  },
  actionRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  shareButton: {
    flex: 2,
    backgroundColor: COLORS.accent,
    borderRadius: 6,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareButtonText: {
    ...TYPOGRAPHY.body,
    color: COLORS.bg,
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: 0.8,
  },
  copyButton: {
    flex: 1,
    backgroundColor: COLORS.surfaceElevated,
    borderColor: COLORS.surfaceBorder,
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copyButtonActive: {
    borderColor: COLORS.accent,
    backgroundColor: COLORS.surface,
  },
  copyButtonText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    fontWeight: '700',
    fontSize: 13,
  },
  copyButtonTextActive: {
    color: COLORS.accent,
  },
});
