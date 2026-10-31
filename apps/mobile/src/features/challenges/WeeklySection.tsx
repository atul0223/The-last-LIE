import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import type { ApiClient } from '@lastlie/api-contract';
import { useWeekly } from './useWeekly';
import { navigateTo } from '../home/navigation';
import { COLORS, SPACING, TYPOGRAPHY } from '../../theme/tokens';

export interface WeeklySectionProps {
  apiClientOverride?: ApiClient;
  onSessionLaunched?: (sessionId: string) => void;
}

export function WeeklySection({ apiClientOverride, onSessionLaunched }: WeeklySectionProps) {
  const {
    weeklyCase,
    aggregate,
    isOpen,
    timeRemainingText,
    isLoading,
    error,
    startWeeklyCase,
  } = useWeekly(apiClientOverride);

  const [isLaunching, setIsLaunching] = useState(false);

  const handleStart = async () => {
    if (isLaunching) return;
    setIsLaunching(true);
    try {
      const sessionId = await startWeeklyCase();
      if (sessionId) {
        if (onSessionLaunched) {
          onSessionLaunched(sessionId);
        } else {
          navigateTo(`/case/${sessionId}`);
        }
      }
    } finally {
      setIsLaunching(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.card} testID="weekly.card.loading">
        <ActivityIndicator color={COLORS.accent} />
        <Text style={styles.loadingText} allowFontScaling>
          Fetching weekly community dispatch...
        </Text>
      </View>
    );
  }

  if (error || !weeklyCase) {
    return (
      <View style={styles.card} testID="weekly.card.error">
        <Text style={styles.cardCategory} allowFontScaling>
          WEEKLY COMMUNITY DISPATCH
        </Text>
        <Text style={styles.errorText} allowFontScaling>
          {error || 'No weekly case currently scheduled.'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.card} testID="weekly.card">
      {/* Header */}
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.cardCategory} allowFontScaling>
            WEEKLY COMMUNITY DUEL
          </Text>
          <Text style={styles.weekNumberBadge} allowFontScaling>
            {`WEEK #${weeklyCase.weekNumber} // ${weeklyCase.year}`}
          </Text>
        </View>

        <View
          style={[styles.statusBadge, isOpen ? styles.statusBadgeOpen : styles.statusBadgeClosed]}
        >
          <Text
            style={[styles.statusText, isOpen ? styles.statusTextOpen : styles.statusTextClosed]}
            allowFontScaling
            testID="weekly.countdown"
          >
            {isOpen ? `⏱ ${timeRemainingText}` : 'WINDOW CLOSED'}
          </Text>
        </View>
      </View>

      {/* When window is OPEN */}
      {isOpen ? (
        <View style={styles.openContent} testID="weekly.window.open">
          <Text style={styles.cardTitle} allowFontScaling>
            {weeklyCase.case?.title ?? `Community Mystery #${weeklyCase.caseId}`}
          </Text>
          <Text style={styles.cardDesc} allowFontScaling>
            {weeklyCase.case?.setting?.summary ??
              'Citywide community investigation. All detectives solve the identical mystery under standard bureau conditions.'}
          </Text>

          <View style={styles.rulesNotice}>
            <Text style={styles.rulesNoticeText} allowFontScaling>
              ⚖️ Official Rule: Only your FIRST attempt counts toward the leaderboard. Theory
              distributions and scores remain strictly classified until the window closes.
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.startButton, isLaunching && styles.buttonDisabled]}
            onPress={handleStart}
            disabled={isLaunching}
            accessibilityRole="button"
            accessibilityLabel="Participate in weekly community mystery"
            testID="weekly.button.start"
          >
            <Text style={styles.startButtonText} allowFontScaling>
              {isLaunching ? 'INITIALIZING DISPATCH...' : 'PARTICIPATE IN WEEKLY CASE'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        /* When window is CLOSED */
        <View style={styles.closedContent} testID="weekly.window.closed">
          <Text style={styles.cardTitle} allowFontScaling>
            {weeklyCase.case?.title ?? `Community Mystery #${weeklyCase.caseId}`} (Resolved)
          </Text>
          <Text style={styles.finalStandingsNotice} allowFontScaling>
            Window closed. Official standing and community deduction aggregate unlocked below:
          </Text>

          {aggregate ? (
            <View style={styles.aggregateBox} testID="weekly.aggregate">
              {/* Stats Overview */}
              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <Text
                    style={styles.statValue}
                    allowFontScaling
                    testID="weekly.total_participants"
                  >
                    {aggregate.totalParticipants}
                  </Text>
                  <Text style={styles.statLabel} allowFontScaling>
                    DETECTIVES
                  </Text>
                </View>

                <View style={styles.statBox}>
                  <Text style={styles.statValue} allowFontScaling testID="weekly.average_score">
                    {Math.round(aggregate.averageScore)}
                  </Text>
                  <Text style={styles.statLabel} allowFontScaling>
                    AVG SCORE
                  </Text>
                </View>
              </View>

              {/* Leaderboard Table */}
              <View style={styles.leaderboardSection} testID="weekly.leaderboard">
                <Text style={styles.subSectionTitle} allowFontScaling>
                  COMMUNITY LEADERBOARD
                </Text>
                {aggregate.leaderboard.slice(0, 5).map((entry) => (
                  <View
                    key={entry.userId}
                    style={styles.leaderboardRow}
                    testID={`weekly.leaderboard.row.${entry.rank}`}
                  >
                    <Text style={styles.rankText} allowFontScaling>
                      {`#${entry.rank}`}
                    </Text>
                    <Text style={styles.playerText} allowFontScaling numberOfLines={1}>
                      {entry.displayName}
                    </Text>
                    <Text style={styles.scoreText} allowFontScaling>
                      {`${entry.score} PTS`}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Hypothesis Distribution */}
              {Object.keys(aggregate.hypothesisDistribution).length > 0 && (
                <View
                  style={styles.distributionSection}
                  testID="weekly.hypothesis_distribution"
                >
                  <Text style={styles.subSectionTitle} allowFontScaling>
                    COMMUNITY THEORIES
                  </Text>
                  {Object.entries(aggregate.hypothesisDistribution).map(([hypId, count]) => {
                    const total = Math.max(aggregate.totalParticipants, 1);
                    const pct = Math.round((count / total) * 100);
                    return (
                      <View key={hypId} style={styles.hypBarItem}>
                        <View style={styles.hypBarHeader}>
                          <Text style={styles.hypLabel} allowFontScaling numberOfLines={1}>
                            {`Hypothesis [${hypId}]`}
                          </Text>
                          <Text style={styles.hypPct} allowFontScaling>
                            {`${pct}% (${count})`}
                          </Text>
                        </View>
                        <View style={styles.hypBarTrack}>
                          <View style={[styles.hypBarFill, { width: `${Math.max(pct, 4)}%` }]} />
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          ) : (
            <Text style={styles.emptyAggText} allowFontScaling>
              No aggregate results recorded for this weekly dispatch.
            </Text>
          )}
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardCategory: {
    ...TYPOGRAPHY.caption,
    color: COLORS.accent,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  weekNumberBadge: {
    ...TYPOGRAPHY.monospace,
    color: COLORS.muted,
    fontSize: 10,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
  },
  statusBadgeOpen: {
    backgroundColor: COLORS.surfaceElevated,
    borderColor: COLORS.accent,
  },
  statusBadgeClosed: {
    backgroundColor: '#1c1515',
    borderColor: COLORS.danger,
  },
  statusText: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    fontWeight: '700',
  },
  statusTextOpen: {
    color: COLORS.accent,
  },
  statusTextClosed: {
    color: COLORS.danger,
  },
  openContent: {
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  closedContent: {
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  cardTitle: {
    ...TYPOGRAPHY.h2,
    fontSize: 18,
    color: COLORS.text,
  },
  cardDesc: {
    ...TYPOGRAPHY.body,
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  rulesNotice: {
    backgroundColor: COLORS.surfaceElevated,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 4,
    padding: SPACING.sm,
  },
  rulesNoticeText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.muted,
    fontSize: 11,
    lineHeight: 16,
  },
  startButton: {
    backgroundColor: COLORS.accent,
    borderRadius: 4,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.xs,
  },
  startButtonText: {
    ...TYPOGRAPHY.body,
    color: COLORS.bg,
    fontWeight: '700',
    fontSize: 13,
    letterSpacing: 0.8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  finalStandingsNotice: {
    ...TYPOGRAPHY.caption,
    color: COLORS.muted,
    fontSize: 12,
  },
  aggregateBox: {
    gap: SPACING.md,
    marginTop: SPACING.xs,
  },
  statsRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  statBox: {
    flex: 1,
    backgroundColor: COLORS.surfaceElevated,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 4,
    padding: SPACING.sm,
    alignItems: 'center',
  },
  statValue: {
    ...TYPOGRAPHY.h1,
    fontSize: 22,
    color: COLORS.accent,
    fontWeight: '800',
  },
  statLabel: {
    ...TYPOGRAPHY.caption,
    fontSize: 10,
    color: COLORS.muted,
    marginTop: 2,
    fontWeight: '700',
  },
  leaderboardSection: {
    gap: 6,
    backgroundColor: COLORS.surfaceElevated,
    padding: SPACING.sm,
    borderRadius: 4,
  },
  subSectionTitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.accent,
    fontWeight: '700',
    letterSpacing: 0.8,
    fontSize: 11,
    marginBottom: 2,
  },
  leaderboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  rankText: {
    ...TYPOGRAPHY.monospace,
    color: COLORS.accent,
    fontWeight: '700',
    width: 32,
    fontSize: 12,
  },
  playerText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    flex: 1,
    fontSize: 13,
  },
  scoreText: {
    ...TYPOGRAPHY.monospace,
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '700',
  },
  distributionSection: {
    gap: 6,
    backgroundColor: COLORS.surfaceElevated,
    padding: SPACING.sm,
    borderRadius: 4,
  },
  hypBarItem: {
    gap: 3,
  },
  hypBarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  hypLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text,
    fontSize: 11,
    flex: 1,
  },
  hypPct: {
    ...TYPOGRAPHY.monospace,
    color: COLORS.accent,
    fontSize: 11,
    fontWeight: '700',
  },
  hypBarTrack: {
    height: 6,
    backgroundColor: COLORS.surface,
    borderRadius: 3,
    overflow: 'hidden',
  },
  hypBarFill: {
    height: '100%',
    backgroundColor: COLORS.accent,
  },
  loadingText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.muted,
    textAlign: 'center',
  },
  errorText: {
    ...TYPOGRAPHY.body,
    color: COLORS.muted,
    fontSize: 13,
  },
  emptyAggText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.muted,
    textAlign: 'center',
  },
});
