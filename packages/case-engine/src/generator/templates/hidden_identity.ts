/**
 * Template: Hidden Identity (tpl_hidden_identity_v1)
 *
 * Story Shape:
 * An operative or impostor infiltrates Vesper City under an assumed identity.
 * During an evening window, a critical cipher ledger or confidential manifest is stolen.
 * The impostor claims an alibi under their assumed persona, but physical access, surveillance,
 * or exclusive possession records reveal their true presence at the crime scene.
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
import { formatNameList } from './helpers.js';

export const tpl_hidden_identity: CaseTemplate = {
  id: 'tpl_hidden_identity_v1',
  mysteryType: 'hidden_identity',
  difficultyRange: [1, 4],
  slots: [
    { name: 'culprit', type: 'character', role: 'Undercover Operative' },
    { name: 'victim', type: 'character', role: 'Diplomatic Attache' },
    { name: 'suspect2', type: 'character', role: 'Platform Technician' },
    { name: 'suspect3', type: 'character', role: 'Station Supervisor' },
    { name: 'locStation', type: 'location' },
    { name: 'locHotel', type: 'location' },
    { name: 'locTransit', type: 'location' },
    { name: 'targetItem', type: 'object' },
  ],

  build(rng: Rng, slots: FilledSlots, params: TemplateParams): CaseDefinition {
    const rawDiff = params.difficulty ?? 1;
    const diff = Math.min(4, Math.max(1, rawDiff)) as 1 | 2 | 3 | 4;

    const variant = rng.int(0, 2) as 0 | 1 | 2;

    const culprit = { ...(slots.culprit as Character) };
    const victim = { ...(slots.victim as Character) };
    const suspect2 = { ...(slots.suspect2 as Character) };
    const suspect3 = { ...(slots.suspect3 as Character) };

    const possibleRoles = [
      'Undercover Operative',
      'Foreign Attache',
      'Visiting Archivist',
      'Special Envoy',
      'Commercial Agent',
    ];
    const shuffledRoles = rng.shuffle(possibleRoles);
    culprit.role = shuffledRoles[0]!;
    victim.role = shuffledRoles[1]!;
    suspect2.role = shuffledRoles[2]!;
    suspect3.role = shuffledRoles[3]!;

    const locStation = { ...(slots.locStation as Location) };
    const locHotel = { ...(slots.locHotel as Location) };
    const locTransit = { ...(slots.locTransit as Location) };
    const targetItem = { ...(slots.targetItem as GameObject), ownerId: victim.id };

    const doorStation = locStation.doorIds[0] ?? `door_${locStation.id}_main`;
    const doorHotel = locHotel.doorIds[0] ?? `door_${locHotel.id}_main`;
    const doorTransit = locTransit.doorIds[0] ?? `door_${locTransit.id}_main`;

    locStation.doorIds = [doorStation];
    locHotel.doorIds = [doorHotel];
    locTransit.doorIds = [doorTransit];

    if (diff >= 3) {
      locStation.adjacency = [
        { to: locHotel.id, travelMinutes: 20 },
        { to: locTransit.id, travelMinutes: 10 },
      ];
      locHotel.adjacency = [
        { to: locStation.id, travelMinutes: 20 },
        { to: locTransit.id, travelMinutes: 15 },
      ];
      locTransit.adjacency = [
        { to: locStation.id, travelMinutes: 10 },
        { to: locHotel.id, travelMinutes: 15 },
      ];
    } else {
      locStation.adjacency = [];
      locHotel.adjacency = [];
      locTransit.adjacency = [];
    }

    const characters: Character[] =
      diff >= 3 ? [culprit, victim, suspect2, suspect3] : [culprit, victim, suspect2];

    const locations: Location[] =
      diff === 1 ? [locStation, locHotel] : [locStation, locHotel, locTransit];

    const s2LocId = diff === 1 ? locHotel.id : locTransit.id;
    const s2Door = diff === 1 ? doorHotel : doorTransit;

    // Timeline
    const timeline: Fact[] = [
      {
        kind: 'at',
        who: culprit.id,
        where: locStation.id,
        from: 1215,
        to: 1235,
      },
      {
        kind: 'access',
        who: culprit.id,
        door: doorStation,
        at: 1218,
      },
      {
        kind: 'action',
        who: culprit.id,
        verb: 'took',
        target: targetItem.id,
        at: 1220,
        where: locStation.id,
      },
      {
        kind: 'at',
        who: victim.id,
        where: locHotel.id,
        from: 1210,
        to: 1230,
      },
      {
        kind: 'access',
        who: victim.id,
        door: doorHotel,
        at: 1215,
      },
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

    timeline.push(
      { kind: 'access', who: victim.id, door: doorHotel, at: 1205 },
      { kind: 'access', who: suspect2.id, door: s2Door, at: 1206 },
      { kind: 'access', who: victim.id, door: doorHotel, at: 1228 },
      { kind: 'access', who: suspect2.id, door: s2Door, at: 1229 },
    );

    const liarClueId = 'clue_impostor_testimony';
    const baseClues: Clue[] = [
      {
        id: liarClueId,
        type: 'testimony',
        reliability: 'testimony',
        source: culprit.id,
        asserts: [
          {
            kind: 'at',
            who: culprit.id,
            where: locHotel.id,
            from: 1210,
            to: 1230,
          },
        ],
        text: `${culprit.name} stated: 'I remained in my suite at ${locHotel.name} from 20:10 to 20:30 under official diplomatic lodging.'`,
        unlock: { kind: 'default' },
      },
      {
        id: 'clue_victim_alibi_access',
        type: 'access_log',
        reliability: 'physical',
        asserts: [
          {
            kind: 'access',
            who: victim.id,
            door: doorHotel,
            at: 1215,
          },
        ],
        text: `Hotel Terminal: ${victim.name} checked through ${doorHotel} at 20:15.`,
        unlock: { kind: 'default' },
      },
    ];

    const decisiveClueId = 'clue_decisive_identity_refutation';
    if (variant === 0) {
      // access.presence
      baseClues.push({
        id: decisiveClueId,
        type: 'access_log',
        reliability: 'physical',
        asserts: [
          {
            kind: 'access',
            who: culprit.id,
            door: doorStation,
            at: 1218,
          },
        ],
        text: `Station Gate Scanner: ${culprit.name} scanned access credentials at ${doorStation} at 20:18.`,
        unlock:
          diff === 1
            ? { kind: 'default' }
            : { kind: 'after_clue', clueId: liarClueId },
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
            where: locStation.id,
            from: 1215,
            to: 1235,
          },
        ],
        text: `Concourse Camera: Optical feed captured ${culprit.name} inside ${locStation.name} between 20:15 and 20:35.`,
        unlock:
          diff === 1
            ? { kind: 'default' }
            : { kind: 'after_clue', clueId: liarClueId },
      });
    } else {
      // presence.travel
      locStation.adjacency = [
        { to: locHotel.id, travelMinutes: 25 },
        { to: locTransit.id, travelMinutes: 10 },
      ];
      locHotel.adjacency = [
        { to: locStation.id, travelMinutes: 25 },
        { to: locTransit.id, travelMinutes: 15 },
      ];
      baseClues.push({
        id: decisiveClueId,
        type: 'access_log',
        reliability: 'physical',
        asserts: [
          {
            kind: 'access',
            who: culprit.id,
            door: doorStation,
            at: 1233,
          },
        ],
        text: `Transit Gate: ${culprit.name} badged through ${doorStation} at 20:33, just three minutes after claimed lodging at ${locHotel.name}.`,
        unlock:
          diff === 1
            ? { kind: 'default' }
            : { kind: 'after_clue', clueId: liarClueId },
      });
    }

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
            ? { kind: 'after_clue', clueId: 'clue_victim_alibi_access' }
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

    const redHerringCount = diff === 1 ? 1 : 2;
    const clues = injectRedHerrings(baseClues, timeline, redHerringCount, rng);

    const solutionHypothesis = {
      id: 'hyp_culprit_guilty',
      label: `${culprit.name} infiltrated ${locStation.name} and intercepted ${targetItem.name}.`,
      claims: [
        {
          kind: 'action' as const,
          who: culprit.id,
          verb: 'took' as const,
          target: targetItem.id,
          at: 1220,
          where: locStation.id,
        },
      ],
      culpritIds: [culprit.id],
    };

    const decoy1 = {
      id: 'hyp_victim_guilty',
      label: `${victim.name} entered ${locStation.name} and intercepted ${targetItem.name}.`,
      claims: [
        {
          kind: 'at' as const,
          who: victim.id,
          where: locStation.id,
          from: 1212,
          to: 1225,
        },
      ],
      culpritIds: [victim.id],
    };

    let hypotheses = [solutionHypothesis, decoy1];
    let keyEvidence: string[][] = [];

    if (diff === 1) {
      const decoy2 = {
        id: 'hyp_culprit_innocent',
        label: `${culprit.name} remained in ${locHotel.name} and did not enter ${locStation.name}.`,
        claims: [
          {
            kind: 'at' as const,
            who: culprit.id,
            where: locHotel.id,
            from: 1215,
            to: 1230,
          },
        ],
        culpritIds: [victim.id],
      };
      hypotheses = [solutionHypothesis, decoy1, decoy2];
      keyEvidence = [['clue_victim_alibi_access', decisiveClueId]];
    } else if (diff === 2 || diff === 3) {
      const decoy2 = {
        id: 'hyp_suspect2_guilty',
        label: `${suspect2.name} entered ${locStation.name} and intercepted ${targetItem.name}.`,
        claims: [
          {
            kind: 'at' as const,
            who: suspect2.id,
            where: locStation.id,
            from: 1212,
            to: 1225,
          },
        ],
        culpritIds: [suspect2.id],
      };

      const decoy3 = {
        id: 'hyp_culprit_innocent',
        label: `${culprit.name} remained in ${locHotel.name} and did not enter ${locStation.name}.`,
        claims: [
          {
            kind: 'at' as const,
            who: culprit.id,
            where: locHotel.id,
            from: 1215,
            to: 1230,
          },
        ],
        culpritIds: [victim.id],
      };
      hypotheses = [solutionHypothesis, decoy1, decoy2, decoy3];
      keyEvidence = [
        ['clue_victim_alibi_access', 'clue_suspect2_alibi_access', decisiveClueId],
      ];
    } else {
      // Diff 4
      const decoy2 = {
        id: 'hyp_suspect2_guilty',
        label: `${suspect2.name} entered ${locStation.name} and intercepted ${targetItem.name}.`,
        claims: [
          {
            kind: 'at' as const,
            who: suspect2.id,
            where: locStation.id,
            from: 1212,
            to: 1225,
          },
        ],
        culpritIds: [suspect2.id],
      };

      const decoy3 = {
        id: 'hyp_suspect3_guilty',
        label: `${suspect3.name} entered ${locStation.name} and intercepted ${targetItem.name}.`,
        claims: [
          {
            kind: 'at' as const,
            who: suspect3.id,
            where: locStation.id,
            from: 1212,
            to: 1225,
          },
        ],
        culpritIds: [suspect3.id],
      };
      hypotheses = [solutionHypothesis, decoy1, decoy2, decoy3];
      keyEvidence = [
        [
          'clue_victim_alibi_access',
          'clue_suspect2_alibi_access',
          'clue_suspect3_alibi_access',
          decisiveClueId,
        ],
      ];
    }

    hypotheses = rng.shuffle(hypotheses);

    const explanation = [
      {
        time: 1215,
        text: `${victim.name} badged into ${doorHotel} at 20:15, proving their presence at ${locHotel.name}.`,
        clueIds: ['clue_victim_alibi_access'],
      },
      {
        time: variant === 2 ? 1233 : 1218,
        text: `Physical tracking records exposed ${culprit.name}'s fabricated hotel alibi and placed them at ${locStation.name}.`,
        clueIds: [decisiveClueId, liarClueId],
      },
      ...(diff >= 2
        ? [
            {
              time: 1216,
              text: `${suspect2.name} badged through ${s2Door} at 20:16, ruling out their presence at ${locStation.name}.`,
              clueIds: ['clue_suspect2_alibi_access'],
            },
          ]
        : []),
      ...(diff === 4
        ? [
            {
              time: 1217,
              text: `${suspect3.name} badged through ${doorTransit} at 20:17, ruling out their presence at ${locStation.name}.`,
              clueIds: ['clue_suspect3_alibi_access'],
            },
          ]
        : []),
      {
        time: 1220,
        text: `${culprit.name} intercepted ${targetItem.name} at ${locStation.name} under their assumed persona.`,
        clueIds: [decisiveClueId],
      },
    ];

    const descriptors = [
      'The Chameleon of',
      'The Phantom Attache at',
      'Impostor at',
      'The False Identity of',
      'The Man from',
      'Shadow Over',
      'The Infiltrator at',
      'The Cipher Theft at',
    ];
    const title = `${rng.pick(descriptors)} ${locStation.name}`;

    const suspects = diff >= 3 ? [culprit, victim, suspect2, suspect3] : [culprit, victim, suspect2];
    const shuffledSuspects = rng.shuffle(suspects);
    const suspectNames = formatNameList(shuffledSuspects.map((s) => s.name));
    const countWord = suspects.length === 4 ? 'four' : 'three';

    const briefing = `At 20:20, ${targetItem.name} was intercepted at ${locStation.name}. Authorities suspect an infiltrator among ${countWord} individuals: ${suspectNames}. Examine credentials and location records to uncover the impostor.`;

    return {
      id: `case_gen_${rng.int(100000, 999999)}`,
      version: 1,
      kind: 'procedural',
      title,
      difficulty: diff,
      estimatedMinutes: diff * 4 + 2,
      mysteryType: 'hidden_identity',
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
        liars: [{ who: culprit.id, statementClueIds: [liarClueId] }],
        keyEvidence,
        explanation,
      },
      meta: {
        seed: typeof params.seed === 'number' ? params.seed : undefined,
        templateId: 'tpl_hidden_identity_v1',
        status: 'validated',
      },
    };
  },
};
