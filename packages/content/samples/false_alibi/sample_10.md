# Contradiction at Vesper Central Station (case_fa_4805)

- **Mystery Type:** false_alibi
- **Difficulty:** Declared: 3 | Measured: 3 (Score: 16.5)
- **Estimated Duration:** 11 minutes
- **Date:** 2026-11-04
- **Setting:** An unauthorized incident occurred at North Gate Print Shop under cover of evening routines.

## Briefing
Freight Turnstile Scanner was compromised at North Gate Print Shop. Suspect Sebastian Thorne claims to have been at Vesper Central Station throughout the entire evening. Unravel the contradictions to identify the perpetrator.

## Cast of Characters
- **Sebastian Thorne** (Primary Suspect): Primary Suspect in Vesper City involved in the incident.
- **Yvaine Calloway** (Staff Member): Staff Member in Vesper City involved in the incident.
- **Cassian Ashford** (Associate): Associate in Vesper City involved in the incident.
- **Octavia Harrington** (Night Supervisor): Night Supervisor in Vesper City involved in the incident.

## Locations
- **North Gate Print Shop**: Industrial printing press facility with mechanical composing bays and ink tanks.
- **Vesper Central Station**: Subterranean rail hub connecting municipal lines to northern freight corridors.
- **North Freight Dock**: Enclosed cargo staging bay equipped with security turnstiles and rolling shutters.

## Evidence & Clues
- **[clue_culprit_testimony]** (testimony, testimony, Default)
  > "Sebastian Thorne stated: 'I spent the entire evening from 20:10 to 20:30 at Vesper Central Station attending to routine matters.'"
- **[clue_suspect1_testimony]** (testimony, testimony, Default)
  > "Yvaine Calloway stated: 'I was present in Vesper Central Station between 20:10 and 20:30. I did not see any unauthorized activity.'"
- **[clue_suspect1_alibi_access]** (access_log, physical, Default)
  > "Access Reader: Yvaine Calloway badged through door_station_gate at 20:15."
- **[clue_culprit_crime_access]** (access_log, physical, Unlocked via clue_culprit_testimony)
  > "Security Terminal: Sebastian Thorne scanned access badge at door_printshop_dock at 20:18."
- **[clue_suspect2_alibi_access]** (access_log, physical, Default)
  > "Turnstile Log: Cassian Ashford verified entry at door_dock_turnstile at 20:16."
- **[clue_redherring_1]** (cctv, physical, Default [tags: red_herring])
  > "[20:10] CCTV_FEED · NORTH_FREIGHT_DOCK · subject: Cassian Ashford"
- **[clue_redherring_2]** (access_log, physical, Default [tags: red_herring])
  > "[20:29] ENTRY_GATE · DOCK_TURNSTILE · authorized: Cassian Ashford"

## Hypotheses
- **hyp_culprit_guilty**: Sebastian Thorne took Freight Turnstile Scanner from North Gate Print Shop. **[SOLUTION]**
- **hyp_suspect1_guilty**: Yvaine Calloway was present at North Gate Print Shop during the incident.
- **hyp_suspect2_guilty**: Cassian Ashford was present at North Gate Print Shop during the incident.
- **hyp_culprit_innocent**: Sebastian Thorne was at Vesper Central Station and did not enter North Gate Print Shop.

## Truth & Reveal Explanation
- **Culprit:** char_sebastian
- **Liars:** char_sebastian (clue_culprit_testimony)
- **Key Evidence Sets:** [clue_suspect1_alibi_access, clue_suspect2_alibi_access, clue_culprit_crime_access]

### Chronological Explanation
1. **[1215]** Yvaine Calloway was logged badging into door_station_gate at 20:15, proving their presence at Vesper Central Station and ruling out their presence at North Gate Print Shop. *(Clues: clue_suspect1_alibi_access)*
2. **[1216]** Cassian Ashford badged through door_dock_turnstile at 20:16, establishing their presence at North Freight Dock. *(Clues: clue_suspect2_alibi_access)*
3. **[1218]** Sebastian Thorne was captured scanning their badge at door_printshop_dock at 20:18, completely shattering their fabricated alibi. *(Clues: clue_culprit_crime_access, clue_culprit_testimony)*
4. **[1220]** Sebastian Thorne took Freight Turnstile Scanner from North Gate Print Shop at 20:20 before departing. *(Clues: clue_culprit_crime_access)*
