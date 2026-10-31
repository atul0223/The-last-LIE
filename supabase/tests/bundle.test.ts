import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

describe('WP-61 Engine Bundle Correctness & Portability Suite', () => {
  const bundlePath = path.resolve(__dirname, '../functions/_shared/engine.js');

  beforeAll(() => {
    // Ensure the engine bundle is freshly built
    execSync('pnpm build:engine', {
      cwd: path.resolve(__dirname, '../..'),
      stdio: 'pipe',
    });
    expect(fs.existsSync(bundlePath)).toBe(true);
  });

  it('contains no Node.js or Deno-specific built-in imports or APIs', () => {
    const bundleContent = fs.readFileSync(bundlePath, 'utf-8');

    // Forbidden runtime imports
    const forbiddenImports = [
      'node:',
      'from "fs"',
      "from 'fs'",
      'from "path"',
      "from 'path'",
      'from "crypto"',
      "from 'crypto'",
      'from "os"',
      "from 'os'",
      'from "child_process"',
      "from 'child_process'",
      'from "http"',
      "from 'http'",
      'from "net"',
      "from 'net'",
      'from "stream"',
      "from 'stream'",
    ];

    for (const forbidden of forbiddenImports) {
      expect(bundleContent).not.toContain(forbidden);
    }

    // Forbidden global access in engine logic
    expect(bundleContent).not.toMatch(/\bprocess\.env\b/);
    expect(bundleContent).not.toMatch(/\bprocess\.cwd\b/);
    expect(bundleContent).not.toMatch(/\bDeno\.[a-zA-Z]/);
  });

  it('exports all core engine functions required by the backend routes', async () => {
    // Dynamically import the bundled ESM module
    const engine = await import(bundlePath);

    // Verify key engine exports used by backend routes
    expect(typeof engine.toPublicCase).toBe('function');
    expect(typeof engine.canUnlock).toBe('function');
    expect(typeof engine.scoreSubmission).toBe('function');
    expect(typeof engine.buildReveal).toBe('function');
    expect(typeof engine.applyResult).toBe('function');
    expect(typeof engine.validateCase).toBe('function');

    // Schemas & utilities
    expect(engine.DEFAULT_PROGRESSION_CONFIG).toBeDefined();
    expect(engine.CaseDefinitionSchema).toBeDefined();
    expect(engine.CasePublicSchema).toBeDefined();
  });
});
