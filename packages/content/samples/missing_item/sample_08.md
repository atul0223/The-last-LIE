# A Breach in North Freight Dock: The High-Speed Rotary Press (case_gen_111621)

- **Mystery Type:** missing_item
- **Difficulty:** Declared: 4 | Measured: 4 (Score: 20)
- **Estimated Duration:** 18 minutes
- **Date:** 2026-10-24
- **Setting:** Vesper City incidents across North Freight Dock, The Grand Vesper Hotel, Vesper Central Station.

## Briefing
The disappearance of High-Speed Rotary Press from North Freight Dock triggered an audit. Conflicting accounts from Damian Althaus, Silas Ibrahim, Celeste Althaus, and Beatrix Ward contradict physical registers. Trace the evidence to recover the truth.

## Cast of Characters
- **Damian Althaus** (Visiting Researcher): Archive Clerk in Vesper City involved in the incident.
- **Beatrix Ward** (Security Officer): Vault Curator in Vesper City involved in the incident.
- **Celeste Althaus** (Vault Curator): Visiting Researcher in Vesper City involved in the incident.
- **Silas Ibrahim** (Chief Conservator): Security Guard in Vesper City involved in the incident.

## Locations
- **North Freight Dock**: Enclosed cargo staging bay equipped with security turnstiles and rolling shutters.
- **The Grand Vesper Hotel**: Neoclassical luxury hotel situated north of the central rail terminus.
- **Vesper Central Station**: Subterranean rail hub connecting municipal lines to northern freight corridors.

## Evidence & Clues
- **[clue_missing_item_testimony]** (testimony, testimony, Default)
  > "Damian Althaus stated: 'I personally inspected the display mounting of High-Speed Rotary Press at 20:18; the security seal was completely intact.'"
- **[clue_custody_log]** (document, physical, Default)
  > "Official Register: Beatrix Ward verified registered custody of High-Speed Rotary Press in North Freight Dock until 20:20."
- **[clue_custodian_office_access]** (access_log, physical, Default)
  > "Office Reader: Beatrix Ward badged through door_hotel_lobby at 20:26."
- **[clue_culprit_vault_access]** (access_log, physical, Unlocked via clue_missing_item_testimony)
  > "Vault Terminal: Damian Althaus scanned access badge at door_dock_turnstile at 20:18."
- **[clue_seal_sensor]** (document, physical, Default)
  > "Sensor Diagnostic: Automated mount recorded the security seal on High-Speed Rotary Press was broken at 20:18."
- **[clue_suspect2_transit_access]** (access_log, physical, Unlocked via clue_custodian_office_access)
  > "Turnstile Log: Celeste Althaus verified entry at door_station_gate at 20:16."
- **[clue_suspect3_transit_access]** (access_log, physical, Default)
  > "Turnstile Log: Silas Ibrahim verified entry at door_station_gate at 20:17."
- **[clue_redherring_1]** (access_log, physical, Default [tags: red_herring])
  > "[20:02] HOTEL_LOBBY · badge: Beatrix Ward"
- **[clue_redherring_2]** (cctv, physical, Default [tags: red_herring])
  > "[20:10] SECURITY_CAMERA · VESPER_CENTRAL_STATION · visual: Celeste Althaus"

## Hypotheses
- **hyp_culprit_guilty**: Damian Althaus entered North Freight Dock and took High-Speed Rotary Press. **[SOLUTION]**
- **hyp_suspect2_guilty**: Celeste Althaus entered North Freight Dock and took High-Speed Rotary Press.
- **hyp_custodian_guilty**: Beatrix Ward entered North Freight Dock and took High-Speed Rotary Press.
- **hyp_suspect3_guilty**: Silas Ibrahim entered North Freight Dock and took High-Speed Rotary Press.

## Truth & Reveal Explanation
- **Culprit:** char_damian
- **Liars:** char_damian (clue_missing_item_testimony)
- **Key Evidence Sets:** [clue_custodian_office_access, clue_suspect2_transit_access, clue_suspect3_transit_access, clue_culprit_vault_access]

### Chronological Explanation
1. **[1216]** Digital sensor diagnostics showed the security seal on High-Speed Rotary Press was broken at 20:18, contradicting testimony that it remained intact. *(Clues: clue_seal_sensor, clue_missing_item_testimony)*
2. **[1218]** Terminal badge logs confirmed Damian Althaus accessed door_dock_turnstile at 20:18, putting them inside the vault during the theft. *(Clues: clue_culprit_vault_access)*
3. **[1216]** Celeste Althaus badged into door_station_gate at 20:16, ruling out their presence at North Freight Dock. *(Clues: clue_suspect2_transit_access)*
4. **[1217]** Silas Ibrahim badged into door_station_gate at 20:17, ruling out their presence at North Freight Dock. *(Clues: clue_suspect3_transit_access)*
5. **[1220]** Damian Althaus took High-Speed Rotary Press from North Freight Dock before departing. *(Clues: clue_culprit_vault_access)*
