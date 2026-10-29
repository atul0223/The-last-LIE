import React, { useState, useMemo } from 'react';
import { StyleSheet, Text, View, Pressable, ScrollView, TextInput } from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY } from '../../theme/tokens';
import { useGameService, useSessionStore } from '../../store';
import { CASE_CATALOG, type CaseCatalogItem } from './catalog';
import {
  filterCases,
  type DifficultyFilter,
  type MysteryTypeFilter,
  type StatusFilter,
} from './filterCases';

import { navigateTo } from '../home/navigation';

interface SafeTextInputProps extends React.ComponentProps<typeof TextInput> {
  testID?: string;
}

const SafeTextInput =
  typeof document === 'undefined'
    ? function SafeTextInputNodeFallback(props: SafeTextInputProps) {
        return (
          <View testID={props.testID} style={props.style}>
            <Text style={{ color: props.placeholderTextColor as string }} allowFontScaling>
              {props.value || props.placeholder}
            </Text>
          </View>
        );
      }
    : TextInput;

const DIFFICULTY_OPTIONS: { id: DifficultyFilter; label: string }[] = [
  { id: 'all', label: 'ALL' },
  { id: 1, label: '1★' },
  { id: 2, label: '2★' },
  { id: 3, label: '3★' },
  { id: 4, label: '4★' },
  { id: 5, label: '5★' },
];

const TYPE_OPTIONS: { id: MysteryTypeFilter; label: string }[] = [
  { id: 'all', label: 'ALL TYPES' },
  { id: 'forged_message', label: 'FORGED MESSAGE' },
  { id: 'missing_item', label: 'MISSING ITEM' },
  { id: 'false_alibi', label: 'FALSE ALIBI' },
];

const STATUS_OPTIONS: { id: StatusFilter; label: string }[] = [
  { id: 'all', label: 'ALL' },
  { id: 'unsolved', label: 'UNSOLVED' },
  { id: 'solved', label: 'SOLVED' },
];

export default function LibraryFeature() {
  const gameService = useGameService();
  const sessions = useSessionStore((state) => state.sessions);
  const results = useSessionStore((state) => state.results);

  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyFilter>('all');
  const [selectedType, setSelectedType] = useState<MysteryTypeFilter>('all');
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [startingCaseId, setStartingCaseId] = useState<string | null>(null);

  // 1. Map solved and in-progress states
  const solvedCaseIds = useMemo(() => {
    const set = new Set<string>();
    for (const s of Object.values(sessions)) {
      if (s.status === 'submitted' || results[s.id]) {
        set.add(s.caseId);
      }
    }
    return set;
  }, [sessions, results]);

  const inProgressMap = useMemo(() => {
    const map = new Map<string, string>(); // caseId -> sessionId
    for (const s of Object.values(sessions)) {
      if (s.status === 'in_progress') {
        map.set(s.caseId, s.id);
      }
    }
    return map;
  }, [sessions]);

  // 2. Filter cases using pure filter function
  const filteredCases = useMemo(() => {
    return filterCases(
      CASE_CATALOG,
      {
        difficulty: selectedDifficulty,
        mysteryType: selectedType,
        status: selectedStatus,
        searchQuery,
      },
      solvedCaseIds,
    );
  }, [selectedDifficulty, selectedType, selectedStatus, searchQuery, solvedCaseIds]);

  // 3. Handle opening/starting case
  const handleOpenCase = async (item: CaseCatalogItem) => {
    if (startingCaseId) return;

    // If an in-progress session already exists for this case, resume it
    const existingSessionId = inProgressMap.get(item.id);
    if (existingSessionId) {
      navigateTo(`/case/${existingSessionId}`);
      return;
    }

    const isSolved = solvedCaseIds.has(item.id);
    setStartingCaseId(item.id);
    try {
      const mode = isSolved ? 'replay' : 'normal';
      const { session } = await gameService.startSession({
        caseId: item.id,
        mode,
      });
      navigateTo(`/case/${session.id}`);
    } catch {
      // Graceful error fallback
    } finally {
      setStartingCaseId(null);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      testID="library.screen"
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title} allowFontScaling>
          CASE ARCHIVE
        </Text>
        <Text style={styles.subtitle} allowFontScaling>
          Active and declassified dossiers from the central precinct
        </Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchBarContainer}>
        <Text style={styles.searchIcon} allowFontScaling>
          🔍
        </Text>
        <SafeTextInput
          style={styles.searchInput}
          placeholder="Search by title, dossier code, or mystery type..."
          placeholderTextColor={COLORS.muted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          accessibilityLabel="Search cases"
          testID="library.search.input"
          allowFontScaling
        />
        {searchQuery.length > 0 && (
          <Pressable
            onPress={() => setSearchQuery('')}
            accessibilityRole="button"
            accessibilityLabel="Clear search"
          >
            <Text style={styles.clearIcon} allowFontScaling>
              ✕
            </Text>
          </Pressable>
        )}
      </View>

      {/* Difficulty Filter Chips */}
      <View style={styles.filterSection}>
        <Text style={styles.filterSectionLabel} allowFontScaling>
          DIFFICULTY
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {DIFFICULTY_OPTIONS.map((opt) => {
            const isActive = selectedDifficulty === opt.id;
            return (
              <Pressable
                key={String(opt.id)}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                onPress={() => setSelectedDifficulty(opt.id)}
                accessibilityRole="button"
                accessibilityLabel={`Filter difficulty: ${opt.label}`}
                testID={`library.filter.difficulty.${opt.id}`}
              >
                <Text
                  style={[styles.filterText, isActive && styles.filterTextActive]}
                  allowFontScaling
                >
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Mystery Type Filter Chips */}
      <View style={styles.filterSection}>
        <Text style={styles.filterSectionLabel} allowFontScaling>
          MYSTERY TYPE
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {TYPE_OPTIONS.map((opt) => {
            const isActive = selectedType === opt.id;
            return (
              <Pressable
                key={opt.id}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                onPress={() => setSelectedType(opt.id)}
                accessibilityRole="button"
                accessibilityLabel={`Filter mystery type: ${opt.label}`}
                testID={`library.filter.type.${opt.id}`}
              >
                <Text
                  style={[styles.filterText, isActive && styles.filterTextActive]}
                  allowFontScaling
                >
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Status Filter Chips */}
      <View style={styles.filterSection}>
        <Text style={styles.filterSectionLabel} allowFontScaling>
          STATUS
        </Text>
        <View style={styles.filterRow}>
          {STATUS_OPTIONS.map((opt) => {
            const isActive = selectedStatus === opt.id;
            return (
              <Pressable
                key={opt.id}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                onPress={() => setSelectedStatus(opt.id)}
                accessibilityRole="button"
                accessibilityLabel={`Filter status: ${opt.label}`}
                testID={`library.filter.status.${opt.id}`}
              >
                <Text
                  style={[styles.filterText, isActive && styles.filterTextActive]}
                  allowFontScaling
                >
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Case Count Indicator */}
      <View style={styles.countRow}>
        <Text style={styles.countText} allowFontScaling>
          DOSSIERS FOUND: {filteredCases.length}
        </Text>
      </View>

      {/* Case List */}
      {filteredCases.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon} allowFontScaling>
            📁
          </Text>
          <Text style={styles.emptyText} allowFontScaling>
            No case dossiers match the active filters.
          </Text>
          <Pressable
            style={styles.resetButton}
            onPress={() => {
              setSelectedDifficulty('all');
              setSelectedType('all');
              setSelectedStatus('all');
              setSearchQuery('');
            }}
            accessibilityRole="button"
            accessibilityLabel="Reset all filters"
          >
            <Text style={styles.resetButtonText} allowFontScaling>
              RESET FILTERS
            </Text>
          </Pressable>
        </View>
      ) : (
        filteredCases.map((item) => {
          const isSolved = solvedCaseIds.has(item.id);
          const hasInProgress = inProgressMap.has(item.id);
          const isStarting = startingCaseId === item.id;

          return (
            <Pressable
              key={item.id}
              style={[
                styles.caseCard,
                hasInProgress && styles.caseCardInProgress,
                isSolved && styles.caseCardSolved,
              ]}
              onPress={() => handleOpenCase(item)}
              accessibilityRole="button"
              accessibilityLabel={`${item.title}, ${isSolved ? 'Solved' : hasInProgress ? 'In Progress' : 'Unsolved'}, Difficulty ${item.difficulty}`}
              testID={`library.card.${item.id}`}
            >
              {/* Badge Header Row */}
              <View style={styles.badgeRow}>
                <View style={styles.tagGroup}>
                  <Text style={styles.difficultyBadge} allowFontScaling>
                    LEVEL {item.difficulty}
                  </Text>
                  {item.difficulty === 1 && (
                    <Text style={styles.tutorialBadge} allowFontScaling>
                      TUTORIAL
                    </Text>
                  )}
                  {isSolved ? (
                    <View style={styles.solvedBadgeContainer}>
                      <Text style={styles.checkIcon} allowFontScaling>
                        ✓
                      </Text>
                      <Text style={styles.solvedBadgeText} allowFontScaling>
                        SOLVED
                      </Text>
                    </View>
                  ) : hasInProgress ? (
                    <View style={styles.inProgressBadgeContainer}>
                      <View style={styles.pulseDot} />
                      <Text style={styles.inProgressBadgeText} allowFontScaling>
                        ACTIVE
                      </Text>
                    </View>
                  ) : (
                    <Text style={styles.unsolvedBadgeText} allowFontScaling>
                      UNSOLVED
                    </Text>
                  )}
                </View>

                <Text style={styles.caseCode} allowFontScaling>
                  {item.code}
                </Text>
              </View>

              {/* Title & Description */}
              <Text style={styles.caseTitle} allowFontScaling>
                {item.title}
              </Text>
              <Text style={styles.caseDesc} allowFontScaling>
                {item.summary}
              </Text>

              {/* Meta Stats Row */}
              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <Text style={styles.metaIcon} allowFontScaling>
                    ⏱
                  </Text>
                  <Text style={styles.metaText} allowFontScaling>
                    Est: {item.estimatedMinutes} mins
                  </Text>
                </View>
                <View style={styles.metaItem}>
                  <Text style={styles.metaIcon} allowFontScaling>
                    ☍
                  </Text>
                  <Text style={styles.metaText} allowFontScaling>
                    {item.hypothesesCount} Hypotheses
                  </Text>
                </View>
                <View style={styles.metaItem}>
                  <Text style={styles.metaIcon} allowFontScaling>
                    📄
                  </Text>
                  <Text style={styles.metaText} allowFontScaling>
                    {item.cluesCount} Clues
                  </Text>
                </View>
              </View>

              {/* Action Button */}
              <View style={styles.actionRow}>
                <Pressable
                  style={[
                    styles.actionButton,
                    hasInProgress
                      ? styles.actionButtonActive
                      : isSolved
                        ? styles.actionButtonReplay
                        : styles.actionButtonStart,
                  ]}
                  onPress={() => handleOpenCase(item)}
                  accessibilityRole="button"
                  accessibilityLabel={`${hasInProgress ? 'Resume' : isSolved ? 'Replay' : 'Investigate'} ${item.title}`}
                  testID={`library.button.start.${item.id}`}
                  disabled={isStarting}
                >
                  <Text
                    style={[
                      styles.actionButtonText,
                      hasInProgress && styles.actionButtonTextActive,
                    ]}
                    allowFontScaling
                  >
                    {isStarting
                      ? 'OPENING...'
                      : hasInProgress
                        ? 'RESUME INVESTIGATION'
                        : isSolved
                          ? 'REPLAY / REVIEW'
                          : 'OPEN DOSSIER'}
                  </Text>
                  <Text
                    style={[
                      styles.arrowIcon,
                      hasInProgress && styles.arrowIconActive,
                    ]}
                    allowFontScaling
                  >
                    ›
                  </Text>
                </Pressable>
              </View>
            </Pressable>
          );
        })
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
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  header: {
    marginBottom: SPACING.xs,
  },
  title: {
    ...TYPOGRAPHY.h1,
    color: COLORS.text,
  },
  subtitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.muted,
    marginTop: SPACING.xs,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderColor: COLORS.surfaceBorder,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: SPACING.sm,
    height: 42,
    gap: SPACING.xs,
  },
  searchIcon: {
    marginLeft: 2,
  },
  searchInput: {
    flex: 1,
    ...TYPOGRAPHY.body,
    fontSize: 13,
    color: COLORS.text,
    paddingVertical: 0,
  },
  filterSection: {
    gap: 6,
  },
  filterSectionLabel: {
    ...TYPOGRAPHY.caption,
    fontSize: 10,
    color: COLORS.muted,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  filterRow: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  filterChip: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.surfaceBorder,
    borderWidth: 1,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 4,
  },
  filterChipActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  filterText: {
    ...TYPOGRAPHY.caption,
    fontWeight: '600',
    color: COLORS.muted,
    fontSize: 11,
  },
  filterTextActive: {
    color: '#0b0c0e',
    fontWeight: '700',
  },
  countRow: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: 4,
    marginTop: 2,
  },
  countText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xl,
    gap: SPACING.sm,
  },
  emptyText: {
    ...TYPOGRAPHY.body,
    color: COLORS.muted,
    textAlign: 'center',
    fontSize: 13,
  },
  resetButton: {
    marginTop: SPACING.xs,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: COLORS.surface,
    borderColor: COLORS.accent,
    borderWidth: 1,
    borderRadius: 4,
  },
  resetButtonText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.accent,
    fontWeight: '700',
  },
  caseCard: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.surfaceBorder,
    borderWidth: 1,
    borderRadius: 6,
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  caseCardInProgress: {
    borderColor: COLORS.success,
    backgroundColor: '#0c1613',
  },
  caseCardSolved: {
    borderColor: '#243b31',
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tagGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  difficultyBadge: {
    ...TYPOGRAPHY.caption,
    color: COLORS.accent,
    fontWeight: '700',
    fontSize: 11,
  },
  tutorialBadge: {
    ...TYPOGRAPHY.caption,
    color: COLORS.muted,
    backgroundColor: '#1b222c',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
    fontSize: 10,
    fontWeight: '700',
  },
  solvedBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#13281c',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 3,
  },
  solvedBadgeText: {
    ...TYPOGRAPHY.caption,
    fontSize: 10,
    color: COLORS.success,
    fontWeight: '700',
  },
  inProgressBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#162e21',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 3,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.success,
  },
  inProgressBadgeText: {
    ...TYPOGRAPHY.caption,
    fontSize: 10,
    color: COLORS.success,
    fontWeight: '700',
  },
  unsolvedBadgeText: {
    ...TYPOGRAPHY.caption,
    fontSize: 10,
    color: COLORS.muted,
    backgroundColor: '#161a22',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
  },
  caseCode: {
    ...TYPOGRAPHY.monospace,
    fontSize: 11,
    color: COLORS.muted,
  },
  caseTitle: {
    ...TYPOGRAPHY.h2,
    fontSize: 18,
    color: COLORS.text,
  },
  caseDesc: {
    ...TYPOGRAPHY.body,
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.sm,
    marginTop: 2,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.muted,
    fontSize: 11,
  },
  actionRow: {
    marginTop: 2,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 4,
    gap: 6,
  },
  actionButtonStart: {
    backgroundColor: '#131922',
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  actionButtonActive: {
    backgroundColor: COLORS.accent,
  },
  actionButtonReplay: {
    backgroundColor: '#131922',
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  actionButtonText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.accent,
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  actionButtonTextActive: {
    color: '#0b0c0e',
  },
  clearIcon: {
    color: COLORS.muted,
    fontSize: 14,
    paddingHorizontal: 4,
  },
  emptyIcon: {
    fontSize: 32,
    textAlign: 'center',
  },
  checkIcon: {
    color: COLORS.success,
    fontSize: 10,
    fontWeight: '900',
  },
  metaIcon: {
    fontSize: 11,
    color: COLORS.muted,
  },
  arrowIcon: {
    color: COLORS.accent,
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 16,
  },
  arrowIconActive: {
    color: '#0b0c0e',
  },
});
