# Incident at North Gate Print Shop (case_fa_4294)

- **Mystery Type:** false_alibi
- **Difficulty:** Declared: 3 | Measured: 3 (Score: 16.5)
- **Estimated Duration:** 11 minutes
- **Date:** 2026-11-04
- **Setting:** An unauthorized incident occurred at North Gate Print Shop under cover of evening routines.

## Briefing
Following the incident involving Transit Cipher Ledger at North Gate Print Shop, investigators identified four persons of interest: Yvaine Chen, Astrid Whitman, Dorian Mercer, and Lenore Castile. Each claims to have been elsewhere during the evening. Identify which account is fabricated.

## Cast of Characters
- **Dorian Mercer** (Primary Suspect): Primary Suspect in Vesper City involved in the incident.
- **Yvaine Chen** (Staff Member): Staff Member in Vesper City involved in the incident.
- **Astrid Whitman** (Associate): Associate in Vesper City involved in the incident.
- **Lenore Castile** (Night Supervisor): Night Supervisor in Vesper City involved in the incident.

## Locations
- **North Gate Print Shop**: Industrial printing press facility with mechanical composing bays and ink tanks.
- **North Freight Dock**: Enclosed cargo staging bay equipped with security turnstiles and rolling shutters.
- **The Vesper Chronicle Newsroom**: Editorial offices, library archives, and news telegraph desks.

## Evidence & Clues
- **[clue_culprit_testimony]** (testimony, testimony, Default)
  > "Dorian Mercer stated: 'I spent the entire evening from 20:10 to 20:30 at North Freight Dock attending to routine matters.'"
- **[clue_suspect1_testimony]** (testimony, testimony, Default)
  > "Yvaine Chen stated: 'I was present in North Freight Dock between 20:10 and 20:30. I did not see any unauthorized activity.'"
- **[clue_suspect1_alibi_access]** (access_log, physical, Default)
  > "Access Reader: Yvaine Chen badged through door_dock_turnstile at 20:15."
- **[clue_culprit_crime_access]** (access_log, physical, Unlocked via clue_culprit_testimony)
  > "Security Terminal: Dorian Mercer scanned access badge at door_printshop_dock at 20:18."
- **[clue_suspect2_alibi_access]** (access_log, physical, Default)
  > "Turnstile Log: Astrid Whitman verified entry at door_newsroom_press at 20:16."
- **[clue_redherring_1]** (cctv, physical, Default [tags: red_herring])
  > "[20:10] SECURITY_CAMERA · THE_VESPER_CHRONICLE_NEWSROOM · visual: Lenore Castile"
- **[clue_redherring_2]** (access_log, physical, Default [tags: red_herring])
  > "[20:17] ACCESS_LOG · NEWSROOM_PRESS · badge: Lenore Castile"

## Hypotheses
- **hyp_culprit_innocent**: Dorian Mercer remained at North Freight Dock and did not enter North Gate Print Shop.
- **hyp_suspect1_guilty**: Yvaine Chen entered North Gate Print Shop and took Transit Cipher Ledger.
- **hyp_culprit_guilty**: Dorian Mercer entered North Gate Print Shop and took Transit Cipher Ledger. **[SOLUTION]**
- **hyp_suspect2_guilty**: Astrid Whitman entered North Gate Print Shop and took Transit Cipher Ledger.

## Truth & Reveal Explanation
- **Culprit:** char_dorian
- **Liars:** char_dorian (clue_culprit_testimony)
- **Key Evidence Sets:** [clue_suspect1_alibi_access, clue_suspect2_alibi_access, clue_culprit_crime_access]

### Chronological Explanation
1. **[1215]** Yvaine Chen was logged badging into door_dock_turnstile at 20:15, proving their presence at North Freight Dock and ruling out their presence at North Gate Print Shop. *(Clues: clue_suspect1_alibi_access)*
2. **[1216]** Astrid Whitman badged through door_newsroom_press at 20:16, establishing their presence at The Vesper Chronicle Newsroom. *(Clues: clue_suspect2_alibi_access)*
3. **[1218]** Dorian Mercer was captured scanning their badge at door_printshop_dock at 20:18, completely shattering their fabricated alibi. *(Clues: clue_culprit_crime_access, clue_culprit_testimony)*
4. **[1220]** Dorian Mercer took Transit Cipher Ledger from North Gate Print Shop at 20:20 before departing. *(Clues: clue_culprit_crime_access)*
