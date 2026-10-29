import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { CaseDefinition, SessionState, Submission } from '../src/schema/index.js';
import { buildReveal, scoreSubmission } from '../src/scoring/index.js';

describe('scoreSubmission Scoring Table Tests (SYSTEM_DESIGN §7.2)', () => {
  const case0001Path = resolve(__dirname, '../../content/cases/authored/case_0001.json');
  const raw = readFileSync(case0001Path, 'utf-8');
  const case0001 = JSON.parse(raw) as CaseDefinition;

  const allClueIds = case0001.clues.map((c) => c.id);

  function makeSession(mode: 'normal' | 'daily' | 'challenge' | 'replay' = 'normal'): SessionState {
    return {
      id: 'session_scoring_01',
      caseId: case0001.id,
      caseVersion: 1,
      mode,
      status: 'in_progress',
      unlockedClueIds: allClueIds,
      board: { cards: [], links: [] },
      startedAt: '2026-10-29T10:00:00Z',
    };
  }

  it('correct + full evidence + valid contradiction link earns maximum score', () => {
    const session = makeSession();
    const submission: Submission = {
      sessionId: session.id,
      hypothesisId: 'hyp_arjun_forged', // correct
      supportingClueIds: ['clue_keycard_exit', 'clue_device_log'], // full key evidence (2/2)
      contradictions: [
        {
          a: 'clue_arjun_testimony', // declared lie (claims Maya at studio [1420, 1435))
          b: 'clue_keycard_exit', // physical proof Maya at lobby [1420, 1430)
        },
      ],
    };

    const res = scoreSubmission(case0001, session, submission);

    // 100 (hyp) + 50 (evidence) + 10 (contradiction) = 160
    expect(res.score).toBe(160);
    expect(res.breakdown.correctHypothesis).toBe(true);
    expect(res.breakdown.hypothesisPoints).toBe(100);
    expect(res.breakdown.evidencePoints).toBe(50);
    expect(res.breakdown.contradictionPoints).toBe(10);
    expect(res.breakdown.multiplier).toBe(1.0);
    expect(res.breakdown.penaltyPoints).toBe(0);
    // XP = score * difficulty (160 * 2 = 320)
    expect(res.xp).toBe(320);
  });

  it('correct + partial evidence earns proportional evidence points', () => {
    const session = makeSession();
    const submission: Submission = {
      sessionId: session.id,
      hypothesisId: 'hyp_arjun_forged',
      supportingClueIds: ['clue_keycard_exit'], // 1 of 2 key clues -> 50%
      contradictions: [
        {
          a: 'clue_arjun_testimony',
          b: 'clue_keycard_exit',
        },
      ],
    };

    const res = scoreSubmission(case0001, session, submission);

    // 100 (hyp) + 25 (50% of 50) + 10 (contradiction) = 135
    expect(res.score).toBe(135);
    expect(res.breakdown.evidencePoints).toBe(25);
    expect(res.xp).toBe(270); // 135 * 2
  });

  it('wrong hypothesis earns 0 hypothesis points and half reasoning points (x0.5 multiplier)', () => {
    const session = makeSession();
    const submission: Submission = {
      sessionId: session.id,
      hypothesisId: 'hyp_maya_sent', // wrong!
      supportingClueIds: ['clue_keycard_exit', 'clue_device_log'], // 50 evidence
      contradictions: [
        {
          a: 'clue_arjun_testimony',
          b: 'clue_keycard_exit', // +10 contradiction
        },
      ],
    };

    const res = scoreSubmission(case0001, session, submission);

    // Reasoning = 50 + 10 = 60. Multiplier = 0.5 -> 30.
    expect(res.score).toBe(30);
    expect(res.breakdown.correctHypothesis).toBe(false);
    expect(res.breakdown.hypothesisPoints).toBe(0);
    expect(res.breakdown.evidencePoints).toBe(50);
    expect(res.breakdown.contradictionPoints).toBe(10);
    expect(res.breakdown.multiplier).toBe(0.5);
    expect(res.xp).toBe(60); // 30 * 2
  });

  it('bad links floor at 0 for the contradiction component and do not reduce other points', () => {
    const session = makeSession();
    const submission: Submission = {
      sessionId: session.id,
      hypothesisId: 'hyp_arjun_forged',
      supportingClueIds: ['clue_keycard_exit', 'clue_device_log'], // 50 evidence
      contradictions: [
        // 3 bad links that do not contradict
        { a: 'clue_maya_testimony', b: 'clue_marcus_log' },
        { a: 'clue_rhea_testimony', b: 'clue_keycard_exit' },
        { a: 'clue_maya_testimony', b: 'clue_rhea_testimony' },
      ],
    };

    const res = scoreSubmission(case0001, session, submission);

    // 3 bad links = -15, but contradiction component is floored at 0!
    expect(res.breakdown.badLinksCount).toBe(3);
    expect(res.breakdown.validLinksCount).toBe(0);
    expect(res.breakdown.contradictionPoints).toBe(0);
    // Total score is 100 + 50 + 0 = 150 (not 135!)
    expect(res.score).toBe(150);
  });

  it('deducts 10 points per request-unlocked clue in the session', () => {
    const sessionWithRequest = makeSession();
    const caseWithRequest: CaseDefinition = {
      ...case0001,
      clues: [
        ...case0001.clues,
        {
          id: 'clue_wiretap',
          type: 'device_log',
          reliability: 'physical',
          asserts: [],
          text: 'Wiretap transcript',
          unlock: { kind: 'request', cost: 10 },
        },
      ],
    };
    sessionWithRequest.unlockedClueIds.push('clue_wiretap');

    const submission: Submission = {
      sessionId: sessionWithRequest.id,
      hypothesisId: 'hyp_arjun_forged',
      supportingClueIds: ['clue_keycard_exit', 'clue_device_log'],
      contradictions: [],
    };

    const res = scoreSubmission(caseWithRequest, sessionWithRequest, submission);

    // 100 + 50 - 10 (request penalty) = 140
    expect(res.breakdown.penaltyPoints).toBe(10);
    expect(res.score).toBe(140);
  });

  it('replay mode grants reduced XP (x0.25)', () => {
    const replaySession = makeSession('replay');
    const submission: Submission = {
      sessionId: replaySession.id,
      hypothesisId: 'hyp_arjun_forged',
      supportingClueIds: ['clue_keycard_exit', 'clue_device_log'],
      contradictions: [],
    };

    const res = scoreSubmission(case0001, replaySession, submission);

    expect(res.score).toBe(150);
    // Normal XP would be 150 * 2 = 300.
    // Replay XP is 300 * 0.25 = 75!
    expect(res.xp).toBe(75);
  });

  it('validates submission against session and case: throws on invalid inputs', () => {
    const session = makeSession();

    // 1. Invalid hypothesis
    expect(() =>
      scoreSubmission(case0001, session, {
        sessionId: session.id,
        hypothesisId: 'hyp_ghost',
        supportingClueIds: [],
        contradictions: [],
      }),
    ).toThrowError(/hypothesisId 'hyp_ghost' does not exist/);

    // 2. Locked supporting clue
    const restrictedSession: SessionState = {
      ...session,
      unlockedClueIds: ['clue_arjun_testimony'],
    };
    expect(() =>
      scoreSubmission(case0001, restrictedSession, {
        sessionId: session.id,
        hypothesisId: 'hyp_arjun_forged',
        supportingClueIds: ['clue_device_log'], // not unlocked
        contradictions: [],
      }),
    ).toThrowError(/supportingClueId 'clue_device_log' is not unlocked/);

    // 3. Locked contradiction clue
    expect(() =>
      scoreSubmission(case0001, restrictedSession, {
        sessionId: session.id,
        hypothesisId: 'hyp_arjun_forged',
        supportingClueIds: [],
        contradictions: [{ a: 'clue_arjun_testimony', b: 'clue_device_log' }],
      }),
    ).toThrowError(/contradiction link references locked clue/);

    // 4. Non-existent supporting clue
    expect(() =>
      scoreSubmission(case0001, session, {
        sessionId: session.id,
        hypothesisId: 'hyp_arjun_forged',
        supportingClueIds: ['clue_nonexistent'],
        contradictions: [],
      }),
    ).toThrowError(/supportingClueId 'clue_nonexistent' does not exist/);

    // 5. Non-existent contradiction clue
    expect(() =>
      scoreSubmission(case0001, session, {
        sessionId: session.id,
        hypothesisId: 'hyp_arjun_forged',
        supportingClueIds: [],
        contradictions: [{ a: 'clue_arjun_testimony', b: 'clue_nonexistent' }],
      }),
    ).toThrowError(/contradiction link references non-existent clue/);
  });
});

describe('buildReveal Full Case Unredaction (WP-06)', () => {
  const case0001Path = resolve(__dirname, '../../content/cases/authored/case_0001.json');
  const raw = readFileSync(case0001Path, 'utf-8');
  const case0001 = JSON.parse(raw) as CaseDefinition;

  it('builds comprehensive reveal narrative with all clues, truth, and link evaluations', () => {
    const submission: Submission = {
      sessionId: 'session_01',
      hypothesisId: 'hyp_arjun_forged',
      supportingClueIds: ['clue_keycard_exit', 'clue_device_log'],
      contradictions: [
        {
          a: 'clue_arjun_testimony',
          b: 'clue_keycard_exit',
        },
        {
          a: 'clue_maya_testimony',
          b: 'clue_rhea_testimony',
        },
      ],
    };

    const reveal = buildReveal(case0001, submission);

    expect(reveal.caseId).toBe('case_0001');
    expect(reveal.solutionHypothesisId).toBe('hyp_arjun_forged');
    expect(reveal.explanation.length).toBeGreaterThan(0);
    expect(reveal.allClues).toHaveLength(case0001.clues.length);
    expect(reveal.culprits).toEqual(['char_arjun']);
    expect(reveal.truth).toBeDefined();

    // Check link evaluation with ruleId
    expect(reveal.validLinks).toHaveLength(1);
    expect(reveal.validLinks[0]?.a).toBe('clue_arjun_testimony');
    expect(reveal.validLinks[0]?.b).toBe('clue_keycard_exit');
    expect(reveal.validLinks[0]?.ruleId).toBe('access.presence');
    expect(reveal.validLinks[0]?.explanation).toBeDefined();

    // Invalid link
    expect(reveal.invalidLinks).toHaveLength(1);
    expect(reveal.invalidLinks[0]?.a).toBe('clue_maya_testimony');
    expect(reveal.invalidLinks[0]?.b).toBe('clue_rhea_testimony');
  });

  it('accepts wrapped { submission } input as well', () => {
    const submission: Submission = {
      sessionId: 'session_01',
      hypothesisId: 'hyp_arjun_forged',
      supportingClueIds: [],
      contradictions: [],
    };

    const reveal = buildReveal(case0001, { submission });
    expect(reveal.caseId).toBe('case_0001');
    expect(reveal.validLinks).toEqual([]);
    expect(reveal.invalidLinks).toEqual([]);
  });

  it('buildReveal marks links with nonexistent clues as invalid', () => {
    const submission: Submission = {
      sessionId: 'session_01',
      hypothesisId: 'hyp_arjun_forged',
      supportingClueIds: [],
      contradictions: [{ a: 'clue_ghost_1', b: 'clue_ghost_2' }],
    };
    const reveal = buildReveal(case0001, submission);
    expect(reveal.invalidLinks).toHaveLength(1);
    expect(reveal.validLinks).toHaveLength(0);
  });
});
