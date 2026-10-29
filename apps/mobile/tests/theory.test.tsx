import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import renderer, { act } from 'react-test-renderer';
import type { CasePublic, SessionState, PublicClue } from '@lastlie/case-engine';
import TheorySlot from '../src/features/case/theory';
import { useSessionStore } from '../src/store';
import { getGameService } from '../src/services';

describe('TheorySlot Component (WP-13)', () => {
  const testSessionId = 'sess_theory_test';

  const mockClues: PublicClue[] = [
    {
      id: 'clue_01',
      type: 'access_log',
      reliability: 'physical',
      text: 'Turnstile B exit at 23:41:12.',
      unlock: { kind: 'default' },
    },
    {
      id: 'clue_02',
      type: 'device_log',
      reliability: 'physical',
      text: 'Screen unlock PIN at 23:47:04.',
      unlock: { kind: 'default' },
    },
    {
      id: 'clue_03',
      type: 'testimony',
      reliability: 'testimony',
      text: 'Arjun states he received an SMS at 23:47.',
      unlock: { kind: 'default' },
    },
    {
      id: 'clue_04',
      type: 'receipt',
      reliability: 'physical',
      text: 'Cab receipt issued at 23:55.',
      unlock: { kind: 'default' },
    },
    {
      id: 'locked_05',
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
    lockedClueIds: ['locked_05'],
    hypotheses: [
      { id: 'hyp_01', label: 'Arjun forged the message' },
      { id: 'hyp_02', label: 'Maya sent the message herself' },
    ],
    meta: { status: 'published' },
  };

  const mockSession: SessionState = {
    id: testSessionId,
    caseId: 'case_0001',
    caseVersion: 1,
    mode: 'normal',
    unlockedClueIds: ['clue_01', 'clue_02', 'clue_03', 'clue_04'],
    board: {
      cards: [],
      links: [{ a: 'clue_01', b: 'clue_02', explanation: 'Presence conflict' }],
    },
    status: 'in_progress',
    startedAt: '2026-10-29T10:00:00Z',
  };

  beforeEach(() => {
    useSessionStore.getState().clear();
  });

  it('renders hypotheses and read-only list of board links', () => {
    useSessionStore.getState().setSession(mockSession, mockCasePublic);

    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<TheorySlot sessionId={testSessionId} />);
    });

    const json = JSON.stringify(tree!.toJSON());
    expect(json).toContain('Arjun forged the message');
    expect(json).toContain('Maya sent the message herself');
    expect(json).toContain('clue_01');
    expect(json).toContain('clue_02');
    expect(json).toContain('Presence conflict');
  });

  it('enforces maximum 3 supporting clues limit with visible message', () => {
    useSessionStore.getState().setSession(mockSession, mockCasePublic);

    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<TheorySlot sessionId={testSessionId} />);
    });

    // Select 3 clues
    const clue1 = tree!.root.findByProps({ testID: 'case.theory.clue.clue_01' });
    const clue2 = tree!.root.findByProps({ testID: 'case.theory.clue.clue_02' });
    const clue3 = tree!.root.findByProps({ testID: 'case.theory.clue.clue_03' });
    const clue4 = tree!.root.findByProps({ testID: 'case.theory.clue.clue_04' });

    act(() => {
      clue1.props.onPress();
      clue2.props.onPress();
      clue3.props.onPress();
    });

    let json = JSON.stringify(tree!.toJSON());
    expect(json).not.toContain('Maximum 3 supporting clues allowed');

    // Attempt to select a 4th clue
    act(() => {
      clue4.props.onPress();
    });

    json = JSON.stringify(tree!.toJSON());
    expect(json).toContain('Maximum 3 supporting clues allowed');
  });

  it('double tap on confirm produces only one submit call', async () => {
    const service = getGameService();
    const submitSpy = vi.spyOn(service, 'submit').mockImplementation(async () => {
      // Simulate delay in network/service
      await new Promise((r) => setTimeout(r, 50));
      return {
        result: {
          score: 85,
          breakdown: {
            correctHypothesis: true,
            hypothesisPoints: 50,
            evidencePoints: 20,
            contradictionPoints: 15,
            penaltyPoints: 0,
            multiplier: 1.0,
          },
          xp: 100,
        },
        reveal: {
          caseId: 'case_0001',
          solutionHypothesisId: 'hyp_01',
          explanation: [{ text: 'Arjun took the phone', clueIds: ['clue_01'] }],
          allClues: [],
          culprits: ['char_arjun'],
          validLinks: [{ a: 'clue_01', b: 'clue_02' }],
          invalidLinks: [],
        },
      };
    });

    useSessionStore.getState().setSession(mockSession, mockCasePublic);

    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<TheorySlot sessionId={testSessionId} />);
    });

    // Select hypothesis
    const hyp1 = tree!.root.findByProps({ testID: 'case.theory.hypothesis.hyp_01' });
    act(() => {
      hyp1.props.onPress();
    });

    // Tap submit button to open confirmation sheet
    const submitBtn = tree!.root.findByProps({ testID: 'case.theory.submit' });
    act(() => {
      submitBtn.props.onPress();
    });

    // Find confirm button in sheet
    const confirmBtn = tree!.root.findByProps({ testID: 'case.theory.confirm' });

    // Double tap confirm rapidly
    await act(async () => {
      const p1 = confirmBtn.props.onPress();
      const p2 = confirmBtn.props.onPress();
      await Promise.all([p1, p2]);
    });

    // Only one call should have been dispatched to service
    expect(submitSpy).toHaveBeenCalledTimes(1);
    expect(submitSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: testSessionId,
        hypothesisId: 'hyp_01',
        supportingClueIds: [],
        contradictions: [{ a: 'clue_01', b: 'clue_02', explanation: 'Presence conflict' }],
      }),
    );
  });
});
