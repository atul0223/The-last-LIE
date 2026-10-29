import {
  PUBLIC_CLUE_TAGS,
  type CaseDefinition,
  type CasePublic,
  type LockedClueHint,
  type PublicClue,
} from '../schema/index.js';

/**
 * Builds an explicit, sanitized public view of a case definition.
 * Following SYSTEM_DESIGN.md §3.6:
 *
 * - Unlocked clue: { id, type, reliability, source?, text, unlock, tags? }
 *   `text` is required. `asserts` is NEVER sent. `tags` are filtered by PUBLIC_CLUE_TAGS.
 * - Locked clue: { id: "locked_<n>", type, locked: true, hint }
 *   `hint` exposes prerequisite clueId only if that prerequisite is already unlocked; otherwise "after_clue_hidden".
 * - Dropped: truth, hypotheses[].claims, hypotheses[].culpritIds, conspiracyHooks, meta (except status).
 */
export function toPublicCase(
  def: CaseDefinition,
  unlockedIds: Iterable<string> | string[] | Set<string>,
): CasePublic {
  const unlockedSet = new Set(unlockedIds);

  const publicClues: PublicClue[] = [];
  const lockedClueIds: string[] = [];
  let lockedCounter = 0;

  for (const clue of def.clues) {
    if (unlockedSet.has(clue.id)) {
      if (!clue.text || clue.text.trim().length === 0) {
        throw new Error(`Clue '${clue.id}' missing required text override/render in toPublicCase`);
      }

      const filteredTags = clue.tags
        ? clue.tags.filter((t) => (PUBLIC_CLUE_TAGS as readonly string[]).includes(t))
        : undefined;

      publicClues.push({
        id: clue.id,
        type: clue.type,
        reliability: clue.reliability,
        ...(clue.source !== undefined ? { source: clue.source } : {}),
        text: clue.text,
        unlock: clue.unlock,
        ...(filteredTags && filteredTags.length > 0 ? { tags: filteredTags } : {}),
        locked: false,
      });
    } else {
      lockedCounter++;
      const placeholderId = `locked_${lockedCounter}`;
      lockedClueIds.push(placeholderId);

      let hint: LockedClueHint | undefined;
      if (clue.unlock.kind === 'after_clue') {
        if (unlockedSet.has(clue.unlock.clueId)) {
          hint = {
            kind: 'after_clue',
            clueId: clue.unlock.clueId,
          };
        } else {
          hint = {
            kind: 'after_clue_hidden',
          };
        }
      } else if (clue.unlock.kind === 'interview') {
        hint = {
          kind: 'interview',
        };
      } else if (clue.unlock.kind === 'request') {
        hint = {
          kind: 'request',
          cost: clue.unlock.cost,
        };
      }

      publicClues.push({
        id: placeholderId,
        type: clue.type,
        locked: true,
        ...(hint !== undefined ? { hint } : {}),
      });
    }
  }

  return {
    id: def.id,
    version: def.version,
    kind: def.kind,
    title: def.title,
    difficulty: def.difficulty,
    estimatedMinutes: def.estimatedMinutes,
    mysteryType: def.mysteryType,
    setting: {
      locationIds: [...def.setting.locationIds],
      date: def.setting.date,
      summary: def.setting.summary,
    },
    briefing: def.briefing,
    characters: def.characters.map((c) => ({
      id: c.id,
      name: c.name,
      role: c.role,
      publicDescription: c.publicDescription,
      ...(c.portrait !== undefined ? { portrait: c.portrait } : {}),
    })),
    locations: def.locations.map((l) => ({
      id: l.id,
      name: l.name,
      ...(l.description !== undefined ? { description: l.description } : {}),
      doorIds: [...l.doorIds],
      adjacency: l.adjacency.map((a) => ({
        to: a.to,
        travelMinutes: a.travelMinutes,
      })),
    })),
    objects: def.objects.map((o) => ({
      id: o.id,
      name: o.name,
      type: o.type,
      ...(o.description !== undefined ? { description: o.description } : {}),
      ...(o.ownerId !== undefined ? { ownerId: o.ownerId } : {}),
    })),
    clues: publicClues,
    lockedClueIds,
    hypotheses: def.hypotheses.map((h) => ({
      id: h.id,
      label: h.label,
    })),
    ...(def.interviews !== undefined
      ? {
          interviews: def.interviews.map((i) => ({
            characterId: i.characterId,
            questions: i.questions.map((q) => ({
              id: q.id,
              prompt: q.prompt,
              answer: q.answer,
              ...(q.unlockedClueId !== undefined ? { unlockedClueId: q.unlockedClueId } : {}),
            })),
          })),
        }
      : {}),
    meta: {
      status: def.meta.status,
    },
  };
}
