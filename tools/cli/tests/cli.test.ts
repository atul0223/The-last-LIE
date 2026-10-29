import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { Readable, Writable } from 'node:stream';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { runValidate } from '../src/validate/index.js';
import { renderCase } from '../src/render/index.js';
import { runPlaytest } from '../src/playtest/index.js';
import { assertSafePath, SecurityError, getRepoRoot } from '../src/utils/security.js';
import type { CaseDefinition } from '@lastlie/case-engine';

describe('WP-35a: Authoring CLI Core Commands', () => {
  let tmpDir: string;
  let repoRoot: string;
  let realCase0001: CaseDefinition;

  beforeEach(() => {
    repoRoot = getRepoRoot();
    tmpDir = fs.mkdtempSync(path.join(repoRoot, 'tools', 'cli', 'tests', 'tmp-test-'));

    // Load canonical case_0001
    const case0001Path = path.join(
      repoRoot,
      'packages',
      'content',
      'cases',
      'authored',
      'case_0001.json',
    );
    const raw = fs.readFileSync(case0001Path, 'utf-8');
    realCase0001 = JSON.parse(raw) as CaseDefinition;
  });

  afterEach(() => {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  describe('validate command', () => {
    it('validates a correct CaseDefinition and outputs PASS report', () => {
      const casePath = path.join(tmpDir, 'valid_case.json');
      fs.writeFileSync(casePath, JSON.stringify(realCase0001, null, 2), 'utf-8');

      const res = runValidate([casePath], { cwd: tmpDir });
      expect(res.totalFiles).toBe(1);
      expect(res.success).toBe(true);
      expect(res.results[0]?.report.ok).toBe(true);
      expect(res.results[0]?.report.errors).toHaveLength(0);
    });

    it('returns fail status on broken CaseDefinition', () => {
      const brokenDef = {
        ...realCase0001,
        truth: {
          ...realCase0001.truth,
          solutionHypothesisId: 'non_existent_hypothesis',
        },
      };

      const casePath = path.join(tmpDir, 'broken_case.json');
      fs.writeFileSync(casePath, JSON.stringify(brokenDef, null, 2), 'utf-8');

      const res = runValidate([casePath], { cwd: tmpDir });
      expect(res.totalFiles).toBe(1);
      expect(res.success).toBe(false);
      expect(res.results[0]?.report.ok).toBe(false);
      expect((res.results[0]?.report.errors.length ?? 0)).toBeGreaterThan(0);
    });

    it('handles multiple globs across directories', () => {
      const casePath1 = path.join(tmpDir, 'case1.json');
      const casePath2 = path.join(tmpDir, 'case2.json');
      fs.writeFileSync(casePath1, JSON.stringify(realCase0001, null, 2), 'utf-8');
      fs.writeFileSync(casePath2, JSON.stringify(realCase0001, null, 2), 'utf-8');

      const res = runValidate([path.join(tmpDir, '*.json')], { cwd: tmpDir });
      expect(res.totalFiles).toBe(2);
      expect(res.success).toBe(true);
    });
  });

  describe('render command', () => {
    it('renders author view with full ground truth and timeline', () => {
      const casePath = path.join(tmpDir, 'case.json');
      fs.writeFileSync(casePath, JSON.stringify(realCase0001, null, 2), 'utf-8');

      const md = renderCase(casePath, { cwd: tmpDir });
      expect(md).toContain('FULL AUTHOR VIEW');
      expect(md).toContain('Ground Truth');
      expect(md).toContain('hyp_arjun_forged');
      expect(md).toContain('Timeline');
      expect(md).toContain('All Clues');
      expect(md).toContain('Reveal Beats');
    });

    it('renders --public view with zero answer leaks', () => {
      const casePath = path.join(tmpDir, 'case.json');
      fs.writeFileSync(casePath, JSON.stringify(realCase0001, null, 2), 'utf-8');

      const md = renderCase(casePath, { public: true, cwd: tmpDir });

      expect(md).toContain('PUBLIC DOSSIER');
      expect(md).toContain('Persons of Interest');
      expect(md).toContain('Initial Evidence');
      expect(md).toContain('LOCKED CLUE: locked_1');

      // STRICT SECURITY LEAK CHECKS
      expect(md).not.toContain('Ground Truth');
      expect(md).not.toContain('Solution Hypothesis');
      expect(md).not.toContain('clue_keycard_exit'); // real locked clue ID must not leak
      expect(md).not.toContain('clue_phone_pin'); // real locked clue ID must not leak
      expect(md).not.toContain('Turnstile B exit: Maya Lin'); // locked clue text must not leak
    });
  });

  describe('playtest command', () => {
    it('executes interactive terminal playtest session with clues, unlock, linking, and submission', async () => {
      const casePath = path.join(tmpDir, 'case.json');
      fs.writeFileSync(casePath, JSON.stringify(realCase0001, null, 2), 'utf-8');

      // Scripted input sequence solving case_0001
      const commands = [
        'briefing',
        'clues',
        'unlock locked_1',
        'link clue_message_carrier locked_1',
        'links',
        'hypotheses',
        'theory hyp_arjun_forged clue_message_carrier locked_1',
        'submit',
        'quit',
      ];

      const input = Readable.from(commands.map((c) => `${c}\n`));
      let outputBuffer = '';
      const output = new Writable({
        write(chunk, _encoding, callback) {
          outputBuffer += chunk.toString();
          callback();
        },
      });

      await runPlaytest(casePath, { input, output, cwd: tmpDir });

      expect(outputBuffer).toContain('THE LAST LIE — INTERACTIVE TERMINAL PLAYTEST');
      expect(outputBuffer).toContain('The Missing Message');
      expect(outputBuffer).toContain('Unlocked [locked_1');
      expect(outputBuffer).toContain('Linked [clue_message_carrier] ↔ [clue_keycard_exit]');
      expect(outputBuffer).toContain('Working theory set to [hyp_arjun_forged]');
      expect(outputBuffer).toContain('CASE CLOSED — OFFICIAL EVALUATION');
      expect(outputBuffer).toContain('CORRECT IDENTIFICATION');
      expect(outputBuffer).toContain('Exiting playtest session.');
    });
  });

  describe('Path safety & security', () => {
    it('detects and blocks symlinks that escape repository root', () => {
      const outsideDir = fs.mkdtempSync(path.join(os.tmpdir(), 'outside-repo-'));
      const secretFile = path.join(outsideDir, 'secret.json');
      fs.writeFileSync(secretFile, '{"secret": true}', 'utf-8');

      const symlinkPath = path.join(tmpDir, 'escaped_symlink.json');
      try {
        fs.symlinkSync(secretFile, symlinkPath);
        // If symlink creation succeeded, assertSafePath must throw SecurityError
        expect(() => assertSafePath(symlinkPath, repoRoot)).toThrow(SecurityError);
      } catch (err: unknown) {
        // On Windows without Developer Mode, creating symlinks can throw EPERM;
        // if so, test directly validates path check
        if ((err as { code?: string }).code !== 'EPERM') {
          throw err;
        }
      } finally {
        fs.rmSync(outsideDir, { recursive: true, force: true });
      }
    });
  });
});
