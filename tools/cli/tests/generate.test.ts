import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { runGenerate, getTemplateRegistry } from '../src/generate/index.js';
import { getRepoRoot, SecurityError } from '../src/utils/security.js';
import { validateCase, type CaseDefinition, type Difficulty } from '@lastlie/case-engine';

describe('WP-35b: Authoring CLI Generate Command', () => {
  let tmpDir: string;
  let repoRoot: string;

  beforeEach(() => {
    repoRoot = getRepoRoot();
    tmpDir = fs.mkdtempSync(path.join(repoRoot, 'tools', 'cli', 'tests', 'tmp-gen-'));
  });

  afterEach(() => {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  describe('Template Registry', () => {
    it('discovers builtin and procedural templates with aliases', () => {
      const registry = getTemplateRegistry();
      expect(registry.has('tpl_toy_two_rooms')).toBe(true);
      expect(registry.has('toy')).toBe(true);

      // Verify procedural templates merged from engine
      expect(registry.has('tpl_false_alibi_v1') || registry.has('false_alibi')).toBe(true);
      expect(registry.has('tpl_missing_item_v1') || registry.has('missing_item')).toBe(true);
    });
  });

  describe('generate execution', () => {
    it('generates a single valid case from toy template with summary.json', () => {
      const outDir = path.join(tmpDir, 'toy_out');
      const result = runGenerate({
        template: 'tpl_toy_two_rooms',
        count: 1,
        difficulty: 1,
        seed: 42,
        out: outDir,
        cwd: tmpDir,
        repoRoot,
      });

      expect(result.count).toBe(1);
      expect(result.seed).toBe(42);
      expect(result.cases).toHaveLength(1);

      const caseEntry = result.cases[0]!;
      expect(caseEntry.attempts).toBeGreaterThanOrEqual(1);

      // Check files on disk
      const caseFilePath = path.join(outDir, caseEntry.file);
      expect(fs.existsSync(caseFilePath)).toBe(true);

      const summaryFilePath = path.join(outDir, 'summary.json');
      expect(fs.existsSync(summaryFilePath)).toBe(true);

      const parsedCase = JSON.parse(fs.readFileSync(caseFilePath, 'utf-8')) as CaseDefinition;
      expect(parsedCase.id).toBe(caseEntry.id);

      // Case must pass engine validation
      const validation = validateCase(parsedCase);
      expect(validation.ok).toBe(true);
      expect(validation.errors).toHaveLength(0);

      // Check summary.json structure
      const summary = JSON.parse(fs.readFileSync(summaryFilePath, 'utf-8'));
      expect(summary.template).toBe('tpl_toy_two_rooms');
      expect(summary.difficulty).toBe(1);
      expect(summary.seed).toBe(42);
      expect(summary.attempts).toBe(caseEntry.attempts);
      expect(summary.measuredDifficulty).toBe(caseEntry.measuredDifficulty);
      expect(Array.isArray(summary.cases)).toBe(true);
      expect(summary.cases).toHaveLength(1);
    });

    it('generates multiple cases with incremental seeds', () => {
      const outDir = path.join(tmpDir, 'multi_out');
      const result = runGenerate({
        template: 'toy',
        count: 3,
        difficulty: 2,
        seed: 100,
        out: outDir,
        cwd: tmpDir,
        repoRoot,
      });

      expect(result.count).toBe(3);
      expect(result.cases).toHaveLength(3);
      expect(result.cases[0]?.seed).toBe(100);
      expect(result.cases[1]?.seed).toBe(101);
      expect(result.cases[2]?.seed).toBe(102);

      for (const entry of result.cases) {
        const filePath = path.join(outDir, entry.file);
        expect(fs.existsSync(filePath)).toBe(true);
        const def = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as CaseDefinition;
        const report = validateCase(def);
        expect(report.ok).toBe(true);
      }

      const summary = JSON.parse(fs.readFileSync(path.join(outDir, 'summary.json'), 'utf-8'));
      expect(summary.count).toBe(3);
      expect(summary.cases).toHaveLength(3);
    });

    it('generates using real templates via friendly alias', () => {
      const outDir = path.join(tmpDir, 'false_alibi_out');
      const result = runGenerate({
        template: 'false_alibi',
        count: 1,
        difficulty: 1,
        seed: 777,
        out: outDir,
        cwd: tmpDir,
        repoRoot,
      });

      expect(result.count).toBe(1);
      const caseFilePath = path.join(outDir, result.cases[0]!.file);
      const def = JSON.parse(fs.readFileSync(caseFilePath, 'utf-8')) as CaseDefinition;
      const report = validateCase(def);
      expect(report.ok).toBe(true);
    });
  });

  describe('Validation & Error Handling', () => {
    it('throws on unknown template', () => {
      expect(() =>
        runGenerate({
          template: 'non_existent_template',
          count: 1,
          difficulty: 1,
          out: path.join(tmpDir, 'err_out'),
          cwd: tmpDir,
          repoRoot,
        }),
      ).toThrow(/Unknown template 'non_existent_template'/);
    });

    it('throws on invalid difficulty level', () => {
      expect(() =>
        runGenerate({
          template: 'toy',
          count: 1,
          difficulty: 5 as unknown as Difficulty,
          out: path.join(tmpDir, 'err_out'),
          cwd: tmpDir,
          repoRoot,
        }),
      ).toThrow(/Difficulty must be 1, 2, 3, or 4/);
    });

    it('throws on invalid count', () => {
      expect(() =>
        runGenerate({
          template: 'toy',
          count: 0,
          difficulty: 1,
          out: path.join(tmpDir, 'err_out'),
          cwd: tmpDir,
          repoRoot,
        }),
      ).toThrow(/Count must be at least 1/);
    });
  });

  describe('Security & Path Safety', () => {
    it('prevents writing outside repo root', () => {
      expect(() =>
        runGenerate({
          template: 'toy',
          count: 1,
          difficulty: 1,
          out: path.resolve(repoRoot, '..', 'escaped_out'),
          cwd: tmpDir,
          repoRoot,
        }),
      ).toThrow(SecurityError);
    });
  });
});
