import fs from 'node:fs';
import path from 'node:path';
import {
  computeDifficultyMetrics,
  DIFFICULTY_WEIGHTS,
  type CaseDefinition,
} from '@lastlie/case-engine';
import { getRepoRoot } from '../utils/security.js';

export interface PlaytestObservation {
  participantId: string;
  caseId: string;
  solveTimeMinutes: number;
  score?: number | undefined;
}

export interface CalibrationWeights {
  smallestKeyEvidenceSize: number;
  nonDefaultKeyClues: number;
  redHerrings: number;
  hypotheses: number;
  needsTravelTime: number;
}

export interface CalibrationResult {
  hasRealPlaytestData: boolean;
  sampleCount: number;
  observations: PlaytestObservation[];
  currentWeights: CalibrationWeights;
  fittedWeights: CalibrationWeights;
  note: string;
}

/**
 * Parses MM:SS or raw numbers into decimal minutes.
 */
function parseTimeMinutes(raw: string): number | null {
  const clean = raw.trim();
  if (clean === '' || clean.includes('__') || clean === 'N/A') return null;

  if (clean.includes(':')) {
    const [minStr, secStr] = clean.split(':');
    const min = Number.parseFloat(minStr ?? '0');
    const sec = Number.parseFloat(secStr ?? '0');
    if (Number.isFinite(min) && Number.isFinite(sec)) {
      return min + sec / 60;
    }
  }

  const val = Number.parseFloat(clean);
  return Number.isFinite(val) ? val : null;
}

/**
 * Solves normal equations (X^T * X + lambda * I) * w = X^T * y using Gaussian elimination.
 */
function solveRidgeRegression(X: number[][], y: number[], lambda = 0.1): number[] {
  const n = X.length;
  const p = X[0]?.length ?? 0;
  if (n === 0 || p === 0) return [];

  // Compute A = X^T * X + lambda * I (p x p)
  const A: number[][] = Array.from({ length: p }, () => Array(p).fill(0));
  const b: number[] = Array(p).fill(0);

  for (let j1 = 0; j1 < p; j1++) {
    for (let j2 = 0; j2 < p; j2++) {
      let sum = 0;
      for (let i = 0; i < n; i++) {
        sum += (X[i]![j1] ?? 0) * (X[i]![j2] ?? 0);
      }
      A[j1]![j2] = sum;
    }
    // Add ridge penalty
    const rowJ1 = A[j1]!;
    rowJ1[j1] = (rowJ1[j1] ?? 0) + lambda;

    // Compute b = X^T * y
    let bSum = 0;
    for (let i = 0; i < n; i++) {
      bSum += (X[i]![j1] ?? 0) * (y[i] ?? 0);
    }
    b[j1] = bSum;
  }

  // Gaussian elimination with partial pivoting
  for (let col = 0; col < p; col++) {
    let maxRow = col;
    let maxVal = Math.abs(A[col]![col] ?? 0);
    for (let row = col + 1; row < p; row++) {
      if (Math.abs(A[row]![col] ?? 0) > maxVal) {
        maxVal = Math.abs(A[row]![col] ?? 0);
        maxRow = row;
      }
    }

    if (maxVal < 1e-12) continue;

    // Swap rows
    const tempA = A[col]!;
    A[col] = A[maxRow]!;
    A[maxRow] = tempA;

    const tempB = b[col] ?? 0;
    b[col] = b[maxRow] ?? 0;
    b[maxRow] = tempB;

    // Eliminate below
    const pivot = A[col]![col] ?? 1;
    for (let row = col + 1; row < p; row++) {
      const factor = (A[row]![col] ?? 0) / pivot;
      const targetRow = A[row]!;
      const pivotRow = A[col]!;
      for (let c = col; c < p; c++) {
        targetRow[c] = (targetRow[c] ?? 0) - factor * (pivotRow[c] ?? 0);
      }
      b[row] = (b[row] ?? 0) - factor * (b[col] ?? 0);
    }
  }

  // Back-substitution
  const w: number[] = Array(p).fill(0);
  for (let row = p - 1; row >= 0; row--) {
    let sum = b[row] ?? 0;
    for (let c = row + 1; c < p; c++) {
      sum -= (A[row]![c] ?? 0) * (w[c] ?? 0);
    }
    const diag = A[row]![row] ?? 0;
    w[row] = diag !== 0 ? Math.max(0, sum / diag) : 0;
  }

  return w;
}

export function loadCaseDefinition(caseId: string, repoRoot: string): CaseDefinition | null {
  const authoredPath = path.join(repoRoot, 'packages/content/cases/authored', `${caseId}.json`);
  if (fs.existsSync(authoredPath)) {
    try {
      return JSON.parse(fs.readFileSync(authoredPath, 'utf-8')) as CaseDefinition;
    } catch {
      return null;
    }
  }
  return null;
}

export const PLAYTEST_FIXTURE_OBSERVATIONS: PlaytestObservation[] = [
  { participantId: 'P-01', caseId: 'case_0001', solveTimeMinutes: 7.5, score: 95 },
  { participantId: 'P-02', caseId: 'case_0001', solveTimeMinutes: 8.0, score: 90 },
  { participantId: 'P-03', caseId: 'case_0001', solveTimeMinutes: 6.8, score: 100 },
  { participantId: 'P-04', caseId: 'case_0002', solveTimeMinutes: 9.2, score: 85 },
  { participantId: 'P-05', caseId: 'case_0002', solveTimeMinutes: 8.5, score: 90 },
  { participantId: 'P-06', caseId: 'case_0003', solveTimeMinutes: 13.4, score: 80 },
  { participantId: 'P-07', caseId: 'case_0003', solveTimeMinutes: 14.1, score: 85 },
  { participantId: 'P-08', caseId: 'case_0004', solveTimeMinutes: 16.5, score: 75 },
  { participantId: 'P-09', caseId: 'case_0004', solveTimeMinutes: 18.0, score: 70 },
  { participantId: 'P-10', caseId: 'case_0004', solveTimeMinutes: 15.2, score: 80 },
];

export function runDifficultyCalibration(options?: {
  repoRoot?: string;
  fixturePath?: string;
}): CalibrationResult {
  const root = options?.repoRoot ?? getRepoRoot();
  const playtestDir = path.join(root, 'docs/playtest');

  const observations: PlaytestObservation[] = [];
  let hasRealPlaytestData = false;

  if (options?.fixturePath && fs.existsSync(options.fixturePath)) {
    const content = JSON.parse(fs.readFileSync(options.fixturePath, 'utf-8'));
    observations.push(...content);
  } else if (fs.existsSync(playtestDir)) {
    const files = fs.readdirSync(playtestDir).filter((f) => f.startsWith('results-') && f.endsWith('.md'));
    for (const file of files) {
      if (file === 'results-template.md') continue;
      const fullPath = path.join(playtestDir, file);
      const text = fs.readFileSync(fullPath, 'utf-8');
      const lines = text.split('\n');

      for (const line of lines) {
        // Look for participant table rows: | `P-XX` | `case_XXXX` | `MM:SS` | ...
        const match = line.match(/\|\s*`?([A-Za-z0-9_-]+)`?\s*\|\s*`?([A-Za-z0-9_-]+)`?\s*\|\s*`?([^|]+)`?\s*\|\s*`?([^|]*)`?/);
        if (match) {
          const participantId = match[1]?.trim() ?? '';
          const caseId = match[2]?.trim() ?? '';
          const timeRaw = match[3]?.trim() ?? '';
          if (participantId.startsWith('P-') && caseId.startsWith('case_')) {
            const time = parseTimeMinutes(timeRaw);
            if (time !== null) {
              observations.push({
                participantId,
                caseId,
                solveTimeMinutes: time,
              });
              hasRealPlaytestData = true;
            }
          }
        }
      }
    }
  }

  const finalObservations =
    observations.length > 0 ? observations : PLAYTEST_FIXTURE_OBSERVATIONS;

  // Extract feature matrix X and targets y
  const X: number[][] = [];
  const y: number[] = [];

  for (const obs of finalObservations) {
    const def = loadCaseDefinition(obs.caseId, root);
    if (!def) continue;

    const metrics = computeDifficultyMetrics(def);

    X.push([
      metrics.smallestKeyEvidenceSize,
      metrics.nonDefaultKeyCluesCount,
      metrics.redHerringsCount,
      metrics.hypothesesCount,
      metrics.needsTravelTime ? 1 : 0,
    ]);
    y.push(obs.solveTimeMinutes);
  }

  let fittedWeights: CalibrationWeights;
  if (X.length >= 3) {
    const w = solveRidgeRegression(X, y, 0.5);
    fittedWeights = {
      smallestKeyEvidenceSize: Math.round((w[0] ?? 2.0) * 10) / 10,
      nonDefaultKeyClues: Math.round((w[1] ?? 1.5) * 10) / 10,
      redHerrings: Math.round((w[2] ?? 1.0) * 10) / 10,
      hypotheses: Math.round((w[3] ?? 1.0) * 10) / 10,
      needsTravelTime: Math.round((w[4] ?? 3.0) * 10) / 10,
    };
  } else {
    fittedWeights = { ...DIFFICULTY_WEIGHTS };
  }

  const note = hasRealPlaytestData
    ? 'Fitted against real playtest logs in docs/playtest/results-*.md.'
    : 'Pending human playtest (WP-25 cohorts). Evaluated against reference fixture. DIFFICULTY_WEIGHTS left unchanged.';

  return {
    hasRealPlaytestData,
    sampleCount: finalObservations.length,
    observations: finalObservations,
    currentWeights: { ...DIFFICULTY_WEIGHTS },
    fittedWeights,
    note,
  };
}

export function formatCalibrationReport(result: CalibrationResult): string {
  const lines: string[] = [];
  lines.push(`================================================================`);
  lines.push(` DIFFICULTY CALIBRATION REPORT`);
  lines.push(` Samples: ${result.sampleCount} observations | Real data: ${result.hasRealPlaytestData ? 'YES' : 'NO (Fixture)'}`);
  lines.push(` Note: ${result.note}`);
  lines.push(`================================================================`);
  lines.push(``);
  lines.push(`WEIGHT COMPARISON (Current vs Proposed Fit):`);
  lines.push(`----------------------------------------------------------------`);
  lines.push(`Component                     Current Weight   Proposed Weight`);
  lines.push(`----------------------------------------------------------------`);
  lines.push(`smallestKeyEvidenceSize        ${result.currentWeights.smallestKeyEvidenceSize.toFixed(2).padEnd(16)} ${result.fittedWeights.smallestKeyEvidenceSize.toFixed(2)}`);
  lines.push(`nonDefaultKeyClues             ${result.currentWeights.nonDefaultKeyClues.toFixed(2).padEnd(16)} ${result.fittedWeights.nonDefaultKeyClues.toFixed(2)}`);
  lines.push(`redHerrings                    ${result.currentWeights.redHerrings.toFixed(2).padEnd(16)} ${result.fittedWeights.redHerrings.toFixed(2)}`);
  lines.push(`hypotheses                     ${result.currentWeights.hypotheses.toFixed(2).padEnd(16)} ${result.fittedWeights.hypotheses.toFixed(2)}`);
  lines.push(`needsTravelTime                ${result.currentWeights.needsTravelTime.toFixed(2).padEnd(16)} ${result.fittedWeights.needsTravelTime.toFixed(2)}`);
  lines.push(`----------------------------------------------------------------`);
  lines.push(`ACTION: DIFFICULTY_WEIGHTS left unchanged (pending human playtest).`);
  lines.push(`================================================================`);
  return lines.join('\n');
}
