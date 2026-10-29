import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import renderer, { act } from 'react-test-renderer';
import type { CasePublic, SessionState, PublicClue, ClueType } from '@lastlie/case-engine';

vi.mock('@shopify/flash-list', async () => {
  const { View } = await import('react-native-web');
  return {
    FlashList: <T,>({
      data,
      renderItem,
      keyExtractor,
    }: {
      data: T[];
      renderItem: (info: { item: T; index: number }) => React.ReactElement | null;
      keyExtractor?: (item: T, index: number) => string;
    }) => (
      <View testID="flash-list-mock">
        {data.map((item, index) => (
          <React.Fragment key={keyExtractor ? keyExtractor(item, index) : index}>
            {renderItem({ item, index })}
          </React.Fragment>
        ))}
      </View>
    ),
  };
});

import EvidenceSlot from '../src/features/case/evidence';
import { ClueCard } from '../src/features/case/components/ClueCard';
import { useSessionStore } from '../src/store';
import { getGameService } from '../src/services';

const ALL_CLUE_TYPES: ClueType[] = [
  'message',
  'access_log',
  'device_log',
  'receipt',
  'testimony',
  'photo',
  'document',
  'object',
  'cctv',
];

describe('EvidenceSlot & ClueCard (WP-11)', () => {
  const testSessionId = 'sess_evidence_test';

  const sampleClues: PublicClue[] = [
    {
      id: 'clue_msg',
      type: 'message',
      reliability: 'testimony',
      text: 'Message received at 23:47: Deploy completed.',
      unlock: { kind: 'default' },
      tags: ['digital', 'timeline'],
    },
    {
      id: 'clue_access',
      type: 'access_log',
      reliability: 'physical',
      text: 'Turnstile B exit: Maya Lin at 23:41:12.',
      unlock: { kind: 'default' },
      tags: ['physical', 'timeline'],
    },
    {
      id: 'clue_device',
      type: 'device_log',
      reliability: 'physical',
      text: 'Phone screen unlock event at 23:47:04 via PIN.',
      unlock: { kind: 'default' },
      tags: ['digital'],
    },
    {
      id: 'clue_receipt',
      type: 'receipt',
      reliability: 'physical',
      text: 'Cab receipt issued at 23:55 to Maya Lin.',
      unlock: { kind: 'default' },
    },
    {
      id: 'clue_testimony',
      type: 'testimony',
      reliability: 'testimony',
      text: 'Arjun states he never left his workstation.',
      unlock: { kind: 'default' },
      tags: ['witness'],
    },
    {
      id: 'clue_photo',
      type: 'photo',
      reliability: 'physical',
      text: 'Parking lot snapshot showing Maya car departing.',
      unlock: { kind: 'default' },
    },
    {
      id: 'clue_doc',
      type: 'document',
      reliability: 'physical',
      text: 'Incident report signed by building management.',
      unlock: { kind: 'default' },
    },
    {
      id: 'clue_obj',
      type: 'object',
      reliability: 'physical',
      text: 'Discarded SIM card packaging found near restroom.',
      unlock: { kind: 'default' },
    },
    {
      id: 'clue_cctv',
      type: 'cctv',
      reliability: 'physical',
      text: 'Hallway camera recording showing shadowy figure at 23:46.',
      unlock: { kind: 'default' },
    },
    {
      id: 'locked_request_01',
      type: 'device_log',
      locked: true,
      hint: { kind: 'request', cost: 10 },
    },
    {
      id: 'locked_after_02',
      type: 'access_log',
      locked: true,
      hint: { kind: 'after_clue', clueId: 'clue_access' },
    },
    {
      id: 'locked_hidden_03',
      type: 'cctv',
      locked: true,
      hint: { kind: 'after_clue_hidden' },
    },
    {
      id: 'locked_interview_04',
      type: 'testimony',
      locked: true,
      hint: { kind: 'interview' },
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
    clues: sampleClues,
    lockedClueIds: ['locked_request_01', 'locked_after_02', 'locked_hidden_03', 'locked_interview_04'],
    hypotheses: [
      { id: 'hyp_01', label: 'Arjun forged it' },
    ],
    meta: { status: 'published' },
  };

  const mockSession: SessionState = {
    id: testSessionId,
    caseId: 'case_0001',
    caseVersion: 1,
    mode: 'normal',
    unlockedClueIds: sampleClues.filter((c) => !('locked' in c && c.locked)).map((c) => c.id),
    board: { cards: [], links: [] },
    status: 'in_progress',
    startedAt: '2026-10-29T10:00:00Z',
  };

  beforeEach(() => {
    useSessionStore.getState().clear();
  });

  it('renders every clue type cleanly in ClueCard', () => {
    for (const clueType of ALL_CLUE_TYPES) {
      const clue: PublicClue = {
        id: `clue_test_${clueType}`,
        type: clueType,
        reliability: 'physical',
        text: `Sample evidence body for ${clueType}`,
        unlock: { kind: 'default' },
      };

      let tree: renderer.ReactTestRenderer;
      act(() => {
        tree = renderer.create(<ClueCard clue={clue} />);
      });

      const root = tree!.root;
      const cardNode = root.findByProps({ testID: `case.evidence.card.${clue.id}` });
      expect(cardNode).toBeDefined();
      expect(JSON.stringify(tree!.toJSON())).toContain(`Sample evidence body for ${clueType}`);
    }
  });

  it('never displays clue text on a locked card', () => {
    const secretText = 'CONFIDENTIAL_SECRET_DO_NOT_LEAK';
    const lockedClue: PublicClue = {
      id: 'locked_leak_test',
      type: 'document',
      locked: true,
      hint: { kind: 'request', cost: 15 },
      ...({ text: secretText } as Record<string, unknown>),
    };

    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<ClueCard clue={lockedClue} />);
    });

    const renderedString = JSON.stringify(tree!.toJSON());
    expect(renderedString).not.toContain(secretText);
    expect(renderedString).toContain('LOCKED DOCUMENT');
    expect(renderedString).toContain('Requires evidence request (15 pts)');
  });

  it('applies type filter chips when selected', () => {
    useSessionStore.getState().setSession(mockSession, mockCasePublic);

    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<EvidenceSlot sessionId={testSessionId} />);
    });

    // Check filter chips exist
    const messageFilter = tree!.root.findByProps({ testID: 'case.evidence.filter.message' });
    expect(messageFilter).toBeDefined();

    // Tap message filter
    act(() => {
      messageFilter.props.onPress();
    });

    // Message clue should be rendered
    const msgCard = tree!.root.findByProps({ testID: 'case.evidence.card.clue_msg' });
    expect(msgCard).toBeDefined();

    // Other clues should not be present
    expect(() => tree!.root.findByProps({ testID: 'case.evidence.card.clue_access' })).toThrow();
  });

  it('opening an unlocked clue card triggers markClueRead and opens detail sheet', () => {
    useSessionStore.getState().setSession(mockSession, mockCasePublic);

    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<EvidenceSlot sessionId={testSessionId} />);
    });

    // Initially readClues is empty in store
    expect(useSessionStore.getState().readClueIds[testSessionId] ?? []).toEqual([]);

    // Tap card
    const card = tree!.root.findByProps({ testID: 'case.evidence.card.clue_msg' });
    act(() => {
      card.props.onPress();
    });

    // markClueRead was called and store was updated
    expect(useSessionStore.getState().readClueIds[testSessionId]).toContain('clue_msg');

    // Detail modal dialog is visible
    const modalDialog = tree!.root.findByProps({ accessibilityLabel: 'Evidence Detail' });
    expect(modalDialog).toBeDefined();
    expect(JSON.stringify(tree!.toJSON())).toContain('Message received at 23:47');
  });

  it('handles request unlock flow with confirmation and calls unlockClue', async () => {
    const service = getGameService();
    const unlockSpy = vi.spyOn(service, 'unlockClue').mockResolvedValue({
      id: 'locked_request_01',
      type: 'device_log',
      reliability: 'physical',
      text: 'Unlocked request text',
      unlock: { kind: 'request', cost: 10 },
    });

    useSessionStore.getState().setSession(mockSession, mockCasePublic);

    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<EvidenceSlot sessionId={testSessionId} />);
    });

    // Tap request button on locked clue
    const requestBtn = tree!.root.findByProps({
      testID: 'case.evidence.request.locked_request_01',
    });
    expect(requestBtn).toBeDefined();

    act(() => {
      requestBtn.props.onPress();
    });

    // Confirm sheet should be visible
    const confirmBtn = tree!.root.findByProps({ testID: 'case.evidence.request.confirm' });
    expect(confirmBtn).toBeDefined();

    // Confirm request
    await act(async () => {
      await confirmBtn.props.onPress();
    });

    expect(unlockSpy).toHaveBeenCalledWith(
      testSessionId,
      'locked_request_01',
      { kind: 'request', cost: 10 },
    );
  });
});
