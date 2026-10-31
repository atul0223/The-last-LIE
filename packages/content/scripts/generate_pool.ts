import fs from 'node:fs';
import path from 'node:path';
import {
  BUILTIN_TEMPLATES,
  generateCase,
  validateCase,
  fingerprint,
  type CaseDefinition,
  type Difficulty,
} from '@lastlie/case-engine';

const TEMPLATES = [
  'tpl_false_alibi_v1',
  'tpl_missing_item_v1',
  'tpl_forged_message_v1',
  'tpl_hidden_identity_v1',
];

const CASES_PER_DIFFICULTY = 8; // 8 * 4 difficulties = 32 per template; 4 templates * 32 = 128 total
const DIFFICULTIES: Difficulty[] = [1, 2, 3, 4];

interface PoolManifestEntry {
  id: string;
  file: string;
  templateId: string;
  difficulty: number;
  title: string;
  daily_eligible: boolean;
  weekly_eligible: boolean;
  fingerprint: string;
  seed: number;
}

function hasCulpritLeak(def: CaseDefinition): boolean {
  const culpritIds = def.truth.culpritIds ?? [];
  const culprits = def.characters.filter((c) => culpritIds.includes(c.id));
  if (culprits.length === 0) return true;

  const titleLower = def.title.toLowerCase();
  const briefingLower = def.briefing.toLowerCase();

  for (const culprit of culprits) {
    const nameParts = culprit.name
      .split(/\s+/)
      .map((p) => p.replace(/[^a-zA-Z]/g, ''))
      .filter((p) => p.length >= 3);

    // Title leak check
    for (const part of nameParts) {
      const reg = new RegExp(`\\b${part.toLowerCase()}\\b`, 'i');
      if (reg.test(titleLower)) return true;
    }

    // Briefing leak check
    let culpritNamed = false;
    for (const part of nameParts) {
      const reg = new RegExp(`\\b${part.toLowerCase()}\\b`, 'i');
      if (reg.test(briefingLower)) {
        culpritNamed = true;
        break;
      }
    }

    if (culpritNamed) {
      for (const char of def.characters) {
        const charParts = char.name
          .split(/\s+/)
          .map((p) => p.replace(/[^a-zA-Z]/g, ''))
          .filter((p) => p.length >= 3);
        const isNamed = charParts.some((p) =>
          new RegExp(`\\b${p.toLowerCase()}\\b`, 'i').test(briefingLower),
        );
        if (!isNamed) return true;
      }
    }
  }

  return false;
}

export function main() {
  const poolDir = path.resolve(process.cwd(), 'packages/content/cases/pool');
  if (fs.existsSync(poolDir)) {
    fs.rmSync(poolDir, { recursive: true, force: true });
  }
  fs.mkdirSync(poolDir, { recursive: true });

  const seenFingerprints = new Set<string>();
  const seenTitles = new Set<string>();
  const manifest: PoolManifestEntry[] = [];

  let caseCounter = 1;
  let currentSeed = 100000;

  for (const tplId of TEMPLATES) {
    const template = BUILTIN_TEMPLATES[tplId];
    if (!template) {
      throw new Error(`Template ${tplId} not found in BUILTIN_TEMPLATES`);
    }

    console.log(`Starting generation for template: ${tplId}`);

    for (const diff of DIFFICULTIES) {
      let countForDiff = 0;

      while (countForDiff < CASES_PER_DIFFICULTY) {
        currentSeed += 1;
        try {
          const res = generateCase({
            templateId: tplId,
            seed: currentSeed,
            difficulty: diff,
            templates: [template],
          });

          const caseDef = res.case;
          const fp = fingerprint(caseDef);

          // Check fingerprint duplication
          if (seenFingerprints.has(fp)) {
            continue;
          }

          // Check title duplication
          if (seenTitles.has(caseDef.title)) {
            continue;
          }

          // Check culprit leaks
          if (hasCulpritLeak(caseDef)) {
            continue;
          }

          // Assign clean pool ID
          const caseNumStr = String(caseCounter).padStart(4, '0');
          const caseId = `case_pool_${caseNumStr}`;
          caseDef.id = caseId;

          // Validate
          const valRes = validateCase(caseDef);
          if (!valRes.ok) {
            continue;
          }

          // Accepted! Record and save
          seenFingerprints.add(fp);
          seenTitles.add(caseDef.title);

          const fileName = `${caseId}.json`;
          const filePath = path.join(poolDir, fileName);
          fs.writeFileSync(filePath, JSON.stringify(caseDef, null, 2), 'utf-8');

          manifest.push({
            id: caseId,
            file: fileName,
            templateId: tplId,
            difficulty: diff,
            title: caseDef.title,
            daily_eligible: true, // all pool cases eligible for daily rotation
            weekly_eligible: diff >= 3, // weekly cases must be difficulty 3 or 4
            fingerprint: fp,
            seed: currentSeed,
          });

          countForDiff++;
          caseCounter++;
        } catch (err) {
          // Retry with next seed on generation errors
          continue;
        }
      }
      console.log(`  Finished difficulty ${diff}: ${countForDiff} cases generated.`);
    }
  }

  const manifestPath = path.join(poolDir, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
  console.log(`Successfully generated ${manifest.length} server pool cases into ${poolDir}`);
}

main();
