# Deception at North Freight Dock Under Cover of Dark (case_gen_337591)

- **Mystery Type:** false_alibi
- **Difficulty:** Declared: 3 | Measured: 3 (Score: 16.5)
- **Estimated Duration:** 14 minutes
- **Date:** 2026-10-24
- **Setting:** Vesper City incidents across North Gate Print Shop, North Freight Dock, The Vesper Chronicle Newsroom.

## Briefing
The theft of Transit Cipher Ledger from North Gate Print Shop occurred under cover of evening. One of the four individuals present—Astrid Whitman, Lenore Castile, Dorian Mercer, and Yvaine Chen—has fabricated their movements. Reconstruct the logs to expose the true culprit.

## Cast of Characters
- **Dorian Mercer** (Night Supervisor): Primary Suspect in Vesper City involved in the incident.
- **Yvaine Chen** (Associate): Staff Member in Vesper City involved in the incident.
- **Astrid Whitman** (Chief Auditor): Associate in Vesper City involved in the incident.
- **Lenore Castile** (Staff Specialist): Night Supervisor in Vesper City involved in the incident.

## Locations
- **North Gate Print Shop**: Industrial printing press facility with mechanical composing bays and ink tanks.
- **North Freight Dock**: Enclosed cargo staging bay equipped with security turnstiles and rolling shutters.
- **The Vesper Chronicle Newsroom**: Editorial offices, library archives, and news telegraph desks.

## Evidence & Clues
- **[clue_alibi_testimony]** (testimony, testimony, Default)
  > "Dorian Mercer stated: 'I spent the entire evening from 20:10 to 20:30 at North Freight Dock attending to routine matters.'"
- **[clue_suspect1_testimony]** (testimony, testimony, Default)
  > "Yvaine Chen stated: 'I was present in North Freight Dock between 20:10 and 20:30. I did not see Dorian Mercer anywhere nearby.'"
- **[clue_suspect1_alibi_access]** (access_log, physical, Default)
  > "Access Reader: Yvaine Chen badged through door_dock_turnstile at 20:15."
- **[clue_decisive_refutation]** (access_log, physical, Unlocked via clue_alibi_testimony)
  > "Security Terminal: Dorian Mercer scanned access badge at door_printshop_dock at 20:18."
- **[clue_suspect2_alibi_access]** (access_log, physical, Default)
  > "Turnstile Log: Astrid Whitman verified entry at door_newsroom_press at 20:16."
- **[clue_redherring_1]** (access_log, physical, Default [tags: red_herring])
  > "[20:29] ENTRY_GATE · NEWSROOM_PRESS · authorized: Astrid Whitman"
- **[clue_redherring_2]** (access_log, physical, Default [tags: red_herring])
  > "[20:28] ACCESS_LOG · DOCK_TURNSTILE · badge: Yvaine Chen"

## Hypotheses
- **hyp_suspect1_guilty**: Yvaine Chen entered North Gate Print Shop and took Transit Cipher Ledger.
- **hyp_suspect2_guilty**: Astrid Whitman entered North Gate Print Shop and took Transit Cipher Ledger.
- **hyp_culprit_innocent**: Dorian Mercer remained at North Freight Dock and did not enter North Gate Print Shop.
- **hyp_culprit_guilty**: Dorian Mercer entered North Gate Print Shop and took Transit Cipher Ledger. **[SOLUTION]**

## Truth & Reveal Explanation
- **Culprit:** char_dorian
- **Liars:** char_dorian (clue_alibi_testimony)
- **Key Evidence Sets:** [clue_suspect1_alibi_access, clue_suspect2_alibi_access, clue_decisive_refutation]

### Chronological Explanation
1. **[1215]** Yvaine Chen was logged badging into door_dock_turnstile at 20:15, proving their presence at North Freight Dock and ruling out their presence at North Gate Print Shop. *(Clues: clue_suspect1_alibi_access)*
2. **[1216]** Astrid Whitman badged through door_newsroom_press at 20:16, establishing their presence at The Vesper Chronicle Newsroom. *(Clues: clue_suspect2_alibi_access)*
3. **[1218]** Dorian Mercer's presence was definitively established at North Gate Print Shop, shattering the fabricated alibi testimony. *(Clues: clue_decisive_refutation, clue_alibi_testimony)*
4. **[1220]** Dorian Mercer took Transit Cipher Ledger from North Gate Print Shop before departing. *(Clues: clue_decisive_refutation)*
