import { describe, expect, it } from 'vitest';
import {
  AccessFactSchema,
  ActionFactSchema,
  AdjacencyConnectionSchema,
  AtFactSchema,
  BoardCardSchema,
  BoardLinkSchema,
  BoardStateSchema,
  CaseDefinitionSchema,
  CaseKindSchema,
  CaseMetaSchema,
  CasePublicMetaSchema,
  CasePublicSchema,
  CaseStatusSchema,
  CharacterSchema,
  ClueSchema,
  ClueTypeSchema,
  ClueUnlockSchema,
  ConspiracyHookSchema,
  ContradictionLinkSchema,
  DeviceUseFactSchema,
  DifficultySchema,
  FactSchema,
  fromTime,
  GameObjectSchema,
  GroundTruthSchema,
  HypothesisSchema,
  IdSchema,
  InterviewQuestionSchema,
  InterviewSchema,
  LiarDeclarationSchema,
  LocationSchema,
  MessageFactSchema,
  MotiveFactSchema,
  MotiveTypeSchema,
  PossessFactSchema,
  PublicClueSchema,
  PublicHypothesisSchema,
  RelationFactSchema,
  RelationTypeSchema,
  ReliabilitySchema,
  RevealBeatSchema,
  RevealSchema,
  ScoreBreakdownSchema,
  ScoreResultSchema,
  SessionModeSchema,
  SessionStateSchema,
  SessionStatusSchema,
  SettingSchema,
  StateFactSchema,
  SubmissionSchema,
  TimeSchema,
  toTime,
  VerbSchema,
} from '../src/index.js';

describe('Time and time helpers', () => {
  it('parses valid time values and round-trips', () => {
    expect(TimeSchema.parse(0)).toBe(0);
    expect(TimeSchema.parse(1427)).toBe(1427);
    expect(TimeSchema.parse(2879)).toBe(2879);

    expect(toTime('00:00')).toBe(0);
    expect(toTime('23:47')).toBe(1427);
    expect(toTime('47:59')).toBe(2879);

    expect(fromTime(0)).toBe('00:00');
    expect(fromTime(1427)).toBe('23:47');
    expect(fromTime(2879)).toBe('47:59');

    expect(fromTime(toTime('23:47'))).toBe('23:47');
  });

  it('rejects invalid time numbers with readable errors', () => {
    expect(() => TimeSchema.parse(-1)).toThrow();
    expect(() => TimeSchema.parse(2880)).toThrow();
    expect(() => TimeSchema.parse(12.5)).toThrow();
    expect(() => TimeSchema.parse('1427')).toThrow();
  });

  it('rejects invalid time strings in toTime', () => {
    expect(() => toTime('invalid')).toThrow(/expected 'HH:MM'/);
    expect(() => toTime(':30')).toThrow(/expected 'HH:MM'/);
    expect(() => toTime('12:')).toThrow(/expected 'HH:MM'/);
    expect(() => toTime('23:60')).toThrow(/Invalid time values/);
    expect(() => toTime('-1:00')).toThrow(/Invalid time values/);
    expect(() => toTime('48:00')).toThrow(/out of range/);
    expect(() => toTime(123 as unknown as string)).toThrow(/Expected time string/);
  });

  it('rejects invalid numbers in fromTime', () => {
    expect(() => fromTime(-5)).toThrow();
    expect(() => fromTime(2880)).toThrow();
    expect(() => fromTime(12.3)).toThrow();
  });
});

describe('Id and enumerations', () => {
  it('parses valid Id and rejects invalid', () => {
    expect(IdSchema.parse('char_maya')).toBe('char_maya');
    expect(IdSchema.parse('loc:lobby-01.a')).toBe('loc:lobby-01.a');
    expect(() => IdSchema.parse('')).toThrow();
    expect(() => IdSchema.parse('invalid id with spaces')).toThrow();
    expect(() => IdSchema.parse(123)).toThrow();
  });

  it('parses valid Verbs and rejects invalid', () => {
    expect(VerbSchema.parse('took')).toBe('took');
    expect(VerbSchema.parse('sent')).toBe('sent');
    expect(VerbSchema.parse('paid')).toBe('paid');
    expect(() => VerbSchema.parse('exploded')).toThrow();
  });

  it('parses RelationType and MotiveType', () => {
    expect(RelationTypeSchema.parse('colleague')).toBe('colleague');
    expect(() => RelationTypeSchema.parse('')).toThrow();

    expect(MotiveTypeSchema.parse('financial')).toBe('financial');
    expect(() => MotiveTypeSchema.parse('')).toThrow();
  });

  it('parses CaseStatus and CaseKind', () => {
    expect(CaseStatusSchema.parse('draft')).toBe('draft');
    expect(CaseStatusSchema.parse('published')).toBe('published');
    expect(() => CaseStatusSchema.parse('cancelled')).toThrow();

    expect(CaseKindSchema.parse('authored')).toBe('authored');
    expect(CaseKindSchema.parse('procedural')).toBe('procedural');
    expect(() => CaseKindSchema.parse('unknown')).toThrow();
  });

  it('parses Difficulty', () => {
    expect(DifficultySchema.parse(1)).toBe(1);
    expect(DifficultySchema.parse(5)).toBe(5);
    expect(() => DifficultySchema.parse(0)).toThrow();
    expect(() => DifficultySchema.parse(6)).toThrow();
  });
});

describe('Fact variants & interval refinements', () => {
  it('parses valid AtFact and rejects from > to', () => {
    const valid = { kind: 'at' as const, who: 'char_maya', where: 'loc_lobby', from: 600, to: 720 };
    expect(AtFactSchema.parse(valid)).toEqual(valid);
    expect(FactSchema.parse(valid)).toEqual(valid);

    const invalid = {
      kind: 'at' as const,
      who: 'char_maya',
      where: 'loc_lobby',
      from: 720,
      to: 600,
    };
    expect(() => AtFactSchema.parse(invalid)).toThrow(/from.*less than or equal to.*to/);
    expect(() => FactSchema.parse(invalid)).toThrow(/from.*less than or equal to.*to/);
  });

  it('parses valid PossessFact and rejects from > to', () => {
    const valid = {
      kind: 'possess' as const,
      who: 'char_arjun',
      what: 'obj_phone',
      from: 1000,
      to: 1427,
    };
    expect(PossessFactSchema.parse(valid)).toEqual(valid);
    expect(FactSchema.parse(valid)).toEqual(valid);

    const invalid = {
      kind: 'possess' as const,
      who: 'char_arjun',
      what: 'obj_phone',
      from: 1500,
      to: 1427,
    };
    expect(() => PossessFactSchema.parse(invalid)).toThrow();
    expect(() => FactSchema.parse(invalid)).toThrow();
  });

  it('parses ActionFact', () => {
    const valid = {
      kind: 'action' as const,
      who: 'char_arjun',
      verb: 'sent' as const,
      target: 'char_maya',
      at: 1427,
      where: 'loc_office',
    };
    expect(ActionFactSchema.parse(valid)).toEqual(valid);
    expect(() => ActionFactSchema.parse({ ...valid, verb: 'unknown' })).toThrow();
  });

  it('parses MessageFact', () => {
    const valid = {
      kind: 'message' as const,
      msg: 'msg_01',
      sender: 'char_arjun',
      device: 'obj_phone',
      recipient: 'char_maya',
      sentAt: 1427,
    };
    expect(MessageFactSchema.parse(valid)).toEqual(valid);
    expect(() => MessageFactSchema.parse({ ...valid, recipient: '' })).toThrow();
  });

  it('parses DeviceUseFact', () => {
    const valid = { kind: 'device_use' as const, device: 'obj_phone', by: 'char_arjun', at: 1427 };
    expect(DeviceUseFactSchema.parse(valid)).toEqual(valid);
    expect(() => DeviceUseFactSchema.parse({ ...valid, device: '' })).toThrow();
  });

  it('parses AccessFact', () => {
    const valid = { kind: 'access' as const, who: 'char_maya', door: 'door_lobby_exit', at: 1421 };
    expect(AccessFactSchema.parse(valid)).toEqual(valid);
    expect(() => AccessFactSchema.parse({ ...valid, door: '' })).toThrow();
  });

  it('parses RelationFact', () => {
    const valid = { kind: 'relation' as const, a: 'char_maya', b: 'char_arjun', rel: 'colleague' };
    expect(RelationFactSchema.parse(valid)).toEqual(valid);
    expect(() => RelationFactSchema.parse({ ...valid, rel: '' })).toThrow();
  });

  it('parses MotiveFact', () => {
    const valid = {
      kind: 'motive' as const,
      who: 'char_arjun',
      motive: 'coverup',
      regarding: 'char_maya',
    };
    expect(MotiveFactSchema.parse(valid)).toEqual(valid);
    expect(() => MotiveFactSchema.parse({ ...valid, motive: '' })).toThrow();
  });

  it('parses StateFact', () => {
    const valid = {
      kind: 'state' as const,
      what: 'obj_safe',
      property: 'locked',
      value: 'false',
      at: 1400,
    };
    expect(StateFactSchema.parse(valid)).toEqual(valid);
    expect(() => StateFactSchema.parse({ ...valid, property: '' })).toThrow();
  });

  it('FactSchema rejects unknown kind with readable path', () => {
    const result = FactSchema.safeParse({ kind: 'unknown_kind', foo: 'bar' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toContain('kind');
    }
  });
});

describe('Clues and unlocks', () => {
  it('parses all ClueUnlock variants and clue metadata enums', () => {
    expect(ClueTypeSchema.parse('access_log')).toBe('access_log');
    expect(ReliabilitySchema.parse('physical')).toBe('physical');

    expect(ClueUnlockSchema.parse({ kind: 'default' })).toEqual({ kind: 'default' });
    expect(ClueUnlockSchema.parse({ kind: 'after_clue', clueId: 'clue_01' })).toEqual({
      kind: 'after_clue',
      clueId: 'clue_01',
    });
    expect(
      ClueUnlockSchema.parse({ kind: 'interview', characterId: 'char_maya', questionId: 'q1' }),
    ).toEqual({ kind: 'interview', characterId: 'char_maya', questionId: 'q1' });
    expect(ClueUnlockSchema.parse({ kind: 'request', cost: 10 })).toEqual({
      kind: 'request',
      cost: 10,
    });

    expect(() => ClueUnlockSchema.parse({ kind: 'request', cost: -1 })).toThrow();
    expect(() => ClueUnlockSchema.parse({ kind: 'unknown' })).toThrow();
  });

  it('parses full Clue and PublicClue round-trip', () => {
    const clueFixture = {
      id: 'clue_keycard',
      type: 'access_log' as const,
      reliability: 'physical' as const,
      source: 'loc_lobby',
      asserts: [
        {
          kind: 'access' as const,
          who: 'char_maya',
          door: 'door_lobby_exit',
          at: 1421,
        },
      ],
      text: 'Lobby keycard log: Maya exited at 23:41.',
      unlock: { kind: 'default' as const },
      tags: ['timeline'],
    };

    const parsed = ClueSchema.parse(clueFixture);
    expect(parsed).toEqual(clueFixture);
    const roundTripped = ClueSchema.parse(JSON.parse(JSON.stringify(parsed)));
    expect(roundTripped).toEqual(clueFixture);

    const publicParsed = PublicClueSchema.parse(clueFixture);
    expect(publicParsed).toEqual(clueFixture);

    expect(() => ClueSchema.parse({ ...clueFixture, reliability: 'invalid' })).toThrow();
    expect(() => ClueSchema.parse({ ...clueFixture, type: 'invalid' })).toThrow();
  });
});

describe('Characters, Locations, GameObjects, Interviews, Hooks', () => {
  it('parses Character', () => {
    const character = {
      id: 'char_maya',
      name: 'Maya Lin',
      role: 'Lead Architect',
      publicDescription: 'Says she left the studio at 23:40.',
      portrait: 'maya.png',
    };
    expect(CharacterSchema.parse(character)).toEqual(character);
    expect(() => CharacterSchema.parse({ ...character, name: '' })).toThrow();
  });

  it('parses Location with doorIds and adjacency', () => {
    const adj = { to: 'loc_lobby', travelMinutes: 4 };
    expect(AdjacencyConnectionSchema.parse(adj)).toEqual(adj);
    expect(() => AdjacencyConnectionSchema.parse({ ...adj, travelMinutes: -1 })).toThrow();

    const location = {
      id: 'loc_office',
      name: 'Private Office',
      description: 'Second floor executive suite.',
      doorIds: ['door_office_main'],
      adjacency: [adj],
    };
    expect(LocationSchema.parse(location)).toEqual(location);
    expect(() =>
      LocationSchema.parse({
        ...location,
        adjacency: [{ to: 'loc_lobby', travelMinutes: -1 }],
      }),
    ).toThrow();
  });

  it('parses GameObject including ownerId for devices', () => {
    const device = {
      id: 'obj_phone_maya',
      name: "Maya's Phone",
      type: 'device' as const,
      ownerId: 'char_maya',
    };
    expect(GameObjectSchema.parse(device)).toEqual(device);
    expect(() => GameObjectSchema.parse({ ...device, name: '' })).toThrow();
  });

  it('parses Interview and InterviewQuestion', () => {
    const question = {
      id: 'q_exit',
      prompt: 'What time did you leave?',
      answer: 'Around 23:40.',
      unlockedClueId: 'clue_testimony_maya',
    };
    expect(InterviewQuestionSchema.parse(question)).toEqual(question);
    expect(() => InterviewQuestionSchema.parse({ ...question, prompt: '' })).toThrow();

    const interview = {
      characterId: 'char_maya',
      questions: [question],
    };
    expect(InterviewSchema.parse(interview)).toEqual(interview);
    expect(() =>
      InterviewSchema.parse({
        ...interview,
        questions: [{ id: 'q1', prompt: '', answer: 'ans' }],
      }),
    ).toThrow();
  });

  it('parses ConspiracyHook', () => {
    const hook = {
      nodeId: 'node_quiet_courier',
      clueId: 'clue_receipt',
      leadText: 'A recurring symbol stamped in violet ink.',
      description: 'Links to The Quiet courier network.',
    };
    expect(ConspiracyHookSchema.parse(hook)).toEqual(hook);
    expect(() => ConspiracyHookSchema.parse({ ...hook, nodeId: '' })).toThrow();
  });
});

describe('CaseDefinition & CasePublic', () => {
  const validCaseFixture = {
    id: 'case_0001',
    version: 1,
    kind: 'authored' as const,
    title: 'The Missing Message',
    difficulty: 2 as const,
    estimatedMinutes: 5,
    mysteryType: 'false_alibi',
    setting: {
      locationIds: ['loc_office', 'loc_lobby'],
      date: '2026-10-29',
      summary: 'A locked office late at night.',
    },
    briefing: 'Who sent the message from Maya’s phone at 23:47?',
    characters: [
      {
        id: 'char_maya',
        name: 'Maya',
        role: 'Designer',
        publicDescription: 'Claims she left at 23:40.',
      },
      {
        id: 'char_arjun',
        name: 'Arjun',
        role: 'Engineer',
        publicDescription: 'Says he received a text at 23:47.',
      },
    ],
    locations: [
      {
        id: 'loc_office',
        name: 'Office',
        doorIds: ['door_office'],
        adjacency: [{ to: 'loc_lobby', travelMinutes: 3 }],
      },
      {
        id: 'loc_lobby',
        name: 'Lobby',
        doorIds: ['door_lobby_exit'],
        adjacency: [{ to: 'loc_office', travelMinutes: 3 }],
      },
    ],
    objects: [
      {
        id: 'obj_phone_maya',
        name: "Maya's Phone",
        type: 'device' as const,
        ownerId: 'char_maya',
      },
    ],
    clues: [
      {
        id: 'clue_keycard',
        type: 'access_log' as const,
        reliability: 'physical' as const,
        asserts: [
          {
            kind: 'access' as const,
            who: 'char_maya',
            door: 'door_lobby_exit',
            at: 1421,
          },
        ],
        text: 'Keycard exit logged at 23:41.',
        unlock: { kind: 'default' as const },
      },
      {
        id: 'clue_device_log',
        type: 'device_log' as const,
        reliability: 'physical' as const,
        asserts: [
          {
            kind: 'device_use' as const,
            device: 'obj_phone_maya',
            by: 'char_arjun',
            at: 1427,
          },
        ],
        text: 'Phone unlocked by Arjun at 23:47.',
        unlock: { kind: 'after_clue' as const, clueId: 'clue_keycard' },
      },
    ],
    hypotheses: [
      {
        id: 'hyp_maya_sent',
        label: 'Maya sent the message before leaving.',
        claims: [
          {
            kind: 'message' as const,
            msg: 'msg_01',
            sender: 'char_maya',
            device: 'obj_phone_maya',
            recipient: 'char_arjun',
            sentAt: 1427,
          },
        ],
        culpritIds: ['char_maya'],
      },
      {
        id: 'hyp_arjun_forged',
        label: 'Arjun forged the message after Maya left.',
        claims: [
          {
            kind: 'device_use' as const,
            device: 'obj_phone_maya',
            by: 'char_arjun',
            at: 1427,
          },
        ],
        culpritIds: ['char_arjun'],
      },
    ],
    truth: {
      timeline: [
        {
          kind: 'access' as const,
          who: 'char_maya',
          door: 'door_lobby_exit',
          at: 1421,
        },
        {
          kind: 'device_use' as const,
          device: 'obj_phone_maya',
          by: 'char_arjun',
          at: 1427,
        },
      ],
      culpritIds: ['char_arjun'],
      liars: [
        {
          who: 'char_arjun',
          statementClueIds: ['clue_device_log'],
        },
      ],
      solutionHypothesisId: 'hyp_arjun_forged',
      keyEvidence: [['clue_keycard', 'clue_device_log']],
      explanation: [
        {
          time: 1421,
          text: 'Maya departed through the lobby exit.',
          clueIds: ['clue_keycard'],
        },
        {
          time: 1427,
          text: 'Arjun used her abandoned phone to forge the message.',
          clueIds: ['clue_device_log'],
        },
      ],
    },
    meta: {
      status: 'validated' as const,
      seed: 101,
      author: 'Antigravity Test',
    },
  };

  it('parses valid CaseDefinition and round-trips cleanly', () => {
    expect(SettingSchema.parse(validCaseFixture.setting)).toEqual(validCaseFixture.setting);
    expect(CaseMetaSchema.parse(validCaseFixture.meta)).toEqual(validCaseFixture.meta);
    expect(CasePublicMetaSchema.parse({ status: 'published' })).toEqual({ status: 'published' });

    expect(HypothesisSchema.parse(validCaseFixture.hypotheses[0]!)).toEqual(
      validCaseFixture.hypotheses[0]!,
    );
    expect(PublicHypothesisSchema.parse({ id: 'hyp_01', label: 'A hypothesis' })).toEqual({
      id: 'hyp_01',
      label: 'A hypothesis',
    });

    expect(LiarDeclarationSchema.parse(validCaseFixture.truth.liars[0]!)).toEqual(
      validCaseFixture.truth.liars[0]!,
    );
    expect(RevealBeatSchema.parse(validCaseFixture.truth.explanation[0]!)).toEqual(
      validCaseFixture.truth.explanation[0]!,
    );
    expect(GroundTruthSchema.parse(validCaseFixture.truth)).toEqual(validCaseFixture.truth);

    const parsed = CaseDefinitionSchema.parse(validCaseFixture);
    expect(parsed.id).toBe('case_0001');

    const json = JSON.stringify(parsed);
    const roundTripped = CaseDefinitionSchema.parse(JSON.parse(json));
    expect(roundTripped).toEqual(parsed);
  });

  it('rejects duplicate character ids with readable path', () => {
    const invalid = {
      ...validCaseFixture,
      characters: [
        validCaseFixture.characters[0]!,
        { ...validCaseFixture.characters[0]!, name: 'Duplicate Maya' },
      ],
    };
    const res = CaseDefinitionSchema.safeParse(invalid);
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues[0]?.path).toEqual(['characters', 1, 'id']);
      expect(res.error.issues[0]?.message).toMatch(/Duplicate id 'char_maya'/);
    }
  });

  it('rejects duplicate clue ids with readable path', () => {
    const invalid = {
      ...validCaseFixture,
      clues: [
        validCaseFixture.clues[0]!,
        { ...validCaseFixture.clues[0]!, text: 'Duplicate clue' },
      ],
    };
    const res = CaseDefinitionSchema.safeParse(invalid);
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues[0]?.path).toEqual(['clues', 1, 'id']);
    }
  });

  it('rejects duplicate hypothesis ids', () => {
    const invalid = {
      ...validCaseFixture,
      hypotheses: [
        validCaseFixture.hypotheses[0]!,
        { ...validCaseFixture.hypotheses[0]!, label: 'Duplicate hypothesis' },
      ],
    };
    const res = CaseDefinitionSchema.safeParse(invalid);
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues[0]?.path).toEqual(['hypotheses', 1, 'id']);
    }
  });

  it('parses valid CasePublic and validates absence of secrets', () => {
    const publicCaseFixture = {
      id: validCaseFixture.id,
      version: validCaseFixture.version,
      kind: validCaseFixture.kind,
      title: validCaseFixture.title,
      difficulty: validCaseFixture.difficulty,
      estimatedMinutes: validCaseFixture.estimatedMinutes,
      mysteryType: validCaseFixture.mysteryType,
      setting: validCaseFixture.setting,
      briefing: validCaseFixture.briefing,
      characters: validCaseFixture.characters,
      locations: validCaseFixture.locations,
      objects: validCaseFixture.objects,
      clues: [validCaseFixture.clues[0]!],
      lockedClueIds: ['clue_device_log'],
      hypotheses: [
        { id: 'hyp_maya_sent', label: 'Maya sent the message before leaving.' },
        { id: 'hyp_arjun_forged', label: 'Arjun forged the message after Maya left.' },
      ],
      meta: {
        status: 'validated' as const,
        author: 'Antigravity Test',
      },
    };

    const parsed = CasePublicSchema.parse(publicCaseFixture);
    expect(parsed.id).toBe('case_0001');
    expect((parsed as Record<string, unknown>)['truth']).toBeUndefined();
    expect((parsed as Record<string, unknown>)['meta.seed']).toBeUndefined();
  });
});

describe('BoardState & SessionState', () => {
  it('parses BoardState with cards and links', () => {
    const card = { id: 'clue_01', x: 120, y: 250, pinned: true };
    const link = { a: 'clue_01', b: 'clue_02', explanation: 'Timeline clash' };
    expect(BoardCardSchema.parse(card)).toEqual(card);
    expect(BoardLinkSchema.parse(link)).toEqual(link);

    const board = {
      cards: [card, { id: 'clue_02', x: 400, y: 250 }],
      links: [link],
    };
    const parsed = BoardStateSchema.parse(board);
    expect(parsed).toEqual(board);
    expect(() =>
      BoardStateSchema.parse({ ...board, cards: [{ id: 'clue_01', x: 'invalid' }] }),
    ).toThrow();
  });

  it('parses SessionState', () => {
    expect(SessionModeSchema.parse('daily')).toBe('daily');
    expect(SessionStatusSchema.parse('submitted')).toBe('submitted');

    const session = {
      id: 'sess_123',
      userId: 'user_456',
      caseId: 'case_0001',
      caseVersion: 1,
      mode: 'normal' as const,
      unlockedClueIds: ['clue_01'],
      board: { cards: [], links: [] },
      status: 'in_progress' as const,
      startedAt: '2026-10-29T10:00:00Z',
    };
    expect(SessionStateSchema.parse(session)).toEqual(session);
    expect(() => SessionStateSchema.parse({ ...session, mode: 'invalid_mode' })).toThrow();
    expect(() => SessionStateSchema.parse({ ...session, caseVersion: 0 })).toThrow();
  });
});

describe('Submission, Scoring & Reveal', () => {
  it('parses Submission and enforces constraints (max 3 clues, max 20 links)', () => {
    const link = { a: 'clue_1', b: 'clue_2' };
    expect(ContradictionLinkSchema.parse(link)).toEqual(link);

    const valid = {
      sessionId: 'sess_123',
      hypothesisId: 'hyp_01',
      supportingClueIds: ['clue_1', 'clue_2', 'clue_3'],
      contradictions: [link],
    };
    expect(SubmissionSchema.parse(valid)).toEqual(valid);

    // Over 3 supporting clue ids
    expect(() =>
      SubmissionSchema.parse({
        ...valid,
        supportingClueIds: ['c1', 'c2', 'c3', 'c4'],
      }),
    ).toThrow(/cannot exceed 3 clues/);

    // Over 20 contradictions
    const excessiveLinks = Array.from({ length: 21 }, (_, i) => ({
      a: `clue_${i}`,
      b: `clue_${i + 1}`,
    }));
    expect(() =>
      SubmissionSchema.parse({
        ...valid,
        contradictions: excessiveLinks,
      }),
    ).toThrow(/cannot exceed 20 links/);
  });

  it('parses ScoreResult and ScoreBreakdown', () => {
    const scoreResult = {
      score: 120,
      xp: 120,
      breakdown: {
        correctHypothesis: true,
        hypothesisPoints: 100,
        evidencePoints: 20,
        contradictionPoints: 10,
        penaltyPoints: 0,
        multiplier: 1.0,
      },
    };
    expect(ScoreResultSchema.parse(scoreResult)).toEqual(scoreResult);
    expect(() => ScoreResultSchema.parse({ ...scoreResult, score: -1 })).toThrow();
    expect(() =>
      ScoreBreakdownSchema.parse({
        correctHypothesis: true,
        hypothesisPoints: 100,
      }),
    ).toThrow();
  });

  it('parses Reveal', () => {
    const reveal = {
      caseId: 'case_0001',
      solutionHypothesisId: 'hyp_arjun_forged',
      explanation: [
        {
          time: 1427,
          text: 'Arjun forged the message.',
          clueIds: ['clue_01'],
        },
      ],
      allClues: [
        {
          id: 'clue_01',
          type: 'device_log' as const,
          reliability: 'physical' as const,
          asserts: [],
          unlock: { kind: 'default' as const },
        },
      ],
      culprits: ['char_arjun'],
      validLinks: [{ a: 'clue_01', b: 'clue_02' }],
      invalidLinks: [],
    };
    expect(RevealSchema.parse(reveal)).toEqual(reveal);
    expect(() => RevealSchema.parse({ ...reveal, solutionHypothesisId: '' })).toThrow();
  });
});
