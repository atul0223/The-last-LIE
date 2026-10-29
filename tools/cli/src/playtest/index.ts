import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import type { Command } from 'commander';
import {
  toPublicCase,
  canUnlock,
  scoreSubmission,
  buildReveal,
  fromTime,
  type CaseDefinition,
  type SessionState,
  type Submission,
  type ClueUnlock,
} from '@lastlie/case-engine';
import { assertSafePath, getRepoRoot } from '../utils/security.js';

export interface PlaytestOptions {
  input?: NodeJS.ReadableStream | undefined;
  output?: NodeJS.WritableStream | undefined;
  cwd?: string | undefined;
  repoRoot?: string | undefined;
}

function formatHint(hint: unknown): string {
  if (!hint) return 'None';
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

export async function runPlaytest(
  filePath: string,
  options: PlaytestOptions = {},
): Promise<void> {
  const cwd = path.resolve(options.cwd ?? process.cwd());
  const repoRoot = options.repoRoot ?? getRepoRoot(cwd);

  const resolved = path.resolve(cwd, filePath);
  assertSafePath(resolved, repoRoot);

  const raw = fs.readFileSync(resolved, 'utf-8');
  const def = JSON.parse(raw) as CaseDefinition;

  const defaultClueIds = def.clues
    .filter((c) => c.unlock.kind === 'default')
    .map((c) => c.id);

  const session: SessionState = {
    id: `sess_cli_${Date.now()}`,
    caseId: def.id,
    caseVersion: def.version,
    mode: 'normal',
    unlockedClueIds: [...defaultClueIds],
    board: {
      cards: defaultClueIds.map((id, index) => ({
        id,
        x: 100 + (index % 3) * 200,
        y: 100 + Math.floor(index / 3) * 150,
      })),
      links: [],
    },
    status: 'in_progress',
    startedAt: new Date().toISOString(),
  };

  let selectedHypothesisId: string | null = null;
  let supportingClueIds: string[] = [];

  const inputStream = options.input ?? process.stdin;
  const outputStream = options.output ?? process.stdout;

  const log = (msg: string) => {
    outputStream.write(`${msg}\n`);
  };

  log(`\n============================================================`);
  log(` THE LAST LIE — INTERACTIVE TERMINAL PLAYTEST`);
  log(` Case: ${def.title} (ID: ${def.id}, Difficulty: Level ${def.difficulty})`);
  log(`============================================================`);
  log(`Type 'help' to view available commands.\n`);

  const rl = readline.createInterface({
    input: inputStream,
    output: outputStream,
    terminal: false,
  });

  const initialPlaceholders = new Map<string, string>();
  let initialLockedCounter = 0;
  for (const clue of def.clues) {
    if (!session.unlockedClueIds.includes(clue.id)) {
      initialLockedCounter++;
      initialPlaceholders.set(`locked_${initialLockedCounter}`, clue.id);
    }
  }

  const getPublicCase = () => toPublicCase(def, session.unlockedClueIds);

  // Helper to map placeholder IDs (locked_1, locked_2) to real clue IDs
  const resolveClueId = (idOrPlaceholder: string): string => {
    return initialPlaceholders.get(idOrPlaceholder) ?? idOrPlaceholder;
  };

  const handleCommand = (rawLine: string) => {
    const line = rawLine.trim();
    if (!line) return;

    const parts = line.split(/\s+/);
    const cmd = parts[0];
    if (!cmd) return;

    const command = cmd.toLowerCase();
    const args = parts.slice(1);

    switch (command) {
      case 'help':
        log(`\nAvailable Commands:`);
        log(`  briefing                       Show case briefing, setting, and suspects`);
        log(`  clues                          List all available clues (unlocked & locked hints)`);
        log(`  clue <id>                      Inspect an unlocked clue in full`);
        log(`  unlock <id> [via]              Unlock a clue (via: request | interview | default)`);
        log(`  link <clueA> <clueB>           Add contradiction link between two clues`);
        log(`  unlink <clueA> <clueB>         Remove contradiction link`);
        log(`  links                          List all contradiction links on the board`);
        log(`  hypotheses                     List available hypotheses`);
        log(`  theory <hypId> [clues...]      Set theory hypothesis and up to 3 supporting clues`);
        log(`  submit                         Submit theory and view official reveal`);
        log(`  quit / exit                    Exit playtest\n`);
        break;

      case 'briefing': {
        const pub = getPublicCase();
        log(`\n[Briefing] ${pub.briefing}`);
        log(`Setting: ${pub.setting.summary} (${pub.setting.date})`);
        log(`\nSuspects:`);
        for (const c of pub.characters) {
          log(`  • ${c.name} (${c.role}): ${c.publicDescription}`);
        }
        log('');
        break;
      }

      case 'clues': {
        const pub = getPublicCase();
        log(`\nEvidence List:`);
        for (const c of pub.clues) {
          if (c.locked) {
            log(`  🔒 [${c.id}] (Type: ${c.type}) — Unlock hint: ${formatHint(c.hint)}`);
          } else {
            log(`  📄 [${c.id}] (${c.type.toUpperCase()}) "${c.text}"`);
          }
        }
        log('');
        break;
      }

      case 'clue': {
        const idInput = args[0];
        if (!idInput) {
          log(`Usage: clue <clueId>`);
          break;
        }
        const resolvedId = resolveClueId(idInput);
        const pub = getPublicCase();
        const found = pub.clues.find((c) => c.id === resolvedId || c.id === idInput);
        if (!found) {
          log(`Clue '${idInput}' not found.`);
        } else if (found.locked) {
          log(`Clue '${idInput}' is locked! Hint: ${formatHint(found.hint)}`);
        } else {
          log(`\n[${found.id}] (${found.type.toUpperCase()} / ${found.reliability})`);
          log(`Text: "${found.text}"`);
          if (found.tags && found.tags.length > 0) {
            log(`Tags: ${found.tags.join(', ')}`);
          }
          log('');
        }
        break;
      }

      case 'unlock': {
        const targetInput = args[0];
        if (!targetInput) {
          log(`Usage: unlock <clueId> [via]`);
          break;
        }

        const realClueId = resolveClueId(targetInput);
        const targetClue = def.clues.find((c) => c.id === realClueId);

        if (session.unlockedClueIds.includes(realClueId)) {
          log(`Clue '${targetInput}' is already unlocked.`);
          break;
        }

        const viaKind = (args[1] ?? targetClue?.unlock.kind ?? 'default') as
          | 'request'
          | 'interview'
          | 'after_clue'
          | 'default';

        let via: ClueUnlock;
        if (viaKind === 'after_clue') {
          const reqClueId = targetClue?.unlock.kind === 'after_clue' ? targetClue.unlock.clueId : 'unknown';
          via = { kind: 'after_clue', clueId: reqClueId };
        } else if (viaKind === 'request') {
          const cost = targetClue?.unlock.kind === 'request' ? targetClue.unlock.cost : 10;
          via = { kind: 'request', cost };
        } else if (viaKind === 'interview') {
          const charId = targetClue?.unlock.kind === 'interview' ? targetClue.unlock.characterId : 'char_unknown';
          const qId = targetClue?.unlock.kind === 'interview' ? targetClue.unlock.questionId : 'q_default';
          via = { kind: 'interview', characterId: charId, questionId: qId };
        } else {
          via = { kind: 'default' };
        }

        const check = canUnlock(def, session, realClueId, via);
        if (!check.ok) {
          log(`✗ Cannot unlock '${targetInput}': ${check.message}`);
          break;
        }

        session.unlockedClueIds.push(realClueId);
        session.board.cards.push({
          id: realClueId,
          x: 100 + (session.unlockedClueIds.length % 3) * 200,
          y: 100 + Math.floor(session.unlockedClueIds.length / 3) * 150,
        });

        const updated = getPublicCase().clues.find((c) => c.id === realClueId);
        if (updated && !updated.locked) {
          log(`✓ Unlocked [${targetInput} -> ${realClueId}]: "${updated.text}"`);
        } else {
          log(`✓ Unlocked [${targetInput}]`);
        }
        break;
      }

      case 'link': {
        const [rawA, rawB] = args;
        if (!rawA || !rawB) {
          log(`Usage: link <clueA> <clueB>`);
          break;
        }
        const a = resolveClueId(rawA);
        const b = resolveClueId(rawB);

        if (a === b) {
          log(`Cannot link clue to itself.`);
          break;
        }
        const exists = session.board.links.some(
          (l) => (l.a === a && l.b === b) || (l.a === b && l.b === a),
        );
        if (exists) {
          log(`Link between '${a}' and '${b}' already exists.`);
          break;
        }
        session.board.links.push({ a, b });
        log(`✓ Linked [${a}] ↔ [${b}] on board.`);
        break;
      }

      case 'unlink': {
        const [rawA, rawB] = args;
        if (!rawA || !rawB) {
          log(`Usage: unlink <clueA> <clueB>`);
          break;
        }
        const a = resolveClueId(rawA);
        const b = resolveClueId(rawB);

        const initialLen = session.board.links.length;
        session.board.links = session.board.links.filter(
          (l) => !( (l.a === a && l.b === b) || (l.a === b && l.b === a) ),
        );
        if (session.board.links.length < initialLen) {
          log(`✓ Removed link between [${a}] and [${b}].`);
        } else {
          log(`Link between [${a}] and [${b}] not found.`);
        }
        break;
      }

      case 'links': {
        log(`\nEvidence Board Links (${session.board.links.length}):`);
        if (session.board.links.length === 0) {
          log(`  (No links established)`);
        } else {
          for (const l of session.board.links) {
            log(`  • [${l.a}] ↔ [${l.b}]`);
          }
        }
        log('');
        break;
      }

      case 'hypotheses': {
        const pub = getPublicCase();
        log(`\nHypotheses:`);
        for (const h of pub.hypotheses) {
          const isSelected = h.id === selectedHypothesisId;
          log(`  ${isSelected ? '►' : ' '} [${h.id}]: ${h.label}`);
        }
        log('');
        break;
      }

      case 'theory': {
        const hypId = args[0];
        if (!hypId) {
          log(`Usage: theory <hypothesisId> [clue1] [clue2] [clue3]`);
          break;
        }
        const pub = getPublicCase();
        const hyp = pub.hypotheses.find((h) => h.id === hypId);
        if (!hyp) {
          log(`Hypothesis '${hypId}' not found. Use 'hypotheses' to view options.`);
          break;
        }
        selectedHypothesisId = hypId;
        supportingClueIds = args.slice(1, 4).map(resolveClueId);
        log(`✓ Working theory set to [${hypId}]: "${hyp.label}"`);
        if (supportingClueIds.length > 0) {
          log(`  Supporting clues: ${supportingClueIds.join(', ')}`);
        }
        break;
      }

      case 'submit': {
        if (!selectedHypothesisId) {
          log(`Cannot submit without selecting a hypothesis. Use 'theory <hypId>'.`);
          break;
        }
        const submission: Submission = {
          sessionId: session.id,
          hypothesisId: selectedHypothesisId,
          supportingClueIds,
          contradictions: session.board.links,
        };

        const result = scoreSubmission(def, session, submission);
        const reveal = buildReveal(def, submission);
        session.status = 'submitted';

        log(`\n============================================================`);
        log(` CASE CLOSED — OFFICIAL EVALUATION`);
        log(`============================================================`);
        log(`Score: ${result.score} PTS | +${result.xp} XP`);
        log(`Hypothesis Verdict: ${result.breakdown.correctHypothesis ? '✓ CORRECT IDENTIFICATION' : '✗ INCORRECT'}`);
        log(`Hypothesis Points: +${result.breakdown.hypothesisPoints}`);
        log(`Evidence Points:   +${result.breakdown.evidencePoints}`);
        log(`Link Points:       +${result.breakdown.contradictionPoints}`);
        log(`Penalties:         -${result.breakdown.penaltyPoints}`);
        log(`Multiplier:        ${result.breakdown.multiplier}x`);

        log(`\nContradiction Links Result:`);
        log(`  Valid Links: ${reveal.validLinks.length}`);
        for (const vl of reveal.validLinks) {
          log(`    ✓ [${vl.a} ↔ ${vl.b}] ${vl.explanation ?? ''}`);
        }
        log(`  Invalid Links: ${reveal.invalidLinks.length}`);
        for (const ivl of reveal.invalidLinks) {
          log(`    ✗ [${ivl.a} ↔ ${ivl.b}] No contradiction`);
        }

        log(`\nReveal Timeline:`);
        for (const beat of reveal.explanation) {
          const timeStr = beat.time !== undefined ? `(${fromTime(beat.time)}) ` : '';
          log(`  • ${timeStr}${beat.text} [Cites: ${beat.clueIds.join(', ')}]`);
        }
        log(`\n============================================================\n`);
        break;
      }

      case 'quit':
      case 'exit':
        rl.close();
        break;

      default:
        log(`Unknown command: '${cmd}'. Type 'help' for command list.`);
        break;
    }
  };

  return new Promise<void>((resolve) => {
    rl.on('line', (line) => {
      handleCommand(line);
    });

    rl.on('close', () => {
      log('Exiting playtest session.');
      resolve();
    });
  });
}

export function registerPlaytestCommand(program: Command): void {
  program
    .command('playtest <file>')
    .description('Launch an interactive terminal playtest session for a case')
    .action(async (file: string) => {
      try {
        await runPlaytest(file);
      } catch (err: unknown) {
        console.error(`[playtest error] ${err instanceof Error ? err.message : String(err)}`);
        process.exitCode = 1;
      }
    });
}
