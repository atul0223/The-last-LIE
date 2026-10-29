/**
 * Template: False Alibi (tpl_false_alibi_v1)
 *
 * Story Shape:
 * A high-profile crime (theft of an item, safe breach, or unauthorized access)
 * occurs at a primary crime scene (locCrime) during a specific evening window (20:15 - 20:35).
 * The primary culprit fabricates an alibi, claiming to have been present at a different location
 * (locAlibi) during the entire incident window (20:10 - 20:30).
 * Meanwhile, innocent colleagues and staff members were either legitimately at the alibi location
 * or in transit/peripheral areas (locTransit), corroborated by physical access logs.
 *
 * Slots:
 * - culprit: Primary suspect who fabricated the alibi and committed the crime
 * - suspect1: Associate present at locAlibi (innocent)
 * - suspect2: Staff member present at locTransit (innocent)
 * - suspect3: Peripheral staff member (used in higher difficulties)
 * - locCrime: The crime scene location (e.g. Vault, Archive, Office)
 * - locAlibi: The fabricated alibi location (e.g. Lounge, Diner, Hotel)
 * - locTransit: Peripheral / transit location (e.g. Corridor, Station, Lobby)
 * - targetItem: The compromised object or document
 *
 * Contradiction Rules (Fair-Play):
 * - access.presence: Culprit's access scan at locCrime directly contradicts their claim
 *   of being at locAlibi during the same time interval.
 * - presence.two_places: Culprit's presence at locCrime contradicts claimed presence at locAlibi.
 * - presence.travel: (Difficulty 3+) Travel time between locAlibi and locCrime is strictly
 *   greater than the interval between culprit's claimed location and their physical scan.
 *
 * Decoy Construction:
 * - Decoy 1 (suspect1): Accuses suspect1 of committing the crime at locCrime. Eliminated by
 *   clue_suspect1_alibi_access (proving suspect1 was badged into locAlibi at that time).
 * - Decoy 2 (suspect2 or innocent alibi): In Diff 1, claims culprit remained at locAlibi
 *   (eliminated by culprit's crime access). In Diff 2-4, accuses suspect2 of committing the crime
 *   at locCrime (eliminated by clue_suspect2_alibi_access at locTransit).
 * - Decoy 3 (suspect3 or culprit alibi claim): Accuses suspect3 (or innocent alibi) of being at locCrime.
 *   Eliminated by physical clue_suspect3_alibi_access or culprit crime access.
 *
 * Difficulty Scaling (1 -> 4):
 * - Diff 1: 3 characters, 2 locations, 3 hypotheses. KeyEvidence size 2, 0 non-default key clues,
 *   1 red herring, no travel time required. Measured difficulty: 1 (rawScore = 8.0).
 * - Diff 2: 3 characters, 3 locations, 4 hypotheses. KeyEvidence size 3, 1 non-default key clue
 *   (after_clue unlock on culprit crime access), 2 red herrings, no travel time required.
 *   Measured difficulty: 2 (rawScore = 13.5).
 * - Diff 3: 4 characters, 3 locations with travel time. 4 hypotheses. KeyEvidence size 3,
 *   1 non-default key clue, 2 red herrings, travel time required. Measured difficulty: 3 (rawScore = 16.5).
 * - Diff 4: 4 characters, 3 locations with travel time. 4 hypotheses. KeyEvidence size 4,
 *   2 non-default key clues, 2 red herrings, travel time required. Measured difficulty: 4 (rawScore = 20.0).
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

    const culprit = slots.culprit as Character;
    const suspect1 = slots.suspect1 as Character;
    const suspect2 = slots.suspect2 as Character;
    const suspect3 = slots.suspect3 as Character;

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

    // Configure adjacency & travel time based on difficulty
    // For diff 1 & 2: empty adjacency so needsTravelTime is false
    // For diff 3 & 4: 20 min travel time between locAlibi and locCrime
    if (diff >= 3) {
      locCrime.adjacency = [
        { to: locAlibi.id, travelMinutes: 20 },
        { to: locTransit.id, travelMinutes: 10 },
      ];
      locAlibi.adjacency = [
        { to: locCrime.id, travelMinutes: 20 },
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

    // Determine secondary suspect location & door for diff 1 vs diff 2+
    const s2LocId = diff === 1 ? locAlibi.id : locTransit.id;
    const s2Door = diff === 1 ? doorAlibi : doorTransit;

    // Build mutually consistent timeline (Ground Truth)
    // Crime occurs at 1220 (20:20)
    const timeline: Fact[] = [
      // Culprit true movements at crime scene
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

      // Suspect 1 legitimate presence at alibi location
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

      // Suspect 2 legitimate presence
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
    ];

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

    // Additional background facts for red herrings (entailed, consistent, not eliminating decoys)
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

    // Primary Clues
    const baseClues: Clue[] = [
      // Culprit's declared lie: claims presence at locAlibi
      {
        id: 'clue_culprit_testimony',
        type: 'testimony',
        reliability: 'testimony',
        source: culprit.id,
        asserts: [
          {
            kind: 'at',
            who: culprit.id,
            where: locAlibi.id,
            from: 1210,
            to: 1230,
          },
        ],
        text: `${culprit.name} stated: 'I spent the entire evening from 20:10 to 20:30 at ${locAlibi.name} attending to routine matters.'`,
        unlock: { kind: 'default' },
      },

      // Suspect 1 truthful testimony
      {
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
        text: `${suspect1.name} stated: 'I was present in ${locAlibi.name} between 20:10 and 20:30. I did not see any unauthorized activity.'`,
        unlock: { kind: 'default' },
      },

      // Physical clue placing suspect 1 at locAlibi (eliminates Decoy 1)
      {
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
      },

      // Physical clue refuting culprit's lie (V14) and positively placing culprit at crime scene (V15)
      // For diff >= 3, also includes 'at' fact so needsTravelTime is triggered
      {
        id: 'clue_culprit_crime_access',
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
                clueId: 'clue_culprit_testimony',
              },
      },
    ];

    // For diff 2, 3, 4: add physical clue placing suspect 2 at locTransit (eliminates Decoy 2)
    if (diff >= 2) {
      baseClues.push({
        id: 'clue_suspect2_alibi_access',
        type: 'access_log',
        reliability: 'physical',
        asserts: [
          {
            kind: 'access',
            who: suspect2.id,
            door: doorTransit,
            at: 1216,
          },
        ],
        text: `Turnstile Log: ${suspect2.name} verified entry at ${doorTransit} at 20:16.`,
        unlock:
          diff === 4
            ? {
                kind: 'after_clue',
                clueId: 'clue_suspect1_testimony',
              }
            : { kind: 'default' },
      });
    }

    // For diff 4: add physical clue placing suspect 3 at locTransit (eliminates Decoy 3)
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

    // Red herrings count:
    // Diff 1: 1 red herring
    // Diff 2-4: 2 red herrings
    const redHerringCount = diff === 1 ? 1 : 2;
    const clues = injectRedHerrings(baseClues, timeline, redHerringCount, rng);

    // Build Hypotheses
    // Solution hypothesis: culprit committed the crime at locCrime
    const solutionHypothesis = {
      id: 'hyp_culprit_guilty',
      label: `${culprit.name} took ${targetItem.name} from ${locCrime.name}.`,
      claims: [
        {
          kind: 'action' as const,
          who: culprit.id,
          verb: 'took' as const,
          target: targetItem.id,
          at: 1220,
          where: locCrime.id,
        },
      ],
      culpritIds: [culprit.id],
    };

    // Decoy 1: suspect 1 took the item / was at locCrime
    const decoy1 = {
      id: 'hyp_suspect1_guilty',
      label: `${suspect1.name} was present at ${locCrime.name} during the incident.`,
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
    let keyEvidence: string[][];

    if (diff === 1) {
      // Decoy 2: Culprit was innocently at locAlibi
      const decoy2 = {
        id: 'hyp_culprit_innocent',
        label: `${culprit.name} was at ${locAlibi.name} and did not enter ${locCrime.name}.`,
        claims: [
          {
            kind: 'at' as const,
            who: culprit.id,
            where: locAlibi.id,
            from: 1215,
            to: 1230,
          },
        ],
        culpritIds: [suspect2.id],
      };
      hypotheses = [solutionHypothesis, decoy1, decoy2];

      // Key evidence size 2 (smallestKeyEvidenceSize = 2)
      // - clue_suspect1_alibi_access eliminates decoy1
      // - clue_culprit_crime_access eliminates decoy2
      keyEvidence = [['clue_suspect1_alibi_access', 'clue_culprit_crime_access']];
    } else if (diff === 2 || diff === 3) {
      // Decoy 2: suspect 2 was at locCrime
      const decoy2 = {
        id: 'hyp_suspect2_guilty',
        label: `${suspect2.name} was present at ${locCrime.name} during the incident.`,
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

      // Decoy 3: Culprit innocent alibi
      const decoy3 = {
        id: 'hyp_culprit_innocent',
        label: `${culprit.name} was at ${locAlibi.name} and did not enter ${locCrime.name}.`,
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

      // Key evidence size 3 (smallestKeyEvidenceSize = 3)
      // - clue_suspect1_alibi_access eliminates decoy1
      // - clue_suspect2_alibi_access eliminates decoy2
      // - clue_culprit_crime_access eliminates decoy3, refutes lie, places culprit
      keyEvidence = [
        ['clue_suspect1_alibi_access', 'clue_suspect2_alibi_access', 'clue_culprit_crime_access'],
      ];
    } else {
      // Diff 4: 4 hypotheses, keyEvidence size 4
      const decoy2 = {
        id: 'hyp_suspect2_guilty',
        label: `${suspect2.name} was present at ${locCrime.name} during the incident.`,
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
        label: `${suspect3.name} was present at ${locCrime.name} during the incident.`,
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

      // Key evidence size 4:
      // - clue_suspect1_alibi_access eliminates decoy1
      // - clue_suspect2_alibi_access eliminates decoy2
      // - clue_suspect3_alibi_access eliminates decoy3
      // - clue_culprit_crime_access refutes culprit lie, places culprit at crime scene
      keyEvidence = [
        [
          'clue_suspect1_alibi_access',
          'clue_suspect2_alibi_access',
          'clue_suspect3_alibi_access',
          'clue_culprit_crime_access',
        ],
      ];
    }

    // Explanation beats for reveal
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
        time: 1218,
        text: `${culprit.name} was captured scanning their badge at ${doorCrime} at 20:18, completely shattering their fabricated alibi.`,
        clueIds: ['clue_culprit_crime_access', 'clue_culprit_testimony'],
      },
      {
        time: 1220,
        text: `${culprit.name} took ${targetItem.name} from ${locCrime.name} at 20:20 before departing.`,
        clueIds: ['clue_culprit_crime_access'],
      },
    ];

    const caseTitles = [
      `The Broken Alibi of ${culprit.name}`,
      `The ${targetItem.name} Conspiracy`,
      `Shadows Over ${locCrime.name}`,
      `Contradiction at ${locAlibi.name}`,
    ];

    return {
      id: `case_fa_${rng.int(1000, 9999)}`,
      version: 1,
      kind: 'procedural',
      title: rng.pick(caseTitles),
      difficulty: diff,
      estimatedMinutes: 5 + diff * 2,
      mysteryType: 'false_alibi',
      setting: {
        locationIds: locations.map((l) => l.id),
        date: '2026-11-04',
        summary: `An unauthorized incident occurred at ${locCrime.name} under cover of evening routines.`,
      },
      briefing: `${targetItem.name} was compromised at ${locCrime.name}. Suspect ${culprit.name} claims to have been at ${locAlibi.name} throughout the entire evening. Unravel the contradictions to identify the perpetrator.`,
      characters,
      locations,
      objects: [targetItem],
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
        solutionHypothesisId: 'hyp_culprit_guilty',
        keyEvidence,
        explanation,
      },
      meta: {
        status: 'validated',
        author: 'Procedural Case Engine',
        templateId: 'tpl_false_alibi_v1',
      },
    };
  },
};
