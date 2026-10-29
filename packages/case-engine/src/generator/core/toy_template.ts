import type { CaseDefinition, Character, GameObject, Location } from '../../schema/index.js';
import type { Rng } from '../../rng.js';
import type { CaseTemplate, FilledSlots, TemplateParams } from './types.js';

export const tpl_toy_two_rooms: CaseTemplate = {
  id: 'tpl_toy_two_rooms',
  mysteryType: 'missing_item',
  difficultyRange: [1, 2],
  slots: [
    { name: 'culprit', type: 'character', role: 'Night Caretaker' },
    { name: 'witness', type: 'character', role: 'Archive Curator' },
    { name: 'suspect', type: 'character', role: 'Visiting Scholar' },
    { name: 'locA', type: 'location' },
    { name: 'locB', type: 'location' },
    { name: 'item', type: 'object' },
  ],

  build(rng: Rng, slots: FilledSlots, params: TemplateParams): CaseDefinition {
    const culprit = slots.culprit as Character;
    const witness = slots.witness as Character;
    const suspect = slots.suspect as Character;
    const locA = { ...(slots.locA as Location) };
    const locB = { ...(slots.locB as Location) };
    const item = { ...(slots.item as GameObject), ownerId: witness.id };

    // Ensure bidirectional adjacency with 10 min travel time
    const doorA = locA.doorIds[0] ?? `door_${locA.id}_main`;
    const doorB = locB.doorIds[0] ?? `door_${locB.id}_main`;
    if (!locA.doorIds.includes(doorA)) locA.doorIds = [doorA];
    if (!locB.doorIds.includes(doorB)) locB.doorIds = [doorB];

    locA.adjacency = [{ to: locB.id, travelMinutes: 10 }];
    locB.adjacency = [{ to: locA.id, travelMinutes: 10 }];

    const timeline = [
      {
        kind: 'at' as const,
        who: witness.id,
        where: locA.id,
        from: 1200,
        to: 1220,
      },
      {
        kind: 'access' as const,
        who: witness.id,
        door: doorA,
        at: 1210,
      },
      {
        kind: 'at' as const,
        who: suspect.id,
        where: locB.id,
        from: 1210,
        to: 1230,
      },
      {
        kind: 'access' as const,
        who: suspect.id,
        door: doorB,
        at: 1212,
      },
      {
        kind: 'at' as const,
        who: culprit.id,
        where: locA.id,
        from: 1215,
        to: 1230,
      },
      {
        kind: 'access' as const,
        who: culprit.id,
        door: doorA,
        at: 1220,
      },
      {
        kind: 'action' as const,
        who: culprit.id,
        verb: 'took' as const,
        target: item.id,
        at: 1222,
        where: locA.id,
      },
    ];

    const clues = [
      {
        id: 'clue_witness_testimony',
        type: 'testimony' as const,
        reliability: 'testimony' as const,
        source: witness.id,
        asserts: [
          {
            kind: 'at' as const,
            who: witness.id,
            where: locA.id,
            from: 1200,
            to: 1220,
          },
        ],
        text: `${witness.name} stated: 'I was present in ${locA.name} from 20:00 to 20:20 completing daily records.'`,
        unlock: { kind: 'default' as const },
      },
      {
        id: 'clue_suspect_testimony',
        type: 'testimony' as const,
        reliability: 'testimony' as const,
        source: suspect.id,
        asserts: [
          {
            kind: 'at' as const,
            who: suspect.id,
            where: locB.id,
            from: 1210,
            to: 1230,
          },
        ],
        text: `${suspect.name} stated: 'I remained in ${locB.name} from 20:10 to 20:30 studying documents.'`,
        unlock: { kind: 'default' as const },
      },
      {
        id: 'clue_culprit_testimony',
        type: 'testimony' as const,
        reliability: 'testimony' as const,
        source: culprit.id,
        asserts: [
          {
            kind: 'at' as const,
            who: culprit.id,
            where: locB.id,
            from: 1215,
            to: 1230,
          },
        ],
        text: `${culprit.name} stated: 'I was in ${locB.name} from 20:15 to 20:30 on cleaning duties.'`,
        unlock: { kind: 'default' as const },
      },
      {
        id: 'clue_witness_access',
        type: 'access_log' as const,
        reliability: 'physical' as const,
        asserts: [
          {
            kind: 'access' as const,
            who: witness.id,
            door: doorA,
            at: 1210,
          },
        ],
        text: `Security reader: ${witness.name} scanned access badge at ${doorA} at 20:10.`,
        unlock: { kind: 'default' as const },
      },
      {
        id: 'clue_suspect_access',
        type: 'access_log' as const,
        reliability: 'physical' as const,
        asserts: [
          {
            kind: 'access' as const,
            who: suspect.id,
            door: doorB,
            at: 1212,
          },
        ],
        text: `Security reader: ${suspect.name} scanned access badge at ${doorB} at 20:12.`,
        unlock: { kind: 'default' as const },
      },
      {
        id: 'clue_culprit_access',
        type: 'access_log' as const,
        reliability: 'physical' as const,
        asserts: [
          {
            kind: 'access' as const,
            who: culprit.id,
            door: doorA,
            at: 1220,
          },
        ],
        text: `Security reader: ${culprit.name} scanned access badge at ${doorA} at 20:20.`,
        unlock: {
          kind: 'after_clue' as const,
          clueId: 'clue_culprit_testimony',
        },
      },
    ];

    const hypotheses = [
      {
        id: 'hyp_suspect_stole',
        label: `${suspect.name} took the item from ${locA.name}.`,
        claims: [
          {
            kind: 'at' as const,
            who: suspect.id,
            where: locA.id,
            from: 1210,
            to: 1215,
          },
        ],
        culpritIds: [suspect.id],
      },
      {
        id: 'hyp_witness_stole',
        label: `${witness.name} took the item from ${locB.name}.`,
        claims: [
          {
            kind: 'at' as const,
            who: witness.id,
            where: locB.id,
            from: 1205,
            to: 1215,
          },
        ],
        culpritIds: [witness.id],
      },
      {
        id: 'hyp_culprit_stole',
        label: `${culprit.name} took the item from ${locA.name}.`,
        claims: [
          {
            kind: 'action' as const,
            who: culprit.id,
            verb: 'took' as const,
            target: item.id,
            at: 1222,
            where: locA.id,
          },
        ],
        culpritIds: [culprit.id],
      },
    ];

    const diff = (params.difficulty ?? 1) as 1 | 2 | 3 | 4 | 5;

    return {
      id: `case_toy_${rng.int(1000, 9999)}`,
      version: 1,
      kind: 'procedural',
      title: `The Mystery of ${item.name}`,
      difficulty: diff,
      estimatedMinutes: 4,
      mysteryType: 'missing_item',
      setting: {
        locationIds: [locA.id, locB.id],
        date: '2026-10-31',
        summary: `An incident occurring between ${locA.name} and ${locB.name}.`,
      },
      briefing: `${item.name} vanished under suspicious circumstances. Who took it?`,
      characters: [culprit, witness, suspect],
      locations: [locA, locB],
      objects: [item],
      clues,
      hypotheses,
      truth: {
        timeline,
        culpritIds: [culprit.id],
        liars: [
          {
            who: culprit.id,
            statementClueIds: ['clue_culprit_testimony'],
          },
        ],
        solutionHypothesisId: 'hyp_culprit_stole',
        keyEvidence: [['clue_suspect_access', 'clue_witness_access', 'clue_culprit_access']],
        explanation: [
          {
            time: 1210,
            text: `${witness.name} was badged into ${doorA} at 20:10, eliminating suspicions that they were at ${locB.name}.`,
            clueIds: ['clue_witness_access'],
          },
          {
            time: 1212,
            text: `${suspect.name} was badged into ${doorB} at 20:12, eliminating suspicions that they were at ${locA.name}.`,
            clueIds: ['clue_suspect_access'],
          },
          {
            time: 1220,
            text: `${culprit.name} badged into ${doorA} at 20:20, disproving their alibi and placing them at the crime scene.`,
            clueIds: ['clue_culprit_testimony', 'clue_culprit_access'],
          },
        ],
      },
      meta: {
        status: 'validated',
        author: 'Toy Generator',
        templateId: 'tpl_toy_two_rooms',
      },
    };
  },
};
