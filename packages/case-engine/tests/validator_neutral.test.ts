import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { CaseDefinition } from '../src/schema/index.js';
import { v16PresentationNeutralCheck } from '../src/validator/checks/v16_presentation_neutral.js';
import { validateCase } from '../src/validator/index.js';

function makeBaseCase(): CaseDefinition {
  return {
    id: 'case_neutral_test',
    version: 1,
    kind: 'procedural',
    title: 'The Contradiction at Archive Vault',
    difficulty: 1,
    estimatedMinutes: 5,
    mysteryType: 'false_alibi',
    setting: {
      locationIds: ['loc_vault', 'loc_office'],
      date: '2026-11-04',
      summary: 'Incident at the archive vault',
    },
    briefing:
      'An incident occurred at Archive Vault. Three people had access: Adrian Vance, Bram Blackwood, and Clara Chen. Each has an account of the evening.',
    characters: [
      {
        id: 'char_culprit',
        name: 'Adrian Vance',
        role: 'Primary Suspect',
        publicDescription: 'Clerk on duty',
      },
      {
        id: 'char_s1',
        name: 'Bram Blackwood',
        role: 'Research Associate',
        publicDescription: 'Researcher in the library',
      },
      {
        id: 'char_s2',
        name: 'Clara Chen',
        role: 'Night Supervisor',
        publicDescription: 'Floor supervisor',
      },
    ],
    locations: [
      {
        id: 'loc_vault',
        name: 'Archive Vault',
        doorIds: ['door_vault'],
        adjacency: [],
      },
      {
        id: 'loc_office',
        name: 'Curator Office',
        doorIds: ['door_office'],
        adjacency: [],
      },
    ],
    objects: [
      {
        id: 'obj_ledger',
        name: 'Transit Ledger',
        type: 'item',
      },
    ],
    clues: [
      {
        id: 'clue_testimony_culprit',
        type: 'testimony',
        reliability: 'testimony',
        source: 'char_culprit',
        asserts: [
          {
            kind: 'at',
            who: 'char_culprit',
            where: 'loc_office',
            from: 1210,
            to: 1230,
          },
        ],
        text: 'Adrian stated they were in Curator Office all evening.',
        unlock: { kind: 'default' },
      },
      {
        id: 'clue_vault_scan',
        type: 'access_log',
        reliability: 'physical',
        asserts: [
          {
            kind: 'access',
            who: 'char_culprit',
            door: 'door_vault',
            at: 1218,
          },
        ],
        text: 'Access Log: Adrian scanned door_vault at 20:18.',
        unlock: { kind: 'default' },
      },
      {
        id: 'clue_s1_scan',
        type: 'access_log',
        reliability: 'physical',
        asserts: [
          {
            kind: 'access',
            who: 'char_s1',
            door: 'door_office',
            at: 1215,
          },
        ],
        text: 'Access Log: Bram scanned door_office at 20:15.',
        unlock: { kind: 'default' },
      },
    ],
    hypotheses: [
      {
        id: 'hyp_culprit',
        label: 'Adrian entered Archive Vault and took Transit Ledger.',
        claims: [
          {
            kind: 'at',
            who: 'char_culprit',
            where: 'loc_vault',
            from: 1215,
            to: 1230,
          },
        ],
        culpritIds: ['char_culprit'],
      },
      {
        id: 'hyp_s1',
        label: 'Bram entered Archive Vault and took Transit Ledger.',
        claims: [
          {
            kind: 'at',
            who: 'char_s1',
            where: 'loc_vault',
            from: 1215,
            to: 1230,
          },
        ],
        culpritIds: ['char_s1'],
      },
    ],
    truth: {
      timeline: [
        {
          kind: 'at',
          who: 'char_culprit',
          where: 'loc_vault',
          from: 1215,
          to: 1230,
        },
        {
          kind: 'access',
          who: 'char_culprit',
          door: 'door_vault',
          at: 1218,
        },
        {
          kind: 'access',
          who: 'char_s1',
          door: 'door_office',
          at: 1215,
        },
      ],
      culpritIds: ['char_culprit'],
      liars: [
        {
          who: 'char_culprit',
          statementClueIds: ['clue_testimony_culprit'],
        },
      ],
      solutionHypothesisId: 'hyp_culprit',
      keyEvidence: [['clue_vault_scan']],
      explanation: [],
    },
    meta: {
      status: 'validated',
      templateId: 'tpl_false_alibi_v1',
    },
  };
}

const dummyCtx = {
  logicCtx: {
    doorLocations: { door_vault: 'loc_vault', door_office: 'loc_office' },
    deviceOwners: {},
    travelTimes: {},
    getTravelTime: () => null,
  },
  obtainableClueIds: new Set(['clue_testimony_culprit', 'clue_vault_scan', 'clue_s1_scan']),
};

describe('Validator Check: V16 presentation.neutral', () => {
  it('passes a clean case with neutral title and neutral briefing listing all suspects', () => {
    const c = makeBaseCase();
    const issues = v16PresentationNeutralCheck.run(c, dummyCtx);
    expect(issues.filter((i) => i.severity === 'error')).toHaveLength(0);
  });

  it('passes when briefing mentions no suspects at all (pure incident description)', () => {
    const c = makeBaseCase();
    c.briefing =
      'Transit Ledger was reported missing from Archive Vault after hours. Review access logs to determine who took the item.';
    const issues = v16PresentationNeutralCheck.run(c, dummyCtx);
    expect(issues.filter((i) => i.severity === 'error')).toHaveLength(0);
  });

  it('fails with severity error if title contains a character first name', () => {
    const c = makeBaseCase();
    c.title = 'The Broken Alibi of Adrian';
    const issues = v16PresentationNeutralCheck.run(c, dummyCtx);
    const errors = issues.filter((i) => i.severity === 'error');
    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(errors[0]!.checkId).toBe('presentation.neutral');
    expect(errors[0]!.message).toContain('Adrian');
    expect(errors[0]!.refs).toContain('char_culprit');
  });

  it('fails with severity error if title contains a character last name', () => {
    const c = makeBaseCase();
    c.title = 'The Vance Conspiracy';
    const issues = v16PresentationNeutralCheck.run(c, dummyCtx);
    const errors = issues.filter((i) => i.severity === 'error');
    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(errors[0]!.checkId).toBe('presentation.neutral');
    expect(errors[0]!.message).toContain('Vance');
    expect(errors[0]!.refs).toContain('char_culprit');
  });

  it('fails with severity error if title contains an innocent character name', () => {
    const c = makeBaseCase();
    c.title = 'The Secret of Bram';
    const issues = v16PresentationNeutralCheck.run(c, dummyCtx);
    const errors = issues.filter((i) => i.severity === 'error');
    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(errors[0]!.checkId).toBe('presentation.neutral');
    expect(errors[0]!.message).toContain('Bram');
    expect(errors[0]!.refs).toContain('char_s1');
  });

  it('fails with severity error if briefing names only the culprit', () => {
    const c = makeBaseCase();
    c.briefing =
      'Transit Ledger was compromised at Archive Vault. Suspect Adrian Vance claims to have been at Curator Office throughout the evening.';
    const issues = v16PresentationNeutralCheck.run(c, dummyCtx);
    const errors = issues.filter((i) => i.severity === 'error');
    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(errors[0]!.checkId).toBe('presentation.neutral');
    expect(errors[0]!.message).toContain('Briefing mentions a suspect but does not neutrally list all suspects');
  });

  it('fails with severity error if briefing names culprit and only one non-culprit', () => {
    const c = makeBaseCase();
    c.briefing =
      'Transit Ledger was compromised at Archive Vault. Suspects Adrian Vance and Bram Blackwood were questioned regarding their whereabouts.';
    const issues = v16PresentationNeutralCheck.run(c, dummyCtx);
    const errors = issues.filter((i) => i.severity === 'error');
    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(errors[0]!.checkId).toBe('presentation.neutral');
  });

  it('passes when case has multiple role="Suspect" and briefing mentions every character with role "Suspect"', () => {
    const c = makeBaseCase();
    c.characters = [
      {
        id: 'char_1',
        name: 'Adrian Vance',
        role: 'Suspect',
        publicDescription: 'First suspect',
      },
      {
        id: 'char_2',
        name: 'Bram Blackwood',
        role: 'Suspect',
        publicDescription: 'Second suspect',
      },
      {
        id: 'char_3',
        name: 'Clara Chen',
        role: 'Victim',
        publicDescription: 'The curator',
      },
    ];
    c.truth.culpritIds = ['char_1'];
    c.briefing = 'Two people had access: Adrian Vance and Bram Blackwood. Who is guilty?';
    const issues = v16PresentationNeutralCheck.run(c, dummyCtx);
    expect(issues.filter((i) => i.severity === 'error')).toHaveLength(0);
  });

  describe('Authored Cases: case_0001 through case_0004 pass V16', () => {
    const authoredDir = resolve(__dirname, '../../content/cases/authored');

    const cases = ['case_0001', 'case_0002', 'case_0003', 'case_0004'];

    for (const caseId of cases) {
      it(`${caseId} passes V16 presentation.neutral check and full validateCase`, () => {
        const filePath = resolve(authoredDir, `${caseId}.json`);
        const json = readFileSync(filePath, 'utf8');
        const def = JSON.parse(json) as CaseDefinition;

        // V16 check specifically
        const v16Issues = v16PresentationNeutralCheck.run(def, dummyCtx);
        const v16Errors = v16Issues.filter((i) => i.severity === 'error');
        expect(v16Errors).toHaveLength(0);

        // Full validateCase
        const report = validateCase(def);
        expect(report.ok).toBe(true);
        expect(report.errors).toHaveLength(0);
      });
    }
  });
});
