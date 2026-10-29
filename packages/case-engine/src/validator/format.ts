import type { ValidationReport } from './types.js';

/**
 * Formats a ValidationReport into human-readable terminal text.
 */
export function formatReport(report: ValidationReport): string {
  const lines: string[] = [];

  const statusStr = report.ok ? '✓ PASS' : '✗ FAIL';
  lines.push(`=== Case Validation Report: ${statusStr} ===`);
  lines.push(
    `Difficulty: Measured ${report.metrics.measuredDifficulty} (Score: ${report.metrics.difficultyScore})`,
  );
  lines.push(
    `Clues: ${report.metrics.totalCluesCount} total, ${report.metrics.obtainableCluesCount} obtainable`,
  );
  lines.push(
    `Key Evidence Size: ${report.metrics.smallestKeyEvidenceSize} (non-default: ${report.metrics.nonDefaultKeyCluesCount})`,
  );
  lines.push(`Hypotheses: ${report.metrics.hypothesesCount}`);

  if (report.errors.length > 0) {
    lines.push('');
    lines.push(`Errors (${report.errors.length}):`);
    for (const err of report.errors) {
      const refStr = err.refs && err.refs.length > 0 ? ` [refs: ${err.refs.join(', ')}]` : '';
      lines.push(`  ✗ [${err.checkId}] ${err.message}${refStr}`);
    }
  }

  if (report.warnings.length > 0) {
    lines.push('');
    lines.push(`Warnings (${report.warnings.length}):`);
    for (const warn of report.warnings) {
      const refStr = warn.refs && warn.refs.length > 0 ? ` [refs: ${warn.refs.join(', ')}]` : '';
      lines.push(`  ⚠ [${warn.checkId}] ${warn.message}${refStr}`);
    }
  }

  if (report.errors.length === 0 && report.warnings.length === 0) {
    lines.push('');
    lines.push('No issues detected. Case is validator-clean.');
  }

  return lines.join('\n');
}
