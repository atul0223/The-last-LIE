import { describe, it, expect } from 'vitest';
import { runRepetitionAnalysis } from '../src/report/repetition.js';
import { runDifficultyCalibration } from '../src/report/calibration.js';

describe('CLI: report command (WP-36)', () => {
  it('runs repetition analysis on false_alibi template', () => {
    const result = runRepetitionAnalysis({
      template: 'tpl_false_alibi_v1',
      count: 20,
      seed: 100,
      difficulty: 2,
    });

    expect(result.templateId).toBe('tpl_false_alibi_v1');
    expect(result.count).toBe(20);
    expect(result.uniqueFingerprints).toBeGreaterThan(0);
    expect(result.collisionRate).toBeGreaterThanOrEqual(0);
    expect(result.topFingerprints.length).toBeGreaterThan(0);
    expect(result.decisiveRules['access.presence']).toBeDefined();
    expect(result.culpritRoles['Primary Suspect']).toBeDefined();
  });

  it('runs repetition analysis on missing_item template', () => {
    const result = runRepetitionAnalysis({
      template: 'tpl_missing_item_v1',
      count: 15,
      seed: 200,
      difficulty: 1,
    });

    expect(result.templateId).toBe('tpl_missing_item_v1');
    expect(result.count).toBe(15);
    expect(result.decisiveRules['possess.exclusive']).toBeDefined();
  });

  it('runs repetition analysis on forged_message template', () => {
    const result = runRepetitionAnalysis({
      template: 'tpl_forged_message_v1',
      count: 15,
      seed: 300,
      difficulty: 2,
    });

    expect(result.templateId).toBe('tpl_forged_message_v1');
    expect(result.count).toBe(15);
    expect(result.decisiveRules['message.sender_device']).toBeDefined();
  });

  it('runs difficulty calibration against fixture when no playtest files are present', () => {
    const calib = runDifficultyCalibration();

    expect(calib.sampleCount).toBeGreaterThan(0);
    expect(calib.currentWeights.smallestKeyEvidenceSize).toBe(2.0);
    expect(calib.fittedWeights).toBeDefined();
    expect(calib.note).toContain('Pending human playtest');
  });
});
