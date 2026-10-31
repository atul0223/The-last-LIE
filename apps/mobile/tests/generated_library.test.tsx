import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import renderer, { act } from 'react-test-renderer';

// Provide minimal document mock for react-native-web TextInput in node test environment
if (typeof global.document === 'undefined') {
  // @ts-expect-error minimal document mock
  global.document = {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    createElement: vi.fn().mockReturnValue({}),
  };
}

import { LocalGameService } from '../src/services/local/LocalGameService';
import { filterCases } from '../src/features/library/filterCases';
import {
  caseDefinitionToCatalogItem,
  getCaseCatalog,
  type CaseCatalogItem,
} from '../src/features/library/catalog';
import { selectNextCase } from '../src/features/home/selectNextCase';
import { fixtureGeneratedCases } from './fixtures/generated_cases.fixture';
import { useSessionStore } from '../src/store';
import LibraryFeature from '../src/features/library';
import { setAppNavigator } from '../src/features/home/navigation';

const FORBIDDEN_LEAK_KEYS = new Set([
  'truth',
  'claims',
  'culpritIds',
  'seed',
  'asserts',
  'keyEvidence',
  'liars',
  'conspiracyHooks',
  'red_herring',
]);

function deepScan(value: unknown, path: string = 'root'): void {
  if (value === null || value === undefined) return;

  if (typeof value === 'object') {
    if (Array.isArray(value)) {
      value.forEach((item, idx) => deepScan(item, `${path}[${idx}]`));
    } else {
      const record = value as Record<string, unknown>;

      for (const [key, val] of Object.entries(record)) {
        if (FORBIDDEN_LEAK_KEYS.has(key)) {
          throw new Error(`Security leak detected: key '${key}' found at path '${path}.${key}'`);
        }
        deepScan(val, `${path}.${key}`);
      }

      // If clue has locked: true, ensure its text is not present
      if (record.locked === true && typeof record.text === 'string' && record.text.length > 0) {
        throw new Error(`Security leak detected: locked clue exposed text at path '${path}'`);
      }
    }
  }
}

describe('WP-26: Generated Cases in the Library & Service', () => {
  beforeEach(() => {
    useSessionStore.getState().clear();
    setAppNavigator(vi.fn());
  });

  describe('LocalGameService with Generated Cases', () => {
    it('loads generated cases alongside authored cases and starts a session', async () => {
      const service = new LocalGameService({ generatedCases: fixtureGeneratedCases });
      const genCase = fixtureGeneratedCases[0]!;

      const { session, case: publicCase } = await service.startSession({
        caseId: genCase.id,
      });

      expect(session).toBeDefined();
      expect(session.caseId).toBe(genCase.id);
      expect(session.status).toBe('in_progress');
      expect(publicCase.id).toBe(genCase.id);
      expect(publicCase.title).toBe(genCase.title);
    });

    it('enforces deepScan security: never leaks solution fields or locked clue texts for generated cases', async () => {
      const service = new LocalGameService({ generatedCases: fixtureGeneratedCases });
      const genCase = fixtureGeneratedCases[1]!;

      const { session, case: publicCase } = await service.startSession({
        caseId: genCase.id,
      });

      // Strict leak check on initial session and publicCase
      expect(() => deepScan(publicCase, 'publicCase')).not.toThrow();
      expect(() => deepScan(session, 'session')).not.toThrow();

      // Ensure locked clues have placeholder ids and no text
      const realClueIds = new Set(genCase.clues.map((c) => c.id));
      const lockedClues = publicCase.clues.filter((c) => c.locked === true);
      for (const locked of lockedClues) {
        expect('text' in locked).toBe(false);
        expect(locked.id).toMatch(/^locked_/);
        expect(realClueIds.has(locked.id)).toBe(false);
      }

      // Find a non-default clue from the case definition
      const nonDefaultClue = genCase.clues.find((c) => c.unlock.kind !== 'default');
      if (nonDefaultClue) {
        const unlocked = await service.unlockClue(session.id, nonDefaultClue.id, nonDefaultClue.unlock);
        expect(() => deepScan(unlocked, 'unlockedClue')).not.toThrow();
        expect(unlocked.id).toBe(nonDefaultClue.id);
        expect(unlocked.locked).toBeFalsy();
        if (!unlocked.locked) {
          expect(unlocked.text).toBeDefined();
        }
      }
    });
  });

  describe('Catalog & Filter Logic (WP-26)', () => {
    const genItem1 = caseDefinitionToCatalogItem(fixtureGeneratedCases[0]!);
    const genItem2 = caseDefinitionToCatalogItem(fixtureGeneratedCases[1]!);

    const mixedCatalog: CaseCatalogItem[] = [
      {
        id: 'case_0001',
        code: 'CASE-0001',
        title: 'The Missing Message',
        briefing: 'B1',
        summary: 'S1',
        difficulty: 1,
        mysteryType: 'forged_message',
        estimatedMinutes: 6,
        hypothesesCount: 3,
        cluesCount: 7,
        kind: 'authored',
      },
      {
        id: 'case_0002',
        code: 'CASE-0002',
        title: 'The Missing Astrum',
        briefing: 'B2',
        summary: 'S2',
        difficulty: 2,
        mysteryType: 'missing_item',
        estimatedMinutes: 8,
        hypothesesCount: 3,
        cluesCount: 8,
        kind: 'authored',
      },
      genItem1,
      genItem2,
    ];

    it('filters correctly for Authored vs Generated cases', () => {
      // 1. All sources
      const all = filterCases(mixedCatalog, { origin: 'all' });
      expect(all.length).toBe(4);

      // 2. Authored only
      const authoredOnly = filterCases(mixedCatalog, { origin: 'authored' });
      expect(authoredOnly.length).toBe(2);
      expect(authoredOnly.every((c) => c.kind === 'authored')).toBe(true);
      expect(authoredOnly.map((c) => c.id)).toEqual(['case_0001', 'case_0002']);

      // 3. Generated only
      const generatedOnly = filterCases(mixedCatalog, { origin: 'generated' });
      expect(generatedOnly.length).toBe(2);
      expect(generatedOnly.every((c) => c.kind === 'generated')).toBe(true);
      expect(generatedOnly.map((c) => c.id)).toEqual([genItem1.id, genItem2.id]);
    });

    it('getCaseCatalog incorporates custom generated cases', () => {
      const catalog = getCaseCatalog(fixtureGeneratedCases);
      expect(catalog.some((c) => c.id === fixtureGeneratedCases[0]!.id)).toBe(true);
      expect(catalog.some((c) => c.id === fixtureGeneratedCases[1]!.id)).toBe(true);
      expect(catalog.some((c) => c.kind === 'generated')).toBe(true);
    });
  });

  describe('Home selectNextCase Preference Order (WP-26)', () => {
    const authored1: CaseCatalogItem = {
      id: 'case_0001',
      code: 'CASE-0001',
      title: 'Authored Case 1',
      briefing: 'B1',
      summary: 'S1',
      difficulty: 3, // Further from level 1 than generated case
      mysteryType: 'forged_message',
      estimatedMinutes: 10,
      hypothesesCount: 3,
      cluesCount: 8,
      kind: 'authored',
    };

    const generated1: CaseCatalogItem = {
      id: 'gen_0001',
      code: 'GEN-0001',
      title: 'Procedural Case 1',
      briefing: 'GB1',
      summary: 'GS1',
      difficulty: 1, // Exact match for level 1
      mysteryType: 'false_alibi',
      estimatedMinutes: 5,
      hypothesesCount: 3,
      cluesCount: 6,
      kind: 'generated',
    };

    const generated2: CaseCatalogItem = {
      id: 'gen_0002',
      code: 'GEN-0002',
      title: 'Procedural Case 2',
      briefing: 'GB2',
      summary: 'GS2',
      difficulty: 2,
      mysteryType: 'missing_item',
      estimatedMinutes: 8,
      hypothesesCount: 3,
      cluesCount: 7,
      kind: 'generated',
    };

    it('prefers unplayed AUTHORED case first, even when a generated case is closer to player level', () => {
      const available = [authored1, generated1, generated2];
      const result = selectNextCase(available, [], 1);

      // Must prefer authored1 first!
      expect(result.kind).toBe('unplayed');
      expect(result.caseItem?.id).toBe('case_0001');
      expect(result.caseItem?.kind).toBe('authored');
    });

    it('picks generated cases at player level when all authored cases are solved', () => {
      const available = [authored1, generated1, generated2];
      // player solved case_0001
      const result = selectNextCase(available, ['case_0001'], 2);

      expect(result.kind).toBe('unplayed');
      // Player level 2 -> generated2 (diff 2) is closer than generated1 (diff 1)
      expect(result.caseItem?.id).toBe('gen_0002');
      expect(result.caseItem?.kind).toBe('generated');
    });

    it('falls back to archive replay when both authored and generated are solved', () => {
      const available = [authored1, generated1];
      const result = selectNextCase(available, ['case_0001', 'gen_0001'], 1);

      expect(result.kind).toBe('archive_replay');
      expect(result.caseItem).toBeDefined();
    });
  });

  describe('LibraryFeature Component Badge & Filter Rendering', () => {
    it('renders the Generated badge and source filters', () => {
      let root: renderer.ReactTestRenderer | undefined;
      act(() => {
        root = renderer.create(<LibraryFeature />);
      });

      const jsonStr = JSON.stringify(root!.toJSON());
      expect(jsonStr).toContain('SOURCE');
      expect(jsonStr).toContain('ALL SOURCES');
      expect(jsonStr).toContain('AUTHORED');
      expect(jsonStr).toContain('GENERATED');
    });
  });
});
