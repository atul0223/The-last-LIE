import fs from 'node:fs';
import path from 'node:path';

/**
 * Converts a glob pattern (with * and **) to a RegExp.
 */
function globToRegExp(pattern: string): RegExp {
  const normalized = pattern.replace(/\\/g, '/');
  let regexStr = '^';

  let i = 0;
  while (i < normalized.length) {
    const c = normalized[i];
    if (!c) break;
    if (c === '*') {
      if (normalized[i + 1] === '*') {
        if (normalized[i + 2] === '/') {
          regexStr += '(?:.+/)?';
          i += 3;
        } else {
          regexStr += '.*';
          i += 2;
        }
      } else {
        regexStr += '[^/]*';
        i += 1;
      }
    } else if (c === '?') {
      regexStr += '[^/]';
      i += 1;
    } else if (['.', '+', '^', '$', '(', ')', '[', ']', '{', '}', '|', '\\'].includes(c)) {
      regexStr += `\\${c}`;
      i += 1;
    } else {
      regexStr += c;
      i += 1;
    }
  }

  regexStr += '$';
  return new RegExp(regexStr);
}

/**
 * Recursively scans directory and matches files against a glob pattern.
 * Supports both relative patterns (e.g. `*.json`, `src/**`) and absolute paths.
 */
export function matchGlobFiles(pattern: string, cwd: string = process.cwd()): string[] {
  const isAbsolute = path.isAbsolute(pattern);
  const normalizedPattern = (isAbsolute ? pattern : path.resolve(cwd, pattern)).replace(/\\/g, '/');
  const regex = globToRegExp(normalizedPattern);

  // Extract base search directory before any glob wildcards
  const parts = normalizedPattern.split('/');
  const baseParts: string[] = [];
  for (const part of parts) {
    if (part.includes('*') || part.includes('?')) break;
    baseParts.push(part);
  }

  let baseDir = baseParts.join('/');
  if (!baseDir) {
    baseDir = cwd;
  }
  // On Windows, drive letter like 'C:' needs trailing slash 'C:/'
  if (/^[A-Za-z]:$/.test(baseDir)) {
    baseDir += '/';
  }

  let startDir = cwd;
  if (fs.existsSync(baseDir)) {
    startDir = fs.statSync(baseDir).isDirectory() ? baseDir : path.dirname(baseDir);
  }

  const results: string[] = [];

  function walk(dir: string) {
    if (!fs.existsSync(dir)) return;
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name !== 'node_modules' && entry.name !== '.git' && entry.name !== 'dist') {
            walk(fullPath);
          }
        } else if (entry.isFile()) {
          const normalizedFullPath = fullPath.replace(/\\/g, '/');
          if (regex.test(normalizedFullPath)) {
            results.push(fullPath);
          }
        }
      }
    } catch {
      // Ignore unreadable directories
    }
  }

  walk(startDir);
  return results;
}
