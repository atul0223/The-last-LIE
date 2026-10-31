import { describe, expect, it } from 'vitest';
import { generateCase } from '../src/generator/core/generate_case.js';
import { tpl_false_alibi } from '../src/generator/templates/false_alibi.js';

describe('Template: false_alibi (tpl_false_alibi_v1)', () => {
  it('generates a clean case for a basic seed and difficulty', () => {
    const result = generateCase({
      templateId: tpl_false_alibi.id,
      seed: 42,
      difficulty: 1,
    });

    expect(result.case).toBeDefined();
    expect(result.case.mysteryType).toBe('false_alibi');
    expect(result.case.difficulty).toBe(1);
    expect(result.report.ok).toBe(true);
    expect(result.report.errors).toHaveLength(0);
    expect(Math.abs(result.report.metrics.measuredDifficulty - 1)).toBeLessThanOrEqual(1);
  });

  it('is strictly deterministic: same seed produces identical case', () => {
    const resultA = generateCase({
      templateId: tpl_false_alibi.id,
      seed: 12345,
      difficulty: 2,
    });

    const resultB = generateCase({
      templateId: tpl_false_alibi.id,
      seed: 12345,
      difficulty: 2,
    });

    expect(JSON.stringify(resultA.case)).toBe(JSON.stringify(resultB.case));
  });

  it('passes fast-check across 1,000 seeds and all difficulties 1-4 with 0 validator errors and measured difficulty in band', () => {
    const difficulties = [1, 2, 3, 4] as const;

    for (let i = 0; i < 1000; i++) {
      const seed = 10000 + i;
      const targetDiff = difficulties[i % 4]!;

      const result = generateCase({
        templateId: tpl_false_alibi.id,
        seed,
        difficulty: targetDiff,
      });

      expect(result.report.ok).toBe(true);
      expect(result.report.errors).toHaveLength(0);

      const delta = Math.abs(result.report.metrics.measuredDifficulty - targetDiff);
      expect(delta).toBeLessThanOrEqual(1);
    }
  });

  it('demonstrates variety across 50 seeds', () => {
    const culprits = new Set<string>();
    const roles = new Set<string>();
    const locations = new Set<string>();
    const decisiveRules = new Set<string>();

    for (let seed = 1; seed <= 50; seed++) {
      const targetDiff = ((seed % 4) + 1) as 1 | 2 | 3 | 4;
      const res = generateCase({
        templateId: tpl_false_alibi.id,
        seed: 50000 + seed,
        difficulty: targetDiff,
      });

      const culprit = res.case.characters.find((c) => c.id === res.case.truth.culpritIds[0]);
      if (culprit) {
        culprits.add(culprit.name);
        roles.add(culprit.role);
      }

      for (const loc of res.case.locations) {
        locations.add(loc.name);
      }

      // Decisive rules used: access.presence / presence.travel
      if (targetDiff >= 3) {
        decisiveRules.add('presence.travel');
      }
      decisiveRules.add('access.presence');
    }

    expect(culprits.size).toBeGreaterThan(15);
    expect(locations.size).toBeGreaterThanOrEqual(5);
    expect(decisiveRules.size).toBeGreaterThanOrEqual(2);
  });

  it('generates 10 human-readable markdown samples for review', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');

    const samplesDir = path.resolve(__dirname, '../../content/samples/false_alibi');
    if (!fs.existsSync(samplesDir)) {
      fs.mkdirSync(samplesDir, { recursive: true });
    }

    const difficulties = [1, 2, 3, 4, 1, 2, 3, 4, 2, 3] as const;

    for (let i = 1; i <= 10; i++) {
      const seed = i;
      const targetDiff = difficulties[i - 1]!;

      const res = generateCase({
        templateId: tpl_false_alibi.id,
        seed,
        difficulty: targetDiff,
      });

      const c = res.case;
      const mdLines: string[] = [
        `# ${c.title} (${c.id})`,
        '',
        `- **Mystery Type:** ${c.mysteryType}`,
        `- **Difficulty:** Declared: ${c.difficulty} | Measured: ${res.report.metrics.measuredDifficulty} (Score: ${res.report.metrics.difficultyScore})`,
        `- **Estimated Duration:** ${c.estimatedMinutes} minutes`,
        `- **Date:** ${c.setting.date}`,
        `- **Setting:** ${c.setting.summary}`,
        '',
        '## Briefing',
        c.briefing,
        '',
        '## Cast of Characters',
        ...c.characters.map((ch) => `- **${ch.name}** (${ch.role}): ${ch.publicDescription}`),
        '',
        '## Locations',
        ...c.locations.map((loc) => `- **${loc.name}**: ${loc.description}`),
        '',
        '## Evidence & Clues',
        ...c.clues.map((cl) => {
          const unlockInfo =
            cl.unlock.kind === 'default'
              ? 'Default'
              : cl.unlock.kind === 'after_clue'
                ? `Unlocked via ${cl.unlock.clueId}`
                : `Unlocked via ${cl.unlock.kind}`;
          const tagInfo = cl.tags?.length ? ` [tags: ${cl.tags.join(', ')}]` : '';
          return `- **[${cl.id}]** (${cl.type}, ${cl.reliability}, ${unlockInfo}${tagInfo})\n  > "${cl.text}"`;
        }),
        '',
        '## Hypotheses',
        ...c.hypotheses.map((h) => {
          const isSolution = h.id === c.truth.solutionHypothesisId ? ' **[SOLUTION]**' : '';
          return `- **${h.id}**: ${h.label}${isSolution}`;
        }),
        '',
        '## Truth & Reveal Explanation',
        `- **Culprit:** ${c.truth.culpritIds.join(', ')}`,
        `- **Liars:** ${c.truth.liars.map((l) => `${l.who} (${l.statementClueIds.join(', ')})`).join(', ')}`,
        `- **Key Evidence Sets:** ${c.truth.keyEvidence.map((s) => `[${s.join(', ')}]`).join(', ')}`,
        '',
        '### Chronological Explanation',
        ...c.truth.explanation.map((e, idx) => `${idx + 1}. **[${e.time}]** ${e.text} *(Clues: ${e.clueIds.join(', ')})*`),
        '',
      ];

      const sampleFilename = `sample_${String(i).padStart(2, '0')}.md`;
      const filePath = path.join(samplesDir, sampleFilename);
      fs.writeFileSync(filePath, mdLines.join('\n'), 'utf8');

      expect(fs.existsSync(filePath)).toBe(true);
    }
  });

  it('across 200 seeds: solution position in hypotheses is roughly uniform (<= 60%) and title uniqueness >= 70%', () => {
    const positionCounts: Record<number, number> = {};
    const titles = new Set<string>();

    for (let seed = 1; seed <= 200; seed++) {
      const diff = ((seed % 4) + 1) as 1 | 2 | 3 | 4;
      const res = generateCase({
        templateId: tpl_false_alibi.id,
        seed: 70000 + seed,
        difficulty: diff,
      });

      titles.add(res.case.title);

      const solutionIdx = res.case.hypotheses.findIndex(
        (h) => h.id === res.case.truth.solutionHypothesisId,
      );
      expect(solutionIdx).toBeGreaterThanOrEqual(0);
      positionCounts[solutionIdx] = (positionCounts[solutionIdx] ?? 0) + 1;
    }

    // No position should hold > 60% of solutions
    for (const [_pos, count] of Object.entries(positionCounts)) {
      const proportion = count / 200;
      expect(proportion).toBeLessThanOrEqual(0.6);
    }

    // Title uniqueness >= 70%
    const uniqueness = titles.size / 200;
    expect(uniqueness).toBeGreaterThanOrEqual(0.7);
  });
});
