# The Broken Timeline at North Gate Print Shop After Hours (case_fa_7176)

- **Mystery Type:** false_alibi
- **Difficulty:** Declared: 2 | Measured: 2 (Score: 13.5)
- **Estimated Duration:** 9 minutes
- **Date:** 2026-11-04
- **Setting:** An unauthorized incident occurred at Vesper Central Station under cover of evening routines.

## Briefing
Security at Vesper Central Station reported Freight Turnstile Scanner missing from its station. Sebastian Mercer, Marcel Frost, and Lucas Vaughn were on site during the evening hours, each offering an explanation. Review the movement logs to expose the false alibi.

## Cast of Characters
- **Marcel Frost** (Primary Suspect): Primary Suspect in Vesper City involved in the incident.
- **Lucas Vaughn** (Staff Member): Staff Member in Vesper City involved in the incident.
- **Sebastian Mercer** (Associate): Associate in Vesper City involved in the incident.

## Locations
- **Vesper Central Station**: Subterranean rail hub connecting municipal lines to northern freight corridors.
- **The Grand Vesper Hotel**: Neoclassical luxury hotel situated north of the central rail terminus.
- **North Gate Print Shop**: Industrial printing press facility with mechanical composing bays and ink tanks.

## Evidence & Clues
- **[clue_culprit_testimony]** (testimony, testimony, Default)
  > "Marcel Frost stated: 'I spent the entire evening from 20:10 to 20:30 at The Grand Vesper Hotel attending to routine matters.'"
- **[clue_suspect1_testimony]** (testimony, testimony, Default)
  > "Lucas Vaughn stated: 'I was present in The Grand Vesper Hotel between 20:10 and 20:30. I did not see any unauthorized activity.'"
- **[clue_suspect1_alibi_access]** (access_log, physical, Default)
  > "Access Reader: Lucas Vaughn badged through door_hotel_lobby at 20:15."
- **[clue_culprit_crime_access]** (access_log, physical, Unlocked via clue_culprit_testimony)
  > "Security Terminal: Marcel Frost scanned access badge at door_station_gate at 20:18."
- **[clue_suspect2_alibi_access]** (access_log, physical, Default)
  > "Turnstile Log: Sebastian Mercer verified entry at door_printshop_dock at 20:16."
- **[clue_redherring_1]** (cctv, physical, Default [tags: red_herring])
  > "[20:10] CCTV_FEED · NORTH_GATE_PRINT_SHOP · subject: Sebastian Mercer"
- **[clue_redherring_2]** (access_log, physical, Default [tags: red_herring])
  > "[20:06] ACCESS_LOG · PRINTSHOP_DOCK · badge: Sebastian Mercer"

## Hypotheses
- **hyp_culprit_innocent**: Marcel Frost remained at The Grand Vesper Hotel and did not enter Vesper Central Station.
- **hyp_suspect1_guilty**: Lucas Vaughn entered Vesper Central Station and took Freight Turnstile Scanner.
- **hyp_culprit_guilty**: Marcel Frost entered Vesper Central Station and took Freight Turnstile Scanner. **[SOLUTION]**
- **hyp_suspect2_guilty**: Sebastian Mercer entered Vesper Central Station and took Freight Turnstile Scanner.

## Truth & Reveal Explanation
- **Culprit:** char_marcel
- **Liars:** char_marcel (clue_culprit_testimony)
- **Key Evidence Sets:** [clue_suspect1_alibi_access, clue_suspect2_alibi_access, clue_culprit_crime_access]

### Chronological Explanation
1. **[1215]** Lucas Vaughn was logged badging into door_hotel_lobby at 20:15, proving their presence at The Grand Vesper Hotel and ruling out their presence at Vesper Central Station. *(Clues: clue_suspect1_alibi_access)*
2. **[1216]** Sebastian Mercer badged through door_printshop_dock at 20:16, establishing their presence at North Gate Print Shop. *(Clues: clue_suspect2_alibi_access)*
3. **[1218]** Marcel Frost was captured scanning their badge at door_station_gate at 20:18, completely shattering their fabricated alibi. *(Clues: clue_culprit_crime_access, clue_culprit_testimony)*
4. **[1220]** Marcel Frost took Freight Turnstile Scanner from Vesper Central Station at 20:20 before departing. *(Clues: clue_culprit_crime_access)*
