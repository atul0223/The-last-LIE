# Incident of the Vanished High-Speed Rotary Press at North Freight Dock (case_gen_815535)

- **Mystery Type:** false_alibi
- **Difficulty:** Declared: 4 | Measured: 3 (Score: 17)
- **Estimated Duration:** 18 minutes
- **Date:** 2026-10-24
- **Setting:** Vesper City incidents across North Freight Dock, The Grand Vesper Hotel, Vesper Central Station.

## Briefing
At 20:35, High-Speed Rotary Press was taken from North Freight Dock. Physical evidence refutes an alibi fabricated by one of four individuals: Damian Althaus, Celeste Althaus, Beatrix Ward, and Silas Ibrahim. Examine the timeline to identify the culprit.

## Cast of Characters
- **Damian Althaus** (Associate): Primary Suspect in Vesper City involved in the incident.
- **Beatrix Ward** (Staff Specialist): Staff Member in Vesper City involved in the incident.
- **Celeste Althaus** (Night Supervisor): Associate in Vesper City involved in the incident.
- **Silas Ibrahim** (Chief Auditor): Night Supervisor in Vesper City involved in the incident.

## Locations
- **North Freight Dock**: Enclosed cargo staging bay equipped with security turnstiles and rolling shutters.
- **The Grand Vesper Hotel**: Neoclassical luxury hotel situated north of the central rail terminus.
- **Vesper Central Station**: Subterranean rail hub connecting municipal lines to northern freight corridors.

## Evidence & Clues
- **[clue_alibi_testimony]** (testimony, testimony, Default)
  > "Damian Althaus stated: 'I spent the entire evening from 20:10 to 20:30 at The Grand Vesper Hotel attending to routine matters.'"
- **[clue_suspect1_testimony]** (testimony, testimony, Default)
  > "Beatrix Ward stated: 'I was present in The Grand Vesper Hotel between 20:10 and 20:30. I did not see Damian Althaus anywhere nearby.'"
- **[clue_suspect1_alibi_access]** (access_log, physical, Default)
  > "Access Reader: Beatrix Ward badged through door_hotel_lobby at 20:15."
- **[clue_decisive_refutation]** (access_log, physical, Unlocked via clue_alibi_testimony)
  > "Gate Reader: Damian Althaus scanned access badge at door_dock_turnstile at 20:33, only three minutes after alleged presence at The Grand Vesper Hotel."
- **[clue_suspect2_alibi_access]** (access_log, physical, Unlocked via clue_suspect1_alibi_access)
  > "Turnstile Log: Celeste Althaus verified entry at door_station_gate at 20:16."
- **[clue_suspect3_alibi_access]** (access_log, physical, Default)
  > "Turnstile Log: Silas Ibrahim verified entry at door_station_gate at 20:17."
- **[clue_redherring_1]** (access_log, physical, Default [tags: red_herring])
  > "[20:05] HOTEL_LOBBY · badge: Beatrix Ward"
- **[clue_redherring_2]** (cctv, physical, Default [tags: red_herring])
  > "[20:10] SECURITY_CAMERA · VESPER_CENTRAL_STATION · visual: Celeste Althaus"

## Hypotheses
- **hyp_culprit_guilty**: Damian Althaus entered North Freight Dock and took High-Speed Rotary Press. **[SOLUTION]**
- **hyp_suspect2_guilty**: Celeste Althaus entered North Freight Dock and took High-Speed Rotary Press.
- **hyp_suspect1_guilty**: Beatrix Ward entered North Freight Dock and took High-Speed Rotary Press.
- **hyp_suspect3_guilty**: Silas Ibrahim entered North Freight Dock and took High-Speed Rotary Press.

## Truth & Reveal Explanation
- **Culprit:** char_damian
- **Liars:** char_damian (clue_alibi_testimony)
- **Key Evidence Sets:** [clue_suspect1_alibi_access, clue_suspect2_alibi_access, clue_suspect3_alibi_access, clue_decisive_refutation]

### Chronological Explanation
1. **[1215]** Beatrix Ward was logged badging into door_hotel_lobby at 20:15, proving their presence at The Grand Vesper Hotel and ruling out their presence at North Freight Dock. *(Clues: clue_suspect1_alibi_access)*
2. **[1216]** Celeste Althaus badged through door_station_gate at 20:16, establishing their presence at Vesper Central Station. *(Clues: clue_suspect2_alibi_access)*
3. **[1217]** Silas Ibrahim badged through door_station_gate at 20:17, ruling out their presence at North Freight Dock. *(Clues: clue_suspect3_alibi_access)*
4. **[1233]** Damian Althaus's presence was definitively established at North Freight Dock, shattering the fabricated alibi testimony. *(Clues: clue_decisive_refutation, clue_alibi_testimony)*
5. **[1235]** Damian Althaus took High-Speed Rotary Press from North Freight Dock before departing. *(Clues: clue_decisive_refutation)*
