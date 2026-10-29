import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { CaseDefinition } from '../src/schema/index.js';
import {
  ALL_CHECKS,
  computeDifficultyMetrics,
  DIFFICULTY_WEIGHTS,
  formatReport,
  getObtainableClueIds,
  v10DifficultyBandCheck,
  v11TextRenderCheck,
  v12HooksCanonicalCheck,
  v13AmbiguityCheck,
  v1SchemaCheck,
  v2RefsCheck,
  v3TimelineConsistentCheck,
  v4PhysicalEntailedCheck,
  v5TestimonyLiesCheck,
  v6SolutionConsistentCheck,
  v7SolutionUniqueCheck,
  v8SolutionReachableCheck,
  v9UnlockAcyclicCheck,
  validateCase,
} from '../src/validator/index.js';

function makeCase(): CaseDefinition {
  return {
    id: 'case_minimal',
    version: 1,
    kind: 'authored',
    title: 'Minimal Test Case',
    difficulty: 1,
    estimatedMinutes: 15,
    mysteryType: 'theft',
    setting: {
      locationIds: ['loc_office', 'loc_lobby'],
      date: '1937-11-04',
      summary: 'Theft at the office',
    },
    briefing: 'The boss laptop was stolen from the office. Find out who took it.',
    characters: [
      {
        id: 'char_alice',
        name: 'Alice',
        role: 'Suspect',
        publicDescription: 'An office worker',
      },
      {
        id: 'char_bob',
        name: 'Bob',
        role: 'Victim',
        publicDescription: 'The manager',
      },
    ],
    locations: [
      {
        id: 'loc_office',
        name: 'Office',
        doorIds: ['door_office'],
        adjacency: [{ to: 'loc_lobby', travelMinutes: 2 }],
      },
      {
        id: 'loc_lobby',
        name: 'Lobby',
        doorIds: ['door_lobby'],
        adjacency: [{ to: 'loc_office', travelMinutes: 2 }],
      },
    ],
    objects: [
      {
        id: 'obj_laptop',
        name: 'Laptop',
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
        text: 'Door logs show Alice accessed the office at 10:00.',
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
        text: 'Lobby CCTV shows Alice in the lobby from 09:50 to 09:55.',
        unlock: { kind: 'after_clue', clueId: 'clue_office_access' },
      },
    ],
    hypotheses: [
      {
        id: 'hyp_alice_stole',
        label: 'Alice entered and took the laptop',
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
        id: 'hyp_alice_innocent',
        label: 'Alice never went to the office',
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
      solutionHypothesisId: 'hyp_alice_stole',
      keyEvidence: [['clue_office_access']],
      explanation: [
        {
          text: 'Alice unlocked the door at 10:00 and entered the office to steal the laptop.',
          clueIds: ['clue_office_access'],
        },
      ],
    },
    meta: {
      status: 'draft',
      allowAmbiguity: false,
    },
  };
}

describe('Case Validator Core & Checks (V1-V13)', () => {
  it('validates minimal base fixture with 0 errors and 0 warnings', () => {
    const baseCase = makeCase();
    const report = validateCase(baseCase);
    expect(report.ok).toBe(true);
    expect(report.errors).toHaveLength(0);
    expect(report.warnings).toHaveLength(0);
    expect(report.metrics.obtainableCluesCount).toBe(2);
    expect(report.metrics.measuredDifficulty).toBe(1);
  });

  it('V1 (schema): detects schema violations', () => {
    const invalidCase = makeCase();
    (invalidCase as unknown as Record<string, unknown>).difficulty = 99; // invalid difficulty band (> 5)
    const report = validateCase(invalidCase);
    expect(report.ok).toBe(false);
    expect(report.errors.some((e) => e.checkId === 'schema')).toBe(true);
  });

  it('V2 (refs): detects unresolved entity references', () => {
    const invalidCase = makeCase();
    invalidCase.truth.solutionHypothesisId = 'hyp_nonexistent';
    const report = validateCase(invalidCase);
    expect(report.ok).toBe(false);
    expect(report.errors.some((e) => e.checkId === 'refs')).toBe(true);

    const invalidLocCase = makeCase();
    invalidLocCase.setting.locationIds = ['loc_nowhere'];
    const reportLoc = validateCase(invalidLocCase);
    expect(reportLoc.errors.some((e) => e.checkId === 'refs')).toBe(true);
  });

  it('V3 (timeline.consistent): detects internal ground truth contradictions', () => {
    const invalidCase = makeCase();
    // Add contradictory presence: Alice in lobby AND office simultaneously
    invalidCase.truth.timeline.push({
      kind: 'at',
      who: 'char_alice',
      where: 'loc_lobby',
      from: 605,
      to: 615,
    });
    const report = validateCase(invalidCase);
    expect(report.ok).toBe(false);
    expect(report.errors.some((e) => e.checkId === 'timeline.consistent')).toBe(true);
  });

  it('V4 (physical.entailed): detects physical clue facts not entailed by timeline', () => {
    const invalidCase = makeCase();
    invalidCase.clues.push({
      id: 'clue_phantom',
      type: 'document',
      reliability: 'physical',
      asserts: [
        {
          kind: 'at',
          who: 'char_bob',
          where: 'loc_office',
          from: 700,
          to: 720,
        },
      ],
      text: 'Phantom document',
      unlock: { kind: 'default' },
    });
    const report = validateCase(invalidCase);
    expect(report.ok).toBe(false);
    expect(report.errors.some((e) => e.checkId === 'physical.entailed')).toBe(true);
  });

  it('V5 (testimony.lies_declared): catches undeclared lies and declared lies with no false facts', () => {
    // 1. Undeclared lie: testimony clue not in truth.liars contradicting timeline
    const undeclaredLieCase = makeCase();
    // Bob is at office [600, 630) in timeline
    undeclaredLieCase.truth.timeline.push({
      kind: 'at',
      who: 'char_bob',
      where: 'loc_office',
      from: 600,
      to: 630,
    });
    // Bob testifies he was in the lobby at the same time
    undeclaredLieCase.clues.push({
      id: 'clue_bob_lie',
      type: 'testimony',
      reliability: 'testimony',
      source: 'char_bob',
      asserts: [
        {
          kind: 'at',
          who: 'char_bob',
          where: 'loc_lobby',
          from: 605,
          to: 620,
        },
      ],
      text: 'Bob claims he was in the lobby from 10:05 to 10:20.',
      unlock: { kind: 'default' },
    });
    const repUndeclared = validateCase(undeclaredLieCase);
    expect(repUndeclared.ok).toBe(false);
    expect(repUndeclared.errors.some((e) => e.checkId === 'testimony.lies_declared')).toBe(true);

    // 2. Declared lie: listed in truth.liars but facts do NOT contradict timeline
    const harmlessLieCase = makeCase();
    harmlessLieCase.clues.push({
      id: 'clue_honest_bob',
      type: 'testimony',
      reliability: 'testimony',
      source: 'char_bob',
      asserts: [
        {
          kind: 'at',
          who: 'char_bob',
          where: 'loc_lobby',
          from: 500,
          to: 510,
        },
      ],
      text: 'Bob claims he was in the lobby at 08:20.',
      unlock: { kind: 'default' },
    });
    harmlessLieCase.truth.liars.push({
      who: 'char_bob',
      statementClueIds: ['clue_honest_bob'],
    });
    const repHarmless = validateCase(harmlessLieCase);
    expect(repHarmless.ok).toBe(false);
    expect(repHarmless.errors.some((e) => e.checkId === 'testimony.lies_declared')).toBe(true);
  });

  it('V6 (solution.consistent): detects solution hypothesis contradicting timeline', () => {
    const invalidCase = makeCase();
    const solHyp = invalidCase.hypotheses.find((h) => h.id === 'hyp_alice_stole')!;
    solHyp.claims.push({
      kind: 'at',
      who: 'char_alice',
      where: 'loc_lobby',
      from: 600,
      to: 610, // contradicts office presence [600, 630)
    });
    const report = validateCase(invalidCase);
    expect(report.ok).toBe(false);
    expect(report.errors.some((e) => e.checkId === 'solution.consistent')).toBe(true);
  });

  it('V7 (solution.unique): detects multiple surviving hypotheses when ambiguity is false', () => {
    const invalidCase = makeCase();
    // Add a decoy hypothesis that cannot be eliminated by any clue
    invalidCase.hypotheses.push({
      id: 'hyp_shadow',
      label: 'An unknown phantom did it',
      culpritIds: ['char_bob'],
      claims: [
        {
          kind: 'action',
          who: 'char_bob',
          verb: 'took',
          where: 'loc_office',
          at: 615,
        },
      ],
    });
    const report = validateCase(invalidCase);
    expect(report.ok).toBe(false);
    expect(report.errors.some((e) => e.checkId === 'solution.unique')).toBe(true);
  });

  it('V8 (solution.reachable): detects unreachable keyEvidence or failing elimination', () => {
    // 1. Unreachable key evidence
    const unreachableCase = makeCase();
    unreachableCase.clues.push({
      id: 'clue_orphan',
      type: 'document',
      reliability: 'physical',
      asserts: [
        {
          kind: 'access',
          who: 'char_alice',
          door: 'door_office',
          at: 600,
        },
      ],
      text: 'Orphan doc',
      unlock: { kind: 'after_clue', clueId: 'clue_never_unlockable' },
    });
    // Add dummy clue so refs pass
    unreachableCase.clues.push({
      id: 'clue_never_unlockable',
      type: 'document',
      reliability: 'physical',
      asserts: [
        {
          kind: 'access',
          who: 'char_alice',
          door: 'door_office',
          at: 600,
        },
      ],
      text: 'Never unlockable',
      unlock: { kind: 'after_clue', clueId: 'clue_orphan' }, // mutually cyclic, neither reachable
    });
    unreachableCase.truth.keyEvidence.push(['clue_orphan']);
    const repUnreachable = validateCase(unreachableCase);
    expect(repUnreachable.ok).toBe(false);
    expect(repUnreachable.errors.some((e) => e.checkId === 'solution.reachable')).toBe(true);

    // 2. keyEvidence set does not eliminate decoy
    const insufficientCase = makeCase();
    insufficientCase.truth.keyEvidence = [['clue_lobby_cam']]; // lobby cam alone doesn't eliminate hyp_alice_innocent
    const repInsufficient = validateCase(insufficientCase);
    expect(repInsufficient.ok).toBe(false);
    expect(repInsufficient.errors.some((e) => e.checkId === 'solution.reachable')).toBe(true);
  });

  it('V9 (unlock.acyclic): catches missing default clues or cycles in unlock graph', () => {
    // 1. No default clues
    const noDefaultCase = makeCase();
    noDefaultCase.clues[0]!.unlock = { kind: 'after_clue', clueId: 'clue_lobby_cam' };
    const repNoDefault = validateCase(noDefaultCase);
    expect(repNoDefault.ok).toBe(false);
    expect(repNoDefault.errors.some((e) => e.checkId === 'unlock.acyclic')).toBe(true);

    // 2. Cycle in after_clue
    const cyclicCase = makeCase();
    cyclicCase.clues[1]!.unlock = { kind: 'after_clue', clueId: 'clue_lobby_cam' }; // points to itself
    const repCyclic = validateCase(cyclicCase);
    expect(repCyclic.ok).toBe(false);
    expect(repCyclic.errors.some((e) => e.checkId === 'unlock.acyclic')).toBe(true);
  });

  it('V10 (difficulty.band): detects difficulty discrepancy >= 2', () => {
    const diffMismatchCase = makeCase();
    diffMismatchCase.difficulty = 5; // measured is 1, delta = 4 >= 2
    const report = validateCase(diffMismatchCase);
    expect(report.warnings.some((w) => w.checkId === 'difficulty.band')).toBe(true);
  });

  it('V11 (text.render): catches empty text, unrendered template vars, and solution leaks', () => {
    // 1. Empty text
    const emptyTextCase = makeCase();
    emptyTextCase.clues[0]!.text = '   ';
    const repEmpty = validateCase(emptyTextCase);
    expect(repEmpty.ok).toBe(false);
    expect(repEmpty.errors.some((e) => e.checkId === 'text.render')).toBe(true);

    // 2. Unrendered template variable
    const templateVarCase = makeCase();
    templateVarCase.clues[0]!.text = 'Found at {{location_name}} at 10:00';
    const repTemplate = validateCase(templateVarCase);
    expect(repTemplate.ok).toBe(false);
    expect(repTemplate.errors.some((e) => e.checkId === 'text.render')).toBe(true);

    // 3. Solution id leaked
    const leakCase = makeCase();
    leakCase.clues[0]!.text = 'Alice is guilty of hyp_alice_stole!';
    const repLeak = validateCase(leakCase);
    expect(repLeak.ok).toBe(false);
    expect(repLeak.errors.some((e) => e.checkId === 'text.render')).toBe(true);

    // 4. Clue text omitted: renders via renderClue and validates cleanly
    const dynamicCase = makeCase();
    delete dynamicCase.clues[0]!.text;
    const repDynamic = validateCase(dynamicCase);
    expect(repDynamic.errors.some((e) => e.checkId === 'text.render')).toBe(false);
  });

  it('V12 (hooks.canonical): catches malformed conspiracy hooks', () => {
    const hookCase = makeCase();
    hookCase.conspiracyHooks = [
      {
        nodeId: 'node_canonical',
        clueId: 'clue_nonexistent',
      },
    ];
    const repHook = validateCase(hookCase);
    expect(repHook.warnings.some((w) => w.checkId === 'hooks.canonical')).toBe(true);
  });

  it('V13 (ambiguity.intentional): warns if intentional ambiguity explanation misses surviving hypotheses', () => {
    const ambigCase = makeCase();
    ambigCase.meta.allowAmbiguity = true;
    ambigCase.hypotheses.push({
      id: 'hyp_shadow',
      label: 'Shadow Thief',
      culpritIds: ['char_bob'],
      claims: [],
    });
    // Explanation only mentions hyp_alice_stole
    ambigCase.truth.explanation = [
      {
        text: 'Alice stole the laptop.',
        clueIds: ['clue_office_access'],
      },
    ];
    const report = validateCase(ambigCase);
    expect(report.warnings.some((w) => w.checkId === 'ambiguity.intentional')).toBe(true);
  });

  it('validates authored case_0001 with zero errors and zero warnings', () => {
    const authoredPath = resolve(__dirname, '../../content/cases/authored/case_0001.json');
    const raw = readFileSync(authoredPath, 'utf-8');
    const case0001 = JSON.parse(raw) as CaseDefinition;

    const report = validateCase(case0001);
    const formatted = formatReport(report);

    expect(report.errors).toEqual([]);
    expect(report.warnings).toEqual([]);
    expect(report.ok).toBe(true);
    expect(formatted).toContain('PASS');
    expect(formatted).toContain('No issues detected. Case is validator-clean.');
  });

  it('formats validation reports cleanly for human reading', () => {
    const invalidCase = makeCase();
    invalidCase.clues[0]!.text = '   ';
    const report = validateCase(invalidCase);
    const formatted = formatReport(report);

    expect(formatted).toContain('FAIL');
    expect(formatted).toContain('Errors (1):');
    expect(formatted).toContain('[text.render]');
  });

  it('supports running a subset of checks via options.checks', () => {
    const testCase = makeCase();
    testCase.clues[0]!.text = '   '; // would fail text.render
    testCase.truth.solutionHypothesisId = 'hyp_nonexistent'; // would fail refs

    const report = validateCase(testCase, { checks: ['refs'] });
    expect(report.errors.some((e) => e.checkId === 'refs')).toBe(true);
    expect(report.errors.some((e) => e.checkId === 'text.render')).toBe(false);
  });

  it('getObtainableClueIds resolves reachable graph correctly', () => {
    const c = makeCase();
    const ids = getObtainableClueIds(c);
    expect(ids.has('clue_office_access')).toBe(true);
    expect(ids.has('clue_lobby_cam')).toBe(true);
  });

  it('computeDifficultyMetrics exports configurable weights and computes score', () => {
    expect(DIFFICULTY_WEIGHTS.smallestKeyEvidenceSize).toBe(2.0);
    expect(DIFFICULTY_WEIGHTS.needsTravelTime).toBe(3.0);

    const c = makeCase();
    const metrics = computeDifficultyMetrics(c);
    expect(metrics.smallestKeyEvidenceSize).toBe(1);
    expect(metrics.hypothesesCount).toBe(2);
    expect(metrics.measuredDifficulty).toBe(1);
  });

  it('ALL_CHECKS exports all 15 checks', () => {
    expect(ALL_CHECKS).toHaveLength(15);
    const checkIds = ALL_CHECKS.map((c) => c.checkId);
    expect(checkIds).toContain('schema');
    expect(checkIds).toContain('refs');
    expect(checkIds).toContain('timeline.consistent');
    expect(checkIds).toContain('physical.entailed');
    expect(checkIds).toContain('testimony.lies_declared');
    expect(checkIds).toContain('solution.consistent');
    expect(checkIds).toContain('solution.unique');
    expect(checkIds).toContain('solution.reachable');
    expect(checkIds).toContain('unlock.acyclic');
    expect(checkIds).toContain('difficulty.band');
    expect(checkIds).toContain('text.render');
    expect(checkIds).toContain('hooks.canonical');
    expect(checkIds).toContain('ambiguity.intentional');
    expect(checkIds).toContain('lie.contradictable');
    expect(checkIds).toContain('solution.positive_evidence');
  });

  it('individual checks can be executed directly', () => {
    const c = makeCase();
    const ctx = {
      logicCtx: {
        doorLocations: { door_office: 'loc_office', door_lobby: 'loc_lobby' },
        deviceOwners: { obj_laptop: 'char_bob' },
        travelTimes: {},
        getTravelTime: () => 2,
      },
      obtainableClueIds: new Set(['clue_office_access', 'clue_lobby_cam']),
    };

    expect(v1SchemaCheck.run(c, ctx)).toHaveLength(0);
    expect(v2RefsCheck.run(c, ctx)).toHaveLength(0);
    expect(v3TimelineConsistentCheck.run(c, ctx)).toHaveLength(0);
    expect(v4PhysicalEntailedCheck.run(c, ctx)).toHaveLength(0);
    expect(v5TestimonyLiesCheck.run(c, ctx)).toHaveLength(0);
    expect(v6SolutionConsistentCheck.run(c, ctx)).toHaveLength(0);
    expect(v7SolutionUniqueCheck.run(c, ctx)).toHaveLength(0);
    expect(v8SolutionReachableCheck.run(c, ctx)).toHaveLength(0);
    expect(v9UnlockAcyclicCheck.run(c, ctx)).toHaveLength(0);
    expect(v10DifficultyBandCheck.run(c, ctx)).toHaveLength(0);
    expect(v11TextRenderCheck.run(c, ctx)).toHaveLength(0);
    expect(v12HooksCanonicalCheck.run(c, ctx)).toHaveLength(0);
    expect(v13AmbiguityCheck.run(c, ctx)).toHaveLength(0);
  });

  it('V2 (refs): validates all fact types and detects foreign key issues', () => {
    const c = makeCase();
    const ctx = {
      logicCtx: {
        doorLocations: { door_office: 'loc_office', door_lobby: 'loc_lobby' },
        deviceOwners: { obj_laptop: 'char_bob' },
        travelTimes: {},
        getTravelTime: () => null,
      },
      obtainableClueIds: new Set(['clue_office_access']),
    };

    // Valid facts across kinds
    c.truth.timeline.push(
      { kind: 'possess', who: 'char_alice', what: 'obj_laptop', from: 600, to: 610 },
      {
        kind: 'message',
        msg: 'msg_01',
        sender: 'char_alice',
        recipient: 'char_bob',
        device: 'obj_laptop',
        sentAt: 605,
      },
      { kind: 'device_use', device: 'obj_laptop', by: 'char_alice', at: 605 },
      { kind: 'relation', a: 'char_alice', b: 'char_bob', rel: 'colleague' },
      { kind: 'motive', who: 'char_alice', regarding: 'char_bob', motive: 'financial' },
      { kind: 'state', what: 'loc_office', property: 'door', value: 'locked', at: 600 },
      {
        kind: 'action',
        who: 'char_alice',
        verb: 'took',
        where: 'loc_office',
        at: 600,
        target: 'obj_laptop',
      },
    );
    expect(v2RefsCheck.run(c, ctx)).toHaveLength(0);

    // Invalid facts across kinds
    c.truth.timeline.push(
      { kind: 'possess', who: 'char_unknown', what: 'obj_laptop', from: 600, to: 610 },
      { kind: 'possess', who: 'char_alice', what: 'obj_unknown', from: 600, to: 610 },
      {
        kind: 'message',
        msg: 'msg_02',
        sender: 'char_unknown',
        recipient: 'char_bob',
        device: 'obj_laptop',
        sentAt: 605,
      },
      {
        kind: 'message',
        msg: 'msg_03',
        sender: 'char_alice',
        recipient: 'char_unknown',
        device: 'obj_laptop',
        sentAt: 605,
      },
      {
        kind: 'message',
        msg: 'msg_04',
        sender: 'char_alice',
        recipient: 'char_bob',
        device: 'obj_unknown',
        sentAt: 605,
      },
      { kind: 'device_use', device: 'obj_unknown', by: 'char_alice', at: 605 },
      { kind: 'device_use', device: 'obj_laptop', by: 'char_unknown', at: 605 },
      { kind: 'access', who: 'char_unknown', door: 'door_office', at: 600 },
      { kind: 'access', who: 'char_alice', door: 'door_unknown', at: 600 },
      { kind: 'relation', a: 'char_unknown', b: 'char_bob', rel: 'colleague' },
      { kind: 'relation', a: 'char_alice', b: 'char_unknown', rel: 'colleague' },
      { kind: 'motive', who: 'char_unknown', motive: 'greed' },
      { kind: 'motive', who: 'char_alice', regarding: 'char_unknown', motive: 'greed' },
      { kind: 'state', what: 'loc_unknown', property: 'door', value: 'open', at: 600 },
      { kind: 'action', who: 'char_alice', verb: 'took', target: 'ghost_target', at: 600 },
    );
    const issues = v2RefsCheck.run(c, ctx);
    expect(issues.length).toBeGreaterThanOrEqual(15);
  });

  it('V11 (text.render): catches empty or template reveal beats', () => {
    const c = makeCase();
    const ctx = {
      logicCtx: {
        doorLocations: {},
        deviceOwners: {},
        travelTimes: {},
        getTravelTime: () => null,
      },
      obtainableClueIds: new Set<string>(),
    };

    c.truth.explanation = [
      { text: '  ', clueIds: [] },
      { text: 'Alice did it with {{weapon}}.', clueIds: [] },
    ];
    const issues = v11TextRenderCheck.run(c, ctx);
    expect(issues).toHaveLength(2);
    expect(issues[0]?.message).toContain('empty');
    expect(issues[1]?.message).toContain('unrendered template');
  });

  it('V12 (hooks.canonical): catches hooks defining edges', () => {
    const c = makeCase();
    const ctx = {
      logicCtx: {
        doorLocations: {},
        deviceOwners: {},
        travelTimes: {},
        getTravelTime: () => null,
      },
      obtainableClueIds: new Set<string>(),
    };

    c.conspiracyHooks = [
      {
        nodeId: 'node_alpha',
        clueId: 'clue_office_access',
        ...({ from: 'node_a', to: 'node_b' } as Record<string, unknown>),
      },
    ];
    const issues = v12HooksCanonicalCheck.run(c, ctx);
    expect(issues.some((i) => i.message.includes('attempts to define an edge'))).toBe(true);
  });

  it('V13 (ambiguity.intentional): warns when ambiguity is enabled but only 1 hypothesis survives', () => {
    const c = makeCase();
    c.meta.allowAmbiguity = true;
    const ctx = {
      logicCtx: {
        doorLocations: { door_office: 'loc_office' },
        deviceOwners: {},
        travelTimes: {},
        getTravelTime: () => null,
      },
      obtainableClueIds: new Set(['clue_office_access']),
    };
    const issues = v13AmbiguityCheck.run(c, ctx);
    expect(issues.some((i) => i.message.includes('only 1 hypothesis survived'))).toBe(true);
  });

  it('formatReport formats warnings properly', () => {
    const report = {
      ok: true,
      errors: [],
      warnings: [
        {
          checkId: 'difficulty.band',
          severity: 'warning' as const,
          message: 'Difficulty differs by ±1',
          refs: ['1', '2'],
        },
      ],
      metrics: {
        difficultyScore: 5.5,
        measuredDifficulty: 2,
        smallestKeyEvidenceSize: 2,
        nonDefaultKeyCluesCount: 1,
        redHerringsCount: 0,
        hypothesesCount: 3,
        needsTravelTime: false,
        totalCluesCount: 5,
        obtainableCluesCount: 5,
      },
    };
    const formatted = formatReport(report);
    expect(formatted).toContain('PASS');
    expect(formatted).toContain('Warnings (1):');
    expect(formatted).toContain('⚠ [difficulty.band]');
  });

  it('computeDifficultyMetrics covers higher difficulty thresholds', () => {
    const c = makeCase();
    c.truth.keyEvidence = [['clue_1', 'clue_2', 'clue_3', 'clue_4', 'clue_5', 'clue_6']];
    c.clues = [
      {
        id: 'clue_1',
        type: 'access_log',
        reliability: 'physical',
        asserts: [],
        unlock: { kind: 'after_clue', clueId: 'clue_2' },
        tags: ['red_herring'],
        text: 'c1',
      },
      {
        id: 'clue_2',
        type: 'access_log',
        reliability: 'physical',
        asserts: [],
        unlock: { kind: 'after_clue', clueId: 'clue_3' },
        tags: ['red_herring'],
        text: 'c2',
      },
      {
        id: 'clue_3',
        type: 'access_log',
        reliability: 'physical',
        asserts: [],
        unlock: { kind: 'after_clue', clueId: 'clue_4' },
        tags: ['red_herring'],
        text: 'c3',
      },
      {
        id: 'clue_4',
        type: 'access_log',
        reliability: 'physical',
        asserts: [],
        unlock: { kind: 'after_clue', clueId: 'clue_5' },
        tags: ['red_herring'],
        text: 'c4',
      },
      {
        id: 'clue_5',
        type: 'access_log',
        reliability: 'physical',
        asserts: [],
        unlock: { kind: 'after_clue', clueId: 'clue_6' },
        tags: ['red_herring'],
        text: 'c5',
      },
      {
        id: 'clue_6',
        type: 'access_log',
        reliability: 'physical',
        asserts: [{ kind: 'at', who: 'char_alice', where: 'loc_office', from: 10, to: 20 }],
        unlock: { kind: 'default' },
        text: 'c6',
      },
    ];
    c.hypotheses = [
      { id: 'h1', label: 'H1', claims: [], culpritIds: [] },
      { id: 'h2', label: 'H2', claims: [], culpritIds: [] },
      { id: 'h3', label: 'H3', claims: [], culpritIds: [] },
      { id: 'h4', label: 'H4', claims: [], culpritIds: [] },
      { id: 'h5', label: 'H5', claims: [], culpritIds: [] },
    ];

    const metrics = computeDifficultyMetrics(c);
    expect(metrics.measuredDifficulty).toBe(5);
    expect(metrics.needsTravelTime).toBe(true);
  });
});
