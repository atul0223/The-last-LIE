# THE LAST LIE: Infinite — System Design

> Status: v1 design. Source of truth for architecture, data contracts, and engine rules.
> Companion doc: [`PLAN.md`](./PLAN.md) (phased build plan with agent work packages).
> If code and this document disagree, fix one of them in the same PR. Do not leave them out of sync.

---

## 1. Product summary

A mobile mystery game, mostly single-player, with asynchronous social competition. The player is a detective in **Vesper City**. They solve short cases (3–6 minutes each). Some cases connect to a long-running conspiracy run by a hidden network called **The Quiet**.

**Core loop:** Receive case → Inspect clues → Build theory (evidence board) → Submit decision → Reveal → Progress & share.

**Non-negotiable principles**

1. **The ground truth exists before the player starts.** Every case has a fixed, structured timeline. Clues are *derived from* that truth. They are never invented on their own.
2. **Cases are data, not code.** The app renders whatever case JSON it gets. Adding a case never needs an app release.
3. **The case engine is UI-independent.** It is a pure TypeScript package. The mobile app, backend functions, and authoring CLI all use the same package.
4. **The server is authoritative.** Solutions and locked evidence never reach the client before the player submits. Scores are computed on the server. (The offline prototype phase is the only exception. See §9.)
5. **Every case is validated before publication.** A deterministic validator checks solvability and uniqueness. Humans review before a case is featured.
6. **Procedural ≠ canonical.** Procedural cases never change the main conspiracy storyline. Only hand-authored canonical cases do.

---

## 2. High-level architecture

Modular monolith. One repo, one backend, and a shared engine package.

```
┌────────────────────────────┐        ┌──────────────────────────────────────┐
│  apps/mobile (Expo RN, TS) │        │  Supabase                            │
│  ─ UI screens              │  HTTPS │  ─ Auth (anon + email/OAuth)         │
│  ─ local session store     │◄──────►│  ─ Postgres (+ RLS)                  │
│  ─ @lastlie/case-engine    │        │  ─ Edge Functions (Deno, TS)         │
│    (render + local checks) │        │      uses @lastlie/case-engine       │
└────────────────────────────┘        │  ─ Storage (case images)             │
          ▲                           └──────────────────────────────────────┘
          │ same package                              ▲
┌─────────┴──────────────────┐                        │ publish (service role)
│ packages/case-engine       │        ┌───────────────┴──────────────────────┐
│  schema · validator ·      │◄───────│ tools/cli  (authoring pipeline)       │
│  generator · scoring ·     │        │  validate · generate · render · publish│
│  redaction                 │        └───────────────────────────────────────┘
└────────────────────────────┘
          ▲
┌─────────┴──────────────────┐
│ packages/content           │  authored cases, templates, name/location pools,
│                            │  canonical conspiracy graph (JSON, versioned in git)
└────────────────────────────┘
```

### 2.1 Repository layout

```
/
├─ apps/
│  └─ mobile/                 Expo (React Native + TypeScript), Expo Router.
│                             Also builds a web target for challenge links.
├─ packages/
│  ├─ case-engine/            Pure TS. No React, no Node/Deno-specific APIs, no network.
│  │  ├─ src/schema/          Zod schemas + inferred types (CaseDefinition, CasePublic, ...)
│  │  ├─ src/logic/           facts, contradiction rules, hypothesis evaluation
│  │  ├─ src/validator/       validateCase() + individual checks
│  │  ├─ src/generator/       templates → CaseDefinition (seeded, deterministic)
│  │  ├─ src/render/          fact → prose text templates
│  │  ├─ src/scoring/         scoreSubmission()
│  │  ├─ src/redact/          toPublicCase(), unlockClue()
│  │  └─ src/rng.ts           seeded PRNG (mulberry32 or similar)
│  ├─ content/                JSON content + loaders
│  │  ├─ cases/authored/      hand-written CaseDefinitions
│  │  ├─ templates/           CaseTemplates
│  │  ├─ pools/               names, locations, objects, motives
│  │  └─ conspiracy/          canonical graph nodes/edges
│  └─ api-contract/           Request/response Zod schemas shared by app + functions
├─ supabase/
│  ├─ migrations/             SQL, numbered
│  ├─ functions/              Edge Functions (one folder each)
│  └─ seed.sql
├─ tools/
│  └─ cli/                    `lastlie validate|generate|render|publish|playtest`
├─ docs/                      ADRs, content style guide
├─ SYSTEM_DESIGN.md
└─ PLAN.md
```

Tooling: **pnpm workspaces**, TypeScript `strict`, **Vitest** for tests, **ESLint + Prettier**, **Zod** for runtime schemas. Node 20+.

---

## 3. Domain model

### 3.1 Two layers per case

| Layer | Contents | Who sees it |
|---|---|---|
| **Ground truth** (`CaseDefinition.truth`) | Full event timeline, who lied, the real sequence | Server + authoring tools only |
| **Presentation** (`CasePublic`) | Briefing, characters, unlocked clues, hypotheses | Client |

The player's belief (their theory) is stored in the **session**. It is never stored in the case.

### 3.2 Facts: the atomic unit of truth

Everything the engine reasons about is a **Fact**, a typed, structured proposition. Prose is generated *from* facts, so rewording text can never change the logic.

```ts
type Time = number;            // minutes since 00:00 on the case day (e.g. 23:47 → 1427)
type Id = string;              // stable ids: "char_maya", "loc_lobby", "obj_phone"

type Fact =
  | { kind: "at";        who: Id; where: Id; from: Time; to: Time }      // presence interval
  | { kind: "action";    who: Id; verb: Verb; target?: Id; at: Time; where?: Id }
  | { kind: "possess";   who: Id; what: Id; from: Time; to: Time }
  | { kind: "message";   msg: Id; sender?: Id; device: Id; recipient: Id; sentAt: Time }
    // sender is optional: a carrier/phone record only knows the DEVICE, not the person.
    // Physical clues must omit `sender` unless the record itself proves who typed it.
  | { kind: "device_use";device: Id; by: Id; at: Time }                  // unlock/log entries
  | { kind: "access";    who: Id; door: Id; at: Time }                   // keycard/door logs
  | { kind: "relation";  a: Id; b: Id; rel: RelationType }
  | { kind: "motive";    who: Id; motive: MotiveType; regarding?: Id }
  | { kind: "state";     what: Id; property: string; value: string; at: Time };

type Verb = "took" | "placed" | "sent" | "deleted" | "edited" | "opened" | "met" | "called" | "paid";
```

New fact kinds are allowed. Each one needs (a) a schema, (b) contradiction rules, (c) a renderer, and (d) tests.

### 3.3 Ground truth

```ts
interface GroundTruth {
  timeline: Fact[];              // everything that actually happened (complete & consistent)
  culpritIds: Id[];              // who is responsible (may be empty for "no crime" cases)
  liars: { who: Id; statementClueIds: Id[] }[];  // which testimonies are false
  solutionHypothesisId: Id;      // which hypothesis is true
  keyEvidence: Id[][];           // ≥1 minimal clue sets that prove the solution (each set alone suffices)
  explanation: RevealBeat[];     // ordered reveal narrative, each beat cites clue ids
}
```

### 3.4 Clues

A clue is a piece of evidence that **asserts facts**. Its reliability decides whether those facts must be true.

```ts
interface Clue {
  id: Id;
  type: "message" | "access_log" | "device_log" | "receipt" | "testimony" |
        "photo" | "document" | "object" | "cctv";
  reliability: "physical" | "testimony";
  // physical: every asserted fact MUST be entailed by truth.timeline (validator enforces)
  // testimony: asserted facts may be false (a lie) — validator checks lies are listed in truth.liars
  source?: Id;                 // character who gave testimony / owner of document
  asserts: Fact[];
  text?: string;               // optional override; otherwise rendered from asserts
  unlock: { kind: "default" } | { kind: "after_clue"; clueId: Id }
        | { kind: "interview"; characterId: Id; questionId: Id }
        | { kind: "request"; cost: number };   // "request further evidence" (costs score)
  tags?: string[];             // e.g. "red_herring", "conspiracy_hook"
}
```

### 3.5 Hypotheses

The player picks a hypothesis. Every hypothesis is a **set of claims (Facts)** plus a culprit set. That lets the engine evaluate hypotheses mechanically.

```ts
interface Hypothesis {
  id: Id;
  label: string;               // "Arjun forged the message after Maya left"
  claims: Fact[];              // what must be true if this hypothesis holds
  culpritIds: Id[];
}
```

### 3.6 The complete case

```ts
interface CaseDefinition {
  id: Id;                       // "case_0001" or "gen_<templateId>_<seed>"
  version: number;
  kind: "authored" | "procedural" | "canonical";
  title: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  estimatedMinutes: number;
  mysteryType: "false_alibi" | "missing_item" | "forged_message" | "hidden_identity" | string;
  setting: { locationIds: Id[]; date: string; summary: string };
  briefing: string;             // the opening question shown to the player
  characters: Character[];      // id, name, role, publicDescription, portrait?
  locations: Location[];
  objects: GameObject[];
  clues: Clue[];
  hypotheses: Hypothesis[];     // 2–5
  interviews?: Interview[];     // v1.1+
  truth: GroundTruth;           // NEVER sent to client
  conspiracyHooks?: ConspiracyHook[];  // read-only references into canonical graph
  meta: { templateId?: Id; seed?: number; author?: string; status: CaseStatus };
}
type CaseStatus = "draft" | "validated" | "reviewed" | "published" | "retired";
```

`CasePublic` comes from `toPublicCase(def, unlockedClueIds)`. It uses an explicit allow-list.

**Unlocked clue → client:** `{ id, type, reliability, source?, text, unlock, tags? }`. `text` is **always present**: the `text` override, or else `renderClue()` output.
- **`asserts` is never sent.** Structured facts are the answer key in machine-readable form. For example, a message fact's `sender` can name the culprit even when the prose doesn't. The client works only from prose, and only the server evaluates facts.
- **`tags` are filtered** through a public allow-list (`PUBLIC_CLUE_TAGS`). Internal tags like `red_herring` and `conspiracy_hook` never leave the server.

**Locked clue → client:** `{ id: "locked_<n>", type, locked: true, hint }`.
- `hint` is one of `{ kind: "after_clue", clueId }` (only when that prerequisite clue is already unlocked, so its real id is public), `{ kind: "after_clue_hidden" }`, `{ kind: "interview" }`, or `{ kind: "request", cost }`.
- Placeholder ids are mapped back to real ids **on the server only**, inside the session.

**Also dropped:** `truth`, `hypotheses[].claims`, `hypotheses[].culpritIds`, `meta` (except `status`), and `conspiracyHooks`.

**Content rule (enforced by V11):** a clue's text may mention only the times, people, places and objects that appear in its own `asserts` (or its `source`). Physical clue `asserts` contain only what that record could actually observe.

---

## 4. Logic core: contradictions & evaluation

### 4.1 Contradiction rules

`contradicts(a: Fact, b: Fact, ctx): Contradiction | null`. It is pure and symmetric, and every rule has a stable `ruleId`. Starter rule set:

| ruleId | Conflict |
|---|---|
| `presence.two_places` | `at(x, L1, [a,b])` and `at(x, L2, [c,d])`, L1≠L2, intervals overlap |
| `presence.absent_action` | `action(x, …, at=t, where=L)` while `at(x, L2, …)` covers t, L≠L2 |
| `message.sender_device` | `message(sender=x, device=D, t)` but `device_use(D, by=y≠x, t)` with no use by x near t |
| `message.time` | Two facts give different `sentAt` for the same `msg` |
| `access.presence` | `access(x, door of L, t)` but x claims `at(x, L2≠L, …)` covering t |
| `possess.exclusive` | Two people have exclusive possession of the same object over overlapping intervals |
| `state.value` | Same `what/property` has different values at the same time with no change event between |
| `presence.travel` | Person x at L1 at/until t1 and at L2 at/from t2 (L1≠L2), and elapsed time `\|t2 - t1\| < travelTime(L1, L2)` |

**Interval semantics:** Intervals are half-open `[from, to)`. A person/possession exists at time `t` when `from <= t < to`. Touching intervals (where `to === from`) do **NOT** count as overlapping.

`ctx` holds the static world data (which door belongs to which location, device owners, travel times between locations). Travel time lets the engine catch "could not have got there in time" contradictions with `presence.travel`.

### 4.2 Evaluating a hypothesis

```
consistent(h, clues):
  physical = ⋃ asserts of physical clues in `clues`
  for each claim c in h.claims, for each fact f in physical:
     if contradicts(c, f) → h is ELIMINATED by (c, f)
  return not eliminated
```

Testimony facts do **not** eliminate hypotheses directly. They are statements that might be lies. The evidence board shows them as **contradiction targets**: the player links a testimony to a physical clue, and the engine confirms whether `contradicts()` fires.

### 4.3 Validator (`validateCase(def) → ValidationReport`)

Each check returns `{ checkId, severity: "error"|"warning", message, refs[] }`. A case is publishable only with **zero errors**.

| # | checkId | Rule |
|---|---|---|
| V1 | `schema` | Zod parse passes |
| V2 | `refs` | Every id referenced (characters, locations, objects, clues, hypotheses, unlock deps) exists |
| V3 | `timeline.consistent` | No two facts in `truth.timeline` contradict each other |
| V4 | `physical.entailed` | Every fact asserted by a physical clue appears in or follows from the timeline |
| V5 | `testimony.lies_declared` | Every testimony fact that contradicts the timeline belongs to a clue in `truth.liars`, and every declared lie really is false |
| V6 | `solution.consistent` | The solution hypothesis's claims don't contradict the timeline |
| V7 | `solution.unique` | With **all obtainable** clues, exactly one hypothesis survives (the solution) |
| V8 | `solution.reachable` | Each `keyEvidence` set is obtainable via unlock rules, and with only that set, all non-solution hypotheses are eliminated |
| V9 | `unlock.acyclic` | The unlock dependency graph has no cycles, and default clues exist |
| V10 | `difficulty.band` | Measured difficulty (below) matches `difficulty` ±1 (warning), ±2 (error) |
| V11 | `text.render` | Every clue renders to non-empty text, and no rendered text leaks truth-only ids (e.g. culprit name inside "redacted" text) |
| V12 | `hooks.canonical` | `conspiracyHooks` only reference existing canonical nodes, and they never create edges |
| V13 | `ambiguity.intentional` | If V7 fails because a case is *meant* to be ambiguous, `meta.allowAmbiguity` must be set and each surviving hypothesis must be listed in the reveal |

**Difficulty metric** (deterministic) is a weighted sum of:
- size of the smallest `keyEvidence` set,
- number of non-default clues in that set (how deep the unlocks go),
- number of red-herring clues,
- number of hypotheses,
- whether finding the decisive contradiction needs travel-time or multi-hop rules.

Calibrate the weights against human playtest times in Phase 3.

---

## 5. Procedural generation

### 5.1 Template model

A `CaseTemplate` is a parametrized blueprint. Its constraints are tested once, so every instance it produces stays solvable.

```ts
interface CaseTemplate {
  id: Id;                          // "tpl_false_alibi_message_v1"
  mysteryType: string;
  difficultyRange: [number, number];
  slots: SlotSpec[];               // e.g. culprit, victim, witness, location×2, device, motive
  build(rng: Rng, slots: FilledSlots, params: TemplateParams): CaseDefinition;
  // build() writes the timeline FIRST, then derives clues from it,
  // then writes hypotheses (true one + plausible decoys built by perturbing one claim).
}
```

Templates are TypeScript modules in `packages/case-engine/src/generator/templates/`. They are code because they hold logic. They read their pools from `packages/content/pools`.

### 5.2 Generation pipeline

```
generateCase(templateId, seed, difficulty)
  1. rng = seeded(seed)                         -- fully deterministic: same inputs → same case
  2. fill slots from pools (respect constraints: distinct names, compatible locations)
  3. template.build() → CaseDefinition
       a. ground-truth timeline
       b. derive physical clues from timeline facts (selection by difficulty)
       c. inject lies: chosen liar's testimony = timeline fact perturbed (time shift / place swap)
       d. red herrings: physical clues that are true but irrelevant to hypothesis elimination
       e. hypotheses: solution + N decoys (each decoy = solution with one claim perturbed
          so that exactly one key clue eliminates it)
  4. render prose from facts (src/render)
  5. validateCase() → if errors: retry with seed+1 (max 20), else return
  6. dedupe: fingerprint = hash(template, culprit role, decisive ruleId, location set);
     reject if fingerprint was served to this player in the last K cases
```

### 5.3 AI-assisted text (optional, offline only)

LLMs may **paraphrase rendered text** and **draft new templates/pools** inside the authoring CLI. They never run at play time and never touch `truth` or `asserts`. Any LLM-edited text is re-checked by V11. A rule also checks that no new proper nouns or times appear that are missing from the case facts. Templates drafted by AI follow the normal code review + validator path.

### 5.4 Serving procedural cases

v1: **pre-generate** batches with the CLI (`lastlie generate --template X --count 500`). The CLI validates them and publishes them to `cases` with `kind = 'procedural'`. The server picks from that pool. This keeps edge functions cheap and makes it easy to look at every served case afterwards. On-demand generation inside an edge function can come later, using the same engine call.

---

## 6. Conspiracy graph

Canonical, hand-authored, and versioned in `packages/content/conspiracy/` as JSON. It is mirrored into Postgres on publish.

- **Nodes**: `character | organization | location | symbol | transaction | case`
- **Edges**: `{ from, to, rel, revealedBy: caseId, clueId }`. An edge becomes visible to a player only after they solve the case that reveals it.
- **Procedural cases** may carry `conspiracyHooks`. A hook is a *mention* of an existing node, like a recurring symbol on a receipt. Solving the case can unlock a **lead** (a teaser) that points to the next canonical case. Procedural cases can never add nodes or edges (V12).
- **Canonical chapters** are authored cases (`kind = 'canonical'`) released every few weeks. Each chapter declares which edges it reveals.
- Player view: `player_graph_reveals` records which edges each player has seen. The Progress tab draws the conspiracy map from it.

---

## 7. Scoring & progression

### 7.1 Submission

```ts
interface Submission {
  sessionId: Id;
  hypothesisId: Id;
  supportingClueIds: Id[];         // "which evidence supports your theory" (max 3)
  contradictions: { a: Id; b: Id }[]; // evidence-board links the player made
}
```

### 7.2 `scoreSubmission(def, session, submission) → ScoreResult` (pure, server-side)

| Component | Rule | Points |
|---|---|---|
| Correct hypothesis | `hypothesisId === truth.solutionHypothesisId` | 100 |
| Evidence quality | supportingClueIds ⊇ some keyEvidence set → full. Partial overlap → proportional | 0–50 |
| Contradictions found | each valid link (`contradicts` fires and involves a declared lie) | +10 each, cap 30 |
| Bad links | link where no contradiction exists | −5 each, floor 0 for component |
| Evidence requests | each `request`-unlocked clue | −10 each |
| Wrong hypothesis | still earns evidence/contradiction points ×0.5 (reward partial reasoning) | — |

The score cannot be computed from time spent or number of attempts. **One submission per session**: replays from the archive are scored separately and give reduced XP (×0.25).

### 7.3 Progression tracks

- **Detective rank (XP).** XP = score × difficulty multiplier. Ranks: Trainee → Investigator → Specialist → Senior Detective → Master Detective. To move up a rank you need XP **and** a mastery gate (e.g. ≥N correct solves at difficulty ≥ rank level with evidence quality ≥ 60%). Grinding easy cases alone cannot level you up.
- **Knowledge collection**: dossiers, locations, and conspiracy reveals. These are permanent.
- **Social reputation** (Phase 5+): earned from well-supported solutions in shared and weekly cases.

Rank thresholds and mastery gates are stored as config in the `game_config` table, not hardcoded.

---

## 8. Backend

### 8.1 Database (Postgres via Supabase)

Write migrations in this order. Tables marked † belong to Phase 4+.

```sql
profiles(id uuid pk → auth.users, display_name, title, settings jsonb, created_at)
cases(id text pk, version int, kind text, title, difficulty int, mystery_type,
      estimated_minutes int, status text, public_payload jsonb,   -- CasePublic w/ ALL clues' public shape, minus locked texts
      fingerprint text, template_id text, published_at, retired_at)
case_private(case_id pk → cases, version int, definition jsonb)    -- full CaseDefinition incl. truth
case_sessions(id uuid pk, user_id, case_id, case_version, mode text  -- 'normal'|'daily'|'challenge'|'replay'
      , unlocked_clue_ids text[], board jsonb, status text, started_at, submitted_at)
case_results(session_id pk, user_id, case_id, hypothesis_id, supporting_clue_ids text[],
      contradictions jsonb, score int, breakdown jsonb, xp int, created_at)
player_progress(user_id pk, xp int, rank text, solved_count int, mastery jsonb, updated_at)
player_unlocks(user_id, kind text, ref_id text, unlocked_at, pk(user_id,kind,ref_id))  -- dossiers, archive, etc.
daily_cases(date pk, case_id)
game_config(key pk, value jsonb)
† conspiracy_nodes / conspiracy_edges / player_graph_reveals
† challenges(id text pk (short code), creator_id, case_id, case_version, created_at, expires_at)
† challenge_attempts(challenge_id, session_id, user_id null, guest_token null)
† referrals(id, challenge_id, new_user_id, created_at)
† analytics_events (or send straight to PostHog — prefer PostHog, skip this table)
```

**RLS policy summary**

| Table | anon/authenticated | service role |
|---|---|---|
| `cases` | SELECT where `status='published'` (only `public_payload` columns) | all |
| `case_private` | **no access** | all |
| `case_sessions`, `case_results`, `player_progress`, `player_unlocks` | SELECT own rows only; **no direct INSERT/UPDATE** | all |
| `profiles` | SELECT/UPDATE own row (display_name, settings only) | all |
| `daily_cases`, `game_config` | SELECT | all |

Every write that matters goes through Edge Functions running with the service role.

### 8.2 Edge Functions (API)

All request and response bodies are defined in `packages/api-contract` (Zod). Each function validates its input, checks the auth JWT (or a guest token for challenges), and returns typed errors `{ error: { code, message } }`.

| Function | Input | Behavior |
|---|---|---|
| `start-session` | `{ caseId? , mode, challengeId? }` | Picks a case if none is given (next unplayed case at the right difficulty, fingerprint dedupe). Creates a session and returns `CasePublic` with default clues. |
| `unlock-clue` | `{ sessionId, clueId, via }` | `clueId` is the public placeholder (`locked_<n>`), and the server maps it to the real id within the session. Checks the unlock rule against the session state. Adds the clue to the session and returns its public form. |
| `save-board` | `{ sessionId, board }` | Saves the evidence-board state (debounced from the client). |
| `check-link` | `{ sessionId, a, b }` | *Optional hint mode.* Returns only `valid: boolean` and is rate-limited. Off by default for competitive modes. |
| `submit` | `Submission` | Requires the session to be unsubmitted. Loads `case_private`, runs `scoreSubmission`, writes the result, updates progress/unlocks, and returns `ScoreResult` + `Reveal` (the full explanation and every clue). |
| `get-daily` | `{}` | Returns today's daily case id (UTC date). |
| † `create-challenge` | `{ sessionId }` | Must come after the creator has submitted. Returns a short code + share URL. |
| † `challenge-compare` | `{ challengeId }` | Only for people who have submitted. Returns everyone's hypothesis choices + clue usage (aggregated, no PII). |

Rate limits: per user, per function (e.g. 60/min), stored in a small Postgres table or Upstash. `submit` is idempotent per session.

### 8.3 Anti-cheat (proportionate)

- Solutions are never on the client (RLS + redaction tests).
- One scored submission per session. Leaderboards only count `mode in ('daily','weekly')`, first attempt.
- Weekly competitive cases are unpublished until their window opens.
- Flag sessions with impossibly short times as suspicious (excluded from leaderboards, not banned).

---

## 9. Mobile app

### 9.1 Stack

Expo SDK (latest stable) · Expo Router · TypeScript strict · **Zustand** for client state · **TanStack Query** for server calls · `react-native-reanimated` + `react-native-gesture-handler` for the evidence board · `@supabase/supabase-js` · MMKV (or AsyncStorage) for local persistence · Sentry · PostHog.

### 9.2 Data source abstraction

The UI never talks to Supabase directly. Every screen uses a `GameService` interface:

```ts
interface GameService {
  startSession(opts): Promise<{ session: SessionState; case: CasePublic }>;
  unlockClue(sessionId, clueId, via): Promise<PublicClue>;
  saveBoard(sessionId, board): Promise<void>;
  submit(submission): Promise<{ result: ScoreResult; reveal: Reveal }>;
  getProgress(): Promise<PlayerProgress>;
  listArchive(): Promise<ArchiveEntry[]>;
  getDaily(): Promise<CaseSummary>;
}
```

- `LocalGameService` (Phases 1–3): bundles authored cases from `packages/content` and runs the engine on the device. The truth ships in the bundle. **That is fine for prototypes only**, so the app shows a dev badge while it is in use.
- `RemoteGameService` (Phase 4+): uses the Edge Functions. A feature flag switches between the two. Remote is the only option in production builds.

### 9.3 Navigation (5 tabs)

| Tab | Screens |
|---|---|
| **Home** | One primary CTA, "Solve a case". Daily case card, continue-investigation card, latest conspiracy lead |
| **Investigate** | Case library (filter by difficulty/type) → Case screen |
| **Progress** | Rank + mastery, archive, character dossiers, conspiracy map (Phase 5) |
| **Challenges** | Friend challenges you sent/received, results comparison (Phase 4) |
| **Profile** | Name/title, stats, privacy, settings |

**Case screen** (the most important screen) has these sub-views:
1. **Briefing**: the question, characters, setting.
2. **Evidence**: clue list/cards, filtered by type, with an "unread" marker.
3. **Board**: a pannable canvas. Clue cards can be dragged, and you link two cards to claim a contradiction. Links are local until submit (or `check-link` in hint mode). It must also work without drag-and-drop for accessibility: select A, select B, tap "Link".
4. **Theory**: pick a hypothesis plus up to 3 supporting clues, confirm, then submit.
5. **Reveal**: a timeline of what really happened, with each beat citing clues. It shows the score breakdown, which links were right or wrong, and Next case / Share.

### 9.4 UX rules
- Every case has to be finishable in one sitting, but sessions resume if the player leaves.
- Spoilers are never shown before submission, and that includes the share card text.
- Text scales with the system font size. Color is never the only signal (link validity needs an icon too).
- Visual tone is noir/cyberpunk: dark theme first, a single accent color, and monospace for logs.

---

## 10. Social (Phase 4+)

- **Challenge link**: `https://<domain>/c/<code>`. It opens the Expo **web** build of the case screen, so friends can play in a browser with no account. The guest gets a signed guest token tied to the challenge. Installing the app and signing in moves the guest's result into the new account.
- **Result card**: an image without spoilers (case title, rank, score, "Can you beat me?"). Generate it on the device with `react-native-view-shot`.
- **Compare**: once you have submitted, you see the distribution of hypothesis choices and which clues people used most.
- Deferred: chat, guilds, live tournaments, creator marketplace.

---

## 11. Analytics events (PostHog)

`app_open`, `case_started{caseId,kind,difficulty,mode}`, `clue_viewed`, `clue_unlocked{via}`, `board_link_created{valid?}` (valid is filled in after submit), `case_submitted{correct,score,durationSec}`, `reveal_viewed`, `next_case_tapped`, `challenge_created`, `challenge_opened{guest}`, `challenge_completed`, `signup_from_challenge`, `case_reported{reason}`.

Key funnels: first-case completion, second-case start, D1/D7 retention, referral → case start, and case-quality reports per template.

---

## 12. Quality gates

- `case-engine`: ≥90% line coverage. Property tests (fast-check) confirm that `generateCase` gives validator-clean output for 1,000 seeds per template.
- **Redaction test**: deep-scan `toPublicCase` output for every unlock subset. It must contain none of the keys `truth`, `claims`, `culpritIds`, `seed`, `asserts`, `keyEvidence`, `liars`, `conspiracyHooks`, none of the internal tags, none of the locked clue texts, and no real id of a locked clue. An integration test does the same for the `start-session` / `unlock-clue` responses.
- **RLS tests**: SQL tests (pgTAP or supabase test scripts) confirm that anon and authenticated roles cannot read `case_private` or write sessions/results.
- **Content CI**: `lastlie validate packages/content/cases/**` runs in CI, and any error fails the build.
- Mobile: component tests for the case screen, plus one Maestro (or Detox) E2E flow: start case → view clue → link → submit → reveal → next case.

---

## 13. Key decisions (ADR summary)

| Decision | Choice | Why |
|---|---|---|
| Backend shape | Supabase + Edge Functions (modular monolith) | Managed auth/DB, low ops, TS everywhere |
| Engine location | Shared pure-TS package | One source of logic for app, server, and CLI |
| Case truth representation | Typed Facts + contradiction rules | Makes the validator deterministic. Text stays a presentation detail |
| Procedural serving | Pre-generated & published batches | Every served case can be inspected, functions stay cheap, and analytics are per case |
| AI usage | Offline paraphrase/drafting only | Play-time truth is never non-deterministic |
| Mobile framework | Expo (RN) + web target | One codebase for iOS, Android, and the browser challenge page |
| Monetization | None until retention is proven (§11 of concept) | — |
