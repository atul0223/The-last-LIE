# The Broken Alibi of Damian Althaus (case_fa_6262)

- **Mystery Type:** false_alibi
- **Difficulty:** Declared: 4 | Measured: 4 (Score: 20)
- **Estimated Duration:** 13 minutes
- **Date:** 2026-11-04
- **Setting:** An unauthorized incident occurred at North Freight Dock under cover of evening routines.

## Briefing
High-Speed Rotary Press was compromised at North Freight Dock. Suspect Damian Althaus claims to have been at The Grand Vesper Hotel throughout the entire evening. Unravel the contradictions to identify the perpetrator.

## Cast of Characters
- **Damian Althaus** (Primary Suspect): Primary Suspect in Vesper City involved in the incident.
- **Beatrix Ward** (Staff Member): Staff Member in Vesper City involved in the incident.
- **Celeste Althaus** (Associate): Associate in Vesper City involved in the incident.
- **Silas Ibrahim** (Night Supervisor): Night Supervisor in Vesper City involved in the incident.

## Locations
- **North Freight Dock**: Enclosed cargo staging bay equipped with security turnstiles and rolling shutters.
- **The Grand Vesper Hotel**: Neoclassical luxury hotel situated north of the central rail terminus.
- **Vesper Central Station**: Subterranean rail hub connecting municipal lines to northern freight corridors.

## Evidence & Clues
- **[clue_culprit_testimony]** (testimony, testimony, Default)
  > "Damian Althaus stated: 'I spent the entire evening from 20:10 to 20:30 at The Grand Vesper Hotel attending to routine matters.'"
- **[clue_suspect1_testimony]** (testimony, testimony, Default)
  > "Beatrix Ward stated: 'I was present in The Grand Vesper Hotel between 20:10 and 20:30. I did not see any unauthorized activity.'"
- **[clue_suspect1_alibi_access]** (access_log, physical, Default)
  > "Access Reader: Beatrix Ward badged through door_hotel_lobby at 20:15."
- **[clue_culprit_crime_access]** (access_log, physical, Unlocked via clue_culprit_testimony)
  > "Security Terminal: Damian Althaus scanned access badge at door_dock_turnstile at 20:18."
- **[clue_suspect2_alibi_access]** (access_log, physical, Unlocked via clue_suspect1_testimony)
  > "Turnstile Log: Celeste Althaus verified entry at door_station_gate at 20:16."
- **[clue_suspect3_alibi_access]** (access_log, physical, Default)
  > "Turnstile Log: Silas Ibrahim verified entry at door_station_gate at 20:17."
- **[clue_redherring_1]** (access_log, physical, Default [tags: red_herring])
  > "[20:05] HOTEL_LOBBY · badge: Beatrix Ward"
- **[clue_redherring_2]** (access_log, physical, Default [tags: red_herring])
  > "[20:06] ENTRY_GATE · STATION_GATE · authorized: Celeste Althaus"

## Hypotheses
- **hyp_culprit_guilty**: Damian Althaus took High-Speed Rotary Press from North Freight Dock. **[SOLUTION]**
- **hyp_suspect1_guilty**: Beatrix Ward was present at North Freight Dock during the incident.
- **hyp_suspect2_guilty**: Celeste Althaus was present at North Freight Dock during the incident.
- **hyp_suspect3_guilty**: Silas Ibrahim was present at North Freight Dock during the incident.

## Truth & Reveal Explanation
- **Culprit:** char_damian
- **Liars:** char_damian (clue_culprit_testimony)
- **Key Evidence Sets:** [clue_suspect1_alibi_access, clue_suspect2_alibi_access, clue_suspect3_alibi_access, clue_culprit_crime_access]

### Chronological Explanation
1. **[1215]** Beatrix Ward was logged badging into door_hotel_lobby at 20:15, proving their presence at The Grand Vesper Hotel and ruling out their presence at North Freight Dock. *(Clues: clue_suspect1_alibi_access)*
2. **[1216]** Celeste Althaus badged through door_station_gate at 20:16, establishing their presence at Vesper Central Station. *(Clues: clue_suspect2_alibi_access)*
3. **[1217]** Silas Ibrahim badged through door_station_gate at 20:17, ruling out their presence at North Freight Dock. *(Clues: clue_suspect3_alibi_access)*
4. **[1218]** Damian Althaus was captured scanning their badge at door_dock_turnstile at 20:18, completely shattering their fabricated alibi. *(Clues: clue_culprit_crime_access, clue_culprit_testimony)*
5. **[1220]** Damian Althaus took High-Speed Rotary Press from North Freight Dock at 20:20 before departing. *(Clues: clue_culprit_crime_access)*
