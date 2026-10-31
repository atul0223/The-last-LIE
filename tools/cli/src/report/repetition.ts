import {
  generateCase,
  fingerprint,
  getFingerprintComponents,
  getDecisiveRuleId,
  type CaseDefinition,
  type Difficulty,
} from '@lastlie/case-engine';
import { getTemplateRegistry } from '../generate/index.js';

export interface RepetitionReportOptions {
  template: string;
  count: number;
  seed?: number | undefined;
  difficulty?: Difficulty | undefined;
}

export interface TopFingerprintEntry {
  fingerprint: string;
  count: number;
  percentage: number;
  templateId: string;
  culpritRoles: string[];
  decisiveRuleId: string;
  locationIds: string[];
}

export interface RepetitionReportResult {
  templateId: string;
  count: number;
  seed: number;
  difficulty: number;
  uniqueFingerprints: number;
  collisionCount: number;
  collisionRate: number; // percentage (0 - 100)
  uniqueTitles: number;
  duplicateTitles: number;
  titleDuplicateRate: number; // percentage (0 - 100)
  topFingerprints: TopFingerprintEntry[];
  decisiveRules: Record<string, { count: number; percentage: number }>;
  culpritRoles: Record<string, { count: number; percentage: number }>;
}

export function runRepetitionAnalysis(options: RepetitionReportOptions): RepetitionReportResult {
  const registry = getTemplateRegistry();
  const template = registry.get(options.template);
  if (!template) {
    throw new Error(`Template '${options.template}' not found in template registry.`);
  }

  const count = options.count ?? 50;
  const startSeed = options.seed ?? 1000;
  const difficulty = options.difficulty ?? 2;

  const fpCountMap = new Map<string, { count: number; def: CaseDefinition }>();
  const titleSet = new Set<string>();
  let duplicateTitles = 0;

  const decisiveRuleCounts: Record<string, number> = {};
  const culpritRoleCounts: Record<string, number> = {};

  for (let i = 0; i < count; i++) {
    const seed = startSeed + i;
    const result = generateCase({
      templateId: template.id,
      seed,
      difficulty,
    });
    const def = result.case;

    // Fingerprint
    const fp = fingerprint(def);
    const existing = fpCountMap.get(fp);
    if (existing) {
      existing.count++;
    } else {
      fpCountMap.set(fp, { count: 1, def });
    }

    // Titles
    if (titleSet.has(def.title)) {
      duplicateTitles++;
    } else {
      titleSet.add(def.title);
    }

    // Decisive rule
    const rule = getDecisiveRuleId(def);
    decisiveRuleCounts[rule] = (decisiveRuleCounts[rule] ?? 0) + 1;

    // Culprit roles
    const roles = (def.truth.culpritIds ?? [])
      .map((id) => def.characters.find((c) => c.id === id)?.role ?? id)
      .sort()
      .join(', ');
    culpritRoleCounts[roles] = (culpritRoleCounts[roles] ?? 0) + 1;
  }

  const uniqueFingerprints = fpCountMap.size;
  const collisionCount = count - uniqueFingerprints;
  const collisionRate = Math.round((collisionCount / count) * 1000) / 10;
  const titleDuplicateRate = Math.round((duplicateTitles / count) * 1000) / 10;

  // Top fingerprints sorted by frequency
  const sortedFpEntries = Array.from(fpCountMap.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5)
    .map(([fp, data]) => {
      const comp = getFingerprintComponents(data.def);
      return {
        fingerprint: fp,
        count: data.count,
        percentage: Math.round((data.count / count) * 1000) / 10,
        templateId: comp.templateId,
        culpritRoles: comp.culpritRoles,
        decisiveRuleId: comp.decisiveRuleId,
        locationIds: comp.locationIds,
      };
    });

  const decisiveRules: Record<string, { count: number; percentage: number }> = {};
  for (const [rule, c] of Object.entries(decisiveRuleCounts)) {
    decisiveRules[rule] = {
      count: c,
      percentage: Math.round((c / count) * 1000) / 10,
    };
  }

  const culpritRoles: Record<string, { count: number; percentage: number }> = {};
  for (const [role, c] of Object.entries(culpritRoleCounts)) {
    culpritRoles[role] = {
      count: c,
      percentage: Math.round((c / count) * 1000) / 10,
    };
  }

  return {
    templateId: template.id,
    count,
    seed: startSeed,
    difficulty,
    uniqueFingerprints,
    collisionCount,
    collisionRate,
    uniqueTitles: titleSet.size,
    duplicateTitles,
    titleDuplicateRate,
    topFingerprints: sortedFpEntries,
    decisiveRules,
    culpritRoles,
  };
}

export function formatRepetitionReport(result: RepetitionReportResult): string {
  const lines: string[] = [];
  lines.push(`================================================================`);
  lines.push(` REPETITION & DIVERSITY REPORT: ${result.templateId}`);
  lines.push(` Sample: ${result.count} cases | Seed: ${result.seed} | Difficulty: ${result.difficulty}`);
  lines.push(`================================================================`);
  lines.push(``);
  lines.push(`1. FINGERPRINT COLLISIONS`);
  lines.push(`   - Unique fingerprints: ${result.uniqueFingerprints} / ${result.count}`);
  lines.push(`   - Collisions:          ${result.collisionCount} (${result.collisionRate}%)`);
  lines.push(`   - Status:              ${result.collisionRate < 10 ? '✅ PASS (<10%)' : '⚠️ HIGH REPETITION (>=10%)'}`);
  lines.push(``);
  lines.push(`2. TITLE DUPLICATION`);
  lines.push(`   - Unique titles:       ${result.uniqueTitles} / ${result.count}`);
  lines.push(`   - Duplicate titles:    ${result.duplicateTitles} (${result.titleDuplicateRate}%)`);
  lines.push(`   - Status:              ${result.titleDuplicateRate < 30 ? '✅ PASS (<30%)' : '⚠️ HIGH DUPLICATION (>=30%)'}`);
  lines.push(``);
  lines.push(`3. DECISIVE RULES DISTRIBUTION`);
  for (const [rule, stat] of Object.entries(result.decisiveRules)) {
    lines.push(`   - ${rule.padEnd(25)}: ${stat.count.toString().padStart(3)} (${stat.percentage.toFixed(1)}%)`);
  }
  lines.push(``);
  lines.push(`4. CULPRIT ROLES DISTRIBUTION`);
  for (const [role, stat] of Object.entries(result.culpritRoles)) {
    lines.push(`   - ${role.padEnd(25)}: ${stat.count.toString().padStart(3)} (${stat.percentage.toFixed(1)}%)`);
  }
  lines.push(``);
  lines.push(`5. TOP FINGERPRINTS`);
  for (const top of result.topFingerprints) {
    lines.push(`   - ${top.fingerprint}: ${top.count} cases (${top.percentage}%)`);
    lines.push(`     Roles: [${top.culpritRoles.join(', ')}] | Rule: ${top.decisiveRuleId}`);
    lines.push(`     Locations: [${top.locationIds.join(', ')}]`);
  }
  lines.push(`================================================================`);
  return lines.join('\n');
}
