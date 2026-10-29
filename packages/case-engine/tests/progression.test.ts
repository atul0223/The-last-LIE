import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import type { ScoreResult } from '../src/schema/index.js';
import {
  applyResult,
  createInitialProgress,
  DEFAULT_PROGRESSION_CONFIG,
  DETECTIVE_RANKS,
  nextRankRequirements,
  ProgressionConfigSchema,
  rankFor,
  validateProgressionConfig,
} from '../src/progression/index.js';
import type {
  CaseProgressionMeta,
  DetectiveRank,
  PlayerProgress,
  ProgressionConfig,
} from '../src/progression/index.js';

function deepFreeze<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  Object.freeze(obj);
  for (const key of Object.keys(obj)) {
    const prop = (obj as Record<string, unknown>)[key];
    if (prop !== null && typeof prop === 'object' && !Object.isFrozen(prop)) {
      deepFreeze(prop);
    }
  }
  return obj;
}

function makeScoreResult(overrides: Partial<ScoreResult> = {}): ScoreResult {
  return {
    score: 150,
    breakdown: {
      correctHypothesis: true,
      hypothesisPoints: 100,
      evidencePoints: 50,
      contradictionPoints: 0,
      penaltyPoints: 0,
      multiplier: 1.0,
      validLinksCount: 0,
      badLinksCount: 0,
      requestCost: 0,
    },
    xp: 150,
    ...overrides,
  };
}

describe('WP-22 Progression Engine', () => {
  describe('Required Core Specifications', () => {
    it('"Grinder" test: 500 perfect difficulty-1 solves must NOT pass the Investigator gate', () => {
      let progress = createInitialProgress();
      const perfectResult = makeScoreResult({
        score: 150,
        breakdown: {
          correctHypothesis: true,
          hypothesisPoints: 100,
          evidencePoints: 50,
          contradictionPoints: 0,
          penaltyPoints: 0,
          multiplier: 1.0,
        },
      });

      for (let i = 0; i < 500; i++) {
        const caseMeta: CaseProgressionMeta = {
          id: `case_grind_${i}`,
          difficulty: 1,
          mode: 'normal',
        };
        const res = applyResult(progress, perfectResult, caseMeta);
        progress = res.progress;

        // Ensure no rank_up event to Investigator was ever emitted
        const rankUpToInvestigator = res.events.some(
          (e) => e.type === 'rank_up' && e.newRank === 'Investigator',
        );
        expect(rankUpToInvestigator).toBe(false);
      }

      // Grinder has 500 solves * 150 XP = 75,000 XP
      expect(progress.xp).toBe(75000);
      expect(progress.solvedCount).toBe(500);
      expect(progress.correctCount).toBe(500);
      expect(progress.mastery[1]).toBe(500);
      expect(progress.mastery[2]).toBe(0);

      // Rank MUST remain Trainee because Investigator requires mastery gate (difficulty >= 2)
      expect(progress.rank).toBe('Trainee');
      expect(rankFor(progress)).toBe('Trainee');

      // Next rank requirements check
      const nextReq = nextRankRequirements(progress);
      expect(nextReq.currentRank).toBe('Trainee');
      expect(nextReq.nextRank).toBe('Investigator');
      expect(nextReq.xpMissing).toBe(0); // Has plenty of XP
      expect(nextReq.masteryGate?.minDifficulty).toBe(2);
      expect(nextReq.masteryGate?.qualifyingSolves).toBe(2);
      expect(nextReq.masteryGate?.currentSolves).toBe(0);
      expect(nextReq.masteryGate?.solvesMissing).toBe(2); // Blocked on mastery gate
      expect(nextReq.canRankUp).toBe(false);
    });

    it('"Skilled" test: a realistic mix of difficulty 1–3 solves reaches Specialist', () => {
      let progress = createInitialProgress();
      const perfectScore = makeScoreResult({
        score: 150,
        breakdown: {
          correctHypothesis: true,
          hypothesisPoints: 100,
          evidencePoints: 50,
          contradictionPoints: 0,
          penaltyPoints: 0,
          multiplier: 1.0,
        },
      });

      // Realistic mix:
      // 1x Difficulty 1 (XP = 150 * 1 = 150)
      // 2x Difficulty 2 (XP = 2 * (150 * 2) = 600)
      // 2x Difficulty 3 (XP = 2 * (150 * 3) = 900)
      // Total XP = 1650
      const cases: CaseProgressionMeta[] = [
        { id: 'case_d1_01', difficulty: 1 },
        { id: 'case_d2_01', difficulty: 2 },
        { id: 'case_d2_02', difficulty: 2 },
        { id: 'case_d3_01', difficulty: 3 },
        { id: 'case_d3_02', difficulty: 3 },
      ];

      const rankProgressionHistory: DetectiveRank[] = [progress.rank];

      for (const caseMeta of cases) {
        const out = applyResult(progress, perfectScore, caseMeta);
        progress = out.progress;
        rankProgressionHistory.push(progress.rank);
      }

      // Verification of progress metrics
      expect(progress.solvedCount).toBe(5);
      expect(progress.correctCount).toBe(5);
      expect(progress.xp).toBe(1650);
      expect(progress.mastery[1]).toBe(1);
      expect(progress.mastery[2]).toBe(2);
      expect(progress.mastery[3]).toBe(2);

      // Successfully reached Specialist
      expect(progress.rank).toBe('Specialist');
      expect(rankFor(progress)).toBe('Specialist');

      // Rank progression stepped through Trainee -> Investigator -> Specialist
      expect(rankProgressionHistory).toEqual([
        'Trainee',      // Initial
        'Trainee',      // 1st case: diff 1 (XP: 150)
        'Trainee',      // 2nd case: diff 2 (XP: 450 < 500)
        'Investigator', // 3rd case: diff 2 (XP: 750 >= 500, diff 2+ solves: 2 >= 2)
        'Investigator', // 4th case: diff 3 (XP: 1200, diff 3+ solves: 1 < 2)
        'Specialist',   // 5th case: diff 3 (XP: 1650 >= 1200, diff 3+ solves: 2 >= 2)
      ]);

      // Checks next requirements towards Senior Detective (diff 4)
      const nextReq = nextRankRequirements(progress);
      expect(nextReq.currentRank).toBe('Specialist');
      expect(nextReq.nextRank).toBe('Senior Detective');
      expect(nextReq.masteryGate?.minDifficulty).toBe(4);
      expect(nextReq.masteryGate?.qualifyingSolves).toBe(3);
      expect(nextReq.masteryGate?.currentSolves).toBe(0);
      expect(nextReq.masteryGate?.solvesMissing).toBe(3);
      expect(nextReq.canRankUp).toBe(false);
    });

    it('Replay test: replays give reduced XP and never advance mastery', () => {
      const progress = createInitialProgress();
      const initialMastery = { ...progress.mastery };

      const scoreResult = makeScoreResult({
        score: 160,
        breakdown: {
          correctHypothesis: true,
          hypothesisPoints: 100,
          evidencePoints: 50,
          contradictionPoints: 10,
          penaltyPoints: 0,
          multiplier: 1.0,
        },
      });

      const caseMeta: CaseProgressionMeta = {
        id: 'case_replay_01',
        difficulty: 2,
        mode: 'replay',
      };

      const { progress: updatedProgress, events } = applyResult(progress, scoreResult, caseMeta);

      // Normal XP would be 160 * 2.0 = 320.
      // Replay XP: 320 * 0.25 = 80 XP.
      expect(updatedProgress.xp).toBe(80);

      // Solves should increment
      expect(updatedProgress.solvedCount).toBe(1);
      expect(updatedProgress.correctCount).toBe(1);

      // Mastery counts MUST NOT change for replay
      expect(updatedProgress.mastery).toEqual(initialMastery);

      // Events should have xp_gained, but NO mastery_progress
      expect(events.some((e) => e.type === 'xp_gained')).toBe(true);
      expect(events.some((e) => e.type === 'mastery_progress')).toBe(false);

      // Check event payload
      const xpEvent = events.find((e) => e.type === 'xp_gained');
      expect(xpEvent).toEqual({
        type: 'xp_gained',
        amount: 80,
        totalXp: 80,
      });
    });

    it('Wrong-answer test: earns partial XP but no mastery credit', () => {
      const progress = createInitialProgress();
      const initialMastery = { ...progress.mastery };

      // Wrong hypothesis earns partial reasoning points (e.g. 40 evidencePoints * 0.5 = 20)
      const wrongResult = makeScoreResult({
        score: 20,
        breakdown: {
          correctHypothesis: false,
          hypothesisPoints: 0,
          evidencePoints: 40,
          contradictionPoints: 0,
          penaltyPoints: 0,
          multiplier: 0.5,
        },
      });

      const caseMeta: CaseProgressionMeta = {
        id: 'case_wrong_01',
        difficulty: 2,
        mode: 'normal',
      };

      const { progress: updatedProgress, events } = applyResult(progress, wrongResult, caseMeta);

      // XP earned: 20 * 2.0 = 40 XP
      expect(updatedProgress.xp).toBe(40);
      expect(updatedProgress.solvedCount).toBe(1);
      expect(updatedProgress.correctCount).toBe(0); // Wrong answer does not increment correctCount

      // Mastery must NOT advance
      expect(updatedProgress.mastery).toEqual(initialMastery);

      // Events: xp_gained emitted, but NO mastery_progress and NO rank_up
      expect(events).toEqual([
        {
          type: 'xp_gained',
          amount: 40,
          totalXp: 40,
        },
      ]);
    });

    it('Immutability test: input objects are deep-equal before and after the call', () => {
      const progress = deepFreeze(createInitialProgress());
      const scoreResult = deepFreeze(makeScoreResult());
      const caseMeta: CaseProgressionMeta = deepFreeze({
        id: 'case_immut_01',
        difficulty: 2,
        mode: 'normal',
        characters: ['char_maya', 'char_arjun'],
      });
      const config = deepFreeze(JSON.parse(JSON.stringify(DEFAULT_PROGRESSION_CONFIG)));

      const progressBefore = JSON.parse(JSON.stringify(progress));
      const resultBefore = JSON.parse(JSON.stringify(scoreResult));
      const caseMetaBefore = JSON.parse(JSON.stringify(caseMeta));
      const configBefore = JSON.parse(JSON.stringify(config));

      const { progress: nextProgress } = applyResult(progress, scoreResult, caseMeta, config);

      expect(progress).toEqual(progressBefore);
      expect(scoreResult).toEqual(resultBefore);
      expect(caseMeta).toEqual(caseMetaBefore);
      expect(config).toEqual(configBefore);

      // Output should be a newly constructed object
      expect(nextProgress).not.toBe(progress);
      expect(nextProgress.mastery).not.toBe(progress.mastery);
      expect(nextProgress.solvedCaseIds).not.toBe(progress.solvedCaseIds);
    });

    it('Determinism: same inputs → identical outputs', () => {
      const progress = createInitialProgress();
      const scoreResult = makeScoreResult({ score: 140 });
      const caseMeta: CaseProgressionMeta = {
        id: 'case_det_01',
        difficulty: 3,
        characters: [{ id: 'char_a' }, { id: 'char_b' }],
      };

      const run1 = applyResult(progress, scoreResult, caseMeta, DEFAULT_PROGRESSION_CONFIG);
      const run2 = applyResult(progress, scoreResult, caseMeta, DEFAULT_PROGRESSION_CONFIG);

      expect(run1.progress).toEqual(run2.progress);
      expect(run1.events).toEqual(run2.events);
    });

    it('A config that fails Zod validation is rejected', () => {
      const progress = createInitialProgress();
      const scoreResult = makeScoreResult();
      const caseMeta: CaseProgressionMeta = { id: 'case_01', difficulty: 1 };

      // Invalid empty ranks
      const invalidConfig1 = {
        ranks: [],
        difficultyMultipliers: { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5 },
      };

      expect(() =>
        applyResult(progress, scoreResult, caseMeta, invalidConfig1 as unknown as ProgressionConfig),
      ).toThrow();

      // Invalid multiplier (negative)
      const invalidConfig2 = {
        ranks: DEFAULT_PROGRESSION_CONFIG.ranks,
        difficultyMultipliers: { 1: -1, 2: 2, 3: 3, 4: 4, 5: 5 },
      };

      expect(() =>
        applyResult(progress, scoreResult, caseMeta, invalidConfig2 as unknown as ProgressionConfig),
      ).toThrow();

      expect(() => validateProgressionConfig(invalidConfig1)).toThrow();
    });
  });

  describe('Mastery Gate & Evidence Quality Boundaries', () => {
    it('evidencePoints/50 exactly at 60% (30/50) passes mastery gate', () => {
      const progress = createInitialProgress();
      const result = makeScoreResult({
        breakdown: {
          correctHypothesis: true,
          hypothesisPoints: 100,
          evidencePoints: 30, // 30 / 50 = 0.60
          contradictionPoints: 0,
          penaltyPoints: 0,
          multiplier: 1.0,
        },
      });

      const { progress: nextProgress, events } = applyResult(progress, result, {
        id: 'case_boundary_pass',
        difficulty: 2,
      });

      expect(nextProgress.mastery[2]).toBe(1);
      expect(events.some((e) => e.type === 'mastery_progress')).toBe(true);
    });

    it('evidencePoints/50 below 60% (29/50) does NOT pass mastery gate', () => {
      const progress = createInitialProgress();
      const result = makeScoreResult({
        breakdown: {
          correctHypothesis: true,
          hypothesisPoints: 100,
          evidencePoints: 29, // 29 / 50 = 0.58 < 0.60
          contradictionPoints: 0,
          penaltyPoints: 0,
          multiplier: 1.0,
        },
      });

      const { progress: nextProgress, events } = applyResult(progress, result, {
        id: 'case_boundary_fail',
        difficulty: 2,
      });

      expect(nextProgress.mastery[2]).toBe(0);
      expect(events.some((e) => e.type === 'mastery_progress')).toBe(false);
    });
  });

  describe('Dossier Unlocks & Deduplication', () => {
    it('unlocks character dossiers once and avoids duplicate events', () => {
      let progress = createInitialProgress();
      const result = makeScoreResult();

      // Case 1 introduces char_maya and char_arjun
      const { progress: p1, events: e1 } = applyResult(progress, result, {
        id: 'case_0001',
        difficulty: 1,
        characters: ['char_maya', 'char_arjun'],
      });
      progress = p1;

      const unlockEvents1 = e1.filter((e) => e.type === 'unlock');
      expect(unlockEvents1).toEqual([
        { type: 'unlock', kind: 'dossier', id: 'char_maya' },
        { type: 'unlock', kind: 'dossier', id: 'char_arjun' },
      ]);
      expect(progress.unlockedDossierIds).toEqual(['char_maya', 'char_arjun']);

      // Case 2 introduces char_maya (again) and char_rhea (new)
      const { progress: p2, events: e2 } = applyResult(progress, result, {
        id: 'case_0002',
        difficulty: 1,
        characters: [{ id: 'char_maya' }, { id: 'char_rhea', name: 'Rhea' }],
      });
      progress = p2;

      const unlockEvents2 = e2.filter((e) => e.type === 'unlock');
      expect(unlockEvents2).toEqual([
        { type: 'unlock', kind: 'dossier', id: 'char_rhea' },
      ]);
      expect(progress.unlockedDossierIds).toEqual(['char_maya', 'char_arjun', 'char_rhea']);
    });
  });

  describe('Helpers & Edge Cases', () => {
    it('nextRankRequirements for Master Detective reports isMaxRank = true', () => {
      const maxProgress: PlayerProgress = {
        xp: 100000,
        rank: 'Master Detective',
        solvedCount: 50,
        correctCount: 50,
        mastery: { 1: 10, 2: 10, 3: 10, 4: 10, 5: 10 },
        solvedCaseIds: [],
        unlockedDossierIds: [],
      };

      const req = nextRankRequirements(maxProgress);
      expect(req.isMaxRank).toBe(true);
      expect(req.nextRank).toBeNull();
      expect(req.targetXp).toBeNull();
      expect(req.xpMissing).toBe(0);
      expect(req.masteryGate).toBeNull();
      expect(req.canRankUp).toBe(false);
    });

    it('handles zero score gracefully without emitting xp_gained', () => {
      const progress = createInitialProgress();
      const zeroResult = makeScoreResult({
        score: 0,
        breakdown: {
          correctHypothesis: false,
          hypothesisPoints: 0,
          evidencePoints: 0,
          contradictionPoints: 0,
          penaltyPoints: 0,
          multiplier: 0.5,
        },
      });

      const { progress: p, events } = applyResult(progress, zeroResult, {
        id: 'case_zero',
        difficulty: 1,
      });

      expect(p.xp).toBe(0);
      expect(events.some((e) => e.type === 'xp_gained')).toBe(false);
    });

    it('handles repeated case id in solvedCaseIds without duplicates', () => {
      const progress = createInitialProgress();
      const result = makeScoreResult();

      const { progress: p1 } = applyResult(progress, result, { id: 'case_repeat', difficulty: 1 });
      const { progress: p2 } = applyResult(p1, result, { id: 'case_repeat', difficulty: 1 });

      expect(p2.solvedCount).toBe(2);
      expect(p2.solvedCaseIds).toEqual(['case_repeat']);
    });

    it('handles progress with missing or partial fields and no characters', () => {
      // Partially populated progress (e.g. legacy or minimal object)
      const minimalProgress = {
        xp: 100,
      } as unknown as PlayerProgress;

      const result = makeScoreResult({
        score: 100,
        breakdown: {
          correctHypothesis: true,
          hypothesisPoints: 100,
          evidencePoints: 50,
          multiplier: 1.0,
          penaltyPoints: 0,
          contradictionPoints: 0,
        },
      });

      // No characters in caseMeta
      const { progress: p } = applyResult(minimalProgress, result, {
        id: 'case_no_char',
        difficulty: 1,
      });

      expect(p.xp).toBe(200);
      expect(p.solvedCount).toBe(1);
      expect(p.correctCount).toBe(1);
      expect(p.mastery[1]).toBe(1);
      expect(p.unlockedDossierIds).toEqual([]);
    });

    it('handles empty character IDs in characters list gracefully', () => {
      const progress = createInitialProgress();
      const result = makeScoreResult();

      const { progress: p, events } = applyResult(progress, result, {
        id: 'case_empty_char',
        difficulty: 1,
        characters: ['', { id: '' }],
      });

      expect(p.unlockedDossierIds).toEqual([]);
      expect(events.filter((e) => e.type === 'unlock')).toHaveLength(0);
    });

    it('handles rankFor with unknown rank or empty ranks in nextRankRequirements', () => {
      const customConfig: ProgressionConfig = {
        ranks: [
          {
            id: 'Trainee',
            level: 1,
            name: 'Trainee',
            xpThreshold: 0,
            masteryGate: { minDifficulty: 1, qualifyingSolves: 0, minEvidenceQuality: 0.6 },
          },
        ],
        difficultyMultipliers: { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5 },
        replayMultiplier: 0.25,
      };

      const progress: PlayerProgress = {
        ...createInitialProgress(),
        rank: 'UnknownRank' as unknown as DetectiveRank,
      };

      const req = nextRankRequirements(progress, customConfig);
      expect(req.isMaxRank).toBe(true);
      expect(req.nextRank).toBeNull();
    });

    it('handles rankFor and meetsRankRequirements edge cases', () => {
      // Rank definition with 0 qualifyingSolves or missing gate
      const configZeroGate: ProgressionConfig = {
        ranks: [
          {
            id: 'Trainee',
            level: 1,
            name: 'Trainee',
            xpThreshold: 0,
            masteryGate: { minDifficulty: 1, qualifyingSolves: 0, minEvidenceQuality: 0.6 },
          },
          {
            id: 'Investigator',
            level: 2,
            name: 'Investigator',
            xpThreshold: 100,
            masteryGate: { minDifficulty: 1, qualifyingSolves: 0, minEvidenceQuality: 0.6 },
          },
        ],
        difficultyMultipliers: { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5 },
        replayMultiplier: 0.25,
      };

      const progress = {
        ...createInitialProgress(),
        xp: 150,
      };

      expect(rankFor(progress, configZeroGate)).toBe('Investigator');

      // Rank that doesn't meet xpThreshold
      const progressLowXp = {
        ...createInitialProgress(),
        xp: 50,
      };
      expect(rankFor(progressLowXp, configZeroGate)).toBe('Trainee');
    });

    it('ProgressionConfigSchema validates DEFAULT_PROGRESSION_CONFIG and all DETECTIVE_RANKS', () => {
      const parsed = ProgressionConfigSchema.parse(DEFAULT_PROGRESSION_CONFIG);
      expect(parsed.ranks.length).toBe(DETECTIVE_RANKS.length);
      for (const rank of DETECTIVE_RANKS) {
        expect(parsed.ranks.some((r) => r.id === rank)).toBe(true);
      }
    });
  });

  describe('Property-Based Invariants (fast-check)', () => {
    it('xp never decreases and progress remains non-negative', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 200 }),
          fc.boolean(),
          fc.integer({ min: 0, max: 50 }),
          fc.constantFrom(1, 2, 3, 4, 5 as const),
          fc.constantFrom('normal', 'replay' as const),
          (score, correct, evidencePoints, difficulty, mode) => {
            const initial = createInitialProgress();
            const res = makeScoreResult({
              score,
              breakdown: {
                correctHypothesis: correct,
                hypothesisPoints: correct ? 100 : 0,
                evidencePoints,
                contradictionPoints: 0,
                penaltyPoints: 0,
                multiplier: correct ? 1.0 : 0.5,
              },
            });
            const out = applyResult(initial, res, {
              id: 'case_fc',
              difficulty,
              mode,
            });

            expect(out.progress.xp).toBeGreaterThanOrEqual(initial.xp);
            expect(out.progress.solvedCount).toBe(1);
            expect(out.progress.correctCount).toBe(correct ? 1 : 0);
          },
        ),
      );
    });
  });
});
