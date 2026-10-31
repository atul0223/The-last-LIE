# The Shadowed Alibi of North Gate Print Shop After Hours (case_gen_673080)

- **Mystery Type:** false_alibi
- **Difficulty:** Declared: 3 | Measured: 3 (Score: 16.5)
- **Estimated Duration:** 14 minutes
- **Date:** 2026-10-24
- **Setting:** Vesper City incidents across North Gate Print Shop, Vesper Central Station, North Freight Dock.

## Briefing
At 20:20, Freight Turnstile Scanner was taken from North Gate Print Shop. Physical evidence refutes an alibi fabricated by one of four individuals: Yvaine Calloway, Sebastian Thorne, Octavia Harrington, and Cassian Ashford. Examine the timeline to identify the culprit.

## Cast of Characters
- **Sebastian Thorne** (Primary Suspect): Primary Suspect in Vesper City involved in the incident.
- **Yvaine Calloway** (Chief Auditor): Staff Member in Vesper City involved in the incident.
- **Cassian Ashford** (Associate): Associate in Vesper City involved in the incident.
- **Octavia Harrington** (Staff Specialist): Night Supervisor in Vesper City involved in the incident.

## Locations
- **North Gate Print Shop**: Industrial printing press facility with mechanical composing bays and ink tanks.
- **Vesper Central Station**: Subterranean rail hub connecting municipal lines to northern freight corridors.
- **North Freight Dock**: Enclosed cargo staging bay equipped with security turnstiles and rolling shutters.

## Evidence & Clues
- **[clue_alibi_testimony]** (testimony, testimony, Default)
  > "Sebastian Thorne stated: 'I spent the entire evening from 20:10 to 20:30 at Vesper Central Station attending to routine matters.'"
- **[clue_suspect1_testimony]** (testimony, testimony, Default)
  > "Yvaine Calloway stated: 'I was present in Vesper Central Station between 20:10 and 20:30. I did not see Sebastian Thorne anywhere nearby.'"
- **[clue_suspect1_alibi_access]** (access_log, physical, Default)
  > "Access Reader: Yvaine Calloway badged through door_station_gate at 20:15."
- **[clue_decisive_refutation]** (access_log, physical, Unlocked via clue_alibi_testimony)
  > "Security Terminal: Sebastian Thorne scanned access badge at door_printshop_dock at 20:18."
- **[clue_suspect2_alibi_access]** (access_log, physical, Default)
  > "Turnstile Log: Cassian Ashford verified entry at door_dock_turnstile at 20:16."
- **[clue_redherring_1]** (access_log, physical, Default [tags: red_herring])
  > "[20:05] STATION_GATE · badge: Yvaine Calloway"
- **[clue_redherring_2]** (cctv, physical, Default [tags: red_herring])
  > "[20:10] SECURITY_CAMERA · NORTH_FREIGHT_DOCK · visual: Octavia Harrington"

## Hypotheses
- **hyp_culprit_innocent**: Sebastian Thorne remained at Vesper Central Station and did not enter North Gate Print Shop.
- **hyp_suspect2_guilty**: Cassian Ashford entered North Gate Print Shop and took Freight Turnstile Scanner.
- **hyp_culprit_guilty**: Sebastian Thorne entered North Gate Print Shop and took Freight Turnstile Scanner. **[SOLUTION]**
- **hyp_suspect1_guilty**: Yvaine Calloway entered North Gate Print Shop and took Freight Turnstile Scanner.

## Truth & Reveal Explanation
- **Culprit:** char_sebastian
- **Liars:** char_sebastian (clue_alibi_testimony)
- **Key Evidence Sets:** [clue_suspect1_alibi_access, clue_suspect2_alibi_access, clue_decisive_refutation]

### Chronological Explanation
1. **[1215]** Yvaine Calloway was logged badging into door_station_gate at 20:15, proving their presence at Vesper Central Station and ruling out their presence at North Gate Print Shop. *(Clues: clue_suspect1_alibi_access)*
2. **[1216]** Cassian Ashford badged through door_dock_turnstile at 20:16, establishing their presence at North Freight Dock. *(Clues: clue_suspect2_alibi_access)*
3. **[1218]** Sebastian Thorne's presence was definitively established at North Gate Print Shop, shattering the fabricated alibi testimony. *(Clues: clue_decisive_refutation, clue_alibi_testimony)*
4. **[1220]** Sebastian Thorne took Freight Turnstile Scanner from North Gate Print Shop before departing. *(Clues: clue_decisive_refutation)*
