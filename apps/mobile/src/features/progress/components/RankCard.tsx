import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { DETECTIVE_RANKS } from '@lastlie/case-engine';
import { COLORS, SPACING, TYPOGRAPHY } from '../../../theme/tokens';
import type { RankInfo } from '../types';

interface RankCardProps {
  rankInfo: RankInfo;
}

export function RankCard({ rankInfo }: RankCardProps) {
  const {
    currentRank,
    nextRank,
    currentXp,
    targetXp,
    xpMissing,
    progressPercent,
    masteryGate,
    isMaxRank,
    canRankUp,
  } = rankInfo;

  return (
    <View
      style={styles.card}
      testID="progress.rank.card"
      accessible={true}
      accessibilityRole="summary"
      accessibilityLabel={`Rank: ${currentRank}. Current experience: ${currentXp} XP.${
        nextRank ? ` Next rank: ${nextRank}, ${xpMissing} XP needed.` : ' Maximum rank achieved.'
      }`}
    >
      {/* Top Header */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.sectionLabel} allowFontScaling>
            RANK &amp; STANDING
          </Text>
          <Text style={styles.rankTitle} allowFontScaling>
            {currentRank}
          </Text>
        </View>
        <View style={styles.badgeContainer}>
          <Text style={styles.badgeText} allowFontScaling>
            LEVEL {DETECTIVE_RANKS.indexOf(currentRank) + 1}
          </Text>
        </View>
      </View>

      {/* Rank Ladder / Roadmap */}
      <View style={styles.ladderRow}>
        {DETECTIVE_RANKS.map((r, idx) => {
          const isCurrent = r === currentRank;
          const isPassed = DETECTIVE_RANKS.indexOf(currentRank) > idx;

          return (
            <View key={r} style={styles.ladderStep}>
              <View
                style={[
                  styles.ladderDot,
                  isCurrent && styles.ladderDotActive,
                  isPassed && styles.ladderDotPassed,
                ]}
              >
                {isPassed && <Text style={styles.checkText}>✓</Text>}
              </View>
              <Text
                style={[styles.ladderText, isCurrent && styles.ladderTextActive]}
                numberOfLines={1}
                allowFontScaling
              >
                {r}
              </Text>
            </View>
          );
        })}
      </View>

      {/* XP Progress Bar */}
      <View style={styles.xpSection}>
        <View style={styles.xpHeaderRow}>
          <Text style={styles.xpLabel} allowFontScaling>
            INVESTIGATOR EXPERIENCE
          </Text>
          <Text style={styles.xpValue} allowFontScaling>
            {currentXp} {targetXp ? `/ ${targetXp} XP` : 'XP'}
          </Text>
        </View>

        <View style={styles.barTrack}>
          <View style={[styles.barFill, { width: `${progressPercent}%` }]} />
        </View>

        <View style={styles.xpSubRow}>
          <Text style={styles.progressPercentText} allowFontScaling>
            {progressPercent}% Progression
          </Text>
          {nextRank && (
            <Text style={styles.nextRankHint} allowFontScaling>
              {xpMissing > 0 ? `${xpMissing} XP to ${nextRank}` : `XP met for ${nextRank}`}
            </Text>
          )}
        </View>
      </View>

      {/* Mastery Requirements Gate */}
      <View style={styles.gateSection} testID="progress.rank.gate">
        <Text style={styles.gateHeader} allowFontScaling>
          RANK MASTERY REQUIREMENTS
        </Text>

        {isMaxRank ? (
          <View style={styles.gateBox}>
            <Text style={styles.gateTitle} allowFontScaling>
              ★ Top Standing Achieved
            </Text>
            <Text style={styles.gateDetail} allowFontScaling>
              You hold the highest field clearance in Vesper City.
            </Text>
          </View>
        ) : masteryGate ? (
          <View style={styles.gateBox}>
            <View style={styles.gateTitleRow}>
              <Text style={styles.gateTitle} allowFontScaling>
                Clearance Gate: Difficulty {masteryGate.minDifficulty}+
              </Text>
              <View
                style={[
                  styles.gateStatusBadge,
                  masteryGate.solvesMissing === 0
                    ? styles.gateStatusQualified
                    : styles.gateStatusPending,
                ]}
              >
                <Text style={styles.gateStatusText} allowFontScaling>
                  {masteryGate.solvesMissing === 0 ? '✓ GATE CLEARED' : 'PENDING'}
                </Text>
              </View>
            </View>

            <Text style={styles.gateDetail} allowFontScaling>
              Requires {masteryGate.qualifyingSolves} verified solves at Difficulty{' '}
              {masteryGate.minDifficulty}+ with high evidence quality (≥60%).
            </Text>

            <View style={styles.gateProgressRow}>
              <Text style={styles.gateCountText} allowFontScaling>
                Progress: {masteryGate.currentSolves} / {masteryGate.qualifyingSolves} qualifying
                cases solved
              </Text>
              {canRankUp && (
                <Text style={styles.rankUpNotice} allowFontScaling>
                  Ready for promotion to {nextRank}!
                </Text>
              )}
            </View>
          </View>
        ) : (
          <View style={styles.gateBox}>
            <Text style={styles.gateDetail} allowFontScaling>
              No prerequisite mastery gate required for {nextRank ?? 'next rank'}.
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    padding: SPACING.md,
    gap: SPACING.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  sectionLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.muted,
    letterSpacing: 1.5,
  },
  rankTitle: {
    ...TYPOGRAPHY.h1,
    color: COLORS.accent,
    marginTop: 2,
  },
  badgeContainer: {
    backgroundColor: 'rgba(230, 201, 142, 0.15)',
    borderWidth: 1,
    borderColor: COLORS.accent,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.accent,
    fontWeight: '700',
    letterSpacing: 1,
  },
  ladderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.xs,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  ladderStep: {
    alignItems: 'center',
    flex: 1,
  },
  ladderDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: COLORS.muted,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  ladderDotActive: {
    borderColor: COLORS.accent,
    backgroundColor: COLORS.accent,
  },
  ladderDotPassed: {
    borderColor: COLORS.success,
    backgroundColor: 'rgba(102, 187, 106, 0.3)',
  },
  checkText: {
    fontSize: 9,
    color: COLORS.text,
    fontWeight: '700',
  },
  ladderText: {
    fontSize: 9,
    color: COLORS.muted,
    textAlign: 'center',
  },
  ladderTextActive: {
    color: COLORS.accent,
    fontWeight: '700',
  },
  xpSection: {
    gap: SPACING.xs,
  },
  xpHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  xpLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.muted,
    letterSpacing: 1,
  },
  xpValue: {
    ...TYPOGRAPHY.caption,
    ...TYPOGRAPHY.monospace,
    color: COLORS.text,
    fontWeight: '700',
  },
  barTrack: {
    height: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 5,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: COLORS.accent,
    borderRadius: 5,
  },
  xpSubRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressPercentText: {
    fontSize: 11,
    color: COLORS.muted,
  },
  nextRankHint: {
    fontSize: 11,
    color: COLORS.accent,
  },
  gateSection: {
    gap: SPACING.xs,
  },
  gateHeader: {
    ...TYPOGRAPHY.caption,
    color: COLORS.muted,
    letterSpacing: 1.2,
  },
  gateBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 6,
    padding: SPACING.sm,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  gateTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gateTitle: {
    ...TYPOGRAPHY.body,
    fontWeight: '700',
    color: COLORS.text,
  },
  gateStatusBadge: {
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: 3,
  },
  gateStatusQualified: {
    backgroundColor: 'rgba(102, 187, 106, 0.2)',
  },
  gateStatusPending: {
    backgroundColor: 'rgba(255, 179, 0, 0.2)',
  },
  gateStatusText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.text,
  },
  gateDetail: {
    ...TYPOGRAPHY.caption,
    color: COLORS.muted,
    lineHeight: 16,
  },
  gateProgressRow: {
    marginTop: 4,
  },
  gateCountText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text,
  },
  rankUpNotice: {
    ...TYPOGRAPHY.caption,
    color: COLORS.success,
    fontWeight: '700',
    marginTop: 2,
  },
});
