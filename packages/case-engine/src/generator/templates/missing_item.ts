/**
 * Template: Missing Item (tpl_missing_item_v1)
 *
 * Story Shape:
 * A valuable archive record or precision artifact (targetItem) is stolen from a secured
 * vault or collection repository (locVault) during an evening custodial handover window (20:15 - 20:25).
 * The primary culprit (culprit) claims they were working in the curator's office (locOffice)
 * and never approached the vault, falsely claiming an associate (suspect2) had already taken the item.
 * However, official custody registers prove the legitimate curator (custodian) retained uninterrupted
 * custody until 20:20, and electronic access logs place the culprit badging into the vault at 20:18.
 *
 * Slots:
 * - culprit: Primary suspect who stole the item from the vault
 * - custodian: Legitimate keeper / curator who held registered custody
 * - suspect2: Visiting researcher / associate present during the evening
 * - suspect3: Secondary staff member / guard (used in higher difficulties)
 * - locVault: The vault or archive room where the item was stored
 * - locOffice: The curator office / study area
 * - locTransit: Peripheral corridor / loading dock
 * - targetItem: The stolen object or document
 *
 * Contradiction Rules (Fair-Play):
 * - possess.exclusive: Culprit's testimony claiming suspect2 had possession between 20:12 and 20:25
 *   is directly contradicted by the official custody log proving custodian retained exclusive
 *   possession until 20:20.
 * - access.presence: Culprit's security scan at doorVault at 20:18 contradicts their claim
 *   of being at locOffice throughout [20:10, 20:30).
 * - presence.travel: (Difficulty 3+) Inter-location transit time prevents rapid unrecorded travel.
 *
 * Decoy Construction:
 * - Decoy 1 (custodian): Accuses custodian of taking the item after hours. Eliminated by
 *   clue_custodian_office_access (proving custodian was in the office at 20:26).
 * - Decoy 2 (suspect2 or innocent office claim): In Diff 1, claims culprit remained innocently in
 *   locOffice (eliminated by culprit's vault access). In Diff 2-4, accuses suspect2 of taking the item
 *   from locVault (eliminated by suspect2's transit access log).
 * - Decoy 3 (suspect3 or innocent claim): In Diff 2-3, claims culprit remained in locOffice.
 *   In Diff 4, accuses suspect3 of taking the item from locVault (eliminated by suspect3's transit log).
 *
 * Difficulty Scaling (1 -> 4):
 * - Diff 1: 3 characters, 2 locations, 3 hypotheses. KeyEvidence size 2, 0 non-default key clues,
 *   1 red herring, no travel time required. Measured difficulty: 1 (rawScore = 8.0).
 * - Diff 2: 3 characters, 3 locations, 4 hypotheses. KeyEvidence size 3, 1 non-default key clue
 *   (after_clue unlock on culprit vault access), 2 red herrings, no travel time required.
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

export const tpl_missing_item: CaseTemplate = {
  id: 'tpl_missing_item_v1',
  mysteryType: 'missing_item',
  difficultyRange: [1, 4],
  slots: [
    { name: 'culprit', type: 'character', role: 'Archive Clerk' },
    { name: 'custodian', type: 'character', role: 'Vault Curator' },
    { name: 'suspect2', type: 'character', role: 'Visiting Researcher' },
    { name: 'suspect3', type: 'character', role: 'Security Guard' },
    { name: 'locVault', type: 'location' },
    { name: 'locOffice', type: 'location' },
    { name: 'locTransit', type: 'location' },
    { name: 'targetItem', type: 'object' },
  ],

  build(rng: Rng, slots: FilledSlots, params: TemplateParams): CaseDefinition {
    const rawDiff = params.difficulty ?? 1;
    const diff = Math.min(4, Math.max(1, rawDiff)) as 1 | 2 | 3 | 4;

    const culprit = slots.culprit as Character;
    const custodian = slots.custodian as Character;
    const suspect2 = slots.suspect2 as Character;
    const suspect3 = slots.suspect3 as Character;

    const locVault = { ...(slots.locVault as Location) };
    const locOffice = { ...(slots.locOffice as Location) };
    const locTransit = { ...(slots.locTransit as Location) };
    const targetItem = { ...(slots.targetItem as GameObject), ownerId: custodian.id };

    // Ensure valid door IDs exist
    const doorVault = locVault.doorIds[0] ?? `door_${locVault.id}_main`;
    const doorOffice = locOffice.doorIds[0] ?? `door_${locOffice.id}_main`;
    const doorTransit = locTransit.doorIds[0] ?? `door_${locTransit.id}_main`;

    locVault.doorIds = [doorVault];
    locOffice.doorIds = [doorOffice];
    locTransit.doorIds = [doorTransit];

    // Configure adjacency & travel time based on difficulty
    // For diff 1 & 2: empty adjacency so needsTravelTime is false
    // For diff 3 & 4: 20 min travel time between locVault and locOffice
    if (diff >= 3) {
      locVault.adjacency = [
        { to: locOffice.id, travelMinutes: 20 },
        { to: locTransit.id, travelMinutes: 10 },
      ];
      locOffice.adjacency = [
        { to: locVault.id, travelMinutes: 20 },
        { to: locTransit.id, travelMinutes: 15 },
      ];
      locTransit.adjacency = [
        { to: locVault.id, travelMinutes: 10 },
        { to: locOffice.id, travelMinutes: 15 },
      ];
    } else {
      locVault.adjacency = [];
      locOffice.adjacency = [];
      locTransit.adjacency = [];
    }

    const characters: Character[] =
      diff >= 3 ? [culprit, custodian, suspect2, suspect3] : [culprit, custodian, suspect2];

    const locations: Location[] =
      diff === 1 ? [locVault, locOffice] : [locVault, locOffice, locTransit];

    const s2LocId = diff === 1 ? locOffice.id : locTransit.id;
    const s2Door = diff === 1 ? doorOffice : doorTransit;

    // Build mutually consistent timeline (Ground Truth)
    // Custody: custodian owns until 1220. Culprit takes at 1220.
    const timeline: Fact[] = [
      // Custodian legitimate possession until 1220
      {
        kind: 'possess',
        who: custodian.id,
        what: targetItem.id,
        from: 1200,
        to: 1220,
      },
      {
        kind: 'at',
        who: custodian.id,
        where: locOffice.id,
        from: 1220,
        to: 1240,
      },
      {
        kind: 'access',
        who: custodian.id,
        door: doorOffice,
        at: 1226,
      },

      // Culprit true theft movements at vault
      {
        kind: 'at',
        who: culprit.id,
        where: locVault.id,
        from: 1215,
        to: 1235,
      },
      {
        kind: 'access',
        who: culprit.id,
        door: doorVault,
        at: 1218,
      },
      {
        kind: 'action',
        who: culprit.id,
        verb: 'took',
        target: targetItem.id,
        at: 1220,
        where: locVault.id,
      },
      {
        kind: 'possess',
        who: culprit.id,
        what: targetItem.id,
        from: 1220,
        to: 1240,
      },

      // Suspect 2 legitimate movements
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

    // Additional background facts for red herrings
    timeline.push(
      {
        kind: 'access',
        who: custodian.id,
        door: doorOffice,
        at: 1202,
      },
      {
        kind: 'access',
        who: suspect2.id,
        door: s2Door,
        at: 1205,
      },
      {
        kind: 'access',
        who: custodian.id,
        door: doorOffice,
        at: 1238,
      },
      {
        kind: 'access',
        who: suspect2.id,
        door: s2Door,
        at: 1228,
      },
    );

    // Primary Clues
    const baseClues: Clue[] = [
      // Physical clue: Official custody log (asserts custodian possession until 1220)
      // Directly refutes culprit's lie via possess.exclusive!
      {
        id: 'clue_custody_log',
        type: 'document',
        reliability: 'physical',
        asserts: [
          {
            kind: 'possess',
            who: custodian.id,
            what: targetItem.id,
            from: 1200,
            to: 1220,
          },
        ],
        text: `Official Register: ${custodian.name} verified registered custody of ${targetItem.name} in ${locVault.name} until 20:20.`,
        unlock: { kind: 'default' },
      },

      // Culprit's declared lie:
      // 1. Claims they remained in locOffice
      // 2. Falsely claims suspect2 had the item from 1212 to 1225
      {
        id: 'clue_culprit_testimony',
        type: 'testimony',
        reliability: 'testimony',
        source: culprit.id,
        asserts: [
          {
            kind: 'at',
            who: culprit.id,
            where: locOffice.id,
            from: 1210,
            to: 1230,
          },
          {
            kind: 'possess',
            who: suspect2.id,
            what: targetItem.id,
            from: 1212,
            to: 1225,
          },
        ],
        text: `${culprit.name} stated: 'I remained in ${locOffice.name} from 20:10 to 20:30. In fact, ${suspect2.name} was already holding ${targetItem.name} earlier around 20:12.'`,
        unlock: { kind: 'default' },
      },

      // Physical clue placing custodian in locOffice (eliminates Decoy 1)
      {
        id: 'clue_custodian_office_access',
        type: 'access_log',
        reliability: 'physical',
        asserts: [
          {
            kind: 'access',
            who: custodian.id,
            door: doorOffice,
            at: 1226,
          },
        ],
        text: `Office Reader: ${custodian.name} badged through ${doorOffice} at 20:26.`,
        unlock: { kind: 'default' },
      },

      // Physical clue refuting culprit's lie (V14) and positively placing culprit at vault (V15)
      // For diff >= 3, also includes 'at' fact so needsTravelTime is triggered
      {
        id: 'clue_culprit_vault_access',
        type: 'access_log',
        reliability: 'physical',
        asserts:
          diff >= 3
            ? [
                {
                  kind: 'access',
                  who: culprit.id,
                  door: doorVault,
                  at: 1218,
                },
                {
                  kind: 'at',
                  who: culprit.id,
                  where: locVault.id,
                  from: 1215,
                  to: 1235,
                },
              ]
            : [
                {
                  kind: 'access',
                  who: culprit.id,
                  door: doorVault,
                  at: 1218,
                },
              ],
        text: `Vault Security Gate: ${culprit.name} scanned access badge at ${doorVault} at 20:18.`,
        unlock:
          diff === 1
            ? { kind: 'default' }
            : {
                kind: 'after_clue',
                clueId: 'clue_culprit_testimony',
              },
      },
    ];

    // For diff 2, 3, 4: add physical clue placing suspect 2 at transit/location (eliminates Decoy 2)
    if (diff >= 2) {
      baseClues.push({
        id: 'clue_suspect2_transit_access',
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
        text: `Corridor Turnstile: ${suspect2.name} scanned access at ${doorTransit} at 20:16.`,
        unlock:
          diff === 4
            ? {
                kind: 'after_clue',
                clueId: 'clue_custody_log',
              }
            : { kind: 'default' },
      });
    }

    // For diff 4: add physical clue placing suspect 3 at transit (eliminates Decoy 3)
    if (diff === 4) {
      baseClues.push({
        id: 'clue_suspect3_transit_access',
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
        text: `Security Turnstile: ${suspect3.name} logged entry at ${doorTransit} at 20:17.`,
        unlock: { kind: 'default' },
      });
    }

    const redHerringCount = diff === 1 ? 1 : 2;
    const clues = injectRedHerrings(baseClues, timeline, redHerringCount, rng);

    // Build Hypotheses
    // Solution hypothesis: culprit stole targetItem from locVault
    const solutionHypothesis = {
      id: 'hyp_culprit_stole',
      label: `${culprit.name} took ${targetItem.name} from ${locVault.name}.`,
      claims: [
        {
          kind: 'action' as const,
          who: culprit.id,
          verb: 'took' as const,
          target: targetItem.id,
          at: 1220,
          where: locVault.id,
        },
      ],
      culpritIds: [culprit.id],
    };

    // Decoy 1: custodian took the item after hours
    const decoy1 = {
      id: 'hyp_custodian_took',
      label: `${custodian.name} took ${targetItem.name} from ${locVault.name} after hours.`,
      claims: [
        {
          kind: 'at' as const,
          who: custodian.id,
          where: locVault.id,
          from: 1222,
          to: 1230,
        },
      ],
      culpritIds: [custodian.id],
    };

    let hypotheses = [solutionHypothesis, decoy1];
    let keyEvidence: string[][];

    if (diff === 1) {
      // Decoy 2: Culprit remained in office
      const decoy2 = {
        id: 'hyp_culprit_innocent',
        label: `${culprit.name} remained in ${locOffice.name} and never entered ${locVault.name}.`,
        claims: [
          {
            kind: 'at' as const,
            who: culprit.id,
            where: locOffice.id,
            from: 1215,
            to: 1230,
          },
        ],
        culpritIds: [suspect2.id],
      };
      hypotheses = [solutionHypothesis, decoy1, decoy2];

      // Key evidence size 2 (smallestKeyEvidenceSize = 2)
      // - clue_custodian_office_access eliminates decoy1
      // - clue_culprit_vault_access eliminates decoy2
      keyEvidence = [['clue_custodian_office_access', 'clue_culprit_vault_access']];
    } else if (diff === 2 || diff === 3) {
      // Decoy 2: suspect 2 took the item from locVault
      const decoy2 = {
        id: 'hyp_suspect2_took',
        label: `${suspect2.name} took ${targetItem.name} from ${locVault.name}.`,
        claims: [
          {
            kind: 'at' as const,
            who: suspect2.id,
            where: locVault.id,
            from: 1212,
            to: 1225,
          },
        ],
        culpritIds: [suspect2.id],
      };

      // Decoy 3: Culprit innocent alibi in office
      const decoy3 = {
        id: 'hyp_culprit_innocent',
        label: `${culprit.name} remained in ${locOffice.name} and never entered ${locVault.name}.`,
        claims: [
          {
            kind: 'at' as const,
            who: culprit.id,
            where: locOffice.id,
            from: 1215,
            to: 1230,
          },
        ],
        culpritIds: [custodian.id],
      };
      hypotheses = [solutionHypothesis, decoy1, decoy2, decoy3];

      // Key evidence size 3
      // - clue_custodian_office_access eliminates decoy1
      // - clue_suspect2_transit_access eliminates decoy2
      // - clue_culprit_vault_access eliminates decoy3, refutes lie, places culprit
      keyEvidence = [
        ['clue_custodian_office_access', 'clue_suspect2_transit_access', 'clue_culprit_vault_access'],
      ];
    } else {
      // Diff 4: 4 hypotheses, keyEvidence size 4
      const decoy2 = {
        id: 'hyp_suspect2_took',
        label: `${suspect2.name} took ${targetItem.name} from ${locVault.name}.`,
        claims: [
          {
            kind: 'at' as const,
            who: suspect2.id,
            where: locVault.id,
            from: 1212,
            to: 1225,
          },
        ],
        culpritIds: [suspect2.id],
      };

      const decoy3 = {
        id: 'hyp_suspect3_took',
        label: `${suspect3.name} took ${targetItem.name} from ${locVault.name}.`,
        claims: [
          {
            kind: 'at' as const,
            who: suspect3.id,
            where: locVault.id,
            from: 1212,
            to: 1225,
          },
        ],
        culpritIds: [suspect3.id],
      };
      hypotheses = [solutionHypothesis, decoy1, decoy2, decoy3];

      // Key evidence size 4:
      // - clue_custodian_office_access eliminates decoy1
      // - clue_suspect2_transit_access eliminates decoy2
      // - clue_suspect3_transit_access eliminates decoy3
      // - clue_culprit_vault_access places culprit at vault, refutes alibi
      keyEvidence = [
        [
          'clue_custodian_office_access',
          'clue_suspect2_transit_access',
          'clue_suspect3_transit_access',
          'clue_culprit_vault_access',
        ],
      ];
    }

    // Explanation beats for reveal
    const explanation = [
      {
        time: 1216,
        text: `Official custody records proved ${custodian.name} held registered custody of ${targetItem.name} until 20:20, disproving claims of earlier possession by others.`,
        clueIds: ['clue_custody_log', 'clue_culprit_testimony'],
      },
      ...(diff >= 2
        ? [
            {
              time: 1216,
              text: `${suspect2.name} badged into ${s2Door} at 20:16, ruling out their presence at ${locVault.name}.`,
              clueIds: ['clue_suspect2_transit_access'],
            },
          ]
        : []),
      ...(diff === 4
        ? [
            {
              time: 1217,
              text: `${suspect3.name} badged into ${doorTransit} at 20:17, ruling out their presence at ${locVault.name}.`,
              clueIds: ['clue_suspect3_transit_access'],
            },
          ]
        : []),
      {
        time: 1218,
        text: `${culprit.name} was recorded badging into ${doorVault} at 20:18, shattering their office alibi and placing them inside ${locVault.name}.`,
        clueIds: ['clue_culprit_vault_access', 'clue_culprit_testimony'],
      },
      {
        time: 1220,
        text: `${culprit.name} took ${targetItem.name} directly from ${locVault.name} at 20:20.`,
        clueIds: ['clue_culprit_vault_access'],
      },
    ];

    const caseTitles = [
      `The Missing ${targetItem.name}`,
      `The Vault Breach at ${locVault.name}`,
      `Disappearance of the ${targetItem.name}`,
      `The Handover at ${locOffice.name}`,
    ];

    return {
      id: `case_mi_${rng.int(1000, 9999)}`,
      version: 1,
      kind: 'procedural',
      title: rng.pick(caseTitles),
      difficulty: diff,
      estimatedMinutes: 5 + diff * 2,
      mysteryType: 'missing_item',
      setting: {
        locationIds: locations.map((l) => l.id),
        date: '2026-11-05',
        summary: `A high-value object went missing from ${locVault.name} during evening shifts.`,
      },
      briefing: `${targetItem.name} disappeared from ${locVault.name}. Staff member ${culprit.name} claims to have been working in ${locOffice.name} and denies entering the vault. Correlate custody logs and entry records to expose the thief.`,
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
        solutionHypothesisId: 'hyp_culprit_stole',
        keyEvidence,
        explanation,
      },
      meta: {
        status: 'validated',
        author: 'Procedural Case Engine',
        templateId: 'tpl_missing_item_v1',
      },
    };
  },
};
