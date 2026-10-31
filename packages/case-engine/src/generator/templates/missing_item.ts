/**
 * Template: Missing Item (tpl_missing_item_v1)
 *
 * Story Shape:
 * A valuable archive record or precision artifact (targetItem) is stolen from a secured
 * vault or collection repository (locVault) during an evening window.
 * The primary culprit (or a covering associate) gives false statements regarding custody,
 * presence, or security seal status.
 *
 * Mechanism Variants (Decisive Contradiction Rules):
 * 0. possess.exclusive: Culprit/associate claims suspect2 held targetItem at 20:12, refuted by official custody register.
 * 1. access.presence: Culprit claims they remained in curator's office [20:10, 20:30), refuted by electronic badge scan at vault door.
 * 2. state.value: Liar claims the vault security seal on targetItem was intact at 20:18, refuted by digital tamper monitor recording it broken.
 *
 * Roles & Diversity:
 * - Culprit role selected from a rich pool (Archive Clerk, Vault Curator, Visiting Researcher, Security Officer, Chief Conservator).
 * - Liar selection: In ~25% of cases, an associate/researcher provides false testimony covering for the culprit (V14/V15 pass).
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
import { formatNameList, generateMissingItemTitle } from './helpers.js';

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

    // Mechanism variant:
    // 0: possess.exclusive
    // 1: access.presence
    // 2: state.value
    const variantRaw = rng.int(0, 2);
    const variant: 0 | 1 | 2 = variantRaw === 0 ? 1 : variantRaw === 1 ? 0 : 2;

    const culprit = { ...(slots.culprit as Character) };
    const custodian = { ...(slots.custodian as Character) };
    const suspect2 = { ...(slots.suspect2 as Character) };
    const suspect3 = { ...(slots.suspect3 as Character) };

    // Dynamically assign varied roles
    const possibleRoles = [
      'Archive Clerk',
      'Vault Curator',
      'Visiting Researcher',
      'Security Officer',
      'Chief Conservator',
    ];
    const shuffledRoles = rng.shuffle(possibleRoles);
    culprit.role = shuffledRoles[0]!;
    custodian.role = shuffledRoles[1]!;
    suspect2.role = shuffledRoles[2]!;
    suspect3.role = shuffledRoles[3]!;

    // Liar: ~25% of cases witness covers for culprit
    const witnessCovers = rng.next() < 0.25;
    const liar = witnessCovers ? suspect2 : culprit;

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

    // Configure adjacency & travel time
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

    if (variant === 2) {
      // Tamper status record in timeline
      timeline.push({
        kind: 'state',
        what: targetItem.id,
        property: 'seal',
        at: 1218,
        value: 'broken',
      });
    }

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
    const baseClues: Clue[] = [];

    // Liar statement clue
    const liarClueId = 'clue_missing_item_testimony';
    if (variant === 0) {
      // possess.exclusive variant
      if (witnessCovers) {
        baseClues.push({
          id: liarClueId,
          type: 'testimony',
          reliability: 'testimony',
          source: liar.id,
          asserts: [
            {
              kind: 'possess',
              who: suspect2.id,
              what: targetItem.id,
              from: 1212,
              to: 1225,
            },
          ],
          text: `${liar.name} stated: 'I had ${targetItem.name} in my personal work tray between 20:12 and 20:25 before returning it.'`,
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
              kind: 'possess',
              who: suspect2.id,
              what: targetItem.id,
              from: 1212,
              to: 1225,
            },
          ],
          text: `${liar.name} stated: 'I saw ${suspect2.name} holding ${targetItem.name} in their custody between 20:12 and 20:25.'`,
          unlock: { kind: 'default' },
        });
      }
    } else if (variant === 1) {
      // access.presence variant
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
              where: locOffice.id,
              from: 1210,
              to: 1230,
            },
          ],
          text: `${liar.name} stated: 'I was reviewing manuscripts with ${culprit.name} in ${locOffice.name} from 20:10 to 20:30 without pause.'`,
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
              where: locOffice.id,
              from: 1210,
              to: 1230,
            },
          ],
          text: `${liar.name} stated: 'I remained in ${locOffice.name} from 20:10 to 20:30 attending to administrative filings.'`,
          unlock: { kind: 'default' },
        });
      }
    } else {
      // state.value variant
      baseClues.push({
        id: liarClueId,
        type: 'testimony',
        reliability: 'testimony',
        source: liar.id,
        asserts: [
          {
            kind: 'state',
            what: targetItem.id,
            property: 'seal',
            at: 1218,
            value: 'intact',
          },
        ],
        text: `${liar.name} stated: 'I personally inspected the display mounting of ${targetItem.name} at 20:18; the security seal was completely intact.'`,
        unlock: { kind: 'default' },
      });
    }

    // Custodian legitimate possession clue (always present for ground truth)
    baseClues.push({
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
    });

    // Custodian alibi access in office (eliminates Decoy 1)
    baseClues.push({
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
    });

    // Physical clue placing culprit at vault (V15 positive evidence)
    baseClues.push({
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
      text: `Vault Terminal: ${culprit.name} scanned access badge at ${doorVault} at 20:18.`,
      unlock:
        diff === 1
          ? { kind: 'default' }
          : {
              kind: 'after_clue',
              clueId: liarClueId,
            },
    });

    // State monitor clue for variant 2
    if (variant === 2) {
      baseClues.push({
        id: 'clue_seal_sensor',
        type: 'document',
        reliability: 'physical',
        asserts: [
          {
            kind: 'state',
            what: targetItem.id,
            property: 'seal',
            at: 1218,
            value: 'broken',
          },
        ],
        text: `Sensor Diagnostic: Automated mount recorded the security seal on ${targetItem.name} was broken at 20:18.`,
        unlock: { kind: 'default' },
      });
    }

    // Suspect 2 alibi clue
    if (diff >= 2) {
      baseClues.push({
        id: 'clue_suspect2_transit_access',
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
                clueId: 'clue_custodian_office_access',
              }
            : { kind: 'default' },
      });
    }

    // Suspect 3 alibi clue
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
        text: `Turnstile Log: ${suspect3.name} verified entry at ${doorTransit} at 20:17.`,
        unlock: { kind: 'default' },
      });
    }

    // Red herrings
    const redHerringCount = diff === 1 ? 1 : 2;
    const clues = injectRedHerrings(baseClues, timeline, redHerringCount, rng);

    // Build Hypotheses
    const solutionHypothesis = {
      id: 'hyp_culprit_guilty',
      label: `${culprit.name} entered ${locVault.name} and took ${targetItem.name}.`,
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

    const decoy1 = {
      id: 'hyp_custodian_guilty',
      label: `${custodian.name} entered ${locVault.name} and took ${targetItem.name}.`,
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
    let keyEvidence: string[][] = [];

    // The decisive clue refuting the lie
    const decisiveClueId =
      variant === 0
        ? 'clue_custody_log'
        : variant === 1
          ? 'clue_culprit_vault_access'
          : 'clue_seal_sensor';

    if (diff === 1) {
      const decoy2 = {
        id: 'hyp_culprit_innocent',
        label: `${culprit.name} remained in ${locOffice.name} and never approached ${locVault.name}.`,
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
      hypotheses = [solutionHypothesis, decoy1, decoy2];
      keyEvidence = [
        ['clue_custodian_office_access', 'clue_culprit_vault_access'],
      ];
    } else if (diff === 2 || diff === 3) {
      const decoy2 = {
        id: 'hyp_suspect2_guilty',
        label: `${suspect2.name} entered ${locVault.name} and took ${targetItem.name}.`,
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
        id: 'hyp_culprit_innocent',
        label: `${culprit.name} remained in ${locOffice.name} and never approached ${locVault.name}.`,
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
      keyEvidence = [
        [
          'clue_custodian_office_access',
          'clue_suspect2_transit_access',
          'clue_culprit_vault_access',
        ],
      ];
    } else {
      // Diff 4
      const decoy2 = {
        id: 'hyp_suspect2_guilty',
        label: `${suspect2.name} entered ${locVault.name} and took ${targetItem.name}.`,
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
        id: 'hyp_suspect3_guilty',
        label: `${suspect3.name} entered ${locVault.name} and took ${targetItem.name}.`,
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
      keyEvidence = [
        [
          'clue_custodian_office_access',
          'clue_suspect2_transit_access',
          'clue_suspect3_transit_access',
          'clue_culprit_vault_access',
        ],
      ];
    }

    hypotheses = rng.shuffle(hypotheses);

    // Explanation beats
    const explanation = [
      {
        time: 1216,
        text:
          variant === 0
            ? `Official custody records proved ${custodian.name} held exclusive custody of ${targetItem.name} until 20:20, disproving false claims of possession.`
            : variant === 1
              ? `Access records at ${doorVault} proved ${culprit.name} entered the vault at 20:18, shattering claims of staying in ${locOffice.name}.`
              : `Digital sensor diagnostics showed the security seal on ${targetItem.name} was broken at 20:18, contradicting testimony that it remained intact.`,
        clueIds: [decisiveClueId, liarClueId],
      },
      {
        time: 1218,
        text: `Terminal badge logs confirmed ${culprit.name} accessed ${doorVault} at 20:18, putting them inside the vault during the theft.`,
        clueIds: ['clue_culprit_vault_access'],
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
        time: 1220,
        text: `${culprit.name} took ${targetItem.name} from ${locVault.name} before departing.`,
        clueIds: ['clue_culprit_vault_access'],
      },
    ];

    const title = generateMissingItemTitle(rng, targetItem, locVault, locOffice, locTransit);

    const suspects = diff >= 3 ? [culprit, custodian, suspect2, suspect3] : [culprit, custodian, suspect2];
    const shuffledSuspects = rng.shuffle(suspects);
    const suspectNames = formatNameList(shuffledSuspects.map((s) => s.name));
    const countWord = suspects.length === 4 ? 'four' : 'three';

    const briefingOptions = [
      `At 20:20, ${targetItem.name} went missing from ${locVault.name}. A custodial discrepancy involves ${countWord} individuals: ${suspectNames}. Examine access and custody records to expose the culprit.`,
      `The disappearance of ${targetItem.name} from ${locVault.name} triggered an audit. Conflicting accounts from ${suspectNames} contradict physical registers. Trace the evidence to recover the truth.`,
      `An inventory audit revealed the theft of ${targetItem.name} from ${locVault.name}. Statements from ${suspectNames} contain critical inconsistencies with electronic monitoring. Determine who took the item.`,
    ];
    const briefing = rng.pick(briefingOptions);

    return {
      id: `case_gen_${rng.int(100000, 999999)}`,
      version: 1,
      kind: 'procedural',
      title,
      difficulty: diff,
      estimatedMinutes: diff * 4 + 2,
      mysteryType: 'missing_item',
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
        templateId: 'tpl_missing_item_v1',
        status: 'validated',
      },
    };
  },
};
