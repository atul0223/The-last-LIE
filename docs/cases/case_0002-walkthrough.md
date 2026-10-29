# Case 0002: The Missing Astrum — Solution Walkthrough

## 1. Overview of the Crime

At 20:30 on October 30, 2026, an armored municipal transport van arrived at the Helios Fine Arts Gallery loading dock to take custody of the Astrum Seal (`obj_astrum_seal`), a priceless celestial clockwork automaton. When the secure freight holding bay was opened, the seal's display container was empty.

### What Really Happened (Ground Truth Timeline)

- **20:00–20:13:** Curator Asher Vance (`char_asher`) conducts the final condition assessment of the Astrum Seal at the exhibition pedestal (`loc_gallery`). The display sensor registers his physical custody from 20:05 until 20:13.
- **20:05:** Security guard Clara Diaz (`char_clara`) logs a badge scan at the outer loading dock bay gate (`door_dock_bay`) during her standard perimeter check. She does not enter the staging bay.
- **20:10–20:30:** Archive registrar Beatrice Chen (`char_beatrice`) prepares transit packing crates in the loading dock (`loc_dock`).
- **20:13–20:15:** Asher completes his notes, leaves the gallery hall, and walks to the loading dock. At 20:15, he badges through the loading dock turnstile (`door_dock_turnstile`).
- **20:16–20:21:** Beatrice takes custody of the Astrum Seal from Asher in the dock and places it inside the dock staging bay holding locker at 20:21.
- **20:18:** Logistics courier Daniel Holt (`char_daniel`) scans his badge at the loading dock turnstile (`door_dock_turnstile`) and enters the loading dock (`loc_dock`, 20:18–20:28).
- **20:22:** Daniel intercepts the unattended holding locker, steals the Astrum Seal, and conceals it in his transport container.
- **20:25:** Daniel invents a false alibi: he claims he was never in the loading dock staging bay and spent 20:15–20:30 inside the exhibition hall assisting with vitrine packing.

### Who Lied and Why

- **Daniel Holt (`char_daniel`):** Daniel is the sole culprit and the sole liar. He stated that he was inside the exhibition hall (`loc_gallery`) from 20:15 to 20:30. In reality, he badged into the loading dock turnstile (`door_dock_turnstile` in `loc_dock`) at 20:18 where he stole the artifact. His statement directly conflicts with physical access evidence (`access.presence`) and ground truth presence (`presence.two_places`).

---

## 2. Cast of Characters

- **Asher Vance (`char_asher`):** Gallery Curator. Inspected the Astrum Seal at the exhibition pedestal until 20:13 before heading to the loading dock.
- **Beatrice Chen (`char_beatrice`):** Archive Registrar. Stationed in the loading dock packing bay from 20:10 to 20:30; secured the artifact into the dock holding locker at 20:21.
- **Clara Diaz (`char_clara`):** Night Security Guard (Red Herring). Scanned the outer bay gate reader at 20:05 on routine patrol.
- **Daniel Holt (`char_daniel`):** Transit Courier (Culprit & Liar). Claimed an alibi in the exhibition hall between 20:15 and 20:30.

---

## 3. Step-by-Step Detective Walkthrough

### Step 1: Examine the Initial Briefing and Default Evidence

The detective starts with the briefing and 5 default clues:
1. **`clue_asher_testimony`:** Asher Vance claims he completed inventory in the exhibition hall from 20:00 to 20:13, then walked down to the loading dock.
2. **`clue_beatrice_testimony`:** Beatrice Chen claims she was in the loading dock from 20:10 to 20:30 assembling transit crates.
3. **`clue_daniel_testimony`:** Daniel Holt claims he was in the exhibition hall from 20:15 to 20:30 helping pack vitrines.
4. **`clue_pedestal_sensor`:** Electronic pedestal cradle sensor logs Asher Vance holding the Astrum Seal from 20:05 to 20:13.
5. **`clue_clara_patrol_log` (Red Herring):** Perimeter log confirms guard Clara Diaz scanned the dock bay gate at 20:05.

### Step 2: Uncover Decoy 1 Contradiction via `access.presence`

- **Decoy Hypothesis 1 (`hyp_asher_stole`):** _"Asher Vance concealed the Astrum Seal in the exhibition hall."_
  - Claims: Asher remained in `loc_gallery` continuously from 20:10 to 20:25 (`[1210, 1225)`).
- **Investigation:** Following Asher's statement, the investigator requests the loading dock entry reader log.
- **Unlock Clue 6 (`clue_dock_access_log`):** Card reader registers Asher Vance badging through `door_dock_turnstile` (`loc_dock`) at **20:15** (`1215`).
- **Contradiction (`access.presence`):** Asher cannot badge through a loading dock door (`door_dock_turnstile` in `loc_dock`) at 20:15 while being present inside the exhibition hall (`loc_gallery`) over `[1210, 1225)`.
- **Result:** Decoy Hypothesis 1 is conclusively eliminated.

### Step 3: Uncover Decoy 2 Contradiction via `possess.exclusive`

- **Decoy Hypothesis 2 (`hyp_beatrice_stole`):** _"Beatrice Chen removed the Astrum Seal during early packing."_
  - Claims: Beatrice took exclusive custody of `obj_astrum_seal` from 20:08 to 20:20 (`[1208, 1220)`).
- **Physical Evidence (`clue_pedestal_sensor`):** The gallery pedestal sensor log proves that Asher Vance had exclusive physical custody of the seal from 20:05 to 20:13 (`[1205, 1213)`).
- **Contradiction (`possess.exclusive`):** The Astrum Seal cannot be possessed simultaneously by Beatrice Chen (`[1208, 1220)`) and Asher Vance (`[1205, 1213)`), as the intervals overlap between 20:08 and 20:13.
- **Result:** Decoy Hypothesis 2 is conclusively eliminated.

### Step 4: Discard Red Herring & Expose Daniel Holt

- **Red Herring (`clue_clara_patrol_log`):** Clara Diaz only scanned the exterior gate at 20:05; she never entered the packing area or had custody of the artifact.
- **Unlock Clue 8 (`clue_courier_access_log`):** Following Daniel's statement, checking the turnstile reader reveals Daniel Holt badged through `door_dock_turnstile` at **20:18** (`1218`).
- **Provable Lie (`access.presence`):** Daniel claimed he stayed in the gallery hall from 20:15 to 20:30 (`[1215, 1230)`). However, `clue_courier_access_log` proves he badged into the loading dock at 20:18. Daniel cannot badge into `door_dock_turnstile` (`loc_dock`) while being in `loc_gallery`. This physical evidence directly proves Daniel lied to cover his presence at the scene of the theft.

### Step 5: Final Deductive Synthesis

1. Decoy 1 (Asher hid the seal in the gallery) is eliminated by `clue_dock_access_log` (`access.presence`).
2. Decoy 2 (Beatrice stole the seal early) is eliminated by `clue_pedestal_sensor` (`possess.exclusive`).
3. Daniel Holt's alibi is shattered by `clue_courier_access_log` (`access.presence`), placing the culprit at the loading dock where the artifact disappeared.
4. **Conclusion:** Solution Hypothesis **`hyp_daniel_stole`** (_"Daniel Holt took the Astrum Seal from the loading dock staging bay."_) is the sole surviving truth.

**Key Evidence Trio:** `["clue_dock_access_log", "clue_pedestal_sensor", "clue_courier_access_log"]`
Together, these three physical clues eliminate both decoy hypotheses and positively place Daniel Holt at the loading dock, satisfying all fair-play and positive evidence rules.
