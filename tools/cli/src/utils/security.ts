import fs from 'node:fs';
import path from 'node:path';

export class SecurityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SecurityError';
  }
}

/**
 * Finds the monorepo root by looking for pnpm-workspace.yaml or .git
 */
export function getRepoRoot(startDir: string = process.cwd()): string {
  let current = path.resolve(startDir);
  while (true) {
    if (
      fs.existsSync(path.join(current, 'pnpm-workspace.yaml')) ||
      fs.existsSync(path.join(current, '.git'))
    ) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      // Fallback to startDir if reached filesystem root
      return path.resolve(startDir);
    }
    current = parent;
  }
}

/**
 * Ensures that a file or directory path does not follow a symlink outside the repository root.
 */
export function assertSafePath(targetPath: string, repoRoot: string = getRepoRoot()): string {
  const resolved = path.resolve(targetPath);
  const normalizedRoot = path.resolve(repoRoot);

  if (fs.existsSync(resolved)) {
    try {
      const real = fs.realpathSync(resolved);
      const relative = path.relative(normalizedRoot, real);
      if (relative.startsWith('..') || path.isAbsolute(relative)) {
        throw new SecurityError(
          `Security violation: Target path '${targetPath}' resolves to '${real}', escaping repository root '${normalizedRoot}'`,
        );
      }
      return real;
    } catch (err: unknown) {
      if (err instanceof SecurityError) throw err;
      throw new SecurityError(`Could not verify path safety for '${targetPath}': ${String(err)}`);
    }
  }

  // If path does not exist yet (e.g. for creating files), check its nearest existing ancestor
  let ancestor = path.dirname(resolved);
  while (!fs.existsSync(ancestor)) {
    const parent = path.dirname(ancestor);
    if (parent === ancestor) break;
    ancestor = parent;
  }

  if (fs.existsSync(ancestor)) {
    const realAncestor = fs.realpathSync(ancestor);
    const relative = path.relative(normalizedRoot, realAncestor);
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      throw new SecurityError(
        `Security violation: Ancestor of target path '${targetPath}' resolves outside repository root '${normalizedRoot}'`,
      );
    }
  }

  return resolved;
}
