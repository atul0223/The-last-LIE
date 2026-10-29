/**
 * ClueCard
 *
 * Reusable clue presentation card displaying an unlocked or locked clue.
 * Used in the Evidence list (WP-11) and available for reuse in Board (WP-12) and Theory (WP-13).
 *
 * Props:
 * - clue: PublicClue - The public clue data (unlocked or locked placeholder)
 * - isUnread?: boolean - Whether to show the unread indicator (dot + "New" text label)
 * - isSelected?: boolean - Whether this card is selected (e.g. for linking or multi-select)
 * - onPress?: () => void - Callback triggered when the card is pressed
 * - onRequestUnlock?: (clueId: string) => void - Callback triggered when the "Request evidence" button is pressed
 * - compact?: boolean - Whether to render in a compact layout (e.g. for canvas or tray)
 * - testID?: string - Custom test identifier (defaults to case.evidence.card.<clue.id>)
 */

import React from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import type { PublicClue, PublicUnlockedClue, PublicLockedClue } from '@lastlie/case-engine';
import { COLORS, SPACING, TYPOGRAPHY } from '../../../theme/tokens';

export interface ClueCardProps {
  clue: PublicClue;
  isUnread?: boolean;
  isSelected?: boolean;
  onPress?: () => void;
  onRequestUnlock?: (clueId: string) => void;
  compact?: boolean;
  testID?: string;
}

function isLockedClue(clue: PublicClue): clue is PublicLockedClue {
  return (clue as PublicLockedClue).locked === true;
}

function formatClueType(type: string): string {
  return type.replace(/_/g, ' ').toUpperCase();
}

function getHintDescription(hint: PublicLockedClue['hint']): string {
  if (!hint) return 'Evidence locked';
  switch (hint.kind) {
    case 'after_clue':
      return `Unlocked after examining: ${hint.clueId}`;
    case 'after_clue_hidden':
      return 'Unlocked after discovering hidden evidence';
    case 'interview':
      return 'Unlocked during character interview';
    case 'request':
      return `Requires evidence request (${hint.cost} pts)`;
    default:
      return 'Evidence locked';
  }
}

export function ClueCard({
  clue,
  isUnread = false,
  isSelected = false,
  onPress,
  onRequestUnlock,
  compact = false,
  testID,
}: ClueCardProps) {
  const cardTestID = testID ?? `case.evidence.card.${clue.id}`;

  if (isLockedClue(clue)) {
    const hint = clue.hint;
    const isRequestable = hint?.kind === 'request';
    const cost = isRequestable ? hint.cost : 0;

    return (
      <View
        style={[styles.card, styles.lockedCard, isSelected && styles.selectedCard]}
        testID={cardTestID}
        accessible={true}
        accessibilityRole="summary"
        accessibilityLabel={`Locked clue ${formatClueType(clue.type)}. ${getHintDescription(hint)}`}
      >
        <View style={styles.headerRow}>
          <View style={styles.badgeRow}>
            <View style={[styles.badge, styles.lockedBadge]}>
              <Text style={styles.lockedBadgeText} allowFontScaling>
                {`LOCKED ${formatClueType(clue.type)}`}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.lockedContent}>
          <Text style={styles.lockedHintText} allowFontScaling>
            {getHintDescription(hint)}
          </Text>

          {isRequestable && onRequestUnlock && (
            <Pressable
              style={styles.requestButton}
              onPress={() => onRequestUnlock(clue.id)}
              accessibilityRole="button"
              accessibilityLabel={`Request evidence, costs ${cost} points`}
              testID={`case.evidence.request.${clue.id}`}
            >
              <Text style={styles.requestButtonText} allowFontScaling>
                Request evidence (−{cost})
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    );
  }

  // Unlocked Clue
  const unlockedClue = clue as PublicUnlockedClue;
  const isLogType =
    unlockedClue.type === 'access_log' ||
    unlockedClue.type === 'device_log' ||
    unlockedClue.type === 'cctv';

  return (
    <Pressable
      style={[styles.card, isSelected && styles.selectedCard]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${isUnread ? 'Unread clue: ' : 'Clue: '}${formatClueType(
        unlockedClue.type,
      )}, reliability ${unlockedClue.reliability}. ${unlockedClue.text.slice(0, 60)}`}
      testID={cardTestID}
    >
      <View style={styles.headerRow}>
        <View style={styles.badgeRow}>
          <View
            style={[
              styles.badge,
              unlockedClue.reliability === 'physical'
                ? styles.physicalBadge
                : styles.testimonyBadge,
            ]}
          >
            <Text style={styles.badgeText} allowFontScaling>
              {unlockedClue.reliability.toUpperCase()}
            </Text>
          </View>
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText} allowFontScaling>
              {formatClueType(unlockedClue.type)}
            </Text>
          </View>
        </View>

        {isUnread && (
          <View style={styles.unreadContainer} accessible={false}>
            <View style={styles.unreadDot} />
            <Text style={styles.unreadText} allowFontScaling>
              New
            </Text>
          </View>
        )}
      </View>

      {unlockedClue.source && (
        <Text style={styles.sourceText} allowFontScaling numberOfLines={1}>
          Source: {unlockedClue.source}
        </Text>
      )}

      <Text
        style={[styles.bodyText, isLogType && styles.monospaceText]}
        numberOfLines={compact ? 2 : 4}
        allowFontScaling
      >
        {unlockedClue.text}
      </Text>

      {unlockedClue.tags && unlockedClue.tags.length > 0 && !compact && (
        <View style={styles.tagsRow}>
          {unlockedClue.tags.map((tag) => (
            <View key={tag} style={styles.tagPill}>
              <Text style={styles.tagText} allowFontScaling>
                #{tag}
              </Text>
            </View>
          ))}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  selectedCard: {
    borderColor: COLORS.accent,
    backgroundColor: COLORS.surfaceElevated,
  },
  lockedCard: {
    backgroundColor: COLORS.surfaceElevated,
    borderStyle: 'dashed',
    borderColor: COLORS.border,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    flexWrap: 'wrap',
  },
  badge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: 4,
  },
  physicalBadge: {
    backgroundColor: '#1f3a2c',
    borderWidth: 1,
    borderColor: COLORS.success,
  },
  testimonyBadge: {
    backgroundColor: '#35291b',
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  lockedBadge: {
    backgroundColor: '#272e3a',
    borderWidth: 1,
    borderColor: COLORS.muted,
  },
  badgeText: {
    ...TYPOGRAPHY.caption,
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.text,
  },
  lockedBadgeText: {
    ...TYPOGRAPHY.caption,
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.muted,
  },
  typeBadge: {
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
  },
  typeBadgeText: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    color: COLORS.muted,
    fontWeight: '600',
  },
  unreadContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#382510',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  unreadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.accent,
  },
  unreadText: {
    ...TYPOGRAPHY.caption,
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.accent,
  },
  sourceText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.muted,
    marginBottom: SPACING.xs,
  },
  bodyText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    fontSize: 14,
    lineHeight: 20,
  },
  monospaceText: {
    ...TYPOGRAPHY.monospace,
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.accent,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    marginTop: SPACING.sm,
  },
  tagPill: {
    backgroundColor: COLORS.surfaceElevated,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagText: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    color: COLORS.muted,
  },
  lockedContent: {
    marginTop: SPACING.xs,
    gap: SPACING.sm,
  },
  lockedHintText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.muted,
    fontStyle: 'italic',
  },
  requestButton: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: COLORS.accent,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: 6,
    marginTop: SPACING.xs,
  },
  requestButtonText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.accent,
    fontWeight: '700',
  },
});
