# Case 0004: The Midnight Edition — Solution Walkthrough

## 1. Overview of the Mystery

- **Mystery Type:** `forged_message`
- **Target Difficulty:** 3 (Advanced)
- **Setting:** The Vesper Chronicle Newsroom (`loc_newsroom`) and North Gate Lithograph & Print Shop (`loc_printshop`), connected by a 10-minute transit route.
- **Incident Summary:** At 23:30 on November 10, 2026, the morning edition of *The Vesper Chronicle* rolled off the rotary press carrying a retracted headline that quashed an explosive municipal corruption exposé. Investigation revealed that the master lead slug and rotary cylinder plate were tampered with inside the print shop composing bay before printing commenced.

### What Really Happened (Ground Truth Timeline)

- **23:00–23:15 (1380–1395):** Managing Editor Silas Thorne (`char_silas`) holds registered custody of the original approved headline slug (`obj_lead_slug`) in the newsroom archives until formal press release.
- **23:05–23:25 (1385–1405):** Investigative reporter Quinn Harper (`char_quinn`) conducts research in the newsroom archives (`loc_newsroom`). At 23:10 (1390), she badges through the archive security door (`door_newsroom_archives`).
- **23:08 (1388):** Chief typesetter Roland Finch (`char_roland`) scans his badge at the exterior loading dock gate (`door_printshop_dock`) on routine delivery intake.
- **23:10–23:14 (1390–1394):** Print shop assistant Toby Crane (`char_toby`) fabricates a counterfeit retraction slug and replaces the authentic plate on cylinder #2 of the rotary press (`obj_rotary_press`).
- **23:15 (1395):** The automated press optical inspection sensor registers the rotary press plate status as `"forged_altered"`.
- **23:15–23:30 (1395–1410):** Composing bay CCTV records Toby Crane present in the print shop.
- **23:20 (1400):** Toby Crane manually locks the altered plate cylinder onto the high-speed rotary press (`obj_rotary_press`).
- **23:25 (1405):** Toby prepares a fabricated defense: he claims he inspected the plate cylinder at 23:15 and verified its status was `"approved_original"`.

### Who Lied and Why

- **Toby Crane (`char_toby`):** Toby is the sole culprit and sole liar. He claimed that at 23:15 (`1395`), the rotary press plate status was verified as `"approved_original"`.
- **The Decisive Contradiction (`state.value`):** The automated optical sensor on the rotary press (`obj_rotary_press`) recorded its plate status at 23:15 as `"forged_altered"`. A physical system cannot have both `'approved_original'` and `'forged_altered'` simultaneously at 23:15, disproving Toby's alibi and exposing his tampering.

---

## 2. Cast of Characters (Q–Z Names)

1. **Quinn Harper (`char_quinn`):** Senior Investigative Reporter. Authored the original exposé; was working in the newsroom archives.
2. **Roland Finch (`char_roland`):** Master Typesetter (Red Herring). Scanned delivery dock gate on routine material delivery.
3. **Silas Thorne (`char_silas`):** Managing Editor. Retained registered custody of the approved headline slug until 23:15.
4. **Toby Crane (`char_toby`):** Print Shop Assistant (Culprit & Liar). Substituted the altered plate and fabricated a false inspection report.

---

## 3. Step-by-Step Detective Walkthrough

### Step 1: Initial Briefing and Default Evidence

The detective starts with 5 default clues:
1. **`clue_quinn_testimony`:** Quinn claims she remained in the newsroom archives from 23:05 to 23:25 reviewing municipal land deeds.
2. **`clue_roland_testimony`:** Roland claims he was monitoring loading dock deliveries from 23:05 to 23:25.
3. **`clue_toby_testimony`:** Toby claims he inspected the rotary press plate at 23:15 in the print shop and verified it was `"approved_original"`.
4. **`clue_editor_custody_log`:** Managing editor custody record confirms Silas Thorne held registered custody of the approved headline slug from 23:00 to 23:15.
5. **`clue_dock_patrol_log` (Red Herring):** Dock access log shows Roland Finch scanned the print shop loading dock gate at 23:08.

### Step 2: Eliminate Decoy 1 via `access.presence`

- **Decoy Hypothesis 1 (`hyp_quinn_forged`):** _"Quinn Harper altered the headline plate in the composing room to fabricate a sensational scoop."_
  - Claims: Quinn was present at `loc_printshop` from 23:05 to 23:20 (`[1385, 1400)`).
- **Investigation:** Inspect Quinn's newsroom movements.
- **Unlock Clue 6 (`clue_newsroom_keycard_log`):** Keycard reader logs Quinn Harper entering `door_newsroom_archives` in `loc_newsroom` at **23:10** (`1390`).
- **Contradiction (`access.presence`):** Quinn cannot badge into a newsroom door at 23:10 while being present in the print shop across town over `[1385, 1400)`.
- **Result:** Decoy Hypothesis 1 is conclusively eliminated.

### Step 3: Eliminate Decoy 2 via `possess.exclusive`

- **Decoy Hypothesis 2 (`hyp_roland_forged`):** _"Roland Finch smuggled the forged slug in early and held exclusive possession of the plate."_
  - Claims: Roland held exclusive custody of `obj_lead_slug` from 23:02 to 23:12 (`[1382, 1392)`).
- **Physical Evidence (`clue_editor_custody_log`):** Official safe custody record proves Silas Thorne held registered custody of `obj_lead_slug` from 23:00 to 23:15 (`[1380, 1395)`).
- **Contradiction (`possess.exclusive`):** The master slug cannot be possessed simultaneously by Roland Finch and Silas Thorne over `[1382, 1392)`.
- **Result:** Decoy Hypothesis 2 is conclusively eliminated.

### Step 4: Expose Toby Crane via `state.value`

- **Toby's False Claim (`clue_toby_testimony`):** Toby stated that at 23:15 (`1395`), `obj_rotary_press.status` was `"approved_original"`.
- **Unlock Clue 7 (`clue_press_optical_sensor`):** Optical telemetry logs `obj_rotary_press.status` at 23:15 as `"forged_altered"`.
- **Contradiction (`state.value`):** The property `obj_rotary_press.status` cannot be both `'approved_original'` and `'forged_altered'` at time 1395.
- **Unlock Clue 8 (`clue_composing_cctv`):** Composing bay CCTV places Toby Crane at the print shop between 23:15 and 23:30, positively linking him to the machine where the crime occurred.

### Step 5: Deductive Synthesis & Solution

1. Decoy 1 is eliminated by `clue_newsroom_keycard_log` (`access.presence`).
2. Decoy 2 is eliminated by `clue_editor_custody_log` (`possess.exclusive`).
3. Toby Crane's statement is disproved by `clue_press_optical_sensor` (`state.value`), and he is positively placed at the rotary press by `clue_composing_cctv`.
4. **Conclusion:** Solution Hypothesis **`hyp_toby_forged`** (_"Toby Crane substituted the headline plate on the rotary press in the composing bay."_) is the sole surviving truth.

**Key Evidence Set:** `["clue_newsroom_keycard_log", "clue_editor_custody_log", "clue_composing_cctv"]`
Satisfies reachability, uniqueness, positive culprit evidence, and fair-play requirements at difficulty 3.
