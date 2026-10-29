import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import renderer, { act } from 'react-test-renderer';
import type { CasePublic, SessionState } from '@lastlie/case-engine';
import BriefingSlot from '../src/features/case/briefing';
import { useSessionStore } from '../src/store';

describe('BriefingSlot (WP-11)', () => {
  const testSessionId = 'sess_briefing_test';

  const mockCasePublic: CasePublic = {
    id: 'case_0001',
    version: 1,
    kind: 'authored',
    title: 'The Missing Message',
    difficulty: 1,
    estimatedMinutes: 6,
    mysteryType: 'forged_message',
    briefing: 'Who sent the forged message from Maya’s phone at 23:47?',
    setting: {
      locationIds: ['loc_office', 'loc_server_room'],
      date: '2026-10-24',
      summary: 'Vesper Tech HQ, late Saturday night. The security guard was on break.',
    },
    characters: [
      {
        id: 'char_maya',
        name: 'Maya Lin',
        role: 'Lead Architect',
        publicDescription: 'Claims she left the building at 23:40 after saving her work.',
      },
      {
        id: 'char_arjun',
        name: 'Arjun Mehta',
        role: 'Systems Engineer',
        publicDescription: 'Claims he received an SMS from Maya at 23:47 confirming the deployment.',
      },
      {
        id: 'char_rhea',
        name: 'Rhea Patel',
        role: 'Security Analyst',
        publicDescription: 'Maintains that all departures are logged automatically by turnstiles.',
      },
    ],
    locations: [],
    objects: [],
    clues: [],
    lockedClueIds: [],
    hypotheses: [
      { id: 'hyp_01', label: 'Arjun forged the message' },
      { id: 'hyp_02', label: 'Maya sent the message' },
    ],
    meta: { status: 'published' },
  };

  const mockSession: SessionState = {
    id: testSessionId,
    caseId: 'case_0001',
    caseVersion: 1,
    mode: 'normal',
    unlockedClueIds: [],
    board: { cards: [], links: [] },
    status: 'in_progress',
    startedAt: '2026-10-29T10:00:00Z',
  };

  beforeEach(() => {
    useSessionStore.getState().clear();
  });

  it('renders loading state when session is not loaded', () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<BriefingSlot sessionId="unknown_sess" />);
    });

    const loadingNode = tree!.root.findByProps({ testID: 'case.briefing.loading' });
    expect(loadingNode).toBeDefined();
  });

  it('renders briefing question and setting summary', () => {
    useSessionStore.getState().setSession(mockSession, mockCasePublic);

    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<BriefingSlot sessionId={testSessionId} />);
    });

    const json = JSON.stringify(tree!.toJSON());
    expect(json).toContain('Who sent the forged message');
    expect(json).toContain('Vesper Tech HQ');
    expect(json).toContain('The Missing Message');
  });

  it('renders all characters with testID case.briefing.character.<id>', () => {
    useSessionStore.getState().setSession(mockSession, mockCasePublic);

    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<BriefingSlot sessionId={testSessionId} />);
    });

    const json = JSON.stringify(tree!.toJSON());
    for (const char of mockCasePublic.characters) {
      const charNode = tree!.root.findByProps({ testID: `case.briefing.character.${char.id}` });
      expect(charNode).toBeDefined();
      expect(json).toContain(char.name);
      expect(json).toContain(char.role.toUpperCase());
    }
  });
});
