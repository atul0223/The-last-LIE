import React, { forwardRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import ViewShot from 'react-native-view-shot';
import { COLORS, SPACING, TYPOGRAPHY } from '../../theme/tokens';

export interface ResultCardProps {
  caseTitle: string;
  score: number;
  xpEarned?: number;
  ratingText?: string;
  detectiveHandle?: string;
  rankTitle?: string;
  callToAction?: string;
  challengeCode?: string;
}

/**
 * Spoiler-free challenge result card.
 * Designed to be rendered or screenshotted (via react-native-view-shot) and shared with friends.
 *
 * CRITICAL SECURITY & SPOILER RULE:
 * This component and its props MUST NEVER receive or render:
 * - Hypothesis names or claims
 * - Culprit identities
 * - Clue texts or internal identifiers
 * - Ground truth explanations
 */
export const ResultCard = forwardRef<ViewShot, ResultCardProps>(function ResultCard(
  {
    caseTitle,
    score,
    xpEarned,
    ratingText,
    detectiveHandle = 'Field Operative',
    rankTitle = 'Investigator',
    callToAction = 'Can you beat my deduction?',
    challengeCode,
  },
  ref,
) {
  const resolvedRating =
    ratingText ||
    (score >= 90
      ? 'FLAWLESS DEDUCTION'
      : score >= 70
        ? 'CASE RESOLVED'
        : score >= 40
          ? 'PARTIAL RESOLUTION'
          : 'UNSOLVED INQUIRY');

  return (
    <View testID="challenge.result_card">
      <ViewShot
        ref={ref}
        options={{ format: 'png', quality: 0.95 }}
        style={styles.cardContainer}
      >
        {/* Top Banner */}
        <View style={styles.topHeader}>
          <Text style={styles.brandingText} allowFontScaling>
            THE LAST LIE // INFINITE
          </Text>
          {challengeCode && (
            <Text style={styles.codeText} allowFontScaling testID="challenge.result_card.code">
              {`CODE: #${challengeCode.toUpperCase()}`}
            </Text>
          )}
        </View>

        {/* Operative Dossier Info */}
        <View style={styles.operativeSection}>
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarInitial} allowFontScaling>
              {detectiveHandle.slice(0, 2).toUpperCase()}
            </Text>
          </View>
          <View style={styles.operativeInfo}>
            <Text
              style={styles.operativeName}
              allowFontScaling
              testID="challenge.result_card.detective"
            >
              {detectiveHandle}
            </Text>
            <Text style={styles.operativeRank} allowFontScaling>
              RANK: {rankTitle.toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Case Header */}
        <View style={styles.caseSection}>
          <Text style={styles.caseLabel} allowFontScaling>
            CASE INQUIRY
          </Text>
          <Text style={styles.caseTitle} allowFontScaling testID="challenge.result_card.title">
            {caseTitle}
          </Text>
        </View>

        {/* Score Hero */}
        <View style={styles.scoreHero}>
          <View style={styles.scoreRow}>
            <Text style={styles.scoreNumber} allowFontScaling testID="challenge.result_card.score">
              {score}
            </Text>
            <Text style={styles.scoreUnit} allowFontScaling>
              PTS
            </Text>
          </View>
          <View style={styles.ratingBadge}>
            <Text style={styles.ratingText} allowFontScaling>
              {resolvedRating}
            </Text>
          </View>
          {xpEarned !== undefined && (
            <Text style={styles.xpText} allowFontScaling>
              +{xpEarned} INVESTIGATOR XP
            </Text>
          )}
        </View>

        {/* Social Call to Action */}
        <View style={styles.ctaBox}>
          <Text style={styles.ctaText} allowFontScaling testID="challenge.result_card.cta">
            {callToAction}
          </Text>
          <Text style={styles.ctaSubtext} allowFontScaling>
            No account needed • Play directly in your browser
          </Text>
        </View>
      </ViewShot>
    </View>
  );
});

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: COLORS.surfaceElevated,
    borderColor: COLORS.accent,
    borderWidth: 2,
    borderRadius: 8,
    padding: SPACING.lg,
    gap: SPACING.md,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: SPACING.xs,
  },
  brandingText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.accent,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  codeText: {
    ...TYPOGRAPHY.monospace,
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '700',
  },
  operativeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.surface,
    borderColor: COLORS.accent,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    ...TYPOGRAPHY.h2,
    fontSize: 16,
    color: COLORS.accent,
    fontWeight: '700',
  },
  operativeInfo: {
    flex: 1,
    gap: 2,
  },
  operativeName: {
    ...TYPOGRAPHY.h2,
    fontSize: 16,
    color: COLORS.text,
  },
  operativeRank: {
    ...TYPOGRAPHY.caption,
    color: COLORS.muted,
    fontSize: 11,
    letterSpacing: 0.5,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
  },
  caseSection: {
    gap: 4,
  },
  caseLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  caseTitle: {
    ...TYPOGRAPHY.h2,
    fontSize: 18,
    color: COLORS.text,
  },
  scoreHero: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderColor: COLORS.surfaceBorder,
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: SPACING.md,
    gap: SPACING.xs,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: SPACING.xs,
  },
  scoreNumber: {
    ...TYPOGRAPHY.h1,
    fontSize: 44,
    color: COLORS.accent,
    fontWeight: '800',
    letterSpacing: -1,
  },
  scoreUnit: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
  },
  ratingBadge: {
    backgroundColor: COLORS.surfaceElevated,
    borderColor: COLORS.accent,
    borderWidth: 1,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: 4,
  },
  ratingText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.accent,
    fontWeight: '700',
    letterSpacing: 0.8,
    fontSize: 11,
  },
  xpText: {
    ...TYPOGRAPHY.monospace,
    color: COLORS.muted,
    fontSize: 11,
  },
  ctaBox: {
    alignItems: 'center',
    gap: 4,
    paddingTop: SPACING.xs,
  },
  ctaText: {
    ...TYPOGRAPHY.body,
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
  },
  ctaSubtext: {
    ...TYPOGRAPHY.caption,
    color: COLORS.muted,
    fontSize: 11,
    textAlign: 'center',
  },
});
