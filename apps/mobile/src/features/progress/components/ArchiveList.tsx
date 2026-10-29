import React from 'react';
import { StyleSheet, Text, View, Pressable, FlatList } from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY } from '../../../theme/tokens';
import type { ArchiveCaseItem } from '../types';

interface ArchiveListProps {
  items: ArchiveCaseItem[];
  onReplay: (caseId: string) => void;
  isReplaying?: boolean;
}

export function ArchiveList({ items, onReplay, isReplaying = false }: ArchiveListProps) {
  if (items.length === 0) {
    return (
      <View style={styles.emptyContainer} testID="progress.archive.empty">
        <Text style={styles.emptyIcon}>📁</Text>
        <Text style={styles.emptyTitle} allowFontScaling>
          NO CASES ARCHIVED
        </Text>
        <Text style={styles.emptySubtitle} allowFontScaling>
          Cases you solve will be archived here with detailed records, theory comparisons, and
          replay capabilities.
        </Text>
      </View>
    );
  }

  const renderItem = ({ item }: { item: ArchiveCaseItem }) => {
    const isCorrect = item.isCorrect;
    const starsText = '★'.repeat(item.stars) + '☆'.repeat(Math.max(0, 3 - item.stars));

    return (
      <View
        style={styles.card}
        testID={`progress.archive.item.${item.caseId}`}
        accessible={true}
        accessibilityRole="summary"
        accessibilityLabel={`Archived case: ${item.title}. Result: ${
          isCorrect ? 'Correct identification' : 'Incorrect hypothesis'
        }. Score: ${item.score} points.`}
      >
        {/* Top Meta Row */}
        <View style={styles.cardHeader}>
          <View style={styles.titleColumn}>
            <Text style={styles.caseCode} allowFontScaling>
              {item.caseId.toUpperCase()} • DIFFICULTY {item.difficulty}
            </Text>
            <Text style={styles.caseTitle} allowFontScaling>
              {item.title}
            </Text>
          </View>

          <View
            style={[
              styles.statusBadge,
              isCorrect ? styles.statusBadgeSuccess : styles.statusBadgeDanger,
            ]}
          >
            <Text
              style={[
                styles.statusBadgeText,
                isCorrect ? styles.textSuccess : styles.textDanger,
              ]}
              allowFontScaling
            >
              {isCorrect ? '✓ SOLVED' : '✗ FAILED'}
            </Text>
          </View>
        </View>

        {/* Score & Evaluation Details */}
        <View style={styles.evalRow}>
          <View style={styles.evalBox}>
            <Text style={styles.evalLabel} allowFontScaling>
              SCORE
            </Text>
            <Text style={styles.evalValue} allowFontScaling>
              {item.score} <Text style={styles.evalUnit}>PTS</Text>
            </Text>
          </View>

          <View style={styles.evalBox}>
            <Text style={styles.evalLabel} allowFontScaling>
              XP AWARDED
            </Text>
            <Text style={styles.evalValue} allowFontScaling>
              +{item.xp} <Text style={styles.evalUnit}>XP</Text>
            </Text>
          </View>

          <View style={styles.evalBox}>
            <Text style={styles.evalLabel} allowFontScaling>
              RATING
            </Text>
            <Text style={styles.starsText} allowFontScaling>
              {starsText}
            </Text>
          </View>
        </View>

        {/* Previous vs Replay Theory Comparison */}
        {item.previousTheory && item.latestTheory && (
          <View
            style={styles.comparisonBox}
            testID={`progress.archive.comparison.${item.caseId}`}
          >
            <Text style={styles.comparisonTitle} allowFontScaling>
              THEORY COMPARISON (INITIAL VS REPLAY)
            </Text>

            <View style={styles.comparisonGrid}>
              {/* Previous Theory */}
              <View style={styles.theoryColumn}>
                <Text style={styles.theoryColumnHeader} allowFontScaling>
                  INITIAL ATTEMPT
                </Text>
                <Text style={styles.theoryLabel} numberOfLines={2} allowFontScaling>
                  {item.previousTheory.hypothesisLabel}
                </Text>
                <Text
                  style={[
                    styles.theoryStatusText,
                    item.previousTheory.isCorrect ? styles.textSuccess : styles.textDanger,
                  ]}
                  allowFontScaling
                >
                  {item.previousTheory.isCorrect ? '✓ Correct' : '✗ Incorrect'} ({item.previousTheory.score} pts)
                </Text>
              </View>

              {/* Latest Replay Theory */}
              <View style={styles.theoryColumn}>
                <Text style={styles.theoryColumnHeader} allowFontScaling>
                  REPLAY RESOLUTION
                </Text>
                <Text style={styles.theoryLabel} numberOfLines={2} allowFontScaling>
                  {item.latestTheory.hypothesisLabel}
                </Text>
                <Text
                  style={[
                    styles.theoryStatusText,
                    item.latestTheory.isCorrect ? styles.textSuccess : styles.textDanger,
                  ]}
                  allowFontScaling
                >
                  {item.latestTheory.isCorrect ? '✓ Correct' : '✗ Incorrect'} ({item.latestTheory.score} pts)
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Bottom CTA Row: Solved Date & Replay Action */}
        <View style={styles.cardFooter}>
          <Text style={styles.dateText} allowFontScaling>
            Solved: {new Date(item.solvedAt).toLocaleDateString()}
          </Text>

          <Pressable
            style={[styles.replayButton, isReplaying && styles.buttonDisabled]}
            disabled={isReplaying}
            onPress={() => onReplay(item.caseId)}
            testID={`progress.archive.replay.${item.caseId}`}
            accessibilityRole="button"
            accessibilityLabel={`Replay case ${item.title} for twenty-five percent experience points`}
          >
            <Text style={styles.replayButtonText} allowFontScaling>
              Replay Case (0.25x XP)
            </Text>
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.listContainer} testID="progress.archive.list">
      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item.sessionId}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  listContainer: {
    gap: SPACING.md,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleColumn: {
    flex: 1,
    paddingRight: SPACING.sm,
  },
  caseCode: {
    ...TYPOGRAPHY.caption,
    color: COLORS.muted,
    letterSpacing: 1.2,
  },
  caseTitle: {
    ...TYPOGRAPHY.h2,
    color: COLORS.text,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: 4,
  },
  statusBadgeSuccess: {
    backgroundColor: 'rgba(102, 187, 106, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(102, 187, 106, 0.4)',
  },
  statusBadgeDanger: {
    backgroundColor: 'rgba(239, 83, 80, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 83, 80, 0.4)',
  },
  statusBadgeText: {
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
  },
  textSuccess: {
    color: COLORS.success,
  },
  textDanger: {
    color: COLORS.danger,
  },
  evalRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderRadius: 6,
    padding: SPACING.sm,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  evalBox: {
    alignItems: 'center',
    flex: 1,
  },
  evalLabel: {
    fontSize: 9,
    color: COLORS.muted,
    letterSpacing: 1,
    marginBottom: 2,
  },
  evalValue: {
    ...TYPOGRAPHY.body,
    ...TYPOGRAPHY.monospace,
    fontWeight: '700',
    color: COLORS.text,
  },
  evalUnit: {
    fontSize: 10,
    color: COLORS.muted,
  },
  starsText: {
    color: COLORS.accent,
    fontSize: 13,
  },
  comparisonBox: {
    backgroundColor: 'rgba(230, 201, 142, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(230, 201, 142, 0.2)',
    borderRadius: 6,
    padding: SPACING.sm,
    gap: 6,
  },
  comparisonTitle: {
    fontSize: 10,
    color: COLORS.accent,
    fontWeight: '700',
    letterSpacing: 1,
  },
  comparisonGrid: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  theoryColumn: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    padding: SPACING.xs,
    borderRadius: 4,
    gap: 2,
  },
  theoryColumnHeader: {
    fontSize: 9,
    color: COLORS.muted,
    fontWeight: '700',
  },
  theoryLabel: {
    fontSize: 11,
    color: COLORS.text,
  },
  theoryStatusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  dateText: {
    fontSize: 11,
    color: COLORS.muted,
  },
  replayButton: {
    backgroundColor: 'rgba(230, 201, 142, 0.15)',
    borderWidth: 1,
    borderColor: COLORS.accent,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    borderRadius: 4,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  replayButtonText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.accent,
    fontWeight: '700',
  },
  emptyContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    padding: SPACING.xl,
    alignItems: 'center',
    gap: SPACING.xs,
  },
  emptyIcon: {
    fontSize: 32,
    marginBottom: SPACING.xs,
  },
  emptyTitle: {
    ...TYPOGRAPHY.h2,
    color: COLORS.text,
  },
  emptySubtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.muted,
    textAlign: 'center',
    lineHeight: 20,
  },
});
