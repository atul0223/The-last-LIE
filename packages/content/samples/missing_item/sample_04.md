# The Missing Naval Brass Chronometer (case_mi_3089)

- **Mystery Type:** missing_item
- **Difficulty:** Declared: 4 | Measured: 4 (Score: 20)
- **Estimated Duration:** 13 minutes
- **Date:** 2026-11-05
- **Setting:** A high-value object went missing from North Freight Dock during evening shifts.

## Briefing
Naval Brass Chronometer disappeared from North Freight Dock. Staff member Damian Volkov claims to have been working in The Vesper Chronicle Newsroom and denies entering the vault. Correlate custody logs and entry records to expose the thief.

## Cast of Characters
- **Damian Volkov** (Archive Clerk): Archive Clerk in Vesper City involved in the incident.
- **Miriam Vance** (Vault Curator): Vault Curator in Vesper City involved in the incident.
- **Valerie Vance** (Visiting Researcher): Visiting Researcher in Vesper City involved in the incident.
- **Katrina Chambers** (Security Guard): Security Guard in Vesper City involved in the incident.

## Locations
- **North Freight Dock**: Enclosed cargo staging bay equipped with security turnstiles and rolling shutters.
- **The Vesper Chronicle Newsroom**: Editorial offices, library archives, and news telegraph desks.
- **The Grand Vesper Hotel**: Neoclassical luxury hotel situated north of the central rail terminus.

## Evidence & Clues
- **[clue_custody_log]** (document, physical, Default)
  > "Official Register: Miriam Vance verified registered custody of Naval Brass Chronometer in North Freight Dock until 20:20."
- **[clue_culprit_testimony]** (testimony, testimony, Default)
  > "Damian Volkov stated: 'I remained in The Vesper Chronicle Newsroom from 20:10 to 20:30. In fact, Valerie Vance was already holding Naval Brass Chronometer earlier around 20:12.'"
- **[clue_custodian_office_access]** (access_log, physical, Default)
  > "Office Reader: Miriam Vance badged through door_newsroom_press at 20:26."
- **[clue_culprit_vault_access]** (access_log, physical, Unlocked via clue_culprit_testimony)
  > "Vault Security Gate: Damian Volkov scanned access badge at door_dock_turnstile at 20:18."
- **[clue_suspect2_transit_access]** (access_log, physical, Unlocked via clue_custody_log)
  > "Corridor Turnstile: Valerie Vance scanned access at door_hotel_lobby at 20:16."
- **[clue_suspect3_transit_access]** (access_log, physical, Default)
  > "Security Turnstile: Katrina Chambers logged entry at door_hotel_lobby at 20:17."
- **[clue_redherring_1]** (cctv, physical, Default [tags: red_herring])
  > "[20:10] SECURITY_CAMERA · THE_GRAND_VESPER_HOTEL · visual: Katrina Chambers"
- **[clue_redherring_2]** (access_log, physical, Default [tags: red_herring])
  > "[20:28] ACCESS_LOG · HOTEL_LOBBY · badge: Valerie Vance"

## Hypotheses
- **hyp_culprit_stole**: Damian Volkov took Naval Brass Chronometer from North Freight Dock. **[SOLUTION]**
- **hyp_custodian_took**: Miriam Vance took Naval Brass Chronometer from North Freight Dock after hours.
- **hyp_suspect2_took**: Valerie Vance took Naval Brass Chronometer from North Freight Dock.
- **hyp_suspect3_took**: Katrina Chambers took Naval Brass Chronometer from North Freight Dock.

## Truth & Reveal Explanation
- **Culprit:** char_damian
- **Liars:** char_damian (clue_culprit_testimony)
- **Key Evidence Sets:** [clue_custodian_office_access, clue_suspect2_transit_access, clue_suspect3_transit_access, clue_culprit_vault_access]

### Chronological Explanation
1. **[1216]** Official custody records proved Miriam Vance held registered custody of Naval Brass Chronometer until 20:20, disproving claims of earlier possession by others. *(Clues: clue_custody_log, clue_culprit_testimony)*
2. **[1216]** Valerie Vance badged into door_hotel_lobby at 20:16, ruling out their presence at North Freight Dock. *(Clues: clue_suspect2_transit_access)*
3. **[1217]** Katrina Chambers badged into door_hotel_lobby at 20:17, ruling out their presence at North Freight Dock. *(Clues: clue_suspect3_transit_access)*
4. **[1218]** Damian Volkov was recorded badging into door_dock_turnstile at 20:18, shattering their office alibi and placing them inside North Freight Dock. *(Clues: clue_culprit_vault_access, clue_culprit_testimony)*
5. **[1220]** Damian Volkov took Naval Brass Chronometer directly from North Freight Dock at 20:20. *(Clues: clue_culprit_vault_access)*
