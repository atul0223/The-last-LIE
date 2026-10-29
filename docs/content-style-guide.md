# Vesper City Content Style Guide

> Source of truth for writing authored cases, procedural templates, clue copy, and world narratives for **THE LAST LIE: Infinite**.

---

## 1. Setting & Tone

### 1.1 The World of Vesper City

Vesper City is a dense, rain-slicked metropolis where mid-century noir sensibilities collide with near-future corporate technocracy. Heavy rain, neon reflections in dark puddles, analog cardkeys beside digital touchscreens, and whispered institutional coverups set the atmosphere.

### 1.2 Core Tone Principles

- **Noir & Grounded:** Atmosphere is cynical, observational, precise, and understated. Characters speak with economic brevity. The city feels lived-in, cold, and bureaucratic.
- **Intellectual Puzzles over Visceral Horror:** No gore, no gratuitous violence, and no sensationalist shock value. Crimes focus on theft, forged communications, altered records, missing devices, industrial espionage, and fabricated alibis.
- **Fair Play Mystery:** The player must always have all necessary structured facts in evidence to deduce the truth. Solutions never hinge on paranormal elements, unstated technology, sudden confessions, or hidden leaps of logic.
- **Procedural Consistency:** The ground truth timeline exists before presentation. Clues never contradict the established physics, floor plans, or travel times of Vesper City.

---

## 2. Identifier Naming Conventions

Every entity in a case definition must possess a clean, unique, descriptive identifier following these standard prefixes:

| Entity Type   | Prefix           | Example                                    | Description              |
| ------------- | ---------------- | ------------------------------------------ | ------------------------ |
| Character     | `char_`          | `char_maya`, `char_arjun`                  | Unique character handle  |
| Location      | `loc_`           | `loc_studio`, `loc_lobby`                  | Physical room or zone    |
| Object / Item | `obj_`           | `obj_phone_maya`, `obj_badge`              | Physical item or device  |
| Clue          | `clue_`          | `clue_keycard_exit`, `clue_chat_log`       | Piece of evidence        |
| Hypothesis    | `hyp_`           | `hyp_arjun_forged`, `hyp_maya_sent`        | Theory formulation       |
| Message       | `msg_`           | `msg_alibi_text`, `msg_threat`             | Individual communication |
| Door          | `door_`          | `door_studio_exit`, `door_lobby_turnstile` | Doorway or access point  |
| Device        | `dev_` or `obj_` | `obj_phone_maya`, `dev_terminal_01`        | Electronic hardware      |

---

## 3. Clue-Writing Rules

Every clue is rendered from structured facts or provided as an intentional textual excerpt. Follow these strict authoring rules:

1. **One Fact per Sentence:** Keep sentences clean, atomic, and direct. Avoid compound causal assertions in log entries or testimonies.
   - _Good:_ "Maya passed through the lobby exit turnstile at 23:41. Keycard 408 was registered."
   - _Bad:_ "Maya exited through the lobby after texting Arjun because she was running late."
2. **24-Hour Times (`HH:MM`):** Always write timestamps in 24-hour notation with leading zeros (e.g., `09:15`, `23:41`, `00:05`).
3. **Fair-play rule:** No single clue may state the crime or the answer outright (e.g. never 'X took the item'). But the evidence MUST let the player prove the solution: every declared lie must be contradicted by at least one obtainable physical clue, and the culprit must be placed (by time/place/possession/device) by at least one key-evidence clue. Physical records may name people when the record itself would show them (badge logs, sign-in sheets, device logins).
4. **Reliability Disciplines:**
   - **Physical Evidence:** Access logs, CCTV timestamps, digital device logs, time-stamped receipts, and forensic object logs. Every fact asserted must be entailed by the ground truth timeline.
   - **Testimony:** Statements given by suspects or witnesses. Testimony may assert subjective or false claims (lies), but any lie must be explicitly declared in `truth.liars`.
5. **Red Herrings:** Must be factually true (entailed by reality), plausible, but ultimately orthogonal to the decisive contradiction eliminating decoys.

---

## 4. Difficulty Guide

Cases are graded on a 1–5 difficulty scale calibrated to human solve times and cognitive complexity:

| Tier                      | Difficulty | Estimated Time | Clues | Key Evidence Size | Structure & Complexity                                                                                     |
| ------------------------- | ---------- | -------------- | ----- | ----------------- | ---------------------------------------------------------------------------------------------------------- |
| **Tier 1 (Trainee)**      | `1`        | 3–4 min        | 5–6   | 2 clues           | Single contradiction; all default clues or 1 shallow unlock; zero red herrings; direct timeline clash.     |
| **Tier 2 (Investigator)** | `2`        | 4–6 min        | 6–8   | 2 clues           | 1 unlock dependency; 1 plausible red herring; requires cross-referencing access logs with device activity. |
| **Tier 3 (Specialist)**   | `3`        | 6–8 min        | 7–10  | 2–3 clues         | Multi-step unlocks (e.g. clue A unlocks clue B); 1–2 red herrings; travel-time adjacency reasoning.        |
| **Tier 4 (Senior Det.)**  | `4`        | 8–12 min       | 9–12  | 3 clues           | Deep unlock trees; multiple declared lies; multi-hop travel times; overlapping device uses.                |
| **Tier 5 (Master Det.)**  | `5`        | 12–18 min      | 12+   | 3–4 clues         | Conspiracy hooks; complex physical alibis; multi-character alibi chains; subtle interval boundary traps.   |
