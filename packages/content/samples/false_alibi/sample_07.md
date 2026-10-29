# The Broken Alibi of Damian Ramsay (case_fa_6182)

- **Mystery Type:** false_alibi
- **Difficulty:** Declared: 3 | Measured: 3 (Score: 16.5)
- **Estimated Duration:** 11 minutes
- **Date:** 2026-11-04
- **Setting:** An unauthorized incident occurred at The Grand Vesper Hotel under cover of evening routines.

## Briefing
Transit Cipher Ledger was compromised at The Grand Vesper Hotel. Suspect Damian Ramsay claims to have been at North Gate Print Shop throughout the entire evening. Unravel the contradictions to identify the perpetrator.

## Cast of Characters
- **Damian Ramsay** (Primary Suspect): Primary Suspect in Vesper City involved in the incident.
- **Nadia Grayson** (Staff Member): Staff Member in Vesper City involved in the incident.
- **Eleanor Belmont** (Associate): Associate in Vesper City involved in the incident.
- **Beatrix Sterling** (Night Supervisor): Night Supervisor in Vesper City involved in the incident.

## Locations
- **The Grand Vesper Hotel**: Neoclassical luxury hotel situated north of the central rail terminus.
- **North Gate Print Shop**: Industrial printing press facility with mechanical composing bays and ink tanks.
- **The Vesper Chronicle Newsroom**: Editorial offices, library archives, and news telegraph desks.

## Evidence & Clues
- **[clue_culprit_testimony]** (testimony, testimony, Default)
  > "Damian Ramsay stated: 'I spent the entire evening from 20:10 to 20:30 at North Gate Print Shop attending to routine matters.'"
- **[clue_suspect1_testimony]** (testimony, testimony, Default)
  > "Nadia Grayson stated: 'I was present in North Gate Print Shop between 20:10 and 20:30. I did not see any unauthorized activity.'"
- **[clue_suspect1_alibi_access]** (access_log, physical, Default)
  > "Access Reader: Nadia Grayson badged through door_printshop_dock at 20:15."
- **[clue_culprit_crime_access]** (access_log, physical, Unlocked via clue_culprit_testimony)
  > "Security Terminal: Damian Ramsay scanned access badge at door_hotel_lobby at 20:18."
- **[clue_suspect2_alibi_access]** (access_log, physical, Default)
  > "Turnstile Log: Eleanor Belmont verified entry at door_newsroom_press at 20:16."
- **[clue_redherring_1]** (access_log, physical, Default [tags: red_herring])
  > "[20:06] ACCESS_LOG · NEWSROOM_PRESS · badge: Eleanor Belmont"
- **[clue_redherring_2]** (access_log, physical, Default [tags: red_herring])
  > "[20:29] ACCESS_LOG · NEWSROOM_PRESS · badge: Eleanor Belmont"

## Hypotheses
- **hyp_culprit_guilty**: Damian Ramsay took Transit Cipher Ledger from The Grand Vesper Hotel. **[SOLUTION]**
- **hyp_suspect1_guilty**: Nadia Grayson was present at The Grand Vesper Hotel during the incident.
- **hyp_suspect2_guilty**: Eleanor Belmont was present at The Grand Vesper Hotel during the incident.
- **hyp_culprit_innocent**: Damian Ramsay was at North Gate Print Shop and did not enter The Grand Vesper Hotel.

## Truth & Reveal Explanation
- **Culprit:** char_damian
- **Liars:** char_damian (clue_culprit_testimony)
- **Key Evidence Sets:** [clue_suspect1_alibi_access, clue_suspect2_alibi_access, clue_culprit_crime_access]

### Chronological Explanation
1. **[1215]** Nadia Grayson was logged badging into door_printshop_dock at 20:15, proving their presence at North Gate Print Shop and ruling out their presence at The Grand Vesper Hotel. *(Clues: clue_suspect1_alibi_access)*
2. **[1216]** Eleanor Belmont badged through door_newsroom_press at 20:16, establishing their presence at The Vesper Chronicle Newsroom. *(Clues: clue_suspect2_alibi_access)*
3. **[1218]** Damian Ramsay was captured scanning their badge at door_hotel_lobby at 20:18, completely shattering their fabricated alibi. *(Clues: clue_culprit_crime_access, clue_culprit_testimony)*
4. **[1220]** Damian Ramsay took Transit Cipher Ledger from The Grand Vesper Hotel at 20:20 before departing. *(Clues: clue_culprit_crime_access)*
