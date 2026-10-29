import type { CaseDefinition, Fact } from '../../schema/index.js';
import type { ValidationIssue, ValidatorCheck, ValidatorContext } from '../types.js';

export const v2RefsCheck: ValidatorCheck = {
  checkId: 'refs',
  run(def: CaseDefinition, _ctx: ValidatorContext): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    const charIds = new Set(def.characters.map((c) => c.id));
    const locIds = new Set(def.locations.map((l) => l.id));
    const objIds = new Set(def.objects.map((o) => o.id));
    const clueIds = new Set(def.clues.map((c) => c.id));
    const hypIds = new Set(def.hypotheses.map((h) => h.id));
    const doorIds = new Set(def.locations.flatMap((l) => l.doorIds));

    function checkRef(id: string, validSet: Set<string>, entityName: string, path: string) {
      if (!validSet.has(id)) {
        issues.push({
          checkId: 'refs',
          severity: 'error',
          message: `Unresolved ${entityName} reference '${id}' at ${path}`,
          refs: [id, path],
        });
      }
    }

    // 1. Setting locationIds
    def.setting.locationIds.forEach((locId, idx) => {
      checkRef(locId, locIds, 'location', `setting.locationIds[${idx}]`);
    });

    // 2. Location adjacencies
    def.locations.forEach((loc) => {
      loc.adjacency.forEach((adj, idx) => {
        checkRef(adj.to, locIds, 'location', `locations[${loc.id}].adjacency[${idx}].to`);
      });
    });

    // 3. Object owners
    def.objects.forEach((obj) => {
      if (obj.ownerId) {
        checkRef(obj.ownerId, charIds, 'character', `objects[${obj.id}].ownerId`);
      }
    });

    // 4. Clue sources and unlocks
    def.clues.forEach((clue) => {
      if (clue.source && !charIds.has(clue.source) && !locIds.has(clue.source)) {
        issues.push({
          checkId: 'refs',
          severity: 'error',
          message: `Unresolved clue source '${clue.source}' on clue '${clue.id}'`,
          refs: [clue.source, clue.id],
        });
      }

      if (clue.unlock.kind === 'after_clue') {
        checkRef(clue.unlock.clueId, clueIds, 'clue', `clues[${clue.id}].unlock.clueId`);
      } else if (clue.unlock.kind === 'interview') {
        checkRef(
          clue.unlock.characterId,
          charIds,
          'character',
          `clues[${clue.id}].unlock.characterId`,
        );
      }
    });

    // 5. Hypotheses culprits
    def.hypotheses.forEach((h) => {
      h.culpritIds.forEach((culpritId) => {
        checkRef(culpritId, charIds, 'character', `hypotheses[${h.id}].culpritIds`);
      });
    });

    // 6. Truth refs
    def.truth.culpritIds.forEach((culpritId) => {
      checkRef(culpritId, charIds, 'character', 'truth.culpritIds');
    });

    checkRef(def.truth.solutionHypothesisId, hypIds, 'hypothesis', 'truth.solutionHypothesisId');

    def.truth.liars.forEach((liar) => {
      checkRef(liar.who, charIds, 'character', 'truth.liars.who');
      liar.statementClueIds.forEach((cId) => {
        checkRef(cId, clueIds, 'clue', `truth.liars[${liar.who}].statementClueIds`);
      });
    });

    def.truth.keyEvidence.forEach((set, sIdx) => {
      set.forEach((cId, cIdx) => {
        checkRef(cId, clueIds, 'clue', `truth.keyEvidence[${sIdx}][${cIdx}]`);
      });
    });

    def.truth.explanation.forEach((beat, idx) => {
      beat.clueIds.forEach((cId) => {
        checkRef(cId, clueIds, 'clue', `truth.explanation[${idx}].clueIds`);
      });
    });

    // 7. Facts references
    function checkFactRefs(fact: Fact, path: string) {
      if (fact.kind === 'at') {
        checkRef(fact.who, charIds, 'character', `${path}.who`);
        checkRef(fact.where, locIds, 'location', `${path}.where`);
      } else if (fact.kind === 'action') {
        checkRef(fact.who, charIds, 'character', `${path}.who`);
        if (fact.where) checkRef(fact.where, locIds, 'location', `${path}.where`);
        if (fact.target && !charIds.has(fact.target) && !objIds.has(fact.target)) {
          issues.push({
            checkId: 'refs',
            severity: 'error',
            message: `Unresolved action target '${fact.target}' at ${path}`,
            refs: [fact.target, path],
          });
        }
      } else if (fact.kind === 'possess') {
        checkRef(fact.who, charIds, 'character', `${path}.who`);
        checkRef(fact.what, objIds, 'object', `${path}.what`);
      } else if (fact.kind === 'message') {
        checkRef(fact.sender, charIds, 'character', `${path}.sender`);
        checkRef(fact.recipient, charIds, 'character', `${path}.recipient`);
        checkRef(fact.device, objIds, 'object', `${path}.device`);
      } else if (fact.kind === 'device_use') {
        checkRef(fact.by, charIds, 'character', `${path}.by`);
        checkRef(fact.device, objIds, 'object', `${path}.device`);
      } else if (fact.kind === 'access') {
        checkRef(fact.who, charIds, 'character', `${path}.who`);
        checkRef(fact.door, doorIds, 'door', `${path}.door`);
      } else if (fact.kind === 'relation') {
        checkRef(fact.a, charIds, 'character', `${path}.a`);
        checkRef(fact.b, charIds, 'character', `${path}.b`);
      } else if (fact.kind === 'motive') {
        checkRef(fact.who, charIds, 'character', `${path}.who`);
        if (fact.regarding) checkRef(fact.regarding, charIds, 'character', `${path}.regarding`);
      } else if (fact.kind === 'state') {
        if (!objIds.has(fact.what) && !locIds.has(fact.what)) {
          issues.push({
            checkId: 'refs',
            severity: 'error',
            message: `Unresolved state target '${fact.what}' at ${path}`,
            refs: [fact.what, path],
          });
        }
      }
    }

    def.truth.timeline.forEach((f, idx) => checkFactRefs(f, `truth.timeline[${idx}]`));
    def.clues.forEach((c) =>
      c.asserts.forEach((f, idx) => checkFactRefs(f, `clues[${c.id}].asserts[${idx}]`)),
    );
    def.hypotheses.forEach((h) =>
      h.claims.forEach((f, idx) => checkFactRefs(f, `hypotheses[${h.id}].claims[${idx}]`)),
    );

    return issues;
  },
};
