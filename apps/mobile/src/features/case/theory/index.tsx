import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable } from 'react-native';
import type { CaseSlotProps } from '../slots';
import { useCaseSession } from '../slots';
import { COLORS, SPACING, TYPOGRAPHY } from '../../../theme/tokens';

export default function TheorySlot({ sessionId }: CaseSlotProps) {
  const { casePublic, session, submit } = useCaseSession(sessionId);

  const [selectedHypothesisId, setSelectedHypothesisId] = useState<string | null>(null);
  const [selectedClueIds, setSelectedClueIds] = useState<string[]>([]);
  const [showConfirm, setShowConfirm] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [limitWarning, setLimitWarning] = useState<string | null>(null);

  const hypotheses = casePublic?.hypotheses ?? [];
  const unlockedClues = (casePublic?.clues ?? []).filter((c) => !('locked' in c && c.locked));
  const boardLinks = session?.board?.links ?? [];

  const handleSelectHypothesis = useCallback((id: string) => {
    setSelectedHypothesisId(id);
  }, []);

  const handleToggleClue = useCallback((clueId: string) => {
    setSelectedClueIds((prev) => {
      if (prev.includes(clueId)) {
        setLimitWarning(null);
        return prev.filter((id) => id !== clueId);
      }
      if (prev.length >= 3) {
        setLimitWarning('Maximum 3 supporting clues allowed.');
        return prev;
      }
      setLimitWarning(null);
      return [...prev, clueId];
    });
  }, []);

  const handleOpenConfirm = useCallback(() => {
    if (!selectedHypothesisId) return;
    setShowConfirm(true);
  }, [selectedHypothesisId]);

  const handleConfirmSubmit = useCallback(async () => {
    if (!selectedHypothesisId || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await submit({
        hypothesisId: selectedHypothesisId,
        supportingClueIds: selectedClueIds,
        contradictions: boardLinks.map((l) => ({
          a: l.a,
          b: l.b,
          explanation: l.explanation,
        })),
      });
      setShowConfirm(false);
    } catch {
      // Error handled by store/hook
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedHypothesisId, selectedClueIds, boardLinks, isSubmitting, submit]);

  if (!casePublic) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText} allowFontScaling>
          Loading theory formulation...
        </Text>
      </View>
    );
  }

  const isSubmitDisabled = !selectedHypothesisId || isSubmitting;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      testID="case.theory.container"
    >
      <View style={styles.headerSection}>
        <Text style={styles.badge} allowFontScaling>
          FORMULATE HYPOTHESIS & SUBMIT THEORY
        </Text>
        <Text style={styles.headerTitle} allowFontScaling>
          Final Investigation Report
        </Text>
        <Text style={styles.headerSubtitle} allowFontScaling>
          Select your prime hypothesis, cite up to 3 supporting clues, and review board
          contradictions.
        </Text>
      </View>

      {/* 1. Pick exactly one hypothesis */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle} allowFontScaling>
          1. PRIME HYPOTHESIS (Pick one)
        </Text>

        <View style={styles.optionsList}>
          {hypotheses.map((hyp) => {
            const isSelected = selectedHypothesisId === hyp.id;
            return (
              <Pressable
                key={hyp.id}
                style={[styles.hypothesisCard, isSelected && styles.hypothesisCardSelected]}
                onPress={() => handleSelectHypothesis(hyp.id)}
                accessibilityRole="button"
                accessibilityLabel={`Hypothesis: ${hyp.label}. ${isSelected ? 'Selected' : 'Not selected'}`}
                accessibilityState={{ selected: isSelected }}
                testID={`case.theory.hypothesis.${hyp.id}`}
              >
                <View style={styles.radioRow}>
                  <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                    {isSelected && <View style={styles.radioInner} />}
                  </View>
                  <Text
                    style={[styles.hypothesisText, isSelected && styles.hypothesisTextSelected]}
                    allowFontScaling
                  >
                    {hyp.label}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* 2. Choose up to 3 supporting clues */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle} allowFontScaling>
            2. KEY SUPPORTING EVIDENCE ({selectedClueIds.length}/3)
          </Text>
        </View>

        {limitWarning && (
          <Text style={styles.warningText} allowFontScaling>
            {limitWarning}
          </Text>
        )}

        <View style={styles.optionsList}>
          {unlockedClues.map((clue) => {
            const isSelected = selectedClueIds.includes(clue.id);
            return (
              <Pressable
                key={clue.id}
                style={[styles.clueCard, isSelected && styles.clueCardSelected]}
                onPress={() => handleToggleClue(clue.id)}
                accessibilityRole="button"
                accessibilityLabel={`Supporting clue ${clue.id}, type ${clue.type}. ${isSelected ? 'Selected' : 'Not selected'}`}
                accessibilityState={{ selected: isSelected }}
                testID={`case.theory.clue.${clue.id}`}
              >
                <View style={styles.checkboxRow}>
                  <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                    {isSelected && (
                      <Text style={styles.checkmark} allowFontScaling>
                        ✓
                      </Text>
                    )}
                  </View>
                  <View style={styles.clueInfo}>
                    <Text style={styles.clueType} allowFontScaling>
                      {clue.type.replace(/_/g, ' ').toUpperCase()} // {clue.id}
                    </Text>
                    <Text style={styles.clueSnippet} numberOfLines={2} allowFontScaling>
                      {clue.text}
                    </Text>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* 3. Read-only list of board links */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle} allowFontScaling>
          3. ESTABLISHED CONTRADICTIONS ({boardLinks.length})
        </Text>

        {boardLinks.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyBoxText} allowFontScaling>
              No contradiction links placed on the evidence board yet. (You can still submit, but
              bonus contradiction points will be 0.)
            </Text>
          </View>
        ) : (
          <View style={styles.linksList}>
            {boardLinks.map((link) => (
              <View
                key={`${link.a}__${link.b}`}
                style={styles.linkRow}
                accessible={true}
                accessibilityRole="summary"
                accessibilityLabel={`Board contradiction between ${link.a} and ${link.b}`}
              >
                <Text style={styles.linkText} allowFontScaling>
                  {`⚡ ${link.a} ↔ ${link.b}`}
                </Text>
                {link.explanation && (
                  <Text style={styles.linkExplanation} allowFontScaling>
                    {link.explanation}
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Submit Section */}
      <View style={styles.submitSection}>
        <Pressable
          style={[styles.submitButton, isSubmitDisabled && styles.submitButtonDisabled]}
          disabled={isSubmitDisabled}
          onPress={handleOpenConfirm}
          accessibilityRole="button"
          accessibilityLabel="Submit theory report"
          testID="case.theory.submit"
        >
          <Text style={styles.submitButtonText} allowFontScaling>
            {isSubmitting ? 'SUBMITTING...' : 'SUBMIT THEORY REPORT'}
          </Text>
        </Pressable>
      </View>

      {/* Confirmation Bottom Sheet */}
      {showConfirm && (
        <View style={styles.modalOverlay} testID="case.theory.confirm.sheet">
          <View
            style={styles.sheetContainer}
            accessible={true}
            accessibilityRole="alert"
            accessibilityLabel="Confirm final submission"
          >
            <Text style={styles.confirmTitle} allowFontScaling>
              FINAL CASE SUBMISSION
            </Text>
            <Text style={styles.confirmPrompt} allowFontScaling>
              You can&apos;t change your answer once submitted. Your investigation will be
              evaluated by headquarters immediately.
            </Text>

            <View style={styles.confirmSummary}>
              <Text style={styles.summaryLabel} allowFontScaling>
                Selected Hypothesis:
              </Text>
              <Text style={styles.summaryValue} allowFontScaling>
                {hypotheses.find((h) => h.id === selectedHypothesisId)?.label}
              </Text>

              <Text style={styles.summaryLabel} allowFontScaling>
                Supporting Clues: {selectedClueIds.length}
              </Text>
              <Text style={styles.summaryLabel} allowFontScaling>
                Board Contradictions: {boardLinks.length}
              </Text>
            </View>

            <View style={styles.confirmActions}>
              <Pressable
                style={styles.cancelBtn}
                onPress={() => setShowConfirm(false)}
                accessibilityRole="button"
                accessibilityLabel="Cancel submission"
                disabled={isSubmitting}
              >
                <Text style={styles.cancelBtnText} allowFontScaling>
                  Review Again
                </Text>
              </Pressable>

              <Pressable
                style={[styles.confirmBtn, isSubmitting && styles.confirmBtnDisabled]}
                onPress={handleConfirmSubmit}
                accessibilityRole="button"
                accessibilityLabel="Confirm and submit theory"
                disabled={isSubmitting}
                testID="case.theory.confirm"
              >
                <Text style={styles.confirmBtnText} allowFontScaling>
                  {isSubmitting ? 'Submitting...' : 'Confirm Submission'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
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
  headerSection: {
    gap: SPACING.xs,
  },
  badge: {
    ...TYPOGRAPHY.monospace,
    color: COLORS.accent,
    fontSize: 11,
    letterSpacing: 0.5,
  },
  headerTitle: {
    ...TYPOGRAPHY.h1,
    color: COLORS.text,
  },
  headerSubtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.muted,
    fontSize: 14,
  },
  emptyText: {
    ...TYPOGRAPHY.body,
    color: COLORS.muted,
    textAlign: 'center',
    padding: SPACING.xl,
  },
  section: {
    gap: SPACING.sm,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.accent,
    letterSpacing: 0.5,
  },
  warningText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.danger,
    fontWeight: '600',
  },
  optionsList: {
    gap: SPACING.xs,
  },
  hypothesisCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    borderRadius: 8,
    padding: SPACING.md,
  },
  hypothesisCardSelected: {
    borderColor: COLORS.accent,
    backgroundColor: COLORS.surfaceElevated,
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.muted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioCircleSelected: {
    borderColor: COLORS.accent,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.accent,
  },
  hypothesisText: {
    ...TYPOGRAPHY.body,
    fontSize: 15,
    color: COLORS.text,
    flex: 1,
  },
  hypothesisTextSelected: {
    color: COLORS.text,
    fontWeight: '600',
  },
  clueCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    borderRadius: 8,
    padding: SPACING.sm + 2,
  },
  clueCardSelected: {
    borderColor: COLORS.accent,
    backgroundColor: COLORS.surfaceElevated,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: COLORS.muted,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  checkboxSelected: {
    borderColor: COLORS.accent,
    backgroundColor: COLORS.accent,
  },
  checkmark: {
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.bg,
  },
  clueInfo: {
    flex: 1,
    gap: 2,
  },
  clueType: {
    ...TYPOGRAPHY.caption,
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.accent,
  },
  clueSnippet: {
    ...TYPOGRAPHY.caption,
    fontSize: 12,
    color: COLORS.text,
  },
  emptyBox: {
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  emptyBoxText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.muted,
    lineHeight: 18,
  },
  linksList: {
    gap: SPACING.xs,
  },
  linkRow: {
    backgroundColor: COLORS.surface,
    padding: SPACING.sm,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    gap: 2,
  },
  linkText: {
    ...TYPOGRAPHY.monospace,
    fontSize: 12,
    color: COLORS.accent,
    fontWeight: '600',
  },
  linkExplanation: {
    ...TYPOGRAPHY.caption,
    color: COLORS.muted,
    fontSize: 11,
  },
  submitSection: {
    marginTop: SPACING.sm,
    marginBottom: SPACING.xl,
  },
  submitButton: {
    backgroundColor: COLORS.accent,
    paddingVertical: SPACING.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.4,
  },
  submitButtonText: {
    ...TYPOGRAPHY.body,
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.bg,
    letterSpacing: 0.5,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
    zIndex: 100,
  },
  sheetContainer: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  confirmTitle: {
    ...TYPOGRAPHY.h2,
    fontSize: 18,
    color: COLORS.text,
  },
  confirmPrompt: {
    ...TYPOGRAPHY.body,
    color: COLORS.muted,
    lineHeight: 20,
  },
  confirmSummary: {
    backgroundColor: COLORS.surfaceElevated,
    padding: SPACING.md,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    gap: 4,
  },
  summaryLabel: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    color: COLORS.muted,
  },
  summaryValue: {
    ...TYPOGRAPHY.body,
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '600',
    marginBottom: 4,
  },
  confirmActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: SPACING.sm,
  },
  cancelBtn: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: 6,
    backgroundColor: COLORS.surfaceElevated,
  },
  cancelBtnText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.muted,
    fontWeight: '600',
  },
  confirmBtn: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: 6,
    backgroundColor: COLORS.accent,
  },
  confirmBtnDisabled: {
    opacity: 0.5,
  },
  confirmBtnText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.bg,
    fontWeight: '700',
  },
});
