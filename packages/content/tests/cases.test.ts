import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  buildContext,
  CaseDefinitionSchema,
  evaluateHypothesis,
  factEntailed,
  survivingHypotheses,
  type CaseDefinition,
} from '@lastlie/case-engine';
import { AUTHORED_CASES, case_0001 } from '../src/index.js';

describe('Authored Cases Schema Validation', () => {
  const authoredDir = resolve(__dirname, '../cases/authored');
  const files = readdirSync(authoredDir).filter((file) => file.endsWith('.json'));

  it('finds at least one authored case in cases/authored directory', () => {
    expect(files.length).toBeGreaterThan(0);
    expect(files).toContain('case_0001.json');
  });

  it('parses all authored cases on disk with CaseDefinitionSchema', () => {
    for (const file of files) {
      const fullPath = resolve(authoredDir, file);
      const raw = readFileSync(fullPath, 'utf-8');
      const json = JSON.parse(raw);

      const parsed = CaseDefinitionSchema.parse(json);
      expect(parsed.id).toBeDefined();
      expect(parsed.truth).toBeDefined();
      expect(parsed.clues.length).toBeGreaterThanOrEqual(6);
      expect(parsed.hypotheses.length).toBe(3);
    }
  });

  it('validates exported case_0001 against CaseDefinitionSchema', () => {
    expect(AUTHORED_CASES.length).toBeGreaterThan(0);
    const parsed = CaseDefinitionSchema.parse(case_0001);
    expect(parsed.id).toBe('case_0001');
    expect(parsed.title).toBe('The Missing Message');
    expect(parsed.difficulty).toBe(2);
    expect(parsed.mysteryType).toBe('false_alibi');
    expect(parsed.truth.keyEvidence).toEqual([['clue_keycard_exit', 'clue_device_log']]);
    expect(parsed.truth.solutionHypothesisId).toBe('hyp_arjun_forged');
  });
});

describe('Case 0001 Solvability & Logic Verification', () => {
  const parsedCase = CaseDefinitionSchema.parse(case_0001) as CaseDefinition;
  const ctx = buildContext(parsedCase);

  it('verifies all physical clue facts are entailed by truth.timeline', () => {
    const physicalClues = parsedCase.clues.filter((c) => c.reliability === 'physical');
    for (const clue of physicalClues) {
      for (const fact of clue.asserts) {
        expect(factEntailed(fact, parsedCase.truth.timeline, ctx)).toBe(true);
      }
    }
  });

  it('verifies declared lies are indeed false against truth.timeline', () => {
    for (const liar of parsedCase.truth.liars) {
      for (const clueId of liar.statementClueIds) {
        const clue = parsedCase.clues.find((c) => c.id === clueId);
        expect(clue).toBeDefined();
        // The clue asserts facts that conflict with or are not entailed by timeline
        const allEntailed = clue!.asserts.every((f) =>
          factEntailed(f, parsedCase.truth.timeline, ctx),
        );
        expect(allEntailed).toBe(false);
      }
    }
  });

  it('eliminates decoy 1 (Maya sent message) using clue_keycard_exit', () => {
    const hypMaya = parsedCase.hypotheses.find((h) => h.id === 'hyp_maya_sent')!;
    const keycardClue = parsedCase.clues.find((c) => c.id === 'clue_keycard_exit')!;

    const result = evaluateHypothesis(hypMaya, [keycardClue], ctx);
    expect(result.eliminated).toBe(true);
    expect(result.by[0]?.ruleId).toBe('presence.two_places');
  });

  it('eliminates decoy 2 (Rhea sent message) using clue_device_log', () => {
    const hypRhea = parsedCase.hypotheses.find((h) => h.id === 'hyp_rhea_sent')!;
    const deviceLogClue = parsedCase.clues.find((c) => c.id === 'clue_device_log')!;

    const result = evaluateHypothesis(hypRhea, [deviceLogClue], ctx);
    expect(result.eliminated).toBe(true);
    expect(result.by[0]?.ruleId).toBe('message.sender_device');
  });

  it('verifies that the solution hypothesis survives all physical clues', () => {
    const hypSolution = parsedCase.hypotheses.find((h) => h.id === 'hyp_arjun_forged')!;
    const physicalClues = parsedCase.clues.filter((c) => c.reliability === 'physical');

    const result = evaluateHypothesis(hypSolution, physicalClues, ctx);
    expect(result.eliminated).toBe(false);
  });

  it('proves that keyEvidence alone eliminates all decoys and leaves exactly the solution', () => {
    const keyClueIds = ['clue_keycard_exit', 'clue_device_log'];
    const surviving = survivingHypotheses(parsedCase, keyClueIds, ctx);

    expect(surviving).toHaveLength(1);
    expect(surviving[0]?.id).toBe('hyp_arjun_forged');
  });
});
