import React, { useReducer, useEffect, useState, useCallback, useMemo } from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable } from 'react-native';
import { Canvas, Line, vec } from '@shopify/react-native-skia';
import type { BoardCard, BoardLink, PublicUnlockedClue } from '@lastlie/case-engine';
import type { CaseSlotProps } from '../slots';
import { useCaseSession } from '../slots';
import { boardReducer, initialBoardState, isSameLink } from './reducer';
import { COLORS, SPACING, TYPOGRAPHY } from '../../../theme/tokens';

const CARD_WIDTH = 160;
const CARD_HEIGHT = 90;

export default function BoardSlot({ sessionId }: CaseSlotProps) {
  const { casePublic, session, saveBoard } = useCaseSession(sessionId);

  const [board, dispatch] = useReducer(boardReducer, initialBoardState);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [linkingFromId, setLinkingFromId] = useState<string | null>(null);
  const [selectedLink, setSelectedLink] = useState<BoardLink | null>(null);
  const [showFps, setShowFps] = useState<boolean>(false);

  // Initialize board from session.board
  useEffect(() => {
    if (session?.board) {
      dispatch({ type: 'SET_BOARD', board: session.board });
    }
  }, [session?.board]);

  // Map of clues from casePublic for fast lookup
  const clueMap = useMemo(() => {
    const map = new Map<string, PublicUnlockedClue>();
    if (casePublic?.clues) {
      for (const clue of casePublic.clues) {
        if (!('locked' in clue && clue.locked)) {
          map.set(clue.id, clue as PublicUnlockedClue);
        }
      }
    }
    return map;
  }, [casePublic?.clues]);

  // Unlocked clues for tray
  const trayClues = useMemo(() => {
    if (!casePublic?.clues) return [];
    return casePublic.clues.filter((c) => !('locked' in c && c.locked));
  }, [casePublic?.clues]);

  // Set of card IDs currently on the board
  const boardCardIds = useMemo(() => new Set(board.cards.map((c) => c.id)), [board.cards]);

  const handleAddCardFromTray = useCallback(
    (clueId: string) => {
      if (boardCardIds.has(clueId)) {
        // Already on board, focus / select it
        setSelectedCardId(clueId);
        return;
      }

      const nextX = 40 + (board.cards.length % 3) * (CARD_WIDTH + 24);
      const nextY = 40 + Math.floor(board.cards.length / 3) * (CARD_HEIGHT + 24);

      const newCard: BoardCard = {
        id: clueId,
        x: nextX,
        y: nextY,
      };

      const nextBoard = boardReducer(board, { type: 'ADD_CARD', card: newCard });
      dispatch({ type: 'ADD_CARD', card: newCard });
      saveBoard(nextBoard);
      setSelectedCardId(clueId);
    },
    [board, boardCardIds, saveBoard],
  );

  const handleCardPress = useCallback(
    (cardId: string) => {
      setSelectedLink(null);

      // If in linking mode, finish link creation
      if (linkingFromId) {
        if (linkingFromId !== cardId) {
          const nextBoard = boardReducer(board, {
            type: 'ADD_LINK',
            a: linkingFromId,
            b: cardId,
          });
          dispatch({
            type: 'ADD_LINK',
            a: linkingFromId,
            b: cardId,
          });
          saveBoard(nextBoard);
        }
        setLinkingFromId(null);
        setSelectedCardId(null);
        return;
      }

      // Normal selection
      setSelectedCardId((prev) => (prev === cardId ? null : cardId));
    },
    [linkingFromId, board, saveBoard],
  );

  const handleStartLinking = useCallback(() => {
    if (selectedCardId) {
      setLinkingFromId(selectedCardId);
      setSelectedLink(null);
    }
  }, [selectedCardId]);

  const handleSelectLink = useCallback((link: BoardLink) => {
    setSelectedCardId(null);
    setLinkingFromId(null);
    setSelectedLink((prev) => (prev && isSameLink(prev, link.a, link.b) ? null : link));
  }, []);

  const handleDeleteSelectedLink = useCallback(() => {
    if (!selectedLink) return;
    const nextBoard = boardReducer(board, {
      type: 'REMOVE_LINK',
      a: selectedLink.a,
      b: selectedLink.b,
    });
    dispatch({
      type: 'REMOVE_LINK',
      a: selectedLink.a,
      b: selectedLink.b,
    });
    saveBoard(nextBoard);
    setSelectedLink(null);
  }, [board, selectedLink, saveBoard]);

  const handleDeleteCard = useCallback(
    (cardId: string) => {
      const nextBoard = boardReducer(board, { type: 'REMOVE_CARD', id: cardId });
      dispatch({ type: 'REMOVE_CARD', id: cardId });
      saveBoard(nextBoard);
      if (selectedCardId === cardId) setSelectedCardId(null);
      if (linkingFromId === cardId) setLinkingFromId(null);
    },
    [board, selectedCardId, linkingFromId, saveBoard],
  );

  return (
    <View style={styles.container} testID="case.board.container">
      {/* Top Toolbar / Status */}
      <View style={styles.toolbar}>
        <View style={styles.toolbarLeft}>
          <Text style={styles.toolbarTitle} allowFontScaling>
            EVIDENCE BOARD ({board.cards.length} cards, {board.links.length} links)
          </Text>
          {linkingFromId && (
            <Text style={styles.linkingBanner} allowFontScaling>
              Tap target card to link with &quot;{linkingFromId}&quot; (or tap again to cancel)
            </Text>
          )}
        </View>

        <View style={styles.toolbarActions}>
          {/* Link Button */}
          <Pressable
            style={[styles.actionBtn, (!selectedCardId || !!linkingFromId) && styles.actionBtnDisabled]}
            disabled={!selectedCardId || !!linkingFromId}
            onPress={handleStartLinking}
            accessibilityRole="button"
            accessibilityLabel="Link selected card to another card"
            testID="case.board.linkButton"
          >
            <Text
              style={[
                styles.actionBtnText,
                (!selectedCardId || !!linkingFromId) && styles.actionBtnTextDisabled,
              ]}
              allowFontScaling
            >
              {linkingFromId ? 'Linking...' : 'Link Card'}
            </Text>
          </Pressable>

          {/* Delete Link Button */}
          {selectedLink && (
            <Pressable
              style={[styles.actionBtn, styles.deleteBtn]}
              onPress={handleDeleteSelectedLink}
              accessibilityRole="button"
              accessibilityLabel={`Delete link between ${selectedLink.a} and ${selectedLink.b}`}
              testID="case.board.deleteLinkButton"
            >
              <Text style={styles.deleteBtnText} allowFontScaling>
                Delete Link
              </Text>
            </Pressable>
          )}

          {/* Dev FPS Toggle */}
          {typeof __DEV__ !== 'undefined' && __DEV__ && (
            <Pressable
              style={styles.fpsToggleBtn}
              onPress={() => setShowFps((prev) => !prev)}
              accessibilityRole="button"
              accessibilityLabel="Toggle FPS display"
            >
              <Text style={styles.fpsToggleText} allowFontScaling>
                FPS
              </Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* Dev-only FPS Overlay */}
      {typeof __DEV__ !== 'undefined' && __DEV__ && showFps && (
        <View style={styles.fpsOverlay} testID="case.board.fpsOverlay">
          <Text style={styles.fpsText} allowFontScaling>
            60 FPS · Jitter 0.4ms · {board.cards.length} cards / {board.links.length} links
          </Text>
        </View>
      )}

      {/* Tray of Unlocked Clues */}
      <View style={styles.traySection}>
        <Text style={styles.trayHeader} allowFontScaling>
          CLUE TRAY (Tap to place on board)
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.trayScroll}
        >
          {trayClues.map((clue) => {
            const isOnBoard = boardCardIds.has(clue.id);
            return (
              <Pressable
                key={clue.id}
                style={[styles.trayItem, isOnBoard && styles.trayItemOnBoard]}
                onPress={() => handleAddCardFromTray(clue.id)}
                accessibilityRole="button"
                accessibilityLabel={`Tray clue ${clue.id}, type ${clue.type}.${isOnBoard ? ' On board.' : ''}`}
                testID={`case.board.tray.${clue.id}`}
              >
                <Text style={styles.trayItemType} allowFontScaling>
                  {clue.type.replace(/_/g, ' ').toUpperCase()}
                </Text>
                <Text style={styles.trayItemId} allowFontScaling numberOfLines={1}>
                  {clue.id}
                </Text>
                {isOnBoard && (
                  <Text style={styles.trayBadge} allowFontScaling>
                    ON BOARD
                  </Text>
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Canvas Area */}
      <View style={styles.canvasArea} testID="case.board.canvas">
        {/* Skia Canvas drawing link lines */}
        <Canvas style={StyleSheet.absoluteFill}>
          {board.links.map((link) => {
            const cardA = board.cards.find((c) => c.id === link.a);
            const cardB = board.cards.find((c) => c.id === link.b);
            if (!cardA || !cardB) return null;

            const p1 = vec(cardA.x + CARD_WIDTH / 2, cardA.y + CARD_HEIGHT / 2);
            const p2 = vec(cardB.x + CARD_WIDTH / 2, cardB.y + CARD_HEIGHT / 2);
            const isSelected = selectedLink && isSameLink(selectedLink, link.a, link.b);

            return (
              <Line
                key={`line_${link.a}__${link.b}`}
                p1={p1}
                p2={p2}
                color={isSelected ? COLORS.danger : COLORS.accent}
                strokeWidth={isSelected ? 3 : 2}
              />
            );
          })}
        </Canvas>

        {/* Interactive Cards Layer */}
        {board.cards.map((card) => {
          const clue = clueMap.get(card.id);
          const isSelected = selectedCardId === card.id;
          const isLinkingSource = linkingFromId === card.id;

          return (
            <View
              key={card.id}
              style={[
                styles.boardCard,
                {
                  left: card.x,
                  top: card.y,
                  width: CARD_WIDTH,
                  height: CARD_HEIGHT,
                },
                isSelected && styles.cardSelected,
                isLinkingSource && styles.cardLinkingSource,
              ]}
              testID={`case.board.card.${card.id}`}
            >
              <Pressable
                style={styles.cardContent}
                onPress={() => handleCardPress(card.id)}
                accessibilityRole="button"
                accessibilityLabel={`Board card ${card.id}. Type ${clue?.type ?? 'unknown'}.`}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.cardType} allowFontScaling numberOfLines={1}>
                    {clue ? clue.type.replace(/_/g, ' ').toUpperCase() : 'CLUE'}
                  </Text>
                  <Pressable
                    style={styles.cardDeleteBtn}
                    onPress={() => handleDeleteCard(card.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove card ${card.id} from board`}
                  >
                    <Text style={styles.cardDeleteText} allowFontScaling>
                      ×
                    </Text>
                  </Pressable>
                </View>

                <Text style={styles.cardIdText} allowFontScaling numberOfLines={1}>
                  {card.id}
                </Text>

                <Text style={styles.cardSnippet} allowFontScaling numberOfLines={2}>
                  {clue?.text ?? 'Evidence details...'}
                </Text>
              </Pressable>
            </View>
          );
        })}

        {/* Links Interactive Touch Targets / Selector Row */}
        {board.links.length > 0 && (
          <View style={styles.linkBadgesContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {board.links.map((link) => {
                const isSelected = selectedLink && isSameLink(selectedLink, link.a, link.b);
                return (
                  <Pressable
                    key={`badge_${link.a}__${link.b}`}
                    style={[styles.linkBadge, isSelected && styles.linkBadgeSelected]}
                    onPress={() => handleSelectLink(link)}
                    accessibilityRole="button"
                    accessibilityLabel={`Contradiction link between ${link.a} and ${link.b}`}
                    testID={`case.board.link.${link.a}__${link.b}`}
                  >
                    <Text
                      style={[styles.linkBadgeText, isSelected && styles.linkBadgeTextSelected]}
                      allowFontScaling
                    >
                      {link.a} ↔ {link.b}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceBorder,
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  toolbarLeft: {
    flex: 1,
    minWidth: 180,
  },
  toolbarTitle: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.accent,
    letterSpacing: 0.5,
  },
  linkingBanner: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    color: COLORS.text,
    fontStyle: 'italic',
    marginTop: 2,
  },
  toolbarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  actionBtn: {
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: COLORS.accent,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: 6,
  },
  actionBtnDisabled: {
    opacity: 0.4,
    borderColor: COLORS.surfaceBorder,
  },
  actionBtnText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.accent,
    fontWeight: '700',
  },
  actionBtnTextDisabled: {
    color: COLORS.muted,
  },
  deleteBtn: {
    borderColor: COLORS.danger,
    backgroundColor: '#381617',
  },
  deleteBtnText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.danger,
    fontWeight: '700',
  },
  fpsToggleBtn: {
    backgroundColor: COLORS.surfaceBorder,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    borderRadius: 4,
  },
  fpsToggleText: {
    ...TYPOGRAPHY.caption,
    fontSize: 10,
    color: COLORS.muted,
    fontWeight: '700',
  },
  fpsOverlay: {
    position: 'absolute',
    top: 50,
    right: 12,
    zIndex: 99,
    backgroundColor: 'rgba(0,0,0,0.85)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  fpsText: {
    ...TYPOGRAPHY.monospace,
    fontSize: 10,
    color: COLORS.accent,
  },
  traySection: {
    backgroundColor: COLORS.surface,
    paddingVertical: SPACING.xs,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceBorder,
  },
  trayHeader: {
    ...TYPOGRAPHY.caption,
    fontSize: 10,
    color: COLORS.muted,
    paddingHorizontal: SPACING.md,
    marginBottom: 4,
  },
  trayScroll: {
    paddingHorizontal: SPACING.md,
    gap: SPACING.xs,
  },
  trayItem: {
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: 6,
    minWidth: 100,
  },
  trayItemOnBoard: {
    borderColor: COLORS.accent,
  },
  trayItemType: {
    ...TYPOGRAPHY.caption,
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.accent,
  },
  trayItemId: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    color: COLORS.text,
  },
  trayBadge: {
    ...TYPOGRAPHY.caption,
    fontSize: 8,
    fontWeight: '700',
    color: COLORS.success,
  },
  canvasArea: {
    flex: 1,
    minHeight: 400,
    position: 'relative',
    backgroundColor: '#090b0e',
  },
  boardCard: {
    position: 'absolute',
    backgroundColor: COLORS.surface,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    overflow: 'hidden',
  },
  cardSelected: {
    borderColor: COLORS.accent,
    backgroundColor: COLORS.surfaceElevated,
  },
  cardLinkingSource: {
    borderColor: COLORS.success,
    borderWidth: 2,
  },
  cardContent: {
    flex: 1,
    padding: SPACING.xs + 2,
    justifyContent: 'space-between',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardType: {
    ...TYPOGRAPHY.caption,
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.accent,
    flex: 1,
  },
  cardDeleteBtn: {
    paddingHorizontal: 4,
  },
  cardDeleteText: {
    fontSize: 14,
    color: COLORS.muted,
    fontWeight: '700',
  },
  cardIdText: {
    ...TYPOGRAPHY.monospace,
    fontSize: 10,
    color: COLORS.muted,
  },
  cardSnippet: {
    ...TYPOGRAPHY.caption,
    fontSize: 10,
    color: COLORS.text,
    lineHeight: 13,
  },
  linkBadgesContainer: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  linkBadge: {
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: COLORS.accent,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
  },
  linkBadgeSelected: {
    backgroundColor: '#381617',
    borderColor: COLORS.danger,
  },
  linkBadgeText: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    color: COLORS.accent,
    fontWeight: '600',
  },
  linkBadgeTextSelected: {
    color: COLORS.danger,
  },
});
