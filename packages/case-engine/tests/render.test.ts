import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { CaseDefinition, Clue, Fact } from '../src/schema/index.js';
import { fromTime } from '../src/schema/time.js';
import { createRng } from '../src/rng.js';
import {
  buildRenderWorld,
  formatEntityId,
  renderClue,
  renderFact,
} from '../src/render/index.js';

describe('WP-30 Prose Rendering Engine', () => {
  const case0001Path = resolve(__dirname, '../../content/cases/authored/case_0001.json');
  const raw = readFileSync(case0001Path, 'utf-8');
  const case0001 = JSON.parse(raw) as CaseDefinition;
  const world = buildRenderWorld(case0001);

  describe('formatEntityId and buildRenderWorld', () => {
    it('formats arbitrary entity IDs without raw prefixes', () => {
      expect(formatEntityId('door_courtyard_gate')).toBe('Courtyard Gate');
      expect(formatEntityId('char_maya')).toBe('Maya');
      expect(formatEntityId('loc_studio')).toBe('Studio');
      expect(formatEntityId('obj_phone_maya')).toBe('Phone Maya');
      expect(formatEntityId('')).toBe('Unknown Entity');
    });

    it('resolves registered entities to authored display names', () => {
      expect(world.getName('char_maya')).toBe('Maya Lin');
      expect(world.getName('char_arjun')).toBe('Arjun Mehta');
      expect(world.getName('loc_studio')).toBe('4th Floor Design Studio');
      expect(world.getName('obj_phone_maya')).toBe("Maya's Work Phone");
      expect(world.getName('door_lobby_exit')).toBe('Lobby Exit');
      // Unregistered fallback
      expect(world.getName('char_ghost_shadow')).toBe('Ghost Shadow');
    });
  });

  describe('Fact Rendering - All Fact Kinds & Phrasing Variants', () => {
    const allFactSamples: Fact[] = [
      {
        kind: 'at',
        who: 'char_maya',
        where: 'loc_studio',
        from: 1420,
        to: 1435,
      },
      {
        kind: 'action',
        who: 'char_arjun',
        verb: 'opened',
        target: 'obj_phone_maya',
        at: 1425,
        where: 'loc_studio',
      },
      {
        kind: 'action',
        who: 'char_arjun',
        verb: 'deleted',
        target: 'obj_phone_maya',
        at: 1426,
      },
      {
        kind: 'action',
        who: 'char_maya',
        verb: 'met',
        at: 1410,
        where: 'loc_lobby',
      },
      {
        kind: 'action',
        who: 'char_marcus',
        verb: 'called',
        at: 1400,
      },
      {
        kind: 'possess',
        who: 'char_maya',
        what: 'obj_phone_maya',
        from: 1380,
        to: 1420,
      },
      {
        kind: 'message',
        msg: 'msg_2347',
        sender: 'char_arjun',
        device: 'obj_phone_maya',
        recipient: 'char_arjun',
        sentAt: 1427,
      },
      {
        kind: 'device_use',
        device: 'obj_phone_maya',
        by: 'char_arjun',
        at: 1427,
      },
      {
        kind: 'access',
        who: 'char_maya',
        door: 'door_lobby_exit',
        at: 1421,
      },
      {
        kind: 'relation',
        a: 'char_maya',
        b: 'char_arjun',
        rel: 'colleague',
      },
      {
        kind: 'motive',
        who: 'char_arjun',
        motive: 'alibi_fabrication',
        regarding: 'char_maya',
      },
      {
        kind: 'motive',
        who: 'char_rhea',
        motive: 'promotion',
      },
      {
        kind: 'state',
        what: 'obj_phone_maya',
        property: 'lock_screen',
        value: 'unlocked',
        at: 1427,
      },
    ];

    it('every fact kind renders non-empty text without raw IDs, "undefined", or "NaN"', () => {
      const rng = createRng(42);
      for (const fact of allFactSamples) {
        const text = renderFact(fact, world, rng);
        expect(text).toBeTruthy();
        expect(text.length).toBeGreaterThan(10);
        expect(text).not.toContain('undefined');
        expect(text).not.toContain('NaN');
        expect(text).not.toContain('char_');
        expect(text).not.toContain('loc_');
        expect(text).not.toContain('obj_');
        expect(text).not.toContain('door_');
        expect(text).not.toContain('msg_');
      }
    });

    it('each fact kind exhibits ≥2 distinct phrasing variants across seeds', () => {
      for (const fact of allFactSamples) {
        const variants = new Set<string>();
        for (let seed = 1; seed <= 50; seed++) {
          const rng = createRng(seed);
          variants.add(renderFact(fact, world, rng));
        }
        expect(variants.size).toBeGreaterThanOrEqual(2);
      }
    });

    it('message fact supports optional/missing sender gracefully', () => {
      // Pending contract change test
      const factWithoutSender: Fact = {
        kind: 'message',
        msg: 'msg_anon',
        device: 'obj_phone_maya',
        recipient: 'char_arjun',
        sentAt: 1427,
      } as Fact;

      const variants = new Set<string>();
      for (let s = 1; s <= 20; s++) {
        const rng = createRng(s);
        const text = renderFact(factWithoutSender, world, rng);
        expect(text).toContain("Maya's Work Phone");
        expect(text).toContain('Arjun Mehta');
        expect(text).toContain('23:47');
        expect(text).not.toContain('undefined');
        variants.add(text);
      }
      expect(variants.size).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Clue Rendering - All Types & Styling', () => {
    const clueTypes: Clue['type'][] = [
      'message',
      'access_log',
      'device_log',
      'receipt',
      'testimony',
      'photo',
      'document',
      'object',
      'cctv',
    ];

    it('renders all clue types non-empty and without raw IDs, "undefined", or "NaN"', () => {
      const rng = createRng(100);
      for (const type of clueTypes) {
        const syntheticClue: Clue = {
          id: `clue_synth_${type}`,
          type,
          reliability: type === 'testimony' ? 'testimony' : 'physical',
          source: 'char_rhea',
          asserts: [
            {
              kind: 'at',
              who: 'char_rhea',
              where: 'loc_lobby',
              from: 1420,
              to: 1430,
            },
          ],
          unlock: { kind: 'default' },
        };

        const text = renderClue(syntheticClue, world, rng);
        expect(text).toBeTruthy();
        expect(text).not.toContain('undefined');
        expect(text).not.toContain('NaN');
        expect(text).not.toContain('char_');
        expect(text).not.toContain('loc_');
      }
    });

    it('access_log, device_log, and cctv render structured log lines', () => {
      const rng = createRng(101);

      const accessClue: Clue = {
        id: 'clue_test_access',
        type: 'access_log',
        reliability: 'physical',
        asserts: [
          {
            kind: 'access',
            who: 'char_maya',
            door: 'door_lobby_exit',
            at: 1421,
          },
        ],
        unlock: { kind: 'default' },
      };
      const accessText = renderClue(accessClue, world, rng);
      expect(accessText).toMatch(/^\[23:41\]/);
      expect(accessText).toContain('Maya Lin');
      expect(accessText).toContain('LOBBY_EXIT');

      const deviceClue: Clue = {
        id: 'clue_test_device',
        type: 'device_log',
        reliability: 'physical',
        asserts: [
          {
            kind: 'device_use',
            device: 'obj_phone_maya',
            by: 'char_arjun',
            at: 1427,
          },
        ],
        unlock: { kind: 'default' },
      };
      const deviceText = renderClue(deviceClue, world, rng);
      expect(deviceText).toMatch(/^\[23:47\]/);
      expect(deviceText).toContain('Arjun Mehta');
      expect(deviceText).toContain("MAYA'S_WORK_PHONE");

      const cctvClue: Clue = {
        id: 'clue_test_cctv',
        type: 'cctv',
        reliability: 'physical',
        asserts: [
          {
            kind: 'at',
            who: 'char_rhea',
            where: 'loc_lobby',
            from: 1420,
            to: 1430,
          },
        ],
        unlock: { kind: 'default' },
      };
      const cctvText = renderClue(cctvClue, world, rng);
      expect(cctvText).toMatch(/^\[23:40\]/);
      expect(cctvText).toContain('Rhea Vance');
    });

    it('testimony renders as a quote attributed to clue.source', () => {
      const rng = createRng(102);
      const testimonyClue: Clue = {
        id: 'clue_test_testimony',
        type: 'testimony',
        reliability: 'testimony',
        source: 'char_arjun',
        asserts: [
          {
            kind: 'at',
            who: 'char_maya',
            where: 'loc_studio',
            from: 1420,
            to: 1435,
          },
        ],
        unlock: { kind: 'default' },
      };

      const text = renderClue(testimonyClue, world, rng);
      expect(text).toMatch(/^Arjun Mehta (stated|testified|reported): "/);
      expect(text).toContain('Maya Lin');
      expect(text).toContain('4th Floor Design Studio');
    });

    it('returns clue.text unchanged if present and non-empty', () => {
      const rng = createRng(103);
      const clueWithText: Clue = {
        id: 'clue_fixed',
        type: 'access_log',
        reliability: 'physical',
        text: 'Pre-authored unalterable forensic record text.',
        asserts: [],
        unlock: { kind: 'default' },
      };

      expect(renderClue(clueWithText, world, rng)).toBe(
        'Pre-authored unalterable forensic record text.',
      );
    });
  });

  describe('Content Rule (SYSTEM_DESIGN §3.6)', () => {
    it('rendered text for every clue in case_0001 only mentions characters and times in that clue asserts or source', () => {
      const allCharacters = case0001.characters;

      for (const clue of case0001.clues) {
        // Collect allowed character names for this clue
        const allowedCharIds = new Set<string>();
        if (clue.source) {
          allowedCharIds.add(clue.source);
        }
        for (const fact of clue.asserts) {
          if ('who' in fact && fact.who) allowedCharIds.add(fact.who);
          if ('by' in fact && fact.by) allowedCharIds.add(fact.by);
          if ('sender' in fact && fact.sender) allowedCharIds.add(fact.sender);
          if ('recipient' in fact && fact.recipient) allowedCharIds.add(fact.recipient);
          if ('target' in fact && fact.target) allowedCharIds.add(fact.target);
          if ('a' in fact && fact.a) allowedCharIds.add(fact.a);
          if ('b' in fact && fact.b) allowedCharIds.add(fact.b);
        }

        // Collect allowed times (formatted as HH:MM) for this clue
        const allowedTimeStrings = new Set<string>();
        for (const fact of clue.asserts) {
          if ('at' in fact) allowedTimeStrings.add(fromTime(fact.at));
          if ('from' in fact) allowedTimeStrings.add(fromTime(fact.from));
          if ('to' in fact) allowedTimeStrings.add(fromTime(fact.to));
          if ('sentAt' in fact) allowedTimeStrings.add(fromTime(fact.sentAt));
        }

        // Test over several seeds to check all phrasing variants
        for (let seed = 1; seed <= 5; seed++) {
          const rng = createRng(seed);
          const clueWithoutText = { ...clue, text: undefined };
          const rendered = renderClue(clueWithoutText, world, rng);

          // Verify: No unasserted character is mentioned in rendered text
          for (const char of allCharacters) {
            if (!allowedCharIds.has(char.id)) {
              expect(rendered).not.toContain(char.name);
            }
          }

          // Verify: Any times HH:MM in rendered text are in allowedTimeStrings
          const timeMatches = rendered.match(/\b\d{2}:\d{2}\b/g) ?? [];
          for (const t of timeMatches) {
            expect(allowedTimeStrings.has(t)).toBe(true);
          }
        }
      }
    });
  });

  describe('Edge cases and fallbacks', () => {
    it('handles empty asserts or unusual clue types gracefully', () => {
      const rng = createRng(555);

      // Clue with empty asserts
      const emptyAccessClue: Clue = {
        id: 'clue_empty_access',
        type: 'access_log',
        reliability: 'physical',
        asserts: [],
        unlock: { kind: 'default' },
      };
      expect(renderClue(emptyAccessClue, world, rng)).toContain('Access log entry');

      const emptyDeviceClue: Clue = {
        id: 'clue_empty_dev',
        type: 'device_log',
        reliability: 'physical',
        asserts: [],
        unlock: { kind: 'default' },
      };
      expect(renderClue(emptyDeviceClue, world, rng)).toContain('Device log record');

      const emptyMessageClue: Clue = {
        id: 'clue_empty_msg',
        type: 'message',
        reliability: 'physical',
        asserts: [],
        unlock: { kind: 'default' },
      };
      expect(renderClue(emptyMessageClue, world, rng)).toContain('MESSAGE LOG');

      const unknownTypeClue = {
        id: 'clue_custom',
        type: 'custom_type',
        reliability: 'physical',
        asserts: [],
        unlock: { kind: 'default' },
      } as unknown as Clue;
      expect(renderClue(unknownTypeClue, world, rng)).toBe('Evidence clue record.');

      // Unknown fact kind
      const unknownFact = { kind: 'alien_artifact' } as unknown as Fact;
      expect(renderFact(unknownFact, world, rng)).toContain('alien_artifact');

      // formatEntityId and getName with null / whitespace / non-string
      expect(formatEntityId('___')).toBe('Unknown Entity');
      expect(world.getName(null as unknown as string)).toBe('Unknown Entity');
    });
  });

  describe('Snapshot Tests', () => {
    it('matches deterministic snapshot for case_0001 clues at seeds 1, 2, 3', () => {
      const snapshots: Record<string, string[]> = {};

      for (const seed of [1, 2, 3]) {
        const rng = createRng(seed);
        snapshots[`seed_${seed}`] = case0001.clues.map((clue) => {
          const rendered = renderClue({ ...clue, text: undefined }, world, rng);
          return `[${clue.id}]: ${rendered}`;
        });
      }

      expect(snapshots).toMatchSnapshot();
    });
  });
});
