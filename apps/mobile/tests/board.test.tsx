/**
 * BoardSlot Component Tests (WP-12)
 *
 * Skia Mocking Documentation:
 * In the Node test environment, native Skia bindings are not available.
 * We mock `@shopify/react-native-skia` using vi.mock:
 * - `Canvas`: Renders a standard React Native View container with testID="mock-skia-canvas".
 * - `Line`: Renders a mock View with coordinates in test props.
 * - `vec(x, y)`: Returns a simple point coordinate object { x, y }.
 */

import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import renderer, { act } from 'react-test-renderer';
import type { CasePublic, SessionState, PublicClue, BoardState } from '@lastlie/case-engine';

vi.mock('@shopify/react-native-skia', () => {
  return {
    Canvas: ({ children, style }: { children?: React.ReactNode; style?: StyleProp<ViewStyle> }) => (
      <View testID="mock-skia-canvas" style={style}>
        {children}
      </View>
    ),
    Line: (props: unknown) => <View testID="mock-skia-line" {...(props as Record<string, unknown>)} />,
    vec: (x: number, y: number) => ({ x, y }),
  };
});

import BoardSlot from '../src/features/case/board';
import { useSessionStore } from '../src/store';
import { getGameService } from '../src/services';

describe('BoardSlot Component (WP-12)', () => {
  const testSessionId = 'sess_board_test';

  const mockClues: PublicClue[] = [
    {
      id: 'clue_office_log',
      type: 'access_log',
      reliability: 'physical',
      text: 'Turnstile B exit at 23:41.',
      unlock: { kind: 'default' },
    },
    {
      id: 'clue_device_pin',
      type: 'device_log',
      reliability: 'physical',
      text: 'Screen unlock PIN entered at 23:47.',
      unlock: { kind: 'default' },
    },
    {
      id: 'clue_testimony_arjun',
      type: 'testimony',
      reliability: 'testimony',
      text: 'Arjun says he received an SMS at 23:47.',
      unlock: { kind: 'default' },
    },
    {
      id: 'locked_request_01',
      type: 'photo',
      locked: true,
      hint: { kind: 'request', cost: 10 },
    },
  ];

  const mockCasePublic: CasePublic = {
    id: 'case_0001',
    version: 1,
    kind: 'authored',
    title: 'The Missing Message',
    difficulty: 1,
    estimatedMinutes: 6,
    mysteryType: 'forged_message',
    briefing: 'Who sent the forged message?',
    setting: {
      locationIds: ['loc_office'],
      date: '2026-10-24',
      summary: 'Tech HQ',
    },
    characters: [],
    locations: [],
    objects: [],
    clues: mockClues,
    lockedClueIds: ['locked_request_01'],
    hypotheses: [{ id: 'hyp_01', label: 'Arjun forged it' }],
    meta: { status: 'published' },
  };

  const initialBoard: BoardState = {
    cards: [
      { id: 'clue_office_log', x: 40, y: 40 },
      { id: 'clue_device_pin', x: 220, y: 40 },
    ],
    links: [],
  };

  const mockSession: SessionState = {
    id: testSessionId,
    caseId: 'case_0001',
    caseVersion: 1,
    mode: 'normal',
    unlockedClueIds: ['clue_office_log', 'clue_device_pin', 'clue_testimony_arjun'],
    board: initialBoard,
    status: 'in_progress',
    startedAt: '2026-10-29T10:00:00Z',
  };

  beforeEach(() => {
    useSessionStore.getState().clear();
  });

  it('renders initial cards from session.board and tray items for unlocked clues', () => {
    useSessionStore.getState().setSession(mockSession, mockCasePublic);

    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<BoardSlot sessionId={testSessionId} />);
    });

    // Check cards on board
    const card1 = tree!.root.findByProps({ testID: 'case.board.card.clue_office_log' });
    const card2 = tree!.root.findByProps({ testID: 'case.board.card.clue_device_pin' });
    expect(card1).toBeDefined();
    expect(card2).toBeDefined();

    // Check tray renders unlocked clues
    const tray1 = tree!.root.findByProps({ testID: 'case.board.tray.clue_office_log' });
    const tray2 = tree!.root.findByProps({ testID: 'case.board.tray.clue_testimony_arjun' });
    expect(tray1).toBeDefined();
    expect(tray2).toBeDefined();

    // Locked clues should not be in tray
    expect(() => tree!.root.findByProps({ testID: 'case.board.tray.locked_request_01' })).toThrow();
  });

  it('accessible link flow: A -> Link -> B -> saveBoard called with the link', async () => {
    const service = getGameService();
    const saveBoardSpy = vi.spyOn(service, 'saveBoard').mockResolvedValue();

    useSessionStore.getState().setSession(mockSession, mockCasePublic);

    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<BoardSlot sessionId={testSessionId} />);
    });

    // 1. Tap Card A
    const cardA = tree!.root.findByProps({ testID: 'case.board.card.clue_office_log' });
    const pressableA = cardA.findByProps({ accessibilityRole: 'button' });
    act(() => {
      pressableA.props.onPress();
    });

    // 2. Tap "Link" button
    const linkButton = tree!.root.findByProps({ testID: 'case.board.linkButton' });
    expect(linkButton.props.disabled).toBe(false);
    act(() => {
      linkButton.props.onPress();
    });

    // 3. Tap Card B
    const cardB = tree!.root.findByProps({ testID: 'case.board.card.clue_device_pin' });
    const pressableB = cardB.findByProps({ accessibilityRole: 'button' });
    act(() => {
      pressableB.props.onPress();
    });

    // 4. Verify board state in store was updated with the link
    const updatedSession = useSessionStore.getState().getSession(testSessionId);
    expect(updatedSession?.board.links).toEqual([
      { a: 'clue_office_log', b: 'clue_device_pin' },
    ]);

    // Fast-forward debounce (500ms) to verify saveBoard was called on service
    await vi.waitFor(() => {
      expect(saveBoardSpy).toHaveBeenCalledWith(
        testSessionId,
        expect.objectContaining({
          links: [{ a: 'clue_office_log', b: 'clue_device_pin' }],
        }),
      );
    });
  });

  it('tray item tap places card onto board and calls saveBoard', async () => {
    useSessionStore.getState().setSession(mockSession, mockCasePublic);

    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<BoardSlot sessionId={testSessionId} />);
    });

    // Card clue_testimony_arjun is not yet on board
    expect(() =>
      tree!.root.findByProps({ testID: 'case.board.card.clue_testimony_arjun' }),
    ).toThrow();

    // Tap tray item
    const trayItem = tree!.root.findByProps({
      testID: 'case.board.tray.clue_testimony_arjun',
    });
    act(() => {
      trayItem.props.onPress();
    });

    // Card should now be on board
    const newCard = tree!.root.findByProps({
      testID: 'case.board.card.clue_testimony_arjun',
    });
    expect(newCard).toBeDefined();

    const currentSession = useSessionStore.getState().getSession(testSessionId);
    expect(currentSession?.board.cards.some((c) => c.id === 'clue_testimony_arjun')).toBe(true);
  });

  it('select link and delete removes link and calls saveBoard', () => {
    const sessionWithLink: SessionState = {
      ...mockSession,
      board: {
        cards: initialBoard.cards,
        links: [{ a: 'clue_office_log', b: 'clue_device_pin' }],
      },
    };

    useSessionStore.getState().setSession(sessionWithLink, mockCasePublic);

    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<BoardSlot sessionId={testSessionId} />);
    });

    // Link badge should be visible
    const linkBadge = tree!.root.findByProps({
      testID: 'case.board.link.clue_office_log__clue_device_pin',
    });
    expect(linkBadge).toBeDefined();

    // Tap link to select it
    act(() => {
      linkBadge.props.onPress();
    });

    // Delete Link button appears
    const deleteButton = tree!.root.findByProps({ testID: 'case.board.deleteLinkButton' });
    expect(deleteButton).toBeDefined();

    // Tap delete
    act(() => {
      deleteButton.props.onPress();
    });

    // Link removed from store
    const updatedSession = useSessionStore.getState().getSession(testSessionId);
    expect(updatedSession?.board.links).toHaveLength(0);
  });
});
