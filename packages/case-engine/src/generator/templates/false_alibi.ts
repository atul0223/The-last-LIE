/**
 * Template: False Alibi (tpl_false_alibi_v1)
 *
 * Story Shape:
 * A high-profile crime occurs at a primary crime scene (locCrime) during an evening window.
 * The primary culprit (or a covering associate) fabricates an alibi claiming presence at a different
 * location (locAlibi) during the critical interval.
 *
 * Mechanism Variants (Decisive Contradiction Rules):
 * 0. access.presence: Culprit scanned electronic access badge at locCrime door during the claimed alibi interval.
 * 1. presence.two_places: Optical surveillance camera / sensor confirmed culprit present at locCrime during alibi interval.
 * 2. presence.travel: Culprit appeared at locCrime too quickly after allegedly leaving locAlibi (travel time impossibility).
 *
 * Roles & Diversity:
 * - Culprit role selected from a rich pool (Primary Suspect, Night Supervisor, Associate, Staff Specialist, Chief Auditor).
 * - Liar selection: In ~25% of cases, an associate/witness provides false testimony to cover for the culprit (V14/V15 pass).
 */

import type {
  CaseDefinition,
  Character,
  Clue,
  Fact,
  GameObject,
  Location,
} from '../../schema/index.js';
import type { Rng } from '../../rng.js';
import type { CaseTemplate, FilledSlots, TemplateParams } from '../core/types.js';
import { injectRedHerrings } from '../core/helpers.js';
import { formatNameList, generateFalseAlibiTitle } from './helpers.js';

export const tpl_false_alibi: CaseTemplate = {
  id: 'tpl_false_alibi_v1',
  mysteryType: 'false_alibi',
  difficultyRange: [1, 4],
  slots: [
    { name: 'culprit', type: 'character', role: 'Primary Suspect' },
    { name: 'suspect1', type: 'character', role: 'Staff Member' },
    { name: 'suspect2', type: 'character', role: 'Associate' },
    { name: 'suspect3', type: 'character', role: 'Night Supervisor' },
    { name: 'locCrime', type: 'location' },
    { name: 'locAlibi', type: 'location' },
    { name: 'locTransit', type: 'location' },
    { name: 'targetItem', type: 'object' },
  ],

  build(rng: Rng, slots: FilledSlots, params: TemplateParams): CaseDefinition {
    const rawDiff = params.difficulty ?? 1;
    const diff = Math.min(4, Math.max(1, rawDiff)) as 1 | 2 | 3 | 4;

    // Mechanism variant:
    // 0: presence.two_places
    // 1: access.presence
    // 2: presence.travel
    const variantRaw = rng.int(0, 2);
    const variant: 0 | 1 | 2 = variantRaw === 0 ? 1 : variantRaw === 1 ? 0 : 2;

    const culprit = { ...(slots.culprit as Character) };
    const suspect1 = { ...(slots.suspect1 as Character) };
    const suspect2 = { ...(slots.suspect2 as Character) };
    const suspect3 = { ...(slots.suspect3 as Character) };

    // Dynamically assign varied roles to characters
    const possibleRoles = [
      'Primary Suspect',
      'Night Supervisor',
      'Associate',
      'Staff Specialist',
      'Chief Auditor',
    ];
    const shuffledRoles = rng.shuffle(possibleRoles);
    culprit.role = shuffledRoles[0]!;
    suspect1.role = shuffledRoles[1]!;
    suspect2.role = shuffledRoles[2]!;
    suspect3.role = shuffledRoles[3]!;

    // Liar: ~25% of cases witness covers for culprit
    const witnessCovers = rng.next() < 0.25;
    const liar = witnessCovers ? suspect1 : culprit;

    const locCrime = { ...(slots.locCrime as Location) };
    const locAlibi = { ...(slots.locAlibi as Location) };
    const locTransit = { ...(slots.locTransit as Location) };
    const targetItem = { ...(slots.targetItem as GameObject), ownerId: culprit.id };

    // Ensure valid door IDs exist
    const doorCrime = locCrime.doorIds[0] ?? `door_${locCrime.id}_main`;
    const doorAlibi = locAlibi.doorIds[0] ?? `door_${locAlibi.id}_main`;
    const doorTransit = locTransit.doorIds[0] ?? `door_${locTransit.id}_main`;

    locCrime.doorIds = [doorCrime];
    locAlibi.doorIds = [doorAlibi];
    locTransit.doorIds = [doorTransit];

    // Configure adjacency & travel time
    // Variant 2 requires travel time reasoning across all difficulties;
    // Diff 3 & 4 also require travel time reasoning.
    const needsTravel = diff >= 3 || variant === 2;
    if (needsTravel) {
      locCrime.adjacency = [
        { to: locAlibi.id, travelMinutes: 25 },
        { to: locTransit.id, travelMinutes: 10 },
      ];
      locAlibi.adjacency = [
        { to: locCrime.id, travelMinutes: 25 },
        { to: locTransit.id, travelMinutes: 15 },
      ];
      locTransit.adjacency = [
        { to: locCrime.id, travelMinutes: 10 },
        { to: locAlibi.id, travelMinutes: 15 },
      ];
    } else {
      locCrime.adjacency = [];
      locAlibi.adjacency = [];
      locTransit.adjacency = [];
    }

    const characters: Character[] =
      diff >= 3 ? [culprit, suspect1, suspect2, suspect3] : [culprit, suspect1, suspect2];

    const locations: Location[] =
      diff === 1 ? [locCrime, locAlibi] : [locCrime, locAlibi, locTransit];

    const s2LocId = diff === 1 ? locAlibi.id : locTransit.id;
    const s2Door = diff === 1 ? doorAlibi : doorTransit;

    // Build timeline facts (Ground Truth)
    const timeline: Fact[] = [];

    if (variant === 2) {
      // Travel variant: culprit badges at crime scene at 1233 (3 min after claimed alibi window 1210-1230)
      timeline.push(
        {
          kind: 'at',
          who: culprit.id,
          where: locCrime.id,
          from: 1230,
          to: 1250,
        },
        {
          kind: 'access',
          who: culprit.id,
          door: doorCrime,
          at: 1233,
        },
        {
          kind: 'action',
          who: culprit.id,
          verb: 'took',
          target: targetItem.id,
          at: 1235,
          where: locCrime.id,
        },
      );
    } else {
      // Standard variants (access.presence or presence.two_places):
      // Culprit present and badged inside crime scene during 1215-1235
      timeline.push(
        {
          kind: 'at',
          who: culprit.id,
          where: locCrime.id,
          from: 1215,
          to: 1235,
        },
        {
          kind: 'access',
          who: culprit.id,
          door: doorCrime,
          at: 1218,
        },
        {
          kind: 'action',
          who: culprit.id,
          verb: 'took',
          target: targetItem.id,
          at: 1220,
          where: locCrime.id,
        },
      );
    }

    // Suspect 1 legitimate presence
    timeline.push(
      {
        kind: 'at',
        who: suspect1.id,
        where: locAlibi.id,
        from: 1210,
        to: 1230,
      },
      {
        kind: 'access',
        who: suspect1.id,
        door: doorAlibi,
        at: 1215,
      },
    );

    // Suspect 2 legitimate presence
    timeline.push(
      {
        kind: 'at',
        who: suspect2.id,
        where: s2LocId,
        from: 1210,
        to: 1230,
      },
      {
        kind: 'access',
        who: suspect2.id,
        door: s2Door,
        at: 1216,
      },
    );

    if (diff >= 3) {
      timeline.push(
        {
          kind: 'at',
          who: suspect3.id,
          where: locTransit.id,
          from: 1210,
          to: 1230,
        },
        {
          kind: 'access',
          who: suspect3.id,
          door: doorTransit,
          at: 1217,
        },
      );
    }

    // Background red herring facts
    timeline.push(
      {
        kind: 'access',
        who: suspect1.id,
        door: doorAlibi,
        at: 1205,
      },
      {
        kind: 'access',
        who: suspect2.id,
        door: s2Door,
        at: 1206,
      },
      {
        kind: 'access',
        who: suspect1.id,
        door: doorAlibi,
        at: 1228,
      },
      {
        kind: 'access',
        who: suspect2.id,
        door: s2Door,
        at: 1229,
      },
    );

    // Clues Construction
    const baseClues: Clue[] = [];

    // Liar statement clue
    const liarClueId = 'clue_alibi_testimony';
    if (witnessCovers) {
      baseClues.push({
        id: liarClueId,
        type: 'testimony',
        reliability: 'testimony',
        source: liar.id,
        asserts: [
          {
            kind: 'at',
            who: culprit.id,
            where: locAlibi.id,
            from: 1210,
            to: 1230,
          },
          {
            kind: 'at',
            who: suspect1.id,
            where: locAlibi.id,
            from: 1210,
            to: 1230,
          },
        ],
        text: `${liar.name} stated: 'I was in ${locAlibi.name} from 20:10 to 20:30 with ${culprit.name} the entire time discussing routine administrative records.'`,
        unlock: { kind: 'default' },
      });

      // Culprit gives neutral statement
      baseClues.push({
        id: 'clue_culprit_statement',
        type: 'testimony',
        reliability: 'testimony',
        source: culprit.id,
        asserts: [],
        text: `${culprit.name} stated: 'I decline to make any formal statement without departmental review.'`,
        unlock: { kind: 'default' },
      });
    } else {
      baseClues.push({
        id: liarClueId,
        type: 'testimony',
        reliability: 'testimony',
        source: liar.id,
        asserts: [
          {
            kind: 'at',
            who: culprit.id,
            where: locAlibi.id,
            from: 1210,
            to: 1230,
          },
        ],
        text: `${liar.name} stated: 'I spent the entire evening from 20:10 to 20:30 at ${locAlibi.name} attending to routine matters.'`,
        unlock: { kind: 'default' },
      });

      baseClues.push({
        id: 'clue_suspect1_testimony',
        type: 'testimony',
        reliability: 'testimony',
        source: suspect1.id,
        asserts: [
          {
            kind: 'at',
            who: suspect1.id,
            where: locAlibi.id,
            from: 1210,
            to: 1230,
          },
        ],
        text: `${suspect1.name} stated: 'I was present in ${locAlibi.name} between 20:10 and 20:30. I did not see ${culprit.name} anywhere nearby.'`,
        unlock: { kind: 'default' },
      });
    }

    // Physical clue placing suspect 1 at locAlibi (eliminates Decoy 1)
    baseClues.push({
      id: 'clue_suspect1_alibi_access',
      type: 'access_log',
      reliability: 'physical',
      asserts: [
        {
          kind: 'access',
          who: suspect1.id,
          door: doorAlibi,
          at: 1215,
        },
      ],
      text: `Access Reader: ${suspect1.name} badged through ${doorAlibi} at 20:15.`,
      unlock: { kind: 'default' },
    });

    // Decisive physical refutation clue (varies by mechanism variant)
    const decisiveClueId = 'clue_decisive_refutation';
    if (variant === 0) {
      // access.presence
      baseClues.push({
        id: decisiveClueId,
        type: 'access_log',
        reliability: 'physical',
        asserts:
          diff >= 3
            ? [
                {
                  kind: 'access',
                  who: culprit.id,
                  door: doorCrime,
                  at: 1218,
                },
                {
                  kind: 'at',
                  who: culprit.id,
                  where: locCrime.id,
                  from: 1215,
                  to: 1235,
                },
              ]
            : [
                {
                  kind: 'access',
                  who: culprit.id,
                  door: doorCrime,
                  at: 1218,
                },
              ],
        text: `Security Terminal: ${culprit.name} scanned access badge at ${doorCrime} at 20:18.`,
        unlock:
          diff === 1
            ? { kind: 'default' }
            : {
                kind: 'after_clue',
                clueId: liarClueId,
              },
      });
    } else if (variant === 1) {
      // presence.two_places
      baseClues.push({
        id: decisiveClueId,
        type: 'cctv',
        reliability: 'physical',
        asserts: [
          {
            kind: 'at',
            who: culprit.id,
            where: locCrime.id,
            from: 1215,
            to: 1235,
          },
        ],
        text: `Surveillance Still: High-resolution camera recorded ${culprit.name} inside ${locCrime.name} between 20:15 and 20:35.`,
        unlock:
          diff === 1
            ? { kind: 'default' }
            : {
                kind: 'after_clue',
                clueId: liarClueId,
              },
      });
    } else {
      // presence.travel
      baseClues.push({
        id: decisiveClueId,
        type: 'access_log',
        reliability: 'physical',
        asserts: [
          {
            kind: 'access',
            who: culprit.id,
            door: doorCrime,
            at: 1233,
          },
        ],
        text: `Gate Reader: ${culprit.name} scanned access badge at ${doorCrime} at 20:33, only three minutes after alleged presence at ${locAlibi.name}.`,
        unlock:
          diff === 1
            ? { kind: 'default' }
            : {
                kind: 'after_clue',
                clueId: liarClueId,
              },
      });
    }

    // Clues for suspect 2 and suspect 3 (diff scaling)
    if (diff >= 2) {
      baseClues.push({
        id: 'clue_suspect2_alibi_access',
        type: 'access_log',
        reliability: 'physical',
        asserts: [
          {
            kind: 'access',
            who: suspect2.id,
            door: s2Door,
            at: 1216,
          },
        ],
        text: `Turnstile Log: ${suspect2.name} verified entry at ${s2Door} at 20:16.`,
        unlock:
          diff === 4
            ? {
                kind: 'after_clue',
                clueId: 'clue_suspect1_alibi_access',
              }
            : { kind: 'default' },
      });
    }

    if (diff === 4) {
      baseClues.push({
        id: 'clue_suspect3_alibi_access',
        type: 'access_log',
        reliability: 'physical',
        asserts: [
          {
            kind: 'access',
            who: suspect3.id,
            door: doorTransit,
            at: 1217,
          },
        ],
        text: `Turnstile Log: ${suspect3.name} verified entry at ${doorTransit} at 20:17.`,
        unlock: { kind: 'default' },
      });
    }

    // Red herrings
    const redHerringCount = diff === 1 ? 1 : 2;
    const clues = injectRedHerrings(baseClues, timeline, redHerringCount, rng);

    // Build Hypotheses
    const crimeTime = variant === 2 ? 1235 : 1220;
    const solutionHypothesis = {
      id: 'hyp_culprit_guilty',
      label: `${culprit.name} entered ${locCrime.name} and took ${targetItem.name}.`,
      claims: [
        {
          kind: 'action' as const,
          who: culprit.id,
          verb: 'took' as const,
          target: targetItem.id,
          at: crimeTime,
          where: locCrime.id,
        },
      ],
      culpritIds: [culprit.id],
    };

    const decoy1 = {
      id: 'hyp_suspect1_guilty',
      label: `${suspect1.name} entered ${locCrime.name} and took ${targetItem.name}.`,
      claims: [
        {
          kind: 'at' as const,
          who: suspect1.id,
          where: locCrime.id,
          from: 1212,
          to: 1225,
        },
      ],
      culpritIds: [suspect1.id],
    };

    let hypotheses = [solutionHypothesis, decoy1];
    let keyEvidence: string[][] = [];

    if (diff === 1) {
      const decoy2 = {
        id: 'hyp_culprit_innocent',
        label: `${culprit.name} remained at ${locAlibi.name} and did not enter ${locCrime.name}.`,
        claims: [
          {
            kind: 'at' as const,
            who: culprit.id,
            where: locAlibi.id,
            from: 1215,
            to: 1230,
          },
        ],
        culpritIds: [suspect1.id],
      };
      hypotheses = [solutionHypothesis, decoy1, decoy2];
      keyEvidence = [['clue_suspect1_alibi_access', decisiveClueId]];
    } else if (diff === 2 || diff === 3) {
      const decoy2 = {
        id: 'hyp_suspect2_guilty',
        label: `${suspect2.name} entered ${locCrime.name} and took ${targetItem.name}.`,
        claims: [
          {
            kind: 'at' as const,
            who: suspect2.id,
            where: locCrime.id,
            from: 1212,
            to: 1225,
          },
        ],
        culpritIds: [suspect2.id],
      };

      const decoy3 = {
        id: 'hyp_culprit_innocent',
        label: `${culprit.name} remained at ${locAlibi.name} and did not enter ${locCrime.name}.`,
        claims: [
          {
            kind: 'at' as const,
            who: culprit.id,
            where: locAlibi.id,
            from: 1215,
            to: 1230,
          },
        ],
        culpritIds: [suspect1.id],
      };
      hypotheses = [solutionHypothesis, decoy1, decoy2, decoy3];
      keyEvidence = [
        ['clue_suspect1_alibi_access', 'clue_suspect2_alibi_access', decisiveClueId],
      ];
    } else {
      // Diff 4
      const decoy2 = {
        id: 'hyp_suspect2_guilty',
        label: `${suspect2.name} entered ${locCrime.name} and took ${targetItem.name}.`,
        claims: [
          {
            kind: 'at' as const,
            who: suspect2.id,
            where: locCrime.id,
            from: 1212,
            to: 1225,
          },
        ],
        culpritIds: [suspect2.id],
      };

      const decoy3 = {
        id: 'hyp_suspect3_guilty',
        label: `${suspect3.name} entered ${locCrime.name} and took ${targetItem.name}.`,
        claims: [
          {
            kind: 'at' as const,
            who: suspect3.id,
            where: locCrime.id,
            from: 1212,
            to: 1225,
          },
        ],
        culpritIds: [suspect3.id],
      };
      hypotheses = [solutionHypothesis, decoy1, decoy2, decoy3];
      keyEvidence = [
        [
          'clue_suspect1_alibi_access',
          'clue_suspect2_alibi_access',
          'clue_suspect3_alibi_access',
          decisiveClueId,
        ],
      ];
    }

    hypotheses = rng.shuffle(hypotheses);

    // Explanation beats
    const explanation = [
      {
        time: 1215,
        text: `${suspect1.name} was logged badging into ${doorAlibi} at 20:15, proving their presence at ${locAlibi.name} and ruling out their presence at ${locCrime.name}.`,
        clueIds: ['clue_suspect1_alibi_access'],
      },
      ...(diff >= 2
        ? [
            {
              time: 1216,
              text: `${suspect2.name} badged through ${s2Door} at 20:16, establishing their presence at ${diff === 1 ? locAlibi.name : locTransit.name}.`,
              clueIds: ['clue_suspect2_alibi_access'],
            },
          ]
        : []),
      ...(diff === 4
        ? [
            {
              time: 1217,
              text: `${suspect3.name} badged through ${doorTransit} at 20:17, ruling out their presence at ${locCrime.name}.`,
              clueIds: ['clue_suspect3_alibi_access'],
            },
          ]
        : []),
      {
        time: variant === 2 ? 1233 : 1218,
        text: `${culprit.name}'s presence was definitively established at ${locCrime.name}, shattering the fabricated alibi testimony.`,
        clueIds: [decisiveClueId, liarClueId],
      },
      {
        time: crimeTime,
        text: `${culprit.name} took ${targetItem.name} from ${locCrime.name} before departing.`,
        clueIds: [decisiveClueId],
      },
    ];

    const title = generateFalseAlibiTitle(rng, targetItem, locCrime, locAlibi, locTransit);

    const suspects = diff >= 3 ? [culprit, suspect1, suspect2, suspect3] : [culprit, suspect1, suspect2];
    const shuffledSuspects = rng.shuffle(suspects);
    const suspectNames = formatNameList(shuffledSuspects.map((s) => s.name));
    const countWord = suspects.length === 4 ? 'four' : 'three';

    const briefingOptions = [
      `At ${variant === 2 ? '20:35' : '20:20'}, ${targetItem.name} was taken from ${locCrime.name}. Physical evidence refutes an alibi fabricated by one of ${countWord} individuals: ${suspectNames}. Examine the timeline to identify the culprit.`,
      `The theft of ${targetItem.name} from ${locCrime.name} occurred under cover of evening. One of the ${countWord} individuals present—${suspectNames}—has fabricated their movements. Reconstruct the logs to expose the true culprit.`,
      `Security authorities discovered a breach at ${locCrime.name} involving ${targetItem.name}. Statements from ${suspectNames} contain contradictions with physical records. Determine who broke their alibi and took the item.`,
    ];
    const briefing = rng.pick(briefingOptions);

    return {
      id: `case_gen_${rng.int(100000, 999999)}`,
      version: 1,
      kind: 'procedural',
      title,
      difficulty: diff,
      estimatedMinutes: diff * 4 + 2,
      mysteryType: 'false_alibi',
      setting: {
        locationIds: locations.map((l) => l.id),
        date: '2026-10-24',
        summary: `Vesper City incidents across ${locations.map((l) => l.name).join(', ')}.`,
      },
      briefing,
      characters,
      locations,
      objects: [targetItem],
      clues,
      hypotheses,
      truth: {
        timeline,
        solutionHypothesisId: 'hyp_culprit_guilty',
        culpritIds: [culprit.id],
        liars: [{ who: liar.id, statementClueIds: [liarClueId] }],
        keyEvidence,
        explanation,
      },
      meta: {
        seed: typeof params.seed === 'number' ? params.seed : undefined,
        templateId: 'tpl_false_alibi_v1',
        status: 'validated',
      },
    };
  },
};
