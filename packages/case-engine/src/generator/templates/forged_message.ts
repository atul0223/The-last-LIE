/**
 * Template: Forged Message (tpl_forged_message_v1)
 *
 * Story Shape:
 * An unauthorized telegraph wire / network message (msg_dispatch) is sent from a specific
 * terminal (deviceA) located in the newsroom / communications office (locNewsroom) at 20:15.
 * The message instructs the print shop / recipient station (locPrintshop) to publish or act on false orders.
 * The culprit (culprit) claims that the senior editor / officer (victim) sent the message.
 * However, the carrier record contains only carrier metadata (device, timestamp, recipient) without
 * a confirmed sender (NEXT-2 sender-less record), and the local terminal session log proves that the
 * culprit was actively logged into deviceA at that exact timestamp (20:15).
 * Furthermore, physical access logs prove the victim was at locPrintshop at 20:14, rendering their
 * presence at deviceA impossible.
 *
 * Slots:
 * - culprit: Primary suspect who operated the terminal and forged the dispatch
 * - victim: Senior officer / editor falsely accused of sending the message
 * - recipient: Station operator / press foreman who received the wire
 * - suspect3: Secondary technician / operator (used in higher difficulties)
 * - locNewsroom: Communications / telegraph room containing deviceA
 * - locPrintshop: Recipient's press facility / office
 * - locArchive: Peripheral record archive / transit station
 * - deviceA: The transmission terminal / telegraph console
 * - targetDoc: The dispatch document / order
 *
 * Contradiction Rules (Fair-Play):
 * - message.sender_device: Culprit's testimony claiming victim sent the message from deviceA at 20:15
 *   is directly contradicted by the terminal session log proving culprit operated deviceA at 20:15.
 * - access.presence: Physical access scan at doorPrintshop at 20:14 proves victim was not in locNewsroom.
 * - presence.travel: (Difficulty 3+) Travel time between newsroom and print shop prevents unrecorded transit.
 *
 * Decoy Construction:
 * - Decoy 1 (victim): Accuses victim of sending the message from locNewsroom. Eliminated by
 *   clue_victim_alibi_access (proving victim was in locPrintshop at 20:14).
 * - Decoy 2: In Diff 1, claims culprit was at locPrintshop (eliminated by culprit's newsroom access log).
 *   In Diff 2-4, accuses recipient of sending the message from locNewsroom (eliminated by recipient alibi log).
 * - Decoy 3: In Diff 2-3, claims culprit remained in locPrintshop (eliminated by culprit's newsroom access log).
 *   In Diff 4, accuses suspect3 of sending the message (eliminated by suspect3 archive access log).
 *
 * Difficulty Scaling (1 -> 4):
 * - Diff 1: 3 characters, 2 locations, 3 hypotheses. KeyEvidence size 2, 0 non-default key clues,
 *   1 red herring, no travel time required. Measured difficulty: 1 (rawScore = 8.0).
 * - Diff 2: 3 characters, 3 locations, 4 hypotheses. KeyEvidence size 3, 1 non-default key clue
 *   (after_clue unlock on terminal session log), 2 red herrings, no travel time required.
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

export const tpl_forged_message: CaseTemplate = {
  id: 'tpl_forged_message_v1',
  mysteryType: 'forged_message',
  difficultyRange: [1, 4],
  slots: [
    { name: 'culprit', type: 'character', role: 'Wire Editor' },
    { name: 'victim', type: 'character', role: 'Managing Editor' },
    { name: 'recipient', type: 'character', role: 'Press Foreman' },
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

    const culprit = slots.culprit as Character;
    const victim = slots.victim as Character;
    const recipient = slots.recipient as Character;
    const suspect3 = slots.suspect3 as Character;

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

    // Configure adjacency & travel time based on difficulty
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
    // Message sent at 1215 (20:15)
    const timeline: Fact[] = [
      // Culprit badged into newsroom and transmitted message from deviceA
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
      // NEXT-2: carrier message has optional sender (undefined in carrier record)
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

      // Victim legitimate presence in printshop away from deviceA
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

      // Recipient presence in printshop
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
    const baseClues: Clue[] = [
      // 1. Physical Carrier Record: sender-less carrier log
      {
        id: 'clue_carrier_log',
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
        text: `Carrier Dispatch Log: Message msg_dispatch routed from ${deviceA.name} to ${recipient.name} at 20:15. (Carrier header records no authenticated sender id).`,
        unlock: { kind: 'default' },
      },

      // 2. Culprit's declared lie: falsely claims victim sent the message from deviceA at 1215
      {
        id: 'clue_culprit_testimony',
        type: 'testimony',
        reliability: 'testimony',
        source: culprit.id,
        asserts: [
          {
            kind: 'message',
            msg: 'msg_dispatch',
            sender: victim.id,
            device: deviceA.id,
            sentAt: 1215,
            recipient: recipient.id,
          },
        ],
        text: `${culprit.name} stated: 'I saw ${victim.name} log into ${deviceA.name} and send message msg_dispatch at 20:15 before leaving.'`,
        unlock: { kind: 'default' },
      },

      // 3. Physical Access Log for Victim: places victim in printshop at 1214 (eliminates Decoy 1)
      {
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
        text: `Turnstile Log: ${victim.name} badged into ${doorPrintshop} at 20:14.`,
        unlock: { kind: 'default' },
      },

      // 4. Physical Terminal Session Log: proves culprit operated deviceA at 1215!
      // Refutes culprit's lie via message.sender_device (V14) and positively places culprit (V15)
      // Also asserts access at doorNewsroom at 1212 (eliminates Decoy 2/3)
      // In diff >= 3, also includes 'at' fact so needsTravelTime is triggered
      {
        id: 'clue_terminal_session',
        type: 'device_log',
        reliability: 'physical',
        asserts:
          diff >= 3
            ? [
                {
                  kind: 'device_use',
                  device: deviceA.id,
                  by: culprit.id,
                  at: 1215,
                },
                {
                  kind: 'access',
                  who: culprit.id,
                  door: doorNewsroom,
                  at: 1212,
                },
                {
                  kind: 'at',
                  who: culprit.id,
                  where: locNewsroom.id,
                  from: 1210,
                  to: 1230,
                },
              ]
            : [
                {
                  kind: 'device_use',
                  device: deviceA.id,
                  by: culprit.id,
                  at: 1215,
                },
                {
                  kind: 'access',
                  who: culprit.id,
                  door: doorNewsroom,
                  at: 1212,
                },
              ],
        text: `Terminal Audit Trail: ${deviceA.name} authenticated user session for ${culprit.name} at 20:15 with badge access at ${doorNewsroom}.`,
        unlock:
          diff === 1
            ? { kind: 'default' }
            : {
                kind: 'after_clue',
                clueId: 'clue_culprit_testimony',
              },
      },
    ];

    // For diff 2, 3, 4: add physical clue placing recipient at transit/printshop (eliminates Decoy 2)
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
        text: `Gate Log: ${recipient.name} scanned access badge at ${s2Door} at 20:16.`,
        unlock:
          diff === 4
            ? {
                kind: 'after_clue',
                clueId: 'clue_carrier_log',
              }
            : { kind: 'default' },
      });
    }

    // For diff 4: add physical clue placing suspect 3 at archive (eliminates Decoy 3)
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
        text: `Security Log: ${suspect3.name} logged badge at ${doorArchive} at 20:17.`,
        unlock: { kind: 'default' },
      });
    }

    const redHerringCount = diff === 1 ? 1 : 2;
    const clues = injectRedHerrings(baseClues, timeline, redHerringCount, rng);

    // Build Hypotheses
    // Solution hypothesis: culprit transmitted the forged dispatch
    const solutionHypothesis = {
      id: 'hyp_culprit_forged',
      label: `${culprit.name} transmitted the forged dispatch from ${deviceA.name}.`,
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

    // Decoy 1: victim was in locNewsroom transmitting the message
    const decoy1 = {
      id: 'hyp_victim_sent',
      label: `${victim.name} sent the message from ${locNewsroom.name}.`,
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
    let keyEvidence: string[][];

    if (diff === 1) {
      // Decoy 2: Culprit remained innocently at locPrintshop
      const decoy2 = {
        id: 'hyp_culprit_innocent',
        label: `${culprit.name} was at ${locPrintshop.name} and did not operate ${deviceA.name}.`,
        claims: [
          {
            kind: 'at' as const,
            who: culprit.id,
            where: locPrintshop.id,
            from: 1210,
            to: 1220,
          },
        ],
        culpritIds: [recipient.id],
      };
      hypotheses = [solutionHypothesis, decoy1, decoy2];

      // Key evidence size 2 (smallestKeyEvidenceSize = 2)
      // - clue_victim_alibi_access eliminates decoy1
      // - clue_terminal_session eliminates decoy2, refutes culprit lie, places culprit (V15)
      keyEvidence = [['clue_victim_alibi_access', 'clue_terminal_session']];
    } else if (diff === 2 || diff === 3) {
      // Decoy 2: recipient sent the message from locNewsroom
      const decoy2 = {
        id: 'hyp_recipient_sent',
        label: `${recipient.name} was present in ${locNewsroom.name} and sent the message.`,
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

      // Decoy 3: Culprit innocent in printshop
      const decoy3 = {
        id: 'hyp_culprit_innocent',
        label: `${culprit.name} was at ${locPrintshop.name} and did not operate ${deviceA.name}.`,
        claims: [
          {
            kind: 'at' as const,
            who: culprit.id,
            where: locPrintshop.id,
            from: 1210,
            to: 1220,
          },
        ],
        culpritIds: [victim.id],
      };
      hypotheses = [solutionHypothesis, decoy1, decoy2, decoy3];

      // Key evidence size 3:
      // - clue_victim_alibi_access eliminates decoy1
      // - clue_recipient_alibi_access eliminates decoy2
      // - clue_terminal_session eliminates decoy3, refutes lie, places culprit
      keyEvidence = [
        ['clue_victim_alibi_access', 'clue_recipient_alibi_access', 'clue_terminal_session'],
      ];
    } else {
      // Diff 4: 4 hypotheses, keyEvidence size 4
      const decoy2 = {
        id: 'hyp_recipient_sent',
        label: `${recipient.name} was present in ${locNewsroom.name} and sent the message.`,
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
        id: 'hyp_suspect3_sent',
        label: `${suspect3.name} was present in ${locNewsroom.name} and sent the message.`,
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

      // Key evidence size 4:
      // - clue_victim_alibi_access eliminates decoy1
      // - clue_recipient_alibi_access eliminates decoy2
      // - clue_suspect3_alibi_access eliminates decoy3
      // - clue_terminal_session places culprit, refutes lie
      keyEvidence = [
        [
          'clue_victim_alibi_access',
          'clue_recipient_alibi_access',
          'clue_suspect3_alibi_access',
          'clue_terminal_session',
        ],
      ];
    }

    // Explanation beats for reveal
    const explanation = [
      {
        time: 1214,
        text: `${victim.name} badged into ${doorPrintshop} at 20:14, proving they were not present in ${locNewsroom.name} to operate ${deviceA.name}.`,
        clueIds: ['clue_victim_alibi_access'],
      },
      {
        time: 1215,
        text: `Terminal session logs verified that ${culprit.name} was logged into ${deviceA.name} at 20:15, shattering their claim that ${victim.name} sent the dispatch.`,
        clueIds: ['clue_terminal_session', 'clue_culprit_testimony'],
      },
      ...(diff >= 2
        ? [
            {
              time: 1216,
              text: `${recipient.name} was logged at ${s2Door} at 20:16, confirming their legitimate station.`,
              clueIds: ['clue_recipient_alibi_access'],
            },
          ]
        : []),
      ...(diff === 4
        ? [
            {
              time: 1217,
              text: `${suspect3.name} was badged into ${doorArchive} at 20:17, ruling out their presence at ${locNewsroom.name}.`,
              clueIds: ['clue_suspect3_alibi_access'],
            },
          ]
        : []),
      {
        time: 1215,
        text: `${culprit.name} transmitted the forged message msg_dispatch from ${deviceA.name} at 20:15.`,
        clueIds: ['clue_carrier_log', 'clue_terminal_session'],
      },
    ];

    const caseTitles = [
      `The Forged Wire at ${locNewsroom.name}`,
      `The Midnight Dispatch of ${culprit.name}`,
      `The Phantom Message from ${deviceA.name}`,
      `Deception on the Wire at ${locPrintshop.name}`,
    ];

    return {
      id: `case_fm_${rng.int(1000, 9999)}`,
      version: 1,
      kind: 'procedural',
      title: rng.pick(caseTitles),
      difficulty: diff,
      estimatedMinutes: 5 + diff * 2,
      mysteryType: 'forged_message',
      setting: {
        locationIds: locations.map((l) => l.id),
        date: '2026-11-06',
        summary: `A forged telegraph dispatch was transmitted from ${locNewsroom.name} to disrupt operations at ${locPrintshop.name}.`,
      },
      briefing: `An unauthorized message msg_dispatch was sent from ${deviceA.name}. Suspect ${culprit.name} claims ${victim.name} was the sender. Inspect carrier headers and terminal sessions to expose the imposter.`,
      characters,
      locations,
      objects: [deviceA, targetDoc],
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
        solutionHypothesisId: 'hyp_culprit_forged',
        keyEvidence,
        explanation,
      },
      meta: {
        status: 'validated',
        author: 'Procedural Case Engine',
        templateId: 'tpl_forged_message_v1',
      },
    };
  },
};
