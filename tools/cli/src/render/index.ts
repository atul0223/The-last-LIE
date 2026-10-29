import fs from 'node:fs';
import path from 'node:path';
import type { Command } from 'commander';
import {
  toPublicCase,
  fromTime,
  type CaseDefinition,
  type CasePublic,
  type Fact,
} from '@lastlie/case-engine';
import { assertSafePath, getRepoRoot } from '../utils/security.js';

export function renderFactSummary(fact: Fact): string {
  switch (fact.kind) {
    case 'at':
      return `${fromTime(fact.from)}–${fromTime(fact.to)}: [at] ${fact.who} at ${fact.where}`;
    case 'action':
      return `${fromTime(fact.at)}: [action] ${fact.who} ${fact.verb}${fact.target ? ` ${fact.target}` : ''}${fact.where ? ` at ${fact.where}` : ''}`;
    case 'possess':
      return `${fromTime(fact.from)}–${fromTime(fact.to)}: [possess] ${fact.who} possessed ${fact.what}`;
    case 'message':
      return `${fromTime(fact.sentAt)}: [message] ${fact.sender ? `${fact.sender} ` : ''}sent msg ${fact.msg} via ${fact.device} to ${fact.recipient}`;
    case 'device_use':
      return `${fromTime(fact.at)}: [device_use] ${fact.by} used ${fact.device}`;
    case 'access':
      return `${fromTime(fact.at)}: [access] ${fact.who} accessed door ${fact.door}`;
    case 'state':
      return `${fromTime(fact.at)}: [state] ${fact.what}.${fact.property}=${fact.value}`;
    default:
      return `[fact] ${(fact as { kind: string }).kind}`;
  }
}

function formatHint(hint: unknown): string {
  if (!hint) return '';
  if (typeof hint === 'string') return hint;
  if (typeof hint === 'object') {
    const h = hint as { kind?: string; cost?: number; clueId?: string; characterId?: string };
    switch (h.kind) {
      case 'request':
        return `Request (cost: ${h.cost ?? 0} pts)`;
      case 'after_clue':
        return `Unlocks after clue ${h.clueId ?? ''}`;
      case 'interview':
        return `Interview suspect ${h.characterId ?? ''}`;
      case 'after_clue_hidden':
        return 'Follow-up investigation required';
      default:
        return JSON.stringify(hint);
    }
  }
  return String(hint);
}

export function renderPublicCaseMarkdown(pubCase: CasePublic): string {
  const lines: string[] = [];

  lines.push(`# ${pubCase.title} (PUBLIC DOSSIER)`);
  lines.push(`**Case ID:** \`${pubCase.id}\` | **Difficulty:** Level ${pubCase.difficulty} | **Est. Time:** ${pubCase.estimatedMinutes} mins`);
  lines.push(`**Setting:** ${pubCase.setting.summary} (${pubCase.setting.date})`);
  lines.push('');
  lines.push('## Case Briefing');
  lines.push(pubCase.briefing);
  lines.push('');

  lines.push('## Persons of Interest');
  for (const char of pubCase.characters) {
    lines.push(`- **${char.name}** (${char.role}): ${char.publicDescription}`);
  }
  lines.push('');

  lines.push('## Initial Evidence');
  for (const clue of pubCase.clues) {
    if (clue.locked) {
      const hintStr = clue.hint ? ` [Unlock Hint: ${formatHint(clue.hint)}]` : '';
      lines.push(`- **[LOCKED CLUE: ${clue.id}]** Type: *${clue.type}*${hintStr}`);
    } else {
      lines.push(`- **[${clue.id}] (${clue.type.toUpperCase()} / ${clue.reliability}):** ${clue.text}`);
    }
  }
  lines.push('');

  lines.push('## Working Hypotheses');
  for (const hyp of pubCase.hypotheses) {
    lines.push(`- **[${hyp.id}]:** ${hyp.label}`);
  }

  return lines.join('\n');
}

export function renderAuthorCaseMarkdown(def: CaseDefinition): string {
  const lines: string[] = [];

  lines.push(`# ${def.title} (FULL AUTHOR VIEW)`);
  lines.push(`**Case ID:** \`${def.id}\` | **Difficulty:** Level ${def.difficulty} | **Type:** ${def.mysteryType}`);
  lines.push(`**Setting:** ${def.setting.summary} (${def.setting.date})`);
  lines.push('');

  lines.push('## Briefing');
  lines.push(def.briefing);
  lines.push('');

  lines.push('## Ground Truth');
  lines.push(`- **Solution Hypothesis:** \`${def.truth.solutionHypothesisId}\``);
  lines.push(`- **Culprit(s):** ${def.truth.culpritIds.map((c) => `\`${c}\``).join(', ')}`);
  lines.push(`- **Liars:** ${def.truth.liars.map((l) => `\`${l.who}\` (statements: ${l.statementClueIds.join(', ')})`).join(', ') || 'None'}`);
  lines.push(`- **Key Evidence Sets:**`);
  for (const set of def.truth.keyEvidence) {
    lines.push(`  - [${set.map((id) => `\`${id}\``).join(', ')}]`);
  }
  lines.push('');

  lines.push('## Timeline');
  for (const fact of def.truth.timeline) {
    lines.push(`- ${renderFactSummary(fact)}`);
  }
  lines.push('');

  lines.push('## All Clues');
  for (const clue of def.clues) {
    const unlockStr = clue.unlock.kind === 'default' ? 'Default' : `Unlock via ${clue.unlock.kind}`;
    lines.push(`- **[${clue.id}] (${clue.type.toUpperCase()})** [${unlockStr}]`);
    lines.push(`  "${clue.text}"`);
    lines.push(`  *Asserts:* ${clue.asserts.map((a) => a.kind).join(', ')}`);
  }
  lines.push('');

  lines.push('## Hypotheses');
  for (const hyp of def.hypotheses) {
    const isSolution = hyp.id === def.truth.solutionHypothesisId;
    lines.push(`- **[${hyp.id}] ${isSolution ? '★ SOLUTION: ' : ''}${hyp.label}**`);
    lines.push(`  Culprits: ${hyp.culpritIds.join(', ')}`);
  }
  lines.push('');

  lines.push('## Reveal Beats');
  for (const beat of def.truth.explanation) {
    const timeStr = beat.time !== undefined ? `(${fromTime(beat.time)}) ` : '';
    lines.push(`- ${timeStr}${beat.text} [Cites: ${beat.clueIds.join(', ')}]`);
  }

  return lines.join('\n');
}

export function renderCase(
  filePath: string,
  options: { public?: boolean | undefined; cwd?: string | undefined; repoRoot?: string | undefined } = {},
): string {
  const cwd = path.resolve(options.cwd ?? process.cwd());
  const repoRoot = options.repoRoot ?? getRepoRoot(cwd);

  const resolvedPath = path.resolve(cwd, filePath);
  assertSafePath(resolvedPath, repoRoot);

  const raw = fs.readFileSync(resolvedPath, 'utf-8');
  const def = JSON.parse(raw) as CaseDefinition;

  if (options.public) {
    const defaultClueIds = def.clues
      .filter((c) => c.unlock.kind === 'default')
      .map((c) => c.id);
    const pubCase = toPublicCase(def, defaultClueIds);
    return renderPublicCaseMarkdown(pubCase);
  }

  return renderAuthorCaseMarkdown(def);
}

export function registerRenderCommand(program: Command): void {
  program
    .command('render <file>')
    .description('Render a case definition to readable markdown')
    .option('--public', 'Render only what a player sees at case start (redacted)')
    .action((file: string, opts: { public?: boolean }) => {
      try {
        const md = renderCase(file, { public: opts.public });
        console.log(md);
      } catch (err: unknown) {
        console.error(`[render error] ${err instanceof Error ? err.message : String(err)}`);
        process.exitCode = 1;
      }
    });
}
