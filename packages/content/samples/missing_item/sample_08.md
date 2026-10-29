# Disappearance of the High-Speed Rotary Press (case_mi_1577)

- **Mystery Type:** missing_item
- **Difficulty:** Declared: 4 | Measured: 4 (Score: 20)
- **Estimated Duration:** 13 minutes
- **Date:** 2026-11-05
- **Setting:** A high-value object went missing from North Freight Dock during evening shifts.

## Briefing
High-Speed Rotary Press disappeared from North Freight Dock. Staff member Damian Althaus claims to have been working in The Grand Vesper Hotel and denies entering the vault. Correlate custody logs and entry records to expose the thief.

## Cast of Characters
- **Damian Althaus** (Archive Clerk): Archive Clerk in Vesper City involved in the incident.
- **Beatrix Ward** (Vault Curator): Vault Curator in Vesper City involved in the incident.
- **Celeste Althaus** (Visiting Researcher): Visiting Researcher in Vesper City involved in the incident.
- **Silas Ibrahim** (Security Guard): Security Guard in Vesper City involved in the incident.

## Locations
- **North Freight Dock**: Enclosed cargo staging bay equipped with security turnstiles and rolling shutters.
- **The Grand Vesper Hotel**: Neoclassical luxury hotel situated north of the central rail terminus.
- **Vesper Central Station**: Subterranean rail hub connecting municipal lines to northern freight corridors.

## Evidence & Clues
- **[clue_custody_log]** (document, physical, Default)
  > "Official Register: Beatrix Ward verified registered custody of High-Speed Rotary Press in North Freight Dock until 20:20."
- **[clue_culprit_testimony]** (testimony, testimony, Default)
  > "Damian Althaus stated: 'I remained in The Grand Vesper Hotel from 20:10 to 20:30. In fact, Celeste Althaus was already holding High-Speed Rotary Press earlier around 20:12.'"
- **[clue_custodian_office_access]** (access_log, physical, Default)
  > "Office Reader: Beatrix Ward badged through door_hotel_lobby at 20:26."
- **[clue_culprit_vault_access]** (access_log, physical, Unlocked via clue_culprit_testimony)
  > "Vault Security Gate: Damian Althaus scanned access badge at door_dock_turnstile at 20:18."
- **[clue_suspect2_transit_access]** (access_log, physical, Unlocked via clue_custody_log)
  > "Corridor Turnstile: Celeste Althaus scanned access at door_station_gate at 20:16."
- **[clue_suspect3_transit_access]** (access_log, physical, Default)
  > "Security Turnstile: Silas Ibrahim logged entry at door_station_gate at 20:17."
- **[clue_redherring_1]** (access_log, physical, Default [tags: red_herring])
  > "[20:05] STATION_GATE · badge: Celeste Althaus"
- **[clue_redherring_2]** (cctv, physical, Default [tags: red_herring])
  > "[20:10] SECURITY_CAMERA · VESPER_CENTRAL_STATION · visual: Silas Ibrahim"

## Hypotheses
- **hyp_culprit_stole**: Damian Althaus took High-Speed Rotary Press from North Freight Dock. **[SOLUTION]**
- **hyp_custodian_took**: Beatrix Ward took High-Speed Rotary Press from North Freight Dock after hours.
- **hyp_suspect2_took**: Celeste Althaus took High-Speed Rotary Press from North Freight Dock.
- **hyp_suspect3_took**: Silas Ibrahim took High-Speed Rotary Press from North Freight Dock.

## Truth & Reveal Explanation
- **Culprit:** char_damian
- **Liars:** char_damian (clue_culprit_testimony)
- **Key Evidence Sets:** [clue_custodian_office_access, clue_suspect2_transit_access, clue_suspect3_transit_access, clue_culprit_vault_access]

### Chronological Explanation
1. **[1216]** Official custody records proved Beatrix Ward held registered custody of High-Speed Rotary Press until 20:20, disproving claims of earlier possession by others. *(Clues: clue_custody_log, clue_culprit_testimony)*
2. **[1216]** Celeste Althaus badged into door_station_gate at 20:16, ruling out their presence at North Freight Dock. *(Clues: clue_suspect2_transit_access)*
3. **[1217]** Silas Ibrahim badged into door_station_gate at 20:17, ruling out their presence at North Freight Dock. *(Clues: clue_suspect3_transit_access)*
4. **[1218]** Damian Althaus was recorded badging into door_dock_turnstile at 20:18, shattering their office alibi and placing them inside North Freight Dock. *(Clues: clue_culprit_vault_access, clue_culprit_testimony)*
5. **[1220]** Damian Althaus took High-Speed Rotary Press directly from North Freight Dock at 20:20. *(Clues: clue_culprit_vault_access)*
