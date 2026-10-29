/**
 * Integration Test: End-to-End Case Slot Flow (WP-11 -> WP-12 -> WP-13)
 *
 * Exercises the full user journey against LocalGameService + case_0001:
 * 1. BriefingSlot renders case info and objective.
 * 2. EvidenceSlot renders clues and unlocks clue_keycard_exit.
 * 3. BoardSlot places 2 cards and connects 1 link via boardReducer and saveBoard.
 * 4. TheorySlot picks hypothesis and submits theory with contradictions from board.
 * 5. RevealSlot renders score > 0 and marks the link as valid contradiction (✓).
 */

import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import renderer, { act } from 'react-test-renderer';
import { getGameService } from '../src/services';
import type { GameService } from '../src/services';
import { useSessionStore } from '../src/store';
import { boardReducer, initialBoardState } from '../src/features/case/board/reducer';

// Mock Skia for Node test runner
vi.mock('@shopify/react-native-skia', () => ({
  Canvas: ({ children, style }: { children?: React.ReactNode; style?: StyleProp<ViewStyle> }) => (
    <View testID="mock-skia-canvas" style={style}>
      {children}
    </View>
  ),
  Line: (props: unknown) => <View testID="mock-skia-line" {...(props as Record<string, unknown>)} />,
  vec: (x: number, y: number) => ({ x, y }),
}));

// Mock FlashList for Node test runner
vi.mock('@shopify/flash-list', () => ({
  FlashList: <T,>({
    data,
    renderItem,
    keyExtractor,
  }: {
    data: T[];
    renderItem: (info: { item: T; index: number }) => React.ReactElement | null;
    keyExtractor?: (item: T, index: number) => string;
  }) => (
    <>
      {data.map((item, index) => (
        <React.Fragment key={keyExtractor ? keyExtractor(item, index) : index}>
          {renderItem({ item, index })}
        </React.Fragment>
      ))}
    </>
  ),
}));

// Mock expo-router
const mockPush = vi.fn();
vi.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    back: vi.fn(),
  }),
}));

import BriefingSlot from '../src/features/case/briefing';
import EvidenceSlot from '../src/features/case/evidence';
import BoardSlot from '../src/features/case/board';
import TheorySlot from '../src/features/case/theory';
import RevealSlot from '../src/features/case/reveal';

describe('Integration: End-to-End Case Slot Flow (case_0001)', () => {
  let service: GameService;

  beforeEach(() => {
    useSessionStore.getState().clear();
    service = getGameService();
    mockPush.mockClear();
  });

  it('runs complete flow: briefing -> evidence unlock -> board link -> theory submit -> reveal breakdown', async () => {
    // 0. Start a fresh session on case_0001
    const { session } = await service.startSession({
      caseId: 'case_0001',
      mode: 'normal',
    });
    const sessionId = session.id;

    // --- STEP 1: Briefing Slot Renders ---
    let briefingTree: renderer.ReactTestRenderer;
    act(() => {
      briefingTree = renderer.create(<BriefingSlot sessionId={sessionId} />);
    });

    const briefingJson = JSON.stringify(briefingTree!.toJSON());
    expect(briefingJson).toContain('The Missing Message');
    expect(briefingJson).toContain('Maya Lin');
    expect(briefingJson).toContain('Arjun Mehta');
    expect(briefingTree!.root.findByProps({ testID: 'case.briefing.container' })).toBeDefined();

    // --- STEP 2: Evidence Slot Renders & Clue Unlocked ---
    let evidenceTree: renderer.ReactTestRenderer;
    act(() => {
      evidenceTree = renderer.create(<EvidenceSlot sessionId={sessionId} />);
    });
    expect(evidenceTree!.root.findByProps({ testID: 'case.evidence.container' })).toBeDefined();

    // Unlock clue_keycard_exit using the service
    await act(async () => {
      await service.unlockClue(sessionId, 'clue_keycard_exit', {
        kind: 'after_clue',
        clueId: 'clue_maya_testimony',
      });
    });

    const sessionAfterUnlock = useSessionStore.getState().getSession(sessionId);
    expect(sessionAfterUnlock?.unlockedClueIds).toContain('clue_keycard_exit');

    // --- STEP 3: Board Slot with 2 Cards + 1 Link via boardReducer ---
    let boardState = initialBoardState;
    boardState = boardReducer(boardState, {
      type: 'ADD_CARD',
      card: { id: 'clue_arjun_testimony', x: 50, y: 50 },
    });
    boardState = boardReducer(boardState, {
      type: 'ADD_CARD',
      card: { id: 'clue_keycard_exit', x: 250, y: 50 },
    });
    boardState = boardReducer(boardState, {
      type: 'ADD_LINK',
      a: 'clue_arjun_testimony',
      b: 'clue_keycard_exit',
      explanation: 'Maya was outside while Arjun claims message came from her phone',
    });

    // Save board on service and store
    await service.saveBoard(sessionId, boardState);
    useSessionStore.getState().updateSession(sessionId, { board: boardState });

    let boardTree: renderer.ReactTestRenderer;
    act(() => {
      boardTree = renderer.create(<BoardSlot sessionId={sessionId} />);
    });

    expect(boardTree!.root.findByProps({ testID: 'case.board.container' })).toBeDefined();
    expect(
      boardTree!.root.findByProps({ testID: 'case.board.card.clue_arjun_testimony' }),
    ).toBeDefined();
    expect(
      boardTree!.root.findByProps({ testID: 'case.board.card.clue_keycard_exit' }),
    ).toBeDefined();

    // --- STEP 4: Theory Slot Formulates & Submits Theory ---
    let theoryTree: renderer.ReactTestRenderer;
    act(() => {
      theoryTree = renderer.create(<TheorySlot sessionId={sessionId} />);
    });

    expect(theoryTree!.root.findByProps({ testID: 'case.theory.container' })).toBeDefined();

    // Pick prime hypothesis: hyp_arjun_forged
    const hypOption = theoryTree!.root.findByProps({
      testID: 'case.theory.hypothesis.hyp_arjun_forged',
    });
    act(() => {
      hypOption.props.onPress();
    });

    // Select supporting clue
    const clueOption = theoryTree!.root.findByProps({
      testID: 'case.theory.clue.clue_keycard_exit',
    });
    act(() => {
      clueOption.props.onPress();
    });

    // Tap submit button to trigger confirmation modal
    const submitBtn = theoryTree!.root.findByProps({ testID: 'case.theory.submit' });
    act(() => {
      submitBtn.props.onPress();
    });

    // Confirm submission
    const confirmBtn = theoryTree!.root.findByProps({ testID: 'case.theory.confirm' });
    await act(async () => {
      await confirmBtn.props.onPress();
    });

    // Verify session in store transitioned to submitted
    const sessionAfterSubmit = useSessionStore.getState().getSession(sessionId);
    expect(sessionAfterSubmit?.status).toBe('submitted');
    const storedResult = useSessionStore.getState().getResult(sessionId);
    expect(storedResult?.result).toBeDefined();
    expect(storedResult?.reveal).toBeDefined();

    // --- STEP 5: Reveal Slot Displays Score & Valid Contradiction Link ---
    let revealTree: renderer.ReactTestRenderer;
    act(() => {
      revealTree = renderer.create(<RevealSlot sessionId={sessionId} />);
    });

    expect(revealTree!.root.findByProps({ testID: 'case.reveal.container' })).toBeDefined();

    // Score is strictly greater than 0
    const scoreVal = storedResult!.result.score;
    expect(scoreVal).toBeGreaterThan(0);
    const revealJson = JSON.stringify(revealTree!.toJSON());
    expect(revealJson).toContain(`${scoreVal}`);
    expect(revealJson).toContain('OFFICIAL EVALUATION');
    expect(revealJson).toContain('CORRECT IDENTIFICATION');

    // Link is established and verified as Valid Contradiction
    const linkBadge = revealTree!.root.findByProps({
      testID: 'case.reveal.link.clue_arjun_testimony__clue_keycard_exit',
    });
    expect(linkBadge).toBeDefined();
    expect(revealJson).toContain('Valid Contradiction');
  });
});
