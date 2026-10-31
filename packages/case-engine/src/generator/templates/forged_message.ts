/**
 * Template: Forged Message (tpl_forged_message_v1)
 *
 * Story Shape:
 * A forged wire message or electronic dispatch is transmitted from a specialized terminal (deviceA)
 * inside the newsroom (locNewsroom) during an evening deadline window.
 * The primary culprit (or covering associate) fabricates false statements claiming the victim
 * sent the dispatch or misrepresenting transmission times / actions.
 *
 * Mechanism Variants (Decisive Contradiction Rules):
 * 0. message.sender_device: Culprit claimed victim sent the message from deviceA, refuted by terminal session showing culprit used deviceA at that exact time.
 * 1. message.time: Liar claimed dispatch msg_dispatch was sent at 20:25, refuted by carrier switchboard relay logging it at 20:15.
 * 2. presence.absent_action: Liar claimed victim performed the transmission action at locNewsroom at 20:15, refuted by CCTV placing victim inside locPrintshop.
 *
 * Roles & Diversity:
 * - Culprit role selected from a rich pool (Wire Editor, Desk Assistant, Lead Reporter, Telegraph Operator, Communications Officer).
 * - Liar selection: In ~25% of cases, an associate/recipient provides false testimony covering for the culprit (V14/V15 pass).
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
import { formatNameList, generateForgedMessageTitle } from './helpers.js';

export const tpl_forged_message: CaseTemplate = {
  id: 'tpl_forged_message_v1',
  mysteryType: 'forged_message',
  difficultyRange: [1, 4],
  slots: [
    { name: 'culprit', type: 'character', role: 'Wire Editor' },
    { name: 'victim', type: 'character', role: 'Lead Reporter' },
    { name: 'recipient', type: 'character', role: 'Desk Assistant' },
    { name: 'suspect3', type: 'character', role: 'Telegraph Operator' },
    { name: 'locNewsroom', type: 'location' },
    { name: 'locPrintshop', type: 'location' },
    { name: 'locArchive', type: 'location' },
    { name: 'deviceA', type: 'object' },
    { name: 'targetDoc', type: 'object' },
  ],

  build(rng: Rng, slots: FilledSlots, params: TemplateParams): CaseDefinition {
    const rawDiff = params.difficulty ?? 1;
    const diff = Math.min(4, Math.max(1, rawDiff)) as 1 | 2 | 3 | 4;

    const culprit = { ...(slots.culprit as Character) };
    const victim = { ...(slots.victim as Character) };
    const recipient = { ...(slots.recipient as Character) };
    const suspect3 = { ...(slots.suspect3 as Character) };

    // Dynamically assign varied roles
    const possibleRoles = [
      'Desk Assistant',
      'Wire Editor',
      'Lead Reporter',
      'Telegraph Operator',
      'Communications Officer',
    ];
    const shuffledRoles = rng.shuffle(possibleRoles);
    culprit.role = shuffledRoles[0]!;
    victim.role = shuffledRoles[1]!;
    recipient.role = shuffledRoles[2]!;
    suspect3.role = shuffledRoles[3]!;

    // Mechanism variant:
    // 0: message.sender_device
    // 1: message.time
    // 2: presence.absent_action
    const variant = rng.int(0, 2) as 0 | 1 | 2;

    // Liar: ~25% of cases witness covers for culprit
    const witnessCovers = rng.next() < 0.25;
    const liar = witnessCovers ? recipient : culprit;

    const locNewsroom = { ...(slots.locNewsroom as Location) };
    const locPrintshop = { ...(slots.locPrintshop as Location) };
    const locArchive = { ...(slots.locArchive as Location) };

    const deviceA = { ...(slots.deviceA as GameObject), type: 'device' as const };
    const targetDoc = {
      ...(slots.targetDoc as GameObject),
      type: 'item' as const,
      ownerId: victim.id,
    };

    // Ensure valid door IDs exist
    const doorNewsroom = locNewsroom.doorIds[0] ?? `door_${locNewsroom.id}_main`;
    const doorPrintshop = locPrintshop.doorIds[0] ?? `door_${locPrintshop.id}_main`;
    const doorArchive = locArchive.doorIds[0] ?? `door_${locArchive.id}_main`;

    locNewsroom.doorIds = [doorNewsroom];
    locPrintshop.doorIds = [doorPrintshop];
    locArchive.doorIds = [doorArchive];

    // Configure adjacency & travel time
    if (diff >= 3) {
      locNewsroom.adjacency = [
        { to: locPrintshop.id, travelMinutes: 20 },
        { to: locArchive.id, travelMinutes: 10 },
      ];
      locPrintshop.adjacency = [
        { to: locNewsroom.id, travelMinutes: 20 },
        { to: locArchive.id, travelMinutes: 15 },
      ];
      locArchive.adjacency = [
        { to: locNewsroom.id, travelMinutes: 10 },
        { to: locPrintshop.id, travelMinutes: 15 },
      ];
    } else {
      locNewsroom.adjacency = [];
      locPrintshop.adjacency = [];
      locArchive.adjacency = [];
    }

    const characters: Character[] =
      diff >= 3 ? [culprit, victim, recipient, suspect3] : [culprit, victim, recipient];

    const locations: Location[] =
      diff === 1 ? [locNewsroom, locPrintshop] : [locNewsroom, locPrintshop, locArchive];

    const s2LocId = diff === 1 ? locPrintshop.id : locArchive.id;
    const s2Door = diff === 1 ? doorPrintshop : doorArchive;

    // Mutually consistent ground truth timeline
    const timeline: Fact[] = [
      // Culprit badged into newsroom and transmitted message from deviceA at 1215
      {
        kind: 'at',
        who: culprit.id,
        where: locNewsroom.id,
        from: 1210,
        to: 1230,
      },
      {
        kind: 'access',
        who: culprit.id,
        door: doorNewsroom,
        at: 1212,
      },
      {
        kind: 'device_use',
        device: deviceA.id,
        by: culprit.id,
        at: 1215,
      },
      {
        kind: 'message',
        msg: 'msg_dispatch',
        device: deviceA.id,
        sentAt: 1215,
        recipient: recipient.id,
      },
      {
        kind: 'action',
        who: culprit.id,
        verb: 'sent',
        target: targetDoc.id,
        at: 1215,
        where: locNewsroom.id,
      },

      // Victim legitimate presence in printshop
      {
        kind: 'at',
        who: victim.id,
        where: locPrintshop.id,
        from: 1210,
        to: 1230,
      },
      {
        kind: 'access',
        who: victim.id,
        door: doorPrintshop,
        at: 1214,
      },

      // Recipient presence
      {
        kind: 'at',
        who: recipient.id,
        where: s2LocId,
        from: 1210,
        to: 1230,
      },
      {
        kind: 'access',
        who: recipient.id,
        door: s2Door,
        at: 1216,
      },
    ];

    if (diff >= 3) {
      timeline.push(
        {
          kind: 'at',
          who: suspect3.id,
          where: locArchive.id,
          from: 1210,
          to: 1230,
        },
        {
          kind: 'access',
          who: suspect3.id,
          door: doorArchive,
          at: 1217,
        },
      );
    }

    // Additional background facts for red herrings
    timeline.push(
      {
        kind: 'access',
        who: victim.id,
        door: doorPrintshop,
        at: 1205,
      },
      {
        kind: 'access',
        who: recipient.id,
        door: s2Door,
        at: 1206,
      },
      {
        kind: 'access',
        who: victim.id,
        door: doorPrintshop,
        at: 1228,
      },
      {
        kind: 'access',
        who: recipient.id,
        door: s2Door,
        at: 1229,
      },
    );

    // Primary Clues
    const baseClues: Clue[] = [];

    // Liar statement clue
    const liarClueId = 'clue_dispatch_testimony';
    if (variant === 0) {
      // message.sender_device variant
      baseClues.push({
        id: liarClueId,
        type: 'testimony',
        reliability: 'testimony',
        source: liar.id,
        asserts: [
          {
            kind: 'message',
            msg: 'msg_dispatch',
            device: deviceA.id,
            sender: victim.id,
            recipient: recipient.id,
            sentAt: 1215,
          },
        ],
        text: `${liar.name} stated: 'The wire transmission from ${deviceA.name} at 20:15 was authorized and sent directly by ${victim.name}.'`,
        unlock: { kind: 'default' },
      });
    } else if (variant === 1) {
      // message.time variant
      baseClues.push({
        id: liarClueId,
        type: 'testimony',
        reliability: 'testimony',
        source: liar.id,
        asserts: [
          {
            kind: 'message',
            msg: 'msg_dispatch',
            device: deviceA.id,
            sentAt: 1225,
            recipient: recipient.id,
          },
        ],
        text: `${liar.name} claimed: 'The electronic dispatch msg_dispatch was sent from ${deviceA.name} during the later transmission slot at 20:25.'`,
        unlock: { kind: 'default' },
      });
    } else {
      // presence.absent_action variant
      baseClues.push({
        id: liarClueId,
        type: 'testimony',
        reliability: 'testimony',
        source: liar.id,
        asserts: [
          {
            kind: 'action',
            who: victim.id,
            verb: 'sent',
            target: targetDoc.id,
            at: 1215,
            where: locNewsroom.id,
          },
        ],
        text: `${liar.name} stated: 'I saw ${victim.name} operating the transmitter ${deviceA.name} in ${locNewsroom.name} at 20:15.'`,
        unlock: { kind: 'default' },
      });
    }

    // Refutation clues depending on variant
    if (variant === 1) {
      // Carrier switchboard timestamp (refutes message.time)
      baseClues.push({
        id: 'clue_switchboard_timestamp',
        type: 'message',
        reliability: 'physical',
        asserts: [
          {
            kind: 'message',
            msg: 'msg_dispatch',
            device: deviceA.id,
            sentAt: 1215,
            recipient: recipient.id,
          },
        ],
        text: `Switchboard Relay: Carrier timestamp confirmed dispatch msg_dispatch was transmitted from ${deviceA.name} at 20:15.`,
        unlock: { kind: 'default' },
      });
    } else if (variant === 2) {
      // CCTV presence of victim at printshop (refutes presence.absent_action)
      baseClues.push({
        id: 'clue_victim_presence',
        type: 'cctv',
        reliability: 'physical',
        asserts: [
          {
            kind: 'at',
            who: victim.id,
            where: locPrintshop.id,
            from: 1210,
            to: 1225,
          },
        ],
        text: `Printshop CCTV: Optical feed confirmed ${victim.name} was inside ${locPrintshop.name} from 20:10 to 20:25.`,
        unlock: { kind: 'default' },
      });
    }

    // Terminal session log (device use by culprit at 1215 and presence at newsroom)
    // Always present; refutes message.sender_device in variant 0, and provides positive culprit evidence (V15) across all variants
    baseClues.push({
      id: 'clue_terminal_session',
      type: 'device_log',
      reliability: 'physical',
      asserts: [
        {
          kind: 'device_use',
          device: deviceA.id,
          by: culprit.id,
          at: 1215,
        },
        {
          kind: 'at',
          who: culprit.id,
          where: locNewsroom.id,
          from: 1210,
          to: 1230,
        },
      ],
      text: `Terminal Session Log: ${deviceA.name} was actively operated by ${culprit.name} at 20:15 inside ${locNewsroom.name}.`,
      unlock:
        diff === 1
          ? { kind: 'default' }
          : {
              kind: 'after_clue',
              clueId: liarClueId,
            },
    });

    // Victim alibi access log (eliminates Decoy 1)
    baseClues.push({
      id: 'clue_victim_alibi_access',
      type: 'access_log',
      reliability: 'physical',
      asserts: [
        {
          kind: 'access',
          who: victim.id,
          door: doorPrintshop,
          at: 1214,
        },
      ],
      text: `Pressroom Card Reader: ${victim.name} badged into ${doorPrintshop} at 20:14.`,
      unlock: { kind: 'default' },
    });

    // Recipient alibi access log (eliminates Decoy 2)
    if (diff >= 2) {
      baseClues.push({
        id: 'clue_recipient_alibi_access',
        type: 'access_log',
        reliability: 'physical',
        asserts: [
          {
            kind: 'access',
            who: recipient.id,
            door: s2Door,
            at: 1216,
          },
        ],
        text: `Access Log: ${recipient.name} checked in at ${s2Door} at 20:16.`,
        unlock:
          diff === 4
            ? {
                kind: 'after_clue',
                clueId: 'clue_victim_alibi_access',
              }
            : { kind: 'default' },
      });
    }

    // Suspect 3 alibi access log (eliminates Decoy 3)
    if (diff === 4) {
      baseClues.push({
        id: 'clue_suspect3_alibi_access',
        type: 'access_log',
        reliability: 'physical',
        asserts: [
          {
            kind: 'access',
            who: suspect3.id,
            door: doorArchive,
            at: 1217,
          },
        ],
        text: `Archive Reader: ${suspect3.name} badged through ${doorArchive} at 20:17.`,
        unlock: { kind: 'default' },
      });
    }

    // Red herrings
    const redHerringCount = diff === 1 ? 1 : 2;
    const clues = injectRedHerrings(baseClues, timeline, redHerringCount, rng);

    // Build Hypotheses
    const solutionHypothesis = {
      id: 'hyp_culprit_guilty',
      label: `${culprit.name} transmitted the forged dispatch from ${deviceA.name} in ${locNewsroom.name}.`,
      claims: [
        {
          kind: 'action' as const,
          who: culprit.id,
          verb: 'sent' as const,
          target: targetDoc.id,
          at: 1215,
          where: locNewsroom.id,
        },
      ],
      culpritIds: [culprit.id],
    };

    const decoy1 = {
      id: 'hyp_victim_guilty',
      label: `${victim.name} transmitted the dispatch from ${deviceA.name} in ${locNewsroom.name}.`,
      claims: [
        {
          kind: 'at' as const,
          who: victim.id,
          where: locNewsroom.id,
          from: 1212,
          to: 1220,
        },
      ],
      culpritIds: [victim.id],
    };

    let hypotheses = [solutionHypothesis, decoy1];
    let keyEvidence: string[][] = [];

    // The decisive clue refuting the lie
    const decisiveClueId =
      variant === 0
        ? 'clue_terminal_session'
        : variant === 1
          ? 'clue_switchboard_timestamp'
          : 'clue_victim_presence';

    if (diff === 1) {
      const decoy2 = {
        id: 'hyp_culprit_innocent',
        label: `${culprit.name} remained in ${locPrintshop.name} and did not use ${deviceA.name}.`,
        claims: [
          {
            kind: 'at' as const,
            who: culprit.id,
            where: locPrintshop.id,
            from: 1212,
            to: 1220,
          },
        ],
        culpritIds: [victim.id],
      };
      hypotheses = [solutionHypothesis, decoy1, decoy2];
      keyEvidence = [
        variant === 0
          ? ['clue_victim_alibi_access', 'clue_terminal_session']
          : ['clue_victim_alibi_access', decisiveClueId, 'clue_terminal_session'],
      ];
    } else if (diff === 2 || diff === 3) {
      const decoy2 = {
        id: 'hyp_recipient_guilty',
        label: `${recipient.name} transmitted the dispatch from ${deviceA.name} in ${locNewsroom.name}.`,
        claims: [
          {
            kind: 'at' as const,
            who: recipient.id,
            where: locNewsroom.id,
            from: 1212,
            to: 1220,
          },
        ],
        culpritIds: [recipient.id],
      };

      const decoy3 = {
        id: 'hyp_culprit_innocent',
        label: `${culprit.name} remained in ${locPrintshop.name} and did not use ${deviceA.name}.`,
        claims: [
          {
            kind: 'at' as const,
            who: culprit.id,
            where: locPrintshop.id,
            from: 1212,
            to: 1220,
          },
        ],
        culpritIds: [victim.id],
      };
      hypotheses = [solutionHypothesis, decoy1, decoy2, decoy3];
      keyEvidence = [
        [
          'clue_victim_alibi_access',
          'clue_recipient_alibi_access',
          'clue_terminal_session',
        ],
      ];
    } else {
      // Diff 4
      const decoy2 = {
        id: 'hyp_recipient_guilty',
        label: `${recipient.name} transmitted the dispatch from ${deviceA.name} in ${locNewsroom.name}.`,
        claims: [
          {
            kind: 'at' as const,
            who: recipient.id,
            where: locNewsroom.id,
            from: 1212,
            to: 1220,
          },
        ],
        culpritIds: [recipient.id],
      };

      const decoy3 = {
        id: 'hyp_suspect3_guilty',
        label: `${suspect3.name} transmitted the dispatch from ${deviceA.name} in ${locNewsroom.name}.`,
        claims: [
          {
            kind: 'at' as const,
            who: suspect3.id,
            where: locNewsroom.id,
            from: 1212,
            to: 1220,
          },
        ],
        culpritIds: [suspect3.id],
      };
      hypotheses = [solutionHypothesis, decoy1, decoy2, decoy3];
      keyEvidence = [
        [
          'clue_victim_alibi_access',
          'clue_recipient_alibi_access',
          'clue_suspect3_alibi_access',
          'clue_terminal_session',
        ],
      ];
    }

    hypotheses = rng.shuffle(hypotheses);

    // Explanation beats
    const explanation = [
      {
        time: 1214,
        text: `${victim.name} badged into ${doorPrintshop} at 20:14, proving they were not present in ${locNewsroom.name} to operate ${deviceA.name}.`,
        clueIds: ['clue_victim_alibi_access'],
      },
      {
        time: 1215,
        text:
          variant === 0
            ? `Terminal session logs verified that ${culprit.name} was logged into ${deviceA.name} at 20:15, shattering claims that ${victim.name} sent the dispatch.`
            : variant === 1
              ? `Carrier switchboard timestamps verified the dispatch was routed at 20:15, disproving the claimed transmission window.`
              : `Printshop surveillance footage confirmed ${victim.name} was inside ${locPrintshop.name} at 20:15, completely contradicting claims that they operated ${deviceA.name}.`,
        clueIds: [decisiveClueId, liarClueId],
      },
      ...(variant !== 0
        ? [
            {
              time: 1215,
              text: `Terminal authentication records proved ${culprit.name} was the operator at ${deviceA.name} when the dispatch was generated.`,
              clueIds: ['clue_terminal_session'],
            },
          ]
        : []),
      ...(diff >= 2
        ? [
            {
              time: 1216,
              text: `${recipient.name} was badged into ${s2Door} at 20:16, ruling them out as the transmitter at ${locNewsroom.name}.`,
              clueIds: ['clue_recipient_alibi_access'],
            },
          ]
        : []),
      ...(diff === 4
        ? [
            {
              time: 1217,
              text: `${suspect3.name} was logged badging into ${doorArchive} at 20:17, ruling out their presence at ${locNewsroom.name}.`,
              clueIds: ['clue_suspect3_alibi_access'],
            },
          ]
        : []),
      {
        time: 1215,
        text: `${culprit.name} completed the forged transmission of ${targetDoc.name} before signing off.`,
        clueIds: ['clue_terminal_session'],
      },
    ];

    const title = generateForgedMessageTitle(rng, deviceA, targetDoc, locNewsroom, locPrintshop);

    const suspects = diff >= 3 ? [culprit, victim, recipient, suspect3] : [culprit, victim, recipient];
    const shuffledSuspects = rng.shuffle(suspects);
    const suspectNames = formatNameList(shuffledSuspects.map((s) => s.name));
    const countWord = suspects.length === 4 ? 'four' : 'three';

    const briefingOptions = [
      `At 20:15, a compromised dispatch was routed from ${deviceA.name} inside ${locNewsroom.name}. An investigation focuses on ${countWord} individuals: ${suspectNames}. Examine terminal and access logs to uncover the true sender.`,
      `The transmission of an unauthorized cable from ${deviceA.name} caused immediate disruption. Statements from ${suspectNames} contradict electronic carrier records. Trace the dispatch to identify the perpetrator.`,
      `An illicit wire communication was detected originating from ${locNewsroom.name}. Accounts given by ${suspectNames} contain fabricated details regarding device access. Determine who sent the message.`,
    ];
    const briefing = rng.pick(briefingOptions);

    return {
      id: `case_gen_${rng.int(100000, 999999)}`,
      version: 1,
      kind: 'procedural',
      title,
      difficulty: diff,
      estimatedMinutes: diff * 4 + 2,
      mysteryType: 'forged_message',
      setting: {
        locationIds: locations.map((l) => l.id),
        date: '2026-10-24',
        summary: `Vesper City incidents across ${locations.map((l) => l.name).join(', ')}.`,
      },
      briefing,
      characters,
      locations,
      objects: [deviceA, targetDoc],
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
        templateId: 'tpl_forged_message_v1',
        status: 'validated',
      },
    };
  },
};
