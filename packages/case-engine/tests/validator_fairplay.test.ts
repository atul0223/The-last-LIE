import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildContext } from '../src/logic/index.js';
import type { CaseDefinition } from '../src/schema/index.js';
import { getObtainableClueIds } from '../src/validator/obtainable.js';
import { v14LieContradictableCheck } from '../src/validator/checks/v14_lie_contradictable.js';
import { v15SolutionPositiveEvidenceCheck } from '../src/validator/checks/v15_solution_positive_evidence.js';
import { validateCase } from '../src/validator/validate.js';
import type { ValidatorContext } from '../src/validator/types.js';

function makeBaseFairplayCase(): CaseDefinition {
  return {
    id: 'case_fairplay_base',
    version: 1,
    kind: 'authored',
    title: 'Fairplay Base Test Case',
    difficulty: 1,
    estimatedMinutes: 15,
    mysteryType: 'theft',
    setting: {
      locationIds: ['loc_office', 'loc_lobby'],
      date: '2026-10-29',
      summary: 'Theft investigation at OmniCorp office',
    },
    briefing: 'The laptop was stolen. Determine who entered the office.',
    characters: [
      {
        id: 'char_alice',
        name: 'Alice Cooper',
        role: 'Suspect',
        publicDescription: 'Senior analyst',
      },
      {
        id: 'char_bob',
        name: 'Bob Miller',
        role: 'Manager',
        publicDescription: 'Department head',
      },
      {
        id: 'char_charlie',
        name: 'Charlie Dawn',
        role: 'Witness',
        publicDescription: 'Security tech',
      },
    ],
    locations: [
      {
        id: 'loc_office',
        name: 'Office Room',
        doorIds: ['door_office'],
        adjacency: [{ to: 'loc_lobby', travelMinutes: 2 }],
      },
      {
        id: 'loc_lobby',
        name: 'Main Lobby',
        doorIds: ['door_lobby'],
        adjacency: [{ to: 'loc_office', travelMinutes: 2 }],
      },
    ],
    objects: [
      {
        id: 'obj_laptop',
        name: 'Secure Laptop',
        type: 'device',
        ownerId: 'char_bob',
      },
    ],
    clues: [
      {
        id: 'clue_office_access',
        type: 'access_log',
        reliability: 'physical',
        asserts: [
          {
            kind: 'access',
            who: 'char_alice',
            door: 'door_office',
            at: 600,
          },
        ],
        text: 'Badge logs indicate Alice accessed the office at 10:00.',
        unlock: { kind: 'default' },
      },
      {
        id: 'clue_lobby_cam',
        type: 'cctv',
        reliability: 'physical',
        asserts: [
          {
            kind: 'at',
            who: 'char_alice',
            where: 'loc_lobby',
            from: 590,
            to: 595,
          },
        ],
        text: 'CCTV camera shows Alice in the lobby until 09:55.',
        unlock: { kind: 'default' },
      },
    ],
    hypotheses: [
      {
        id: 'hyp_alice_culprit',
        label: 'Alice entered the office and took the laptop',
        culpritIds: ['char_alice'],
        claims: [
          {
            kind: 'access',
            who: 'char_alice',
            door: 'door_office',
            at: 600,
          },
        ],
      },
      {
        id: 'hyp_alice_absent',
        label: 'Alice never visited the office and stayed in the lobby',
        culpritIds: ['char_bob'],
        claims: [
          {
            kind: 'at',
            who: 'char_alice',
            where: 'loc_lobby',
            from: 598,
            to: 605,
          },
        ],
      },
    ],
    truth: {
      timeline: [
        {
          kind: 'at',
          who: 'char_alice',
          where: 'loc_lobby',
          from: 590,
          to: 595,
        },
        {
          kind: 'access',
          who: 'char_alice',
          door: 'door_office',
          at: 600,
        },
        {
          kind: 'at',
          who: 'char_alice',
          where: 'loc_office',
          from: 600,
          to: 630,
        },
      ],
      culpritIds: ['char_alice'],
      liars: [],
      solutionHypothesisId: 'hyp_alice_culprit',
      keyEvidence: [['clue_office_access']],
      explanation: [
        {
          text: 'Alice entered the office at 10:00 and stole the laptop.',
          clueIds: ['clue_office_access'],
        },
      ],
    },
    meta: {
      status: 'draft',
    },
  };
}

describe('WP-05b Validator Fair-Play Checks (V14 & V15)', () => {
  const case0001Path = resolve(__dirname, '../../content/cases/authored/case_0001.json');
  const raw0001 = readFileSync(case0001Path, 'utf-8');
  const case0001 = JSON.parse(raw0001) as CaseDefinition;

  describe('case_0001 verification', () => {
    it('case_0001 passes both V14 and V15 checks', () => {
      const logicCtx = buildContext(case0001);
      const obtainableClueIds = getObtainableClueIds(case0001);
      const ctx: ValidatorContext = { logicCtx, obtainableClueIds };

      const v14Issues = v14LieContradictableCheck.run(case0001, ctx);
      expect(v14Issues).toHaveLength(0);

      const v15Issues = v15SolutionPositiveEvidenceCheck.run(case0001, ctx);
      expect(v15Issues).toHaveLength(0);

      const fullReport = validateCase(case0001);
      expect(fullReport.ok).toBe(true);
      expect(fullReport.errors).toHaveLength(0);
    });

    it('case_0001 Arjun testimony lie is contradicted by obtainable physical clue_keycard_exit', () => {
      const arjunLiar = case0001.truth.liars.find((l) => l.who === 'char_arjun');
      expect(arjunLiar).toBeDefined();
      expect(arjunLiar?.statementClueIds).toContain('clue_arjun_testimony');

      const obtainable = getObtainableClueIds(case0001);
      expect(obtainable.has('clue_keycard_exit')).toBe(true);

      const keycardExit = case0001.clues.find((c) => c.id === 'clue_keycard_exit');
      expect(keycardExit?.reliability).toBe('physical');
    });
  });

  describe('V14: lie.contradictable', () => {
    it('passes when every declared lie is contradicted by an obtainable physical clue', () => {
      const baseCase = makeBaseFairplayCase();
      // Add a liar whose statement is contradicted by obtainable physical clue_office_access
      baseCase.clues.push({
        id: 'clue_bob_testimony',
        type: 'testimony',
        reliability: 'testimony',
        source: 'char_bob',
        asserts: [
          {
            kind: 'at',
            who: 'char_alice',
            where: 'loc_lobby',
            from: 599,
            to: 602,
          },
        ],
        text: 'Bob says: Alice was in the lobby talking to me at 10:00.',
        unlock: { kind: 'default' },
      });
      baseCase.truth.liars.push({
        who: 'char_bob',
        statementClueIds: ['clue_bob_testimony'],
      });

      const report = validateCase(baseCase);
      expect(report.errors).toHaveLength(0);
      expect(report.ok).toBe(true);
    });

    it('broken fixture: fires ONLY lie.contradictable when a lie has no obtainable physical evidence contradicting it', () => {
      const brokenCase = makeBaseFairplayCase();

      // The lie contradicts truth.timeline (Alice was at office from 600 to 630), so V5 passes!
      // But no physical clue in the case asserts Alice was at office between 620 and 630.
      brokenCase.clues.push({
        id: 'clue_charlie_lie',
        type: 'testimony',
        reliability: 'testimony',
        source: 'char_charlie',
        asserts: [
          {
            kind: 'at',
            who: 'char_alice',
            where: 'loc_lobby',
            from: 620,
            to: 630,
          },
        ],
        text: 'Charlie claims Alice was sitting in the lobby at 10:20.',
        unlock: { kind: 'default' },
      });
      brokenCase.truth.liars.push({
        who: 'char_charlie',
        statementClueIds: ['clue_charlie_lie'],
      });

      const report = validateCase(brokenCase);

      // Must fail with EXACTLY one error: lie.contradictable
      expect(report.ok).toBe(false);
      expect(report.errors).toHaveLength(1);
      const err = report.errors[0]!;
      expect(err.checkId).toBe('lie.contradictable');
      expect(err.message).toContain('clue_charlie_lie');
      expect(err.message).toContain('no physical evidence contradicts this lie');
      expect(err.refs).toContain('clue_charlie_lie');
    });

    it('broken fixture: fires lie.contradictable if the contradicting physical clue is unobtainable', () => {
      const brokenCase = makeBaseFairplayCase();

      // Lie: Alice at lobby 620-630 (contradicts timeline 600-630 office)
      brokenCase.clues.push({
        id: 'clue_charlie_lie',
        type: 'testimony',
        reliability: 'testimony',
        source: 'char_charlie',
        asserts: [
          {
            kind: 'at',
            who: 'char_alice',
            where: 'loc_lobby',
            from: 620,
            to: 630,
          },
        ],
        text: 'Charlie claims Alice was sitting in the lobby at 10:20.',
        unlock: { kind: 'default' },
      });
      brokenCase.truth.liars.push({
        who: 'char_charlie',
        statementClueIds: ['clue_charlie_lie'],
      });

      // A physical clue exists that contradicts the lie, BUT it is locked behind an unreachable prerequisite!
      brokenCase.clues.push({
        id: 'clue_locked_camera',
        type: 'cctv',
        reliability: 'physical',
        asserts: [
          {
            kind: 'at',
            who: 'char_alice',
            where: 'loc_office',
            from: 620,
            to: 630,
          },
        ],
        text: 'Locked camera shows Alice in office at 10:20.',
        unlock: { kind: 'after_clue', clueId: 'clue_unobtainable_ghost' },
      });
      // Register reference to avoid V2 refs check error
      brokenCase.clues.push({
        id: 'clue_unobtainable_ghost',
        type: 'cctv',
        reliability: 'physical',
        asserts: [],
        text: 'Ghost clue.',
        unlock: { kind: 'after_clue', clueId: 'clue_locked_camera' }, // cycle makes both unobtainable
      });

      const logicCtx = buildContext(brokenCase);
      const obtainableClueIds = getObtainableClueIds(brokenCase);
      const ctx: ValidatorContext = { logicCtx, obtainableClueIds };

      const v14Issues = v14LieContradictableCheck.run(brokenCase, ctx);
      expect(v14Issues).toHaveLength(1);
      expect(v14Issues[0]!.checkId).toBe('lie.contradictable');
      expect(v14Issues[0]!.message).toContain('no physical evidence contradicts this lie');
    });
  });

  describe('V15: solution.positive_evidence', () => {
    it('broken fixture: fires ONLY solution.positive_evidence when keyEvidence lacks culprit facts', () => {
      const brokenCase = makeBaseFairplayCase();

      // Replace key evidence with a physical clue about victim Bob's location that eliminates
      // hyp_alice_absent without mentioning culprit Alice in any field (who / by / sender / recipient)
      brokenCase.clues = [
        {
          id: 'clue_bob_lobby',
          type: 'cctv',
          reliability: 'physical',
          asserts: [
            {
              kind: 'at',
              who: 'char_bob',
              where: 'loc_office',
              from: 598,
              to: 605,
            },
          ],
          text: 'Camera shows Bob was in the office from 09:58 to 10:05.',
          unlock: { kind: 'default' },
        },
      ];

      // Decoy hypothesis eliminated because Bob was at office, not lobby
      brokenCase.hypotheses[1]!.claims = [
        {
          kind: 'at',
          who: 'char_bob',
          where: 'loc_lobby',
          from: 598,
          to: 605,
        },
      ];

      brokenCase.truth.timeline = [
        {
          kind: 'at',
          who: 'char_bob',
          where: 'loc_office',
          from: 598,
          to: 605,
        },
      ];
      // Solution claims consistent with timeline
      brokenCase.hypotheses[0]!.claims = [];
      brokenCase.truth.keyEvidence = [['clue_bob_lobby']];
      brokenCase.truth.explanation[0]!.clueIds = ['clue_bob_lobby'];

      const report = validateCase(brokenCase);

      // Must fail with EXACTLY one error: solution.positive_evidence
      expect(report.ok).toBe(false);
      expect(report.errors).toHaveLength(1);
      const err = report.errors[0]!;
      expect(err.checkId).toBe('solution.positive_evidence');
      expect(err.message).toContain('No keyEvidence set contains a physical clue involving a culprit id');
      expect(err.refs).toContain('char_alice');
    });

    it('skips positive evidence check with a warning for no-crime cases (empty culpritIds)', () => {
      const noCrimeCase = makeBaseFairplayCase();
      noCrimeCase.truth.culpritIds = [];
      noCrimeCase.hypotheses[0]!.culpritIds = [];
      noCrimeCase.hypotheses[1]!.culpritIds = [];

      const report = validateCase(noCrimeCase);

      // No errors should be emitted for positive evidence
      expect(report.errors.some((e) => e.checkId === 'solution.positive_evidence')).toBe(false);
      // Warning must be present
      const warning = report.warnings.find((w) => w.checkId === 'solution.positive_evidence');
      expect(warning).toBeDefined();
      expect(warning?.severity).toBe('warning');
      expect(warning?.message).toContain('truth.culpritIds is empty; skipping positive evidence check (no-crime case)');
    });

    it('recognizes culprit in by, sender, or recipient fields', () => {
      const culpritId = 'char_alice';

      // 1. by (device_use)
      const caseBy = makeBaseFairplayCase();
      caseBy.clues[0]!.asserts = [
        {
          kind: 'device_use',
          device: 'obj_laptop',
          by: culpritId,
          at: 600,
        },
      ];
      caseBy.hypotheses[0]!.claims = [
        {
          kind: 'device_use',
          device: 'obj_laptop',
          by: culpritId,
          at: 600,
        },
      ];
      caseBy.truth.timeline[1] = {
        kind: 'device_use',
        device: 'obj_laptop',
        by: culpritId,
        at: 600,
      };

      const ctxBy: ValidatorContext = {
        logicCtx: buildContext(caseBy),
        obtainableClueIds: getObtainableClueIds(caseBy),
      };
      expect(v15SolutionPositiveEvidenceCheck.run(caseBy, ctxBy)).toHaveLength(0);

      // 2. sender (message)
      const caseSender = makeBaseFairplayCase();
      caseSender.clues[0]!.asserts = [
        {
          kind: 'message',
          msg: 'msg_hack',
          sender: culpritId,
          device: 'obj_laptop',
          recipient: 'char_bob',
          sentAt: 600,
        },
      ];
      const ctxSender: ValidatorContext = {
        logicCtx: buildContext(caseSender),
        obtainableClueIds: getObtainableClueIds(caseSender),
      };
      expect(v15SolutionPositiveEvidenceCheck.run(caseSender, ctxSender)).toHaveLength(0);

      // 3. recipient (message)
      const caseRecipient = makeBaseFairplayCase();
      caseRecipient.clues[0]!.asserts = [
        {
          kind: 'message',
          msg: 'msg_ping',
          sender: 'char_bob',
          device: 'obj_laptop',
          recipient: culpritId,
          sentAt: 600,
        },
      ];
      const ctxRecipient: ValidatorContext = {
        logicCtx: buildContext(caseRecipient),
        obtainableClueIds: getObtainableClueIds(caseRecipient),
      };
      expect(v15SolutionPositiveEvidenceCheck.run(caseRecipient, ctxRecipient)).toHaveLength(0);

      // 4. Testimony clue in keyEvidence mentioning culprit does NOT satisfy physical evidence requirement
      const caseTestimony = makeBaseFairplayCase();
      caseTestimony.clues.push({
        id: 'clue_testimony_alice',
        type: 'testimony',
        reliability: 'testimony',
        source: 'char_bob',
        asserts: [
          {
            kind: 'at',
            who: culpritId,
            where: 'loc_office',
            from: 600,
            to: 610,
          },
        ],
        text: 'Testimony mentioning Alice',
        unlock: { kind: 'default' },
      });
      caseTestimony.truth.keyEvidence = [['clue_testimony_alice']];
      const ctxTestimony: ValidatorContext = {
        logicCtx: buildContext(caseTestimony),
        obtainableClueIds: getObtainableClueIds(caseTestimony),
      };
      const testimonyIssues = v15SolutionPositiveEvidenceCheck.run(caseTestimony, ctxTestimony);
      expect(testimonyIssues).toHaveLength(1);
      expect(testimonyIssues[0]?.checkId).toBe('solution.positive_evidence');
    });

    it('v14 handles duplicate lie clue references without duplicate error messages', () => {
      const duplicateLieCase = makeBaseFairplayCase();
      duplicateLieCase.truth.liars = [
        { who: 'char_bob', statementClueIds: ['clue_missing_lie'] },
        { who: 'char_charlie', statementClueIds: ['clue_missing_lie'] },
      ];
      duplicateLieCase.clues.push({
        id: 'clue_missing_lie',
        type: 'testimony',
        reliability: 'testimony',
        source: 'char_bob',
        asserts: [
          {
            kind: 'at',
            who: 'char_alice',
            where: 'loc_lobby',
            from: 620,
            to: 630,
          },
        ],
        text: 'Duplicate lie clue text',
        unlock: { kind: 'default' },
      });

      const ctx: ValidatorContext = {
        logicCtx: buildContext(duplicateLieCase),
        obtainableClueIds: getObtainableClueIds(duplicateLieCase),
      };

      const issues = v14LieContradictableCheck.run(duplicateLieCase, ctx);
      // Even though clue_missing_lie is in two liars, only 1 issue is emitted
      expect(issues).toHaveLength(1);
      expect(issues[0]?.message).toContain('no physical evidence contradicts this lie');
    });
  });
});
