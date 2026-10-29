import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import {
  buildContext,
  contradicts,
  evaluateHypothesis,
  factEntailed,
  intervalContains,
  intervalsOverlap,
  survivingHypotheses,
  type CaseDefinition,
  type Clue,
  type Fact,
  type Hypothesis,
  type LogicContext,
} from '../src/index.js';

describe('Interval Semantics', () => {
  it('implements half-open [from, to) intervals where touching intervals do NOT overlap', () => {
    // [10, 20) and [20, 30) touch at 20 -> do NOT overlap
    expect(intervalsOverlap(10, 20, 20, 30)).toBe(false);
    expect(intervalsOverlap(20, 30, 10, 20)).toBe(false);

    // Overlapping intervals
    expect(intervalsOverlap(10, 25, 20, 30)).toBe(true);
    expect(intervalsOverlap(20, 30, 10, 25)).toBe(true);

    // Disjoint non-touching intervals
    expect(intervalsOverlap(10, 15, 20, 30)).toBe(false);

    // Degenerate/empty intervals
    expect(intervalsOverlap(20, 20, 10, 30)).toBe(false);
    expect(intervalsOverlap(25, 20, 10, 30)).toBe(false);
  });

  it('implements intervalContains for half-open intervals', () => {
    // [10, 20) contains 10, 15, 19, but NOT 20 or 9
    expect(intervalContains(10, 20, 10)).toBe(true);
    expect(intervalContains(10, 20, 15)).toBe(true);
    expect(intervalContains(10, 20, 19)).toBe(true);
    expect(intervalContains(10, 20, 20)).toBe(false);
    expect(intervalContains(10, 20, 9)).toBe(false);
  });
});

describe('buildContext', () => {
  const sampleCase: CaseDefinition = {
    id: 'case_test',
    version: 1,
    kind: 'authored',
    title: 'Test Case',
    difficulty: 1,
    estimatedMinutes: 5,
    mysteryType: 'false_alibi',
    setting: { locationIds: ['loc_office'], date: '2026-10-29', summary: 'Summary' },
    briefing: 'Briefing',
    characters: [{ id: 'char_maya', name: 'Maya', role: 'Dev', publicDescription: 'Dev' }],
    locations: [
      {
        id: 'loc_office',
        name: 'Office',
        doorIds: ['door_office_1', 'door_office_2'],
        adjacency: [{ to: 'loc_lobby', travelMinutes: 5 }],
      },
      {
        id: 'loc_lobby',
        name: 'Lobby',
        doorIds: ['door_lobby_exit'],
        adjacency: [],
      },
    ],
    objects: [
      {
        id: 'obj_phone',
        name: 'Phone',
        type: 'device',
        ownerId: 'char_maya',
      },
    ],
    clues: [],
    hypotheses: [
      { id: 'h1', label: 'H1', claims: [], culpritIds: [] },
      { id: 'h2', label: 'H2', claims: [], culpritIds: [] },
    ],
    truth: {
      timeline: [{ kind: 'access', who: 'char_maya', door: 'door_office_1', at: 100 }],
      culpritIds: [],
      liars: [],
      solutionHypothesisId: 'h1',
      keyEvidence: [['c1']],
      explanation: [{ time: 100, text: 'Beat', clueIds: ['c1'] }],
    },
    meta: { status: 'draft' },
  };

  it('maps doors to locations, devices to owners, and builds symmetric travel lookup', () => {
    const ctx = buildContext(sampleCase);

    expect(ctx.doorLocations['door_office_1']).toBe('loc_office');
    expect(ctx.doorLocations['door_office_2']).toBe('loc_office');
    expect(ctx.doorLocations['door_lobby_exit']).toBe('loc_lobby');

    expect(ctx.deviceOwners['obj_phone']).toBe('char_maya');

    // Symmetric travel times
    expect(ctx.getTravelTime('loc_office', 'loc_lobby')).toBe(5);
    expect(ctx.getTravelTime('loc_lobby', 'loc_office')).toBe(5);
    expect(ctx.getTravelTime('loc_office', 'loc_office')).toBe(0);
    expect(ctx.getTravelTime('loc_office', 'loc_unknown')).toBeNull();
  });
});

describe('Contradiction Rules', () => {
  const ctx: LogicContext = {
    doorLocations: {
      door_office: 'loc_office',
      door_lobby: 'loc_lobby',
    },
    deviceOwners: {
      obj_phone: 'char_maya',
    },
    travelTimes: {
      loc_office: { loc_lobby: 10, loc_office: 0 },
      loc_lobby: { loc_office: 10, loc_lobby: 0 },
    },
    getTravelTime(from, to) {
      if (from === to) return 0;
      return this.travelTimes[from]?.[to] ?? this.travelTimes[to]?.[from] ?? null;
    },
  };

  describe('Rule 1: presence.two_places', () => {
    const atLobby: Fact = { kind: 'at', who: 'char_maya', where: 'loc_lobby', from: 600, to: 720 };
    const atOfficeOverlap: Fact = {
      kind: 'at',
      who: 'char_maya',
      where: 'loc_office',
      from: 700,
      to: 800,
    };
    const atOfficeDisjoint: Fact = {
      kind: 'at',
      who: 'char_maya',
      where: 'loc_office',
      from: 730,
      to: 800,
    };
    const atOfficeTouching: Fact = {
      kind: 'at',
      who: 'char_maya',
      where: 'loc_office',
      from: 720,
      to: 800,
    };

    it('positive case: overlapping presence at different locations contradicts', () => {
      const res = contradicts(atLobby, atOfficeOverlap, ctx);
      expect(res).not.toBeNull();
      expect(res?.ruleId).toBe('presence.two_places');
      expect(contradicts(atOfficeOverlap, atLobby, ctx)?.ruleId).toBe('presence.two_places');
    });

    it('negative case: presence of different persons or same location does not contradict', () => {
      const arjunAtOffice: Fact = {
        kind: 'at',
        who: 'char_arjun',
        where: 'loc_office',
        from: 700,
        to: 800,
      };
      expect(contradicts(atLobby, arjunAtOffice, ctx)).toBeNull();

      const mayaSameLocation: Fact = {
        kind: 'at',
        who: 'char_maya',
        where: 'loc_lobby',
        from: 700,
        to: 800,
      };
      expect(contradicts(atLobby, mayaSameLocation, ctx)).toBeNull();
    });

    it('boundary case: touching intervals [600, 720) and [720, 800) do NOT trigger presence.two_places', () => {
      // With travel time = 10, a touching interval (0 min gap) triggers presence.travel, but NOT presence.two_places
      // If travel time is null/unknown:
      const noTravelCtx: LogicContext = {
        ...ctx,
        getTravelTime: () => null,
      };
      expect(contradicts(atLobby, atOfficeTouching, noTravelCtx)).toBeNull();
      expect(contradicts(atLobby, atOfficeDisjoint, noTravelCtx)).toBeNull();
    });
  });

  describe('Rule 2: presence.absent_action', () => {
    const atLobby: Fact = { kind: 'at', who: 'char_maya', where: 'loc_lobby', from: 600, to: 720 };
    const actionOffice: Fact = {
      kind: 'action',
      who: 'char_maya',
      verb: 'sent',
      where: 'loc_office',
      at: 650,
    };

    it('positive case: action at loc_office while present at loc_lobby contradicts', () => {
      const res = contradicts(actionOffice, atLobby, ctx);
      expect(res?.ruleId).toBe('presence.absent_action');
      expect(contradicts(atLobby, actionOffice, ctx)?.ruleId).toBe('presence.absent_action');
    });

    it('negative case: action at same location does not contradict', () => {
      const actionLobby: Fact = {
        kind: 'action',
        who: 'char_maya',
        verb: 'sent',
        where: 'loc_lobby',
        at: 650,
      };
      expect(contradicts(actionLobby, atLobby, ctx)).toBeNull();
    });

    it('boundary case: action at exact boundary time 720 does NOT trigger absent_action', () => {
      const actionAtBoundary: Fact = {
        kind: 'action',
        who: 'char_maya',
        verb: 'sent',
        where: 'loc_office',
        at: 720,
      };
      const noTravelCtx: LogicContext = { ...ctx, getTravelTime: () => null };
      expect(contradicts(actionAtBoundary, atLobby, noTravelCtx)).toBeNull();
    });
  });

  describe('Rule 3: message.sender_device', () => {
    const msgMaya: Fact = {
      kind: 'message',
      msg: 'm1',
      sender: 'char_maya',
      device: 'obj_phone',
      recipient: 'char_arjun',
      sentAt: 1427,
    };
    const useArjun: Fact = {
      kind: 'device_use',
      device: 'obj_phone',
      by: 'char_arjun',
      at: 1427,
    };

    it('positive case: message claims sender X, but device used by Y at same time contradicts', () => {
      const res = contradicts(msgMaya, useArjun, ctx);
      expect(res?.ruleId).toBe('message.sender_device');
      expect(contradicts(useArjun, msgMaya, ctx)?.ruleId).toBe('message.sender_device');
    });

    it('negative case: message sender matches device user', () => {
      const useMaya: Fact = {
        kind: 'device_use',
        device: 'obj_phone',
        by: 'char_maya',
        at: 1427,
      };
      expect(contradicts(msgMaya, useMaya, ctx)).toBeNull();
    });

    it('boundary case: different time does not trigger message.sender_device', () => {
      const useArjunLater: Fact = {
        kind: 'device_use',
        device: 'obj_phone',
        by: 'char_arjun',
        at: 1428,
      };
      expect(contradicts(msgMaya, useArjunLater, ctx)).toBeNull();
    });
  });

  describe('Rule 4: message.time', () => {
    const msgA: Fact = {
      kind: 'message',
      msg: 'm1',
      sender: 'char_maya',
      device: 'obj_phone',
      recipient: 'char_arjun',
      sentAt: 1420,
    };
    const msgB: Fact = {
      kind: 'message',
      msg: 'm1',
      sender: 'char_maya',
      device: 'obj_phone',
      recipient: 'char_arjun',
      sentAt: 1425,
    };

    it('positive case: conflicting sent times for same message id contradicts', () => {
      const res = contradicts(msgA, msgB, ctx);
      expect(res?.ruleId).toBe('message.time');
      expect(contradicts(msgB, msgA, ctx)?.ruleId).toBe('message.time');
    });

    it('negative case: identical sent time', () => {
      expect(contradicts(msgA, { ...msgA }, ctx)).toBeNull();
    });

    it('boundary case: different message id at different times does not contradict', () => {
      const msgDifferent: Fact = { ...msgB, msg: 'm2' };
      expect(contradicts(msgA, msgDifferent, ctx)).toBeNull();
    });
  });

  describe('Rule 5: access.presence', () => {
    const accessDoorLobby: Fact = {
      kind: 'access',
      who: 'char_maya',
      door: 'door_lobby',
      at: 1421,
    };
    const atOffice: Fact = {
      kind: 'at',
      who: 'char_maya',
      where: 'loc_office',
      from: 1400,
      to: 1430,
    };

    it('positive case: access door of loc_lobby while present at loc_office contradicts', () => {
      const res = contradicts(accessDoorLobby, atOffice, ctx);
      expect(res?.ruleId).toBe('access.presence');
      expect(contradicts(atOffice, accessDoorLobby, ctx)?.ruleId).toBe('access.presence');
    });

    it('negative case: access door belonging to current location', () => {
      const accessDoorOffice: Fact = {
        kind: 'access',
        who: 'char_maya',
        door: 'door_office',
        at: 1421,
      };
      expect(contradicts(accessDoorOffice, atOffice, ctx)).toBeNull();
    });

    it('boundary case: access at end boundary of interval (at === to) does not contradict', () => {
      const accessAtEnd: Fact = {
        kind: 'access',
        who: 'char_maya',
        door: 'door_lobby',
        at: 1430,
      };
      const noTravelCtx: LogicContext = { ...ctx, getTravelTime: () => null };
      expect(contradicts(accessAtEnd, atOffice, noTravelCtx)).toBeNull();
    });
  });

  describe('Rule 6: possess.exclusive', () => {
    const possessMaya: Fact = {
      kind: 'possess',
      who: 'char_maya',
      what: 'obj_laptop',
      from: 500,
      to: 600,
    };
    const possessArjunOverlap: Fact = {
      kind: 'possess',
      who: 'char_arjun',
      what: 'obj_laptop',
      from: 550,
      to: 650,
    };
    const possessArjunTouching: Fact = {
      kind: 'possess',
      who: 'char_arjun',
      what: 'obj_laptop',
      from: 600,
      to: 700,
    };

    it('positive case: overlapping exclusive possession contradicts', () => {
      const res = contradicts(possessMaya, possessArjunOverlap, ctx);
      expect(res?.ruleId).toBe('possess.exclusive');
      expect(contradicts(possessArjunOverlap, possessMaya, ctx)?.ruleId).toBe('possess.exclusive');
    });

    it('negative case: same person possessing across overlapping intervals', () => {
      const possessMayaSecond: Fact = {
        kind: 'possess',
        who: 'char_maya',
        what: 'obj_laptop',
        from: 550,
        to: 650,
      };
      expect(contradicts(possessMaya, possessMayaSecond, ctx)).toBeNull();
    });

    it('boundary case: touching intervals [500, 600) and [600, 700) do NOT contradict', () => {
      expect(contradicts(possessMaya, possessArjunTouching, ctx)).toBeNull();
    });
  });

  describe('Rule 7: state.value', () => {
    const stateOpen: Fact = {
      kind: 'state',
      what: 'obj_safe',
      property: 'locked',
      value: 'false',
      at: 1400,
    };
    const stateLocked: Fact = {
      kind: 'state',
      what: 'obj_safe',
      property: 'locked',
      value: 'true',
      at: 1400,
    };

    it('positive case: same object and property with conflicting values at same time contradicts', () => {
      const res = contradicts(stateOpen, stateLocked, ctx);
      expect(res?.ruleId).toBe('state.value');
      expect(contradicts(stateLocked, stateOpen, ctx)?.ruleId).toBe('state.value');
    });

    it('negative case: same value at same time', () => {
      expect(contradicts(stateOpen, { ...stateOpen }, ctx)).toBeNull();
    });

    it('boundary case: different timestamps allow state transition', () => {
      const stateLockedLater: Fact = { ...stateLocked, at: 1401 };
      expect(contradicts(stateOpen, stateLockedLater, ctx)).toBeNull();
    });
  });

  describe('Rule 8: presence.travel', () => {
    // Travel time between loc_lobby and loc_office is 10 minutes
    const atLobby: Fact = { kind: 'at', who: 'char_maya', where: 'loc_lobby', from: 600, to: 700 };
    const atOfficeTooFast: Fact = {
      kind: 'at',
      who: 'char_maya',
      where: 'loc_office',
      from: 705,
      to: 800,
    };
    const atOfficeSufficient: Fact = {
      kind: 'at',
      who: 'char_maya',
      where: 'loc_office',
      from: 715,
      to: 800,
    };
    const atOfficeExactBoundary: Fact = {
      kind: 'at',
      who: 'char_maya',
      where: 'loc_office',
      from: 710,
      to: 800,
    };

    it('positive case: travel between locations faster than travelTime contradicts', () => {
      const res = contradicts(atLobby, atOfficeTooFast, ctx);
      expect(res?.ruleId).toBe('presence.travel');
      expect(contradicts(atOfficeTooFast, atLobby, ctx)?.ruleId).toBe('presence.travel');
    });

    it('negative case: travel time gap >= travelTime does not contradict', () => {
      expect(contradicts(atLobby, atOfficeSufficient, ctx)).toBeNull();
    });

    it('boundary case: travel gap exactly equals travelTime (10 min) does not contradict', () => {
      expect(contradicts(atLobby, atOfficeExactBoundary, ctx)).toBeNull();
    });

    it('handles action and access events with travel time constraints', () => {
      const accessLobbyAt700: Fact = {
        kind: 'access',
        who: 'char_maya',
        door: 'door_lobby',
        at: 700,
      };
      const actionOfficeAt705: Fact = {
        kind: 'action',
        who: 'char_maya',
        verb: 'sent',
        where: 'loc_office',
        at: 705,
      };
      const res = contradicts(accessLobbyAt700, actionOfficeAt705, ctx);
      expect(res?.ruleId).toBe('presence.travel');

      // Reverse order where p2 precedes p1
      const actionOfficeEarly: Fact = {
        kind: 'action',
        who: 'char_maya',
        verb: 'sent',
        where: 'loc_office',
        at: 600,
      };
      const accessLobbyLate: Fact = {
        kind: 'access',
        who: 'char_maya',
        door: 'door_lobby',
        at: 605,
      };
      const resReverse = contradicts(accessLobbyLate, actionOfficeEarly, ctx);
      expect(resReverse?.ruleId).toBe('presence.travel');
    });

    it('falls back to reverse lookup if one-way travel time was recorded in context', () => {
      const oneWayCtx: LogicContext = {
        doorLocations: {},
        deviceOwners: {},
        travelTimes: {
          loc_a: { loc_b: 20 },
        },
        getTravelTime(a, b) {
          if (a === b) return 0;
          const direct = this.travelTimes[a]?.[b];
          if (direct !== undefined) return direct;
          const reverse = this.travelTimes[b]?.[a];
          if (reverse !== undefined) return reverse;
          return null;
        },
      };
      expect(oneWayCtx.getTravelTime('loc_b', 'loc_a')).toBe(20);
    });
  });
});

describe('Property test for symmetry (fast-check)', () => {
  const arbitraryId = fc.stringMatching(/^[a-z0-9_]{1,10}$/);
  const arbitraryTime = fc.integer({ min: 0, max: 2879 });

  const arbitraryFact: fc.Arbitrary<Fact> = fc.oneof(
    fc
      .record({
        who: arbitraryId,
        where: arbitraryId,
        t1: arbitraryTime,
        t2: arbitraryTime,
      })
      .map(({ who, where, t1, t2 }) => ({
        kind: 'at' as const,
        who,
        where,
        from: Math.min(t1, t2),
        to: Math.max(t1, t2),
      })),
    fc.record({
      kind: fc.constant('action' as const),
      who: arbitraryId,
      verb: fc.constantFrom(
        'took',
        'placed',
        'sent',
        'deleted',
        'edited',
        'opened',
        'met',
        'called',
        'paid',
      ),
      at: arbitraryTime,
      where: fc.option(arbitraryId, { nil: undefined }),
    }),
    fc
      .record({
        who: arbitraryId,
        what: arbitraryId,
        t1: arbitraryTime,
        t2: arbitraryTime,
      })
      .map(({ who, what, t1, t2 }) => ({
        kind: 'possess' as const,
        who,
        what,
        from: Math.min(t1, t2),
        to: Math.max(t1, t2),
      })),
    fc.record({
      kind: fc.constant('message' as const),
      msg: arbitraryId,
      sender: arbitraryId,
      device: arbitraryId,
      recipient: arbitraryId,
      sentAt: arbitraryTime,
    }),
    fc.record({
      kind: fc.constant('device_use' as const),
      device: arbitraryId,
      by: arbitraryId,
      at: arbitraryTime,
    }),
    fc.record({
      kind: fc.constant('access' as const),
      who: arbitraryId,
      door: arbitraryId,
      at: arbitraryTime,
    }),
    fc.record({
      kind: fc.constant('state' as const),
      what: arbitraryId,
      property: arbitraryId,
      value: arbitraryId,
      at: arbitraryTime,
    }),
  );

  const testCtx: LogicContext = {
    doorLocations: { door_a: 'loc_a', door_b: 'loc_b' },
    deviceOwners: { dev_1: 'char_1' },
    travelTimes: { loc_a: { loc_b: 15 }, loc_b: { loc_a: 15 } },
    getTravelTime(a, b) {
      if (a === b) return 0;
      return this.travelTimes[a]?.[b] ?? null;
    },
  };

  it('proves contradicts(a, b) === contradicts(b, a) for 1000 generated fact pairs', () => {
    fc.assert(
      fc.property(arbitraryFact, arbitraryFact, (a, b) => {
        const ab = contradicts(a, b, testCtx);
        const ba = contradicts(b, a, testCtx);

        if (ab === null) {
          expect(ba).toBeNull();
        } else {
          expect(ba).not.toBeNull();
          expect(ab.ruleId).toBe(ba?.ruleId);
        }
      }),
      { numRuns: 1000 },
    );
  });
});

describe('factEntailed', () => {
  const ctx: LogicContext = {
    doorLocations: { door_exit: 'loc_lobby' },
    deviceOwners: {},
    travelTimes: {},
    getTravelTime: () => null,
  };

  const timeline: Fact[] = [
    { kind: 'at', who: 'char_maya', where: 'loc_office', from: 600, to: 800 },
    { kind: 'possess', who: 'char_maya', what: 'obj_badge', from: 500, to: 900 },
    { kind: 'action', who: 'char_arjun', verb: 'sent', where: 'loc_lobby', at: 750 },
    { kind: 'access', who: 'char_rhea', door: 'door_exit', at: 820 },
    {
      kind: 'message',
      msg: 'm1',
      sender: 'char_arjun',
      device: 'obj_phone',
      recipient: 'char_maya',
      sentAt: 750,
    },
    { kind: 'relation', a: 'char_maya', b: 'char_arjun', rel: 'colleague' },
  ];

  it('entails facts by exact match', () => {
    expect(factEntailed(timeline[0]!, timeline, ctx)).toBe(true);
  });

  it('entails sub-intervals for presence and possession', () => {
    const subAt: Fact = { kind: 'at', who: 'char_maya', where: 'loc_office', from: 650, to: 750 };
    expect(factEntailed(subAt, timeline, ctx)).toBe(true);

    const outsideAt: Fact = {
      kind: 'at',
      who: 'char_maya',
      where: 'loc_office',
      from: 550,
      to: 750,
    };
    expect(factEntailed(outsideAt, timeline, ctx)).toBe(false);

    const subPossess: Fact = {
      kind: 'possess',
      who: 'char_maya',
      what: 'obj_badge',
      from: 600,
      to: 700,
    };
    expect(factEntailed(subPossess, timeline, ctx)).toBe(true);
  });

  it('entails instantaneous presence from action and door access', () => {
    const actionPresence: Fact = {
      kind: 'at',
      who: 'char_arjun',
      where: 'loc_lobby',
      from: 750,
      to: 750,
    };
    expect(factEntailed(actionPresence, timeline, ctx)).toBe(true);

    const accessPresence: Fact = {
      kind: 'at',
      who: 'char_rhea',
      where: 'loc_lobby',
      from: 820,
      to: 820,
    };
    expect(factEntailed(accessPresence, timeline, ctx)).toBe(true);
  });

  it('entails device use from sent message', () => {
    const deviceUse: Fact = { kind: 'device_use', device: 'obj_phone', by: 'char_arjun', at: 750 };
    expect(factEntailed(deviceUse, timeline, ctx)).toBe(true);

    const deviceUseWrongPerson: Fact = {
      kind: 'device_use',
      device: 'obj_phone',
      by: 'char_maya',
      at: 750,
    };
    expect(factEntailed(deviceUseWrongPerson, timeline, ctx)).toBe(false);
  });

  it('entails symmetric relations', () => {
    const reversedRelation: Fact = {
      kind: 'relation',
      a: 'char_arjun',
      b: 'char_maya',
      rel: 'colleague',
    };
    expect(factEntailed(reversedRelation, timeline, ctx)).toBe(true);
  });
});

describe('evaluateHypothesis & survivingHypotheses', () => {
  const ctx: LogicContext = {
    doorLocations: { door_exit: 'loc_lobby' },
    deviceOwners: { obj_phone: 'char_maya' },
    travelTimes: {},
    getTravelTime: () => null,
  };

  const physicalClue: Clue = {
    id: 'clue_device_log',
    type: 'device_log',
    reliability: 'physical',
    asserts: [{ kind: 'device_use', device: 'obj_phone', by: 'char_arjun', at: 1427 }],
    unlock: { kind: 'default' },
  };

  const testimonyClue: Clue = {
    id: 'clue_testimony',
    type: 'testimony',
    reliability: 'testimony',
    asserts: [
      {
        kind: 'message',
        msg: 'm1',
        sender: 'char_maya',
        device: 'obj_phone',
        recipient: 'char_arjun',
        sentAt: 1427,
      },
    ],
    unlock: { kind: 'default' },
  };

  const hMayaSent: Hypothesis = {
    id: 'h_maya_sent',
    label: 'Maya sent the message',
    claims: [
      {
        kind: 'message',
        msg: 'm1',
        sender: 'char_maya',
        device: 'obj_phone',
        recipient: 'char_arjun',
        sentAt: 1427,
      },
    ],
    culpritIds: ['char_maya'],
  };

  const hArjunForged: Hypothesis = {
    id: 'h_arjun_forged',
    label: 'Arjun forged the message',
    claims: [{ kind: 'device_use', device: 'obj_phone', by: 'char_arjun', at: 1427 }],
    culpritIds: ['char_arjun'],
  };

  it('only PHYSICAL clues eliminate hypotheses', () => {
    // Evaluating against testimony only: does NOT eliminate hMayaSent even if facts conflict
    const evalWithTestimony = evaluateHypothesis(hArjunForged, [testimonyClue], ctx);
    expect(evalWithTestimony.eliminated).toBe(false);

    // Evaluating against physical clue: device_use by Arjun contradicts message claims of sender Maya
    const evalMaya = evaluateHypothesis(hMayaSent, [physicalClue], ctx);
    expect(evalMaya.eliminated).toBe(true);
    expect(evalMaya.by[0]?.ruleId).toBe('message.sender_device');

    // Arjun hypothesis is consistent with physical clue
    const evalArjun = evaluateHypothesis(hArjunForged, [physicalClue], ctx);
    expect(evalArjun.eliminated).toBe(false);
  });

  it('survivingHypotheses returns only uneliminated hypotheses', () => {
    const testCase: CaseDefinition = {
      id: 'case_0001',
      version: 1,
      kind: 'authored',
      title: 'Case',
      difficulty: 1,
      estimatedMinutes: 5,
      mysteryType: 'false_alibi',
      setting: { locationIds: ['loc_office'], date: '2026-10-29', summary: 'Summary' },
      briefing: 'Briefing',
      characters: [],
      locations: [],
      objects: [{ id: 'obj_phone', name: 'Phone', type: 'device', ownerId: 'char_maya' }],
      clues: [physicalClue, testimonyClue],
      hypotheses: [hMayaSent, hArjunForged],
      truth: {
        timeline: physicalClue.asserts,
        culpritIds: ['char_arjun'],
        liars: [],
        solutionHypothesisId: 'h_arjun_forged',
        keyEvidence: [['clue_device_log']],
        explanation: [{ time: 1427, text: 'Arjun forged it', clueIds: ['clue_device_log'] }],
      },
      meta: { status: 'draft' },
    };

    // With no clues active, both survive
    expect(survivingHypotheses(testCase, [])).toHaveLength(2);

    // With physicalClue active, hMayaSent is eliminated, only hArjunForged survives
    const surviving = survivingHypotheses(testCase, ['clue_device_log'], ctx);
    expect(surviving).toHaveLength(1);
    expect(surviving[0]?.id).toBe('h_arjun_forged');
  });
});
