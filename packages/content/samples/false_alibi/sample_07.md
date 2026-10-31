# Shadows Over The Grand Vesper Hotel Before Dawn (case_gen_470048)

- **Mystery Type:** false_alibi
- **Difficulty:** Declared: 3 | Measured: 3 (Score: 16.5)
- **Estimated Duration:** 14 minutes
- **Date:** 2026-10-24
- **Setting:** Vesper City incidents across The Grand Vesper Hotel, North Gate Print Shop, The Vesper Chronicle Newsroom.

## Briefing
The theft of Transit Cipher Ledger from The Grand Vesper Hotel occurred under cover of evening. One of the four individuals present—Nadia Grayson, Eleanor Belmont, Beatrix Sterling, and Damian Ramsay—has fabricated their movements. Reconstruct the logs to expose the true culprit.

## Cast of Characters
- **Damian Ramsay** (Chief Auditor): Primary Suspect in Vesper City involved in the incident.
- **Nadia Grayson** (Associate): Staff Member in Vesper City involved in the incident.
- **Eleanor Belmont** (Primary Suspect): Associate in Vesper City involved in the incident.
- **Beatrix Sterling** (Night Supervisor): Night Supervisor in Vesper City involved in the incident.

## Locations
- **The Grand Vesper Hotel**: Neoclassical luxury hotel situated north of the central rail terminus.
- **North Gate Print Shop**: Industrial printing press facility with mechanical composing bays and ink tanks.
- **The Vesper Chronicle Newsroom**: Editorial offices, library archives, and news telegraph desks.

## Evidence & Clues
- **[clue_alibi_testimony]** (testimony, testimony, Default)
  > "Damian Ramsay stated: 'I spent the entire evening from 20:10 to 20:30 at North Gate Print Shop attending to routine matters.'"
- **[clue_suspect1_testimony]** (testimony, testimony, Default)
  > "Nadia Grayson stated: 'I was present in North Gate Print Shop between 20:10 and 20:30. I did not see Damian Ramsay anywhere nearby.'"
- **[clue_suspect1_alibi_access]** (access_log, physical, Default)
  > "Access Reader: Nadia Grayson badged through door_printshop_dock at 20:15."
- **[clue_decisive_refutation]** (cctv, physical, Unlocked via clue_alibi_testimony)
  > "Surveillance Still: High-resolution camera recorded Damian Ramsay inside The Grand Vesper Hotel between 20:15 and 20:35."
- **[clue_suspect2_alibi_access]** (access_log, physical, Default)
  > "Turnstile Log: Eleanor Belmont verified entry at door_newsroom_press at 20:16."
- **[clue_redherring_1]** (access_log, physical, Default [tags: red_herring])
  > "[20:29] ACCESS_LOG · NEWSROOM_PRESS · badge: Eleanor Belmont"
- **[clue_redherring_2]** (access_log, physical, Default [tags: red_herring])
  > "[20:28] ACCESS_LOG · PRINTSHOP_DOCK · badge: Nadia Grayson"

## Hypotheses
- **hyp_culprit_guilty**: Damian Ramsay entered The Grand Vesper Hotel and took Transit Cipher Ledger. **[SOLUTION]**
- **hyp_suspect1_guilty**: Nadia Grayson entered The Grand Vesper Hotel and took Transit Cipher Ledger.
- **hyp_suspect2_guilty**: Eleanor Belmont entered The Grand Vesper Hotel and took Transit Cipher Ledger.
- **hyp_culprit_innocent**: Damian Ramsay remained at North Gate Print Shop and did not enter The Grand Vesper Hotel.

## Truth & Reveal Explanation
- **Culprit:** char_damian
- **Liars:** char_damian (clue_alibi_testimony)
- **Key Evidence Sets:** [clue_suspect1_alibi_access, clue_suspect2_alibi_access, clue_decisive_refutation]

### Chronological Explanation
1. **[1215]** Nadia Grayson was logged badging into door_printshop_dock at 20:15, proving their presence at North Gate Print Shop and ruling out their presence at The Grand Vesper Hotel. *(Clues: clue_suspect1_alibi_access)*
2. **[1216]** Eleanor Belmont badged through door_newsroom_press at 20:16, establishing their presence at The Vesper Chronicle Newsroom. *(Clues: clue_suspect2_alibi_access)*
3. **[1218]** Damian Ramsay's presence was definitively established at The Grand Vesper Hotel, shattering the fabricated alibi testimony. *(Clues: clue_decisive_refutation, clue_alibi_testimony)*
4. **[1220]** Damian Ramsay took Transit Cipher Ledger from The Grand Vesper Hotel before departing. *(Clues: clue_decisive_refutation)*
