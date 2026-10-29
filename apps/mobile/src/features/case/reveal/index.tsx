import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { fromTime } from '@lastlie/case-engine';
import type { CaseSlotProps } from '../slots';
import { useCaseSession, useGameService } from '../slots';
import { COLORS, SPACING, TYPOGRAPHY } from '../../../theme/tokens';

export default function RevealSlot({ sessionId }: CaseSlotProps) {
  const router = useRouter();
  const service = useGameService();
  const { status, session, result, reveal } = useCaseSession(sessionId);

  const [expandedBeatIdx, setExpandedBeatIdx] = useState<number | null>(null);
  const [isStartingNext, setIsStartingNext] = useState<boolean>(false);

  const handleToggleBeat = useCallback((idx: number) => {
    setExpandedBeatIdx((prev) => (prev === idx ? null : idx));
  }, []);

  const handleNextCase = useCallback(async () => {
    if (isStartingNext) return;
    setIsStartingNext(true);
    try {
      const next = await service.startSession();
      router.push(`/case/${next.session.id}`);
    } catch {
      // Error handling
    } finally {
      setIsStartingNext(false);
    }
  }, [isStartingNext, service, router]);

  const handleBackHome = useCallback(() => {
    router.push('/');
  }, [router]);

  // Security gate: Never render reveal content before submission!
  if (status !== 'submitted' || !result || !reveal) {
    return (
      <View style={styles.container} testID="case.reveal.notSubmitted">
        <Text style={styles.notSubmittedText} allowFontScaling>
          Case resolution is classified until your theory is submitted.
        </Text>
      </View>
    );
  }

  const { score, xp, breakdown } = result;
  const { explanation, allClues, validLinks } = reveal;
  const playerLinks = session?.board?.links ?? [];

  const clueLookup = new Map(allClues.map((c) => [c.id, c]));

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      testID="case.reveal.container"
    >
      {/* 1. Score Header */}
      <View style={styles.scoreCard} testID="case.reveal.score">
        <Text style={styles.scoreBadge} allowFontScaling>
          OFFICIAL EVALUATION // CASE CLOSED
        </Text>
        <View style={styles.scoreRow}>
          <Text style={styles.scoreValue} allowFontScaling>
            {score}
          </Text>
          <Text style={styles.scoreUnit} allowFontScaling>
            PTS
          </Text>
        </View>
        <Text style={styles.xpText} allowFontScaling>
          {`+${xp} INVESTIGATOR XP EARNED`}
        </Text>
      </View>

      {/* 2. Score Breakdown */}
      <View style={styles.section} testID="case.reveal.breakdown">
        <Text style={styles.sectionHeader} allowFontScaling>
          SCORE BREAKDOWN
        </Text>
        <View style={styles.breakdownCard}>
          {/* Hypothesis */}
          <View style={styles.breakdownRow}>
            <View style={styles.breakdownLeft}>
              <Text style={styles.breakdownLabel} allowFontScaling>
                Prime Hypothesis
              </Text>
              <Text
                style={[
                  styles.statusTag,
                  breakdown.correctHypothesis ? styles.statusSuccess : styles.statusDanger,
                ]}
                allowFontScaling
              >
                {breakdown.correctHypothesis ? '✓ CORRECT IDENTIFICATION' : '✗ INCORRECT'}
              </Text>
            </View>
            <Text style={styles.breakdownPoints} allowFontScaling>
              {`+${breakdown.hypothesisPoints} pts`}
            </Text>
          </View>

          {/* Evidence */}
          <View style={styles.breakdownRow}>
            <View style={styles.breakdownLeft}>
              <Text style={styles.breakdownLabel} allowFontScaling>
                Supporting Key Evidence
              </Text>
            </View>
            <Text style={styles.breakdownPoints} allowFontScaling>
              {`+${breakdown.evidencePoints} pts`}
            </Text>
          </View>

          {/* Contradictions */}
          <View style={styles.breakdownRow}>
            <View style={styles.breakdownLeft}>
              <Text style={styles.breakdownLabel} allowFontScaling>
                Contradiction Links Established
              </Text>
            </View>
            <Text style={styles.breakdownPoints} allowFontScaling>
              {`+${breakdown.contradictionPoints} pts`}
            </Text>
          </View>

          {/* Penalties */}
          {breakdown.penaltyPoints > 0 && (
            <View style={styles.breakdownRow}>
              <View style={styles.breakdownLeft}>
                <Text style={styles.breakdownLabel} allowFontScaling>
                  Penalties & Evidence Requests
                </Text>
              </View>
              <Text style={styles.breakdownPenalty} allowFontScaling>
                {`−${breakdown.penaltyPoints} pts`}
              </Text>
            </View>
          )}

          {/* Multiplier */}
          <View style={[styles.breakdownRow, styles.multiplierRow]}>
            <Text style={styles.multiplierLabel} allowFontScaling>
              Score Multiplier
            </Text>
            <Text style={styles.multiplierValue} allowFontScaling>
              {breakdown.multiplier}×
            </Text>
          </View>
        </View>
      </View>

      {/* 3. Player Links Verification */}
      <View style={styles.section}>
        <Text style={styles.sectionHeader} allowFontScaling>
          CONTRADICTION ANALYSIS ({playerLinks.length})
        </Text>

        {playerLinks.length === 0 ? (
          <View style={styles.emptyLinksBox}>
            <Text style={styles.emptyLinksText} allowFontScaling>
              No links submitted.
            </Text>
          </View>
        ) : (
          <View style={styles.linksList}>
            {playerLinks.map((link) => {
              const matchedValid = validLinks.find(
                (v) => (v.a === link.a && v.b === link.b) || (v.a === link.b && v.b === link.a),
              );
              const isValid = !!matchedValid;

              return (
                <View
                  key={`${link.a}__${link.b}`}
                  style={[styles.linkCard, isValid ? styles.linkCardValid : styles.linkCardInvalid]}
                  testID={`case.reveal.link.${link.a}__${link.b}`}
                  accessible={true}
                  accessibilityRole="summary"
                  accessibilityLabel={`Link ${link.a} to ${link.b}. ${isValid ? 'Valid Contradiction' : 'Invalid Contradiction'}`}
                >
                  <View style={styles.linkHeader}>
                    <Text style={styles.linkPairText} allowFontScaling>
                      {link.a} ↔ {link.b}
                    </Text>
                    <View
                      style={[
                        styles.validityBadge,
                        isValid ? styles.badgeValid : styles.badgeInvalid,
                      ]}
                    >
                      <Text
                        style={[
                          styles.validityBadgeText,
                          isValid ? styles.textValid : styles.textInvalid,
                        ]}
                        allowFontScaling
                      >
                        {isValid ? '✓ Valid Contradiction' : '✗ Invalid Contradiction'}
                      </Text>
                    </View>
                  </View>

                  {matchedValid?.explanation && (
                    <Text style={styles.linkExplanationText} allowFontScaling>
                      {matchedValid.explanation}
                    </Text>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* 4. Timeline of Reveal Beats */}
      <View style={styles.section}>
        <Text style={styles.sectionHeader} allowFontScaling>
          WHAT REALLY HAPPENED // TIMELINE
        </Text>

        <View style={styles.timeline}>
          {explanation.map((beat, idx) => {
            const isExpanded = expandedBeatIdx === idx;
            return (
              <Pressable
                key={idx}
                style={[styles.beatCard, isExpanded && styles.beatCardExpanded]}
                onPress={() => handleToggleBeat(idx)}
                accessibilityRole="button"
                accessibilityLabel={`Reveal beat ${idx + 1}: ${beat.text}. ${isExpanded ? 'Tap to collapse cited clues' : 'Tap to expand cited clues'}`}
                testID={`case.reveal.beat.${idx}`}
              >
                <View style={styles.beatHeader}>
                  {beat.time !== undefined && (
                    <Text style={styles.beatTime} allowFontScaling>
                      {fromTime(beat.time)}
                    </Text>
                  )}
                  <Text style={styles.beatIndex} allowFontScaling>
                    BEAT #{idx + 1}
                  </Text>
                </View>

                <Text style={styles.beatText} allowFontScaling>
                  {beat.text}
                </Text>

                {beat.clueIds && beat.clueIds.length > 0 && (
                  <View style={styles.citationSection}>
                    <Text style={styles.citationPrompt} allowFontScaling>
                      {isExpanded ? '▼ Hide cited evidence' : '▶ View cited evidence'} (
                      {beat.clueIds.length})
                    </Text>

                    {isExpanded && (
                      <View style={styles.citedCluesBox}>
                        {beat.clueIds.map((cid) => {
                          const citedClue = clueLookup.get(cid);
                          return (
                            <View key={cid} style={styles.citedClueRow}>
                              <Text style={styles.citedClueId} allowFontScaling>
                                [{citedClue?.type.toUpperCase() ?? 'CLUE'}] {cid}:
                              </Text>
                              <Text style={styles.citedClueBody} allowFontScaling>
                                {citedClue?.text ?? 'No text available'}
                              </Text>
                            </View>
                          );
                        })}
                      </View>
                    )}
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* 5. Next Actions */}
      <View style={styles.actionsSection}>
        <Pressable
          style={[styles.primaryButton, isStartingNext && styles.primaryButtonDisabled]}
          onPress={handleNextCase}
          accessibilityRole="button"
          accessibilityLabel="Proceed to next case"
          disabled={isStartingNext}
          testID="case.reveal.next"
        >
          <Text style={styles.primaryButtonText} allowFontScaling>
            {isStartingNext ? 'LOADING NEXT CASE...' : 'NEXT CASE'}
          </Text>
        </Pressable>

        <Pressable
          style={styles.secondaryButton}
          onPress={handleBackHome}
          accessibilityRole="button"
          accessibilityLabel="Back to Home"
          testID="case.reveal.home"
        >
          <Text style={styles.secondaryButtonText} allowFontScaling>
            BACK TO HOME
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  content: {
    padding: SPACING.md,
    gap: SPACING.lg,
  },
  notSubmittedText: {
    ...TYPOGRAPHY.body,
    color: COLORS.muted,
    textAlign: 'center',
    padding: SPACING.xl,
    fontStyle: 'italic',
  },
  scoreCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.accent,
    padding: SPACING.lg,
    alignItems: 'center',
    gap: SPACING.xs,
  },
  scoreBadge: {
    ...TYPOGRAPHY.monospace,
    fontSize: 11,
    color: COLORS.accent,
    letterSpacing: 1,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: SPACING.xs,
  },
  scoreValue: {
    ...TYPOGRAPHY.h1,
    fontSize: 48,
    fontWeight: '800',
    color: COLORS.accent,
  },
  scoreUnit: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
  },
  xpText: {
    ...TYPOGRAPHY.caption,
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.success,
  },
  section: {
    gap: SPACING.xs,
  },
  sectionHeader: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.accent,
    letterSpacing: 0.5,
  },
  breakdownCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceBorder,
    paddingBottom: SPACING.xs,
  },
  breakdownLeft: {
    gap: 2,
    flex: 1,
  },
  breakdownLabel: {
    ...TYPOGRAPHY.body,
    fontSize: 14,
    color: COLORS.text,
  },
  statusTag: {
    ...TYPOGRAPHY.caption,
    fontSize: 10,
    fontWeight: '700',
  },
  statusSuccess: {
    color: COLORS.success,
  },
  statusDanger: {
    color: COLORS.danger,
  },
  breakdownPoints: {
    ...TYPOGRAPHY.body,
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.success,
  },
  breakdownPenalty: {
    ...TYPOGRAPHY.body,
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.danger,
  },
  multiplierRow: {
    borderBottomWidth: 0,
    paddingTop: 4,
    paddingBottom: 0,
  },
  multiplierLabel: {
    ...TYPOGRAPHY.body,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.muted,
  },
  multiplierValue: {
    ...TYPOGRAPHY.body,
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.accent,
  },
  emptyLinksBox: {
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  emptyLinksText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.muted,
  },
  linksList: {
    gap: SPACING.xs,
  },
  linkCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 6,
    borderWidth: 1,
    padding: SPACING.sm,
    gap: 4,
  },
  linkCardValid: {
    borderColor: COLORS.success,
  },
  linkCardInvalid: {
    borderColor: COLORS.danger,
  },
  linkHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  linkPairText: {
    ...TYPOGRAPHY.monospace,
    fontSize: 12,
    color: COLORS.text,
    fontWeight: '600',
  },
  validityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeValid: {
    backgroundColor: '#1f3a2c',
  },
  badgeInvalid: {
    backgroundColor: '#381617',
  },
  validityBadgeText: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    fontWeight: '700',
  },
  textValid: {
    color: COLORS.success,
  },
  textInvalid: {
    color: COLORS.danger,
  },
  linkExplanationText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 2,
  },
  timeline: {
    gap: SPACING.sm,
  },
  beatCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    padding: SPACING.md,
    gap: SPACING.xs,
  },
  beatCardExpanded: {
    borderColor: COLORS.accent,
  },
  beatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  beatTime: {
    ...TYPOGRAPHY.monospace,
    fontSize: 12,
    color: COLORS.accent,
    fontWeight: '700',
  },
  beatIndex: {
    ...TYPOGRAPHY.caption,
    fontSize: 10,
    color: COLORS.muted,
    fontWeight: '700',
  },
  beatText: {
    ...TYPOGRAPHY.body,
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.text,
  },
  citationSection: {
    marginTop: SPACING.xs,
    paddingTop: SPACING.xs,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceBorder,
  },
  citationPrompt: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    color: COLORS.accent,
    fontWeight: '600',
  },
  citedCluesBox: {
    marginTop: SPACING.xs,
    backgroundColor: COLORS.surfaceElevated,
    padding: SPACING.sm,
    borderRadius: 6,
    gap: SPACING.xs,
  },
  citedClueRow: {
    gap: 2,
  },
  citedClueId: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.accent,
  },
  citedClueBody: {
    ...TYPOGRAPHY.caption,
    fontSize: 12,
    color: COLORS.text,
    lineHeight: 16,
  },
  actionsSection: {
    gap: SPACING.sm,
    marginTop: SPACING.md,
    marginBottom: SPACING.xl,
  },
  primaryButton: {
    backgroundColor: COLORS.accent,
    paddingVertical: SPACING.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButtonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    ...TYPOGRAPHY.body,
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.bg,
    letterSpacing: 0.5,
  },
  secondaryButton: {
    backgroundColor: COLORS.surfaceElevated,
    paddingVertical: SPACING.md,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  secondaryButtonText: {
    ...TYPOGRAPHY.body,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.muted,
  },
});
