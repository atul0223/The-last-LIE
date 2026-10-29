import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import renderer, { act } from 'react-test-renderer';
import type {
  CasePublic,
  SessionState,
  ScoreResult,
  Reveal,
  Clue,
} from '@lastlie/case-engine';

const mockPush = vi.fn();
vi.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    back: vi.fn(),
  }),
}));

import RevealSlot from '../src/features/case/reveal';
import { useSessionStore } from '../src/store';
import { getGameService } from '../src/services';

describe('RevealSlot Component (WP-13)', () => {
  const testSessionId = 'sess_reveal_test';

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
    clues: [],
    lockedClueIds: [],
    hypotheses: [{ id: 'hyp_01', label: 'Arjun forged it' }],
    meta: { status: 'published' },
  };

  const fixtureClues: Clue[] = [
    {
      id: 'clue_01',
      type: 'access_log',
      reliability: 'physical',
      text: 'Turnstile exit logged at 23:41 for Maya.',
      unlock: { kind: 'default' },
      asserts: [],
    },
    {
      id: 'clue_02',
      type: 'device_log',
      reliability: 'physical',
      text: 'Phone screen unlocked at 23:47 inside building.',
      unlock: { kind: 'default' },
      asserts: [],
    },
    {
      id: 'clue_03',
      type: 'testimony',
      reliability: 'testimony',
      text: 'Arjun claims he never touched the device.',
      unlock: { kind: 'default' },
      asserts: [],
    },
  ];

  const fixtureResult: ScoreResult = {
    score: 92,
    xp: 150,
    breakdown: {
      correctHypothesis: true,
      hypothesisPoints: 50,
      evidencePoints: 22,
      contradictionPoints: 20,
      penaltyPoints: 0,
      multiplier: 1.0,
      validLinksCount: 1,
      badLinksCount: 1,
    },
  };

  const fixtureReveal: Reveal = {
    caseId: 'case_0001',
    solutionHypothesisId: 'hyp_01',
    allClues: fixtureClues,
    culprits: ['char_arjun'],
    explanation: [
      {
        time: 1421,
        text: 'Maya departed the office through turnstile B.',
        clueIds: ['clue_01'],
      },
      {
        time: 1427,
        text: 'Arjun unlocked Maya phone left on her desk.',
        clueIds: ['clue_02', 'clue_03'],
      },
    ],
    validLinks: [
      {
        a: 'clue_01',
        b: 'clue_02',
        explanation: 'Maya was already outside when the phone unlocked inside.',
      },
    ],
    invalidLinks: [
      {
        a: 'clue_02',
        b: 'clue_03',
      },
    ],
  };

  const activeSession: SessionState = {
    id: testSessionId,
    caseId: 'case_0001',
    caseVersion: 1,
    mode: 'normal',
    unlockedClueIds: ['clue_01', 'clue_02'],
    board: {
      cards: [],
      links: [
        { a: 'clue_01', b: 'clue_02' },
        { a: 'clue_02', b: 'clue_03' },
      ],
    },
    status: 'in_progress',
    startedAt: '2026-10-29T10:00:00Z',
  };

  beforeEach(() => {
    useSessionStore.getState().clear();
    mockPush.mockClear();
  });

  it('renders nothing from result or reveal before submit', () => {
    useSessionStore.getState().setSession(activeSession, mockCasePublic);

    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<RevealSlot sessionId={testSessionId} />);
    });

    const notSubmittedNode = tree!.root.findByProps({ testID: 'case.reveal.notSubmitted' });
    expect(notSubmittedNode).toBeDefined();

    const json = JSON.stringify(tree!.toJSON());
    expect(json).not.toContain('Arjun unlocked Maya phone');
    expect(json).not.toContain('92');
    expect(json).not.toContain('OFFICIAL EVALUATION');
  });

  it('renders score breakdown, links with ✓/✗ labels, and expandable beats when submitted', () => {
    const submittedSession: SessionState = {
      ...activeSession,
      status: 'submitted',
    };

    useSessionStore.getState().setSession(submittedSession, mockCasePublic);
    useSessionStore.getState().setResult(testSessionId, {
      result: fixtureResult,
      reveal: fixtureReveal,
    });

    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<RevealSlot sessionId={testSessionId} />);
    });

    // 1. Score Header
    const scoreNode = tree!.root.findByProps({ testID: 'case.reveal.score' });
    expect(scoreNode).toBeDefined();
    const json = JSON.stringify(tree!.toJSON());
    expect(json).toContain('92');
    expect(json).toContain('150');
    expect(json).toContain('INVESTIGATOR XP EARNED');

    // 2. Score Breakdown
    expect(json).toContain('Prime Hypothesis');
    expect(json).toContain('CORRECT IDENTIFICATION');
    expect(json).toContain('+50 pts');
    expect(json).toContain('Supporting Key Evidence');
    expect(json).toContain('+22 pts');
    expect(json).toContain('Contradiction Links Established');
    expect(json).toContain('+20 pts');

    // 3. Player Links with ✓/✗ text labels
    const validLink = tree!.root.findByProps({
      testID: 'case.reveal.link.clue_01__clue_02',
    });
    expect(validLink).toBeDefined();
    expect(json).toContain('Valid Contradiction');
    expect(json).toContain('Maya was already outside when the phone unlocked inside.');

    const invalidLink = tree!.root.findByProps({
      testID: 'case.reveal.link.clue_02__clue_03',
    });
    expect(invalidLink).toBeDefined();
    expect(json).toContain('Invalid Contradiction');

    // 4. Reveal Beats
    const beat0 = tree!.root.findByProps({ testID: 'case.reveal.beat.0' });
    const beat1 = tree!.root.findByProps({ testID: 'case.reveal.beat.1' });
    expect(beat0).toBeDefined();
    expect(beat1).toBeDefined();
    expect(json).toContain('Maya departed the office through turnstile B.');

    // Tapping beat expands cited clues
    act(() => {
      beat0.props.onPress();
    });

    const updatedJson = JSON.stringify(tree!.toJSON());
    expect(updatedJson).toContain('Turnstile exit logged at 23:41 for Maya.');
  });

  it('Next case button calls startSession and pushes route to new case', async () => {
    const service = getGameService();
    const startSessionSpy = vi.spyOn(service, 'startSession').mockResolvedValue({
      session: {
        id: 'sess_case_0002_new',
        caseId: 'case_0002',
        caseVersion: 1,
        mode: 'normal',
        unlockedClueIds: [],
        board: { cards: [], links: [] },
        status: 'in_progress',
        startedAt: '2026-10-29T11:00:00Z',
      },
      case: {
        ...mockCasePublic,
        id: 'case_0002',
      },
    });

    const submittedSession: SessionState = {
      ...activeSession,
      status: 'submitted',
    };

    useSessionStore.getState().setSession(submittedSession, mockCasePublic);
    useSessionStore.getState().setResult(testSessionId, {
      result: fixtureResult,
      reveal: fixtureReveal,
    });

    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<RevealSlot sessionId={testSessionId} />);
    });

    const nextBtn = tree!.root.findByProps({ testID: 'case.reveal.next' });
    expect(nextBtn).toBeDefined();

    await act(async () => {
      await nextBtn.props.onPress();
    });

    expect(startSessionSpy).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith('/case/sess_case_0002_new');
  });
});
