import React from 'react';
import { StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import type { ChallengeCompareResponse } from '@lastlie/api-contract';
import { COLORS, SPACING, TYPOGRAPHY } from '../../theme/tokens';

export interface ChallengeCompareViewProps {
  hasSubmitted: boolean;
  compareData?: ChallengeCompareResponse | null;
  isLoading?: boolean;
  errorMessage?: string | null;
  /**
   * Optional map from hypothesisId to label for human readability.
   * e.g. { hyp_1: "Arjun forged the message" }
   */
  hypothesisLabels?: Record<string, string>;
  /**
   * Optional map from clueId to clue short title.
   */
  clueLabels?: Record<string, string>;
}

export function ChallengeCompareView({
  hasSubmitted,
  compareData,
  isLoading,
  errorMessage,
  hypothesisLabels = {},
  clueLabels = {},
}: ChallengeCompareViewProps) {
  // 1. Locked State: Caller has not yet submitted their deduction
  if (!hasSubmitted) {
    return (
      <View style={styles.card} testID="challenge.compare.locked">
        <View style={styles.lockedHeader}>
          <Text style={styles.lockedTag} allowFontScaling>
            CLASSIFIED // COMPARISON LOCKED
          </Text>
        </View>
        <Text style={styles.lockedTitle} allowFontScaling>
          Peer Statistics Locked
        </Text>
        <Text style={styles.lockedDesc} allowFontScaling>
          Peer hypothesis selections and evidence deduction chains are strictly classified until you
          submit your own final theory to prevent bias and spoilers.
        </Text>
      </View>
    );
  }

  // 2. Loading State
  if (isLoading) {
    return (
      <View style={styles.card} testID="challenge.compare.loading">
        <ActivityIndicator color={COLORS.accent} />
        <Text style={styles.loadingText} allowFontScaling>
          Compiling peer deduction records...
        </Text>
      </View>
    );
  }

  // 3. Error State
  if (errorMessage) {
    return (
      <View style={[styles.card, styles.cardError]} testID="challenge.compare.error">
        <Text style={styles.errorTitle} allowFontScaling>
          Comparison Unavailable
        </Text>
        <Text style={styles.errorDesc} allowFontScaling>
          {errorMessage}
        </Text>
      </View>
    );
  }

  // 4. No Data Fallback
  if (!compareData) {
    return (
      <View style={styles.card} testID="challenge.compare.empty">
        <Text style={styles.emptyText} allowFontScaling>
          No peer deduction data available for this challenge yet.
        </Text>
      </View>
    );
  }

  const { totalParticipants, hypothesisDistribution, mostUsedClues } = compareData;
  const totalSubmissions = Math.max(
    totalParticipants,
    Object.values(hypothesisDistribution).reduce((acc, v) => acc + v, 0),
    1,
  );

  return (
    <View style={styles.card} testID="challenge.compare.unlocked">
      {/* Header */}
      <View style={styles.unlockedHeader}>
        <Text style={styles.categoryTitle} allowFontScaling>
          PEER DEDUCTION COMPARISON
        </Text>
        <Text
          style={styles.participantCount}
          allowFontScaling
          testID="challenge.compare.total_participants"
        >
          {`${totalParticipants} ${totalParticipants === 1 ? 'DETECTIVE' : 'DETECTIVES'}`}
        </Text>
      </View>

      <Text style={styles.sectionSubtitle} allowFontScaling>
        Distribution of prime suspects and theories chosen by peer investigators:
      </Text>

      {/* Hypothesis Distribution */}
      <View style={styles.distributionList} testID="challenge.compare.hypothesis_list">
        {Object.entries(hypothesisDistribution).map(([hypId, count]) => {
          const pct = Math.round((count / totalSubmissions) * 100);
          const label = hypothesisLabels[hypId] || `Hypothesis [${hypId}]`;

          return (
            <View key={hypId} style={styles.distributionItem} testID={`challenge.compare.hyp.${hypId}`}>
              <View style={styles.barHeader}>
                <Text style={styles.barLabel} allowFontScaling numberOfLines={1}>
                  {label}
                </Text>
                <Text style={styles.barPct} allowFontScaling>
                  {pct}% ({count})
                </Text>
              </View>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${Math.max(pct, 4)}%` }]} />
              </View>
            </View>
          );
        })}
      </View>

      {/* Most Cited Evidence */}
      {mostUsedClues && mostUsedClues.length > 0 && (
        <View style={styles.cluesSection} testID="challenge.compare.most_used_clues">
          <Text style={styles.subSectionTitle} allowFontScaling>
            MOST CITED EVIDENCE
          </Text>
          <View style={styles.clueChipList}>
            {mostUsedClues.slice(0, 5).map(({ clueId, count }) => {
              const clueName = clueLabels[clueId] || clueId;
              return (
                <View key={clueId} style={styles.clueChip} testID={`challenge.compare.clue.${clueId}`}>
                  <Text style={styles.clueChipText} allowFontScaling numberOfLines={1}>
                    {clueName} ({count})
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.surfaceBorder,
    borderWidth: 1,
    borderRadius: 6,
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  cardError: {
    borderColor: COLORS.danger,
  },
  lockedHeader: {
    marginBottom: SPACING.xs,
  },
  lockedTag: {
    ...TYPOGRAPHY.caption,
    color: COLORS.accent,
    fontWeight: '700',
    letterSpacing: 1,
  },
  lockedTitle: {
    ...TYPOGRAPHY.h2,
    fontSize: 16,
    color: COLORS.text,
  },
  lockedDesc: {
    ...TYPOGRAPHY.body,
    fontSize: 13,
    color: COLORS.muted,
    lineHeight: 18,
  },
  loadingText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.muted,
    textAlign: 'center',
    marginTop: SPACING.xs,
  },
  errorTitle: {
    ...TYPOGRAPHY.h2,
    fontSize: 15,
    color: COLORS.danger,
  },
  errorDesc: {
    ...TYPOGRAPHY.body,
    fontSize: 13,
    color: COLORS.muted,
  },
  emptyText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.muted,
    textAlign: 'center',
  },
  unlockedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: SPACING.xs,
  },
  categoryTitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.accent,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  participantCount: {
    ...TYPOGRAPHY.monospace,
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '700',
  },
  sectionSubtitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.muted,
    fontSize: 12,
  },
  distributionList: {
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  distributionItem: {
    gap: 4,
  },
  barHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  barLabel: {
    ...TYPOGRAPHY.body,
    fontSize: 13,
    color: COLORS.text,
    flex: 1,
    marginRight: SPACING.sm,
  },
  barPct: {
    ...TYPOGRAPHY.monospace,
    fontSize: 12,
    color: COLORS.accent,
    fontWeight: '700',
  },
  barTrack: {
    height: 8,
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: COLORS.accent,
    borderRadius: 4,
  },
  cluesSection: {
    marginTop: SPACING.sm,
    gap: SPACING.xs,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.sm,
  },
  subSectionTitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  clueChipList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  clueChip: {
    backgroundColor: COLORS.surfaceElevated,
    borderColor: COLORS.surfaceBorder,
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
  },
  clueChipText: {
    ...TYPOGRAPHY.monospace,
    fontSize: 11,
    color: COLORS.text,
  },
});
