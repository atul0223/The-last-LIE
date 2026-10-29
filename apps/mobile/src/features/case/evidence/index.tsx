import React, { useState, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import type { PublicClue, PublicUnlockedClue, PublicLockedClue } from '@lastlie/case-engine';
import type { CaseSlotProps } from '../slots';
import { useCaseSession } from '../slots';
import { ClueCard } from '../components/ClueCard';
import { COLORS, SPACING, TYPOGRAPHY } from '../../../theme/tokens';

function isLocked(clue: PublicClue): clue is PublicLockedClue {
  return (clue as PublicLockedClue).locked === true;
}

function formatFilterLabel(type: string): string {
  if (type === 'all') return 'All';
  return type
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export default function EvidenceSlot({ sessionId }: CaseSlotProps) {
  const { casePublic, status, markClueRead, unlockClue } = useCaseSession(sessionId);

  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [selectedClue, setSelectedClue] = useState<PublicUnlockedClue | null>(null);
  const [requestTarget, setRequestTarget] = useState<{ id: string; cost: number } | null>(null);
  const [readClues, setReadClues] = useState<Set<string>>(() => new Set());
  const [requestError, setRequestError] = useState<string | null>(null);
  const [isUnlocking, setIsUnlocking] = useState<boolean>(false);

  const clues = useMemo(() => casePublic?.clues ?? [], [casePublic?.clues]);

  // Extract distinct clue types for chips
  const filterTypes = useMemo(() => {
    const types = new Set<string>();
    clues.forEach((c) => types.add(c.type));
    return ['all', ...Array.from(types)];
  }, [clues]);

  // Filtered clues
  const filteredClues = useMemo(() => {
    if (activeFilter === 'all') return clues;
    return clues.filter((c) => c.type === activeFilter);
  }, [clues, activeFilter]);

  const handleOpenDetail = useCallback(
    (clue: PublicClue) => {
      if (isLocked(clue)) return;
      markClueRead(clue.id);
      setReadClues((prev) => {
        const next = new Set(prev);
        next.add(clue.id);
        return next;
      });
      setSelectedClue(clue as PublicUnlockedClue);
    },
    [markClueRead],
  );

  const handleRequestUnlock = useCallback((placeholderId: string) => {
    const found = clues.find((c) => c.id === placeholderId);
    if (!found || !isLocked(found)) return;
    const cost = found.hint?.kind === 'request' ? found.hint.cost : 0;
    setRequestTarget({ id: placeholderId, cost });
    setRequestError(null);
  }, [clues]);

  const handleConfirmRequest = useCallback(async () => {
    if (!requestTarget) return;
    setIsUnlocking(true);
    setRequestError(null);
    try {
      await unlockClue(requestTarget.id, { kind: 'request', cost: requestTarget.cost });
      setRequestTarget(null);
    } catch (err: unknown) {
      setRequestError(err instanceof Error ? err.message : 'Failed to unlock evidence');
    } finally {
      setIsUnlocking(false);
    }
  }, [requestTarget, unlockClue]);

  if (status === 'loading' || !casePublic) {
    return (
      <View style={styles.container} testID="case.evidence.loading">
        <Text style={styles.emptyText} allowFontScaling>
          Loading evidence catalog...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container} testID="case.evidence.container">
      {/* Type Filter Chips */}
      <View style={styles.filterSection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {filterTypes.map((type) => {
            const isActive = activeFilter === type;
            return (
              <Pressable
                key={type}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                onPress={() => setActiveFilter(type)}
                accessibilityRole="button"
                accessibilityLabel={`Filter by ${formatFilterLabel(type)}`}
                accessibilityState={{ selected: isActive }}
                testID={`case.evidence.filter.${type}`}
              >
                <Text
                  style={[styles.filterText, isActive && styles.filterTextActive]}
                  allowFontScaling
                >
                  {formatFilterLabel(type)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Clues Count Header */}
      <View style={styles.summaryRow}>
        <Text style={styles.summaryText} allowFontScaling>
          SHOWING {filteredClues.length} EVIDENCE {filteredClues.length === 1 ? 'RECORD' : 'RECORDS'}
        </Text>
      </View>

      {/* FlashList of Clues */}
      {filteredClues.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText} allowFontScaling>
            No evidence found matching filter &quot;{formatFilterLabel(activeFilter)}&quot;.
          </Text>
        </View>
      ) : (
        <View style={styles.listWrapper}>
          <FlashList
            data={filteredClues}
            estimatedItemSize={140}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const isUnread = !isLocked(item) && !readClues.has(item.id);
              return (
                <ClueCard
                  clue={item}
                  isUnread={isUnread}
                  onPress={() => handleOpenDetail(item)}
                  onRequestUnlock={handleRequestUnlock}
                  testID={`case.evidence.card.${item.id}`}
                />
              );
            }}
          />
        </View>
      )}

      {/* In-App Detail Bottom Sheet */}
      {selectedClue && (
        <View style={styles.modalOverlay} testID="case.evidence.detail.sheet">
          <View
            style={styles.sheetContainer}
            accessible={true}
            accessibilityRole="summary"
            accessibilityLabel="Evidence Detail"
          >
            <View style={styles.sheetHeader}>
              <View style={styles.sheetTitleGroup}>
                <Text style={styles.sheetTypeBadge} allowFontScaling>
                  {selectedClue.reliability.toUpperCase()} //{' '}
                  {selectedClue.type.replace(/_/g, ' ').toUpperCase()}
                </Text>
                <Text style={styles.sheetIdText} allowFontScaling>
                  ID: {selectedClue.id}
                </Text>
              </View>
              <Pressable
                style={styles.closeButton}
                onPress={() => setSelectedClue(null)}
                accessibilityRole="button"
                accessibilityLabel="Close detail"
              >
                <Text style={styles.closeButtonText} allowFontScaling>
                  ✕
                </Text>
              </Pressable>
            </View>

            <ScrollView style={styles.sheetBody}>
              {selectedClue.source && (
                <View style={styles.sourceBox}>
                  <Text style={styles.sourceLabel} allowFontScaling>
                    Chain of Custody / Source:
                  </Text>
                  <Text style={styles.sourceVal} allowFontScaling>
                    {selectedClue.source}
                  </Text>
                </View>
              )}

              <Text style={styles.sheetContentLabel} allowFontScaling>
                EVIDENCE TRANSCRIPT / DATA:
              </Text>

              <View style={styles.transcriptBox}>
                <Text
                  style={[
                    styles.sheetBodyText,
                    (selectedClue.type === 'access_log' ||
                      selectedClue.type === 'device_log' ||
                      selectedClue.type === 'cctv') &&
                      styles.monospaceSheetText,
                  ]}
                  allowFontScaling
                >
                  {selectedClue.text}
                </Text>
              </View>

              {selectedClue.tags && selectedClue.tags.length > 0 && (
                <View style={styles.detailTagsRow}>
                  {selectedClue.tags.map((t) => (
                    <View key={t} style={styles.detailTagPill}>
                      <Text style={styles.detailTagText} allowFontScaling>
                        #{t}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      )}

      {/* Request Evidence Confirmation Bottom Sheet */}
      {requestTarget && (
        <View style={styles.modalOverlay} testID="case.evidence.request.sheet">
          <View
            style={styles.sheetContainer}
            accessible={true}
            accessibilityRole="alert"
            accessibilityLabel="Confirm evidence request"
          >
            <Text style={styles.confirmTitle} allowFontScaling>
              CONFIRM EVIDENCE REQUEST
            </Text>
            <Text style={styles.confirmPrompt} allowFontScaling>
              Requesting evidence &quot;{requestTarget.id}&quot; will cost {requestTarget.cost}{' '}
              points from your final score. This action cannot be reversed.
            </Text>

            {requestError && (
              <Text style={styles.errorText} allowFontScaling>
                {requestError}
              </Text>
            )}

            <View style={styles.confirmActions}>
              <Pressable
                style={styles.cancelButton}
                onPress={() => setRequestTarget(null)}
                accessibilityRole="button"
                accessibilityLabel="Cancel evidence request"
                disabled={isUnlocking}
              >
                <Text style={styles.cancelButtonText} allowFontScaling>
                  Cancel
                </Text>
              </Pressable>

              <Pressable
                style={styles.confirmButton}
                onPress={handleConfirmRequest}
                accessibilityRole="button"
                accessibilityLabel={`Confirm request for ${requestTarget.cost} points`}
                disabled={isUnlocking}
                testID="case.evidence.request.confirm"
              >
                <Text style={styles.confirmButtonText} allowFontScaling>
                  {isUnlocking ? 'Requesting...' : `Confirm (−${requestTarget.cost} pts)`}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  filterSection: {
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.bg,
  },
  filterScroll: {
    paddingHorizontal: SPACING.md,
    gap: SPACING.xs,
  },
  filterChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  filterChipActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  filterText: {
    ...TYPOGRAPHY.caption,
    fontWeight: '600',
    color: COLORS.muted,
  },
  filterTextActive: {
    color: COLORS.bg,
    fontWeight: '700',
  },
  summaryRow: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  summaryText: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    color: COLORS.muted,
    letterSpacing: 0.5,
  },
  listWrapper: {
    flex: 1,
    paddingHorizontal: SPACING.md,
  },
  emptyState: {
    padding: SPACING.xl,
    alignItems: 'center',
  },
  emptyText: {
    ...TYPOGRAPHY.body,
    color: COLORS.muted,
    textAlign: 'center',
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
    maxHeight: '85%',
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceBorder,
    paddingBottom: SPACING.md,
    marginBottom: SPACING.md,
  },
  sheetTitleGroup: {
    gap: 4,
    flex: 1,
  },
  sheetTypeBadge: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.accent,
  },
  sheetIdText: {
    ...TYPOGRAPHY.monospace,
    fontSize: 12,
    color: COLORS.muted,
  },
  closeButton: {
    padding: SPACING.xs,
    marginLeft: SPACING.sm,
  },
  closeButtonText: {
    fontSize: 18,
    color: COLORS.muted,
    fontWeight: '700',
  },
  sheetBody: {
    marginBottom: SPACING.md,
  },
  sourceBox: {
    backgroundColor: COLORS.surfaceElevated,
    padding: SPACING.sm,
    borderRadius: 6,
    marginBottom: SPACING.md,
    gap: 2,
  },
  sourceLabel: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    color: COLORS.muted,
  },
  sourceVal: {
    ...TYPOGRAPHY.body,
    fontSize: 13,
    color: COLORS.text,
  },
  sheetContentLabel: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    color: COLORS.muted,
    marginBottom: SPACING.xs,
    letterSpacing: 0.5,
  },
  transcriptBox: {
    backgroundColor: COLORS.surfaceElevated,
    padding: SPACING.md,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    marginBottom: SPACING.md,
  },
  sheetBodyText: {
    ...TYPOGRAPHY.body,
    fontSize: 14,
    lineHeight: 22,
    color: COLORS.text,
  },
  monospaceSheetText: {
    ...TYPOGRAPHY.monospace,
    fontSize: 13,
    lineHeight: 20,
    color: COLORS.accent,
  },
  detailTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  detailTagPill: {
    backgroundColor: COLORS.surfaceElevated,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  detailTagText: {
    ...TYPOGRAPHY.caption,
    fontSize: 12,
    color: COLORS.muted,
  },
  confirmTitle: {
    ...TYPOGRAPHY.h2,
    fontSize: 18,
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  confirmPrompt: {
    ...TYPOGRAPHY.body,
    color: COLORS.muted,
    lineHeight: 22,
    marginBottom: SPACING.lg,
  },
  errorText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.danger,
    marginBottom: SPACING.sm,
  },
  confirmActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: SPACING.sm,
  },
  cancelButton: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: 6,
    backgroundColor: COLORS.surfaceElevated,
  },
  cancelButtonText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.muted,
    fontWeight: '600',
  },
  confirmButton: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: 6,
    backgroundColor: COLORS.accent,
  },
  confirmButtonText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.bg,
    fontWeight: '700',
  },
});
