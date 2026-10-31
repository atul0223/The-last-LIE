# Disappearance of the Freight Turnstile Scanner Under Curfew (case_mi_7197)

- **Mystery Type:** missing_item
- **Difficulty:** Declared: 3 | Measured: 3 (Score: 16.5)
- **Estimated Duration:** 11 minutes
- **Date:** 2026-11-05
- **Setting:** A high-value object went missing from North Gate Print Shop during evening shifts.

## Briefing
A secured repository in North Gate Print Shop was breached, and Freight Turnstile Scanner is missing. Inquiries center on Octavia Harrington, Cassian Ashford, Sebastian Thorne, and Yvaine Calloway, each of whom reported routine activity near the scene. Track the movement logs to pinpoint the thief.

## Cast of Characters
- **Sebastian Thorne** (Archive Clerk): Archive Clerk in Vesper City involved in the incident.
- **Yvaine Calloway** (Vault Curator): Vault Curator in Vesper City involved in the incident.
- **Cassian Ashford** (Visiting Researcher): Visiting Researcher in Vesper City involved in the incident.
- **Octavia Harrington** (Security Guard): Security Guard in Vesper City involved in the incident.

## Locations
- **North Gate Print Shop**: Industrial printing press facility with mechanical composing bays and ink tanks.
- **Vesper Central Station**: Subterranean rail hub connecting municipal lines to northern freight corridors.
- **North Freight Dock**: Enclosed cargo staging bay equipped with security turnstiles and rolling shutters.

## Evidence & Clues
- **[clue_custody_log]** (document, physical, Default)
  > "Official Register: Yvaine Calloway verified registered custody of Freight Turnstile Scanner in North Gate Print Shop until 20:20."
- **[clue_culprit_testimony]** (testimony, testimony, Default)
  > "Sebastian Thorne stated: 'I remained in Vesper Central Station from 20:10 to 20:30. In fact, Cassian Ashford was already holding Freight Turnstile Scanner earlier around 20:12.'"
- **[clue_custodian_office_access]** (access_log, physical, Default)
  > "Office Reader: Yvaine Calloway badged through door_station_gate at 20:26."
- **[clue_culprit_vault_access]** (access_log, physical, Unlocked via clue_culprit_testimony)
  > "Vault Security Gate: Sebastian Thorne scanned access badge at door_printshop_dock at 20:18."
- **[clue_suspect2_transit_access]** (access_log, physical, Default)
  > "Corridor Turnstile: Cassian Ashford scanned access at door_dock_turnstile at 20:16."
- **[clue_redherring_1]** (access_log, physical, Default [tags: red_herring])
  > "[20:28] DOCK_TURNSTILE · badge: Cassian Ashford"
- **[clue_redherring_2]** (cctv, physical, Default [tags: red_herring])
  > "[20:20] SECURITY_CAMERA · VESPER_CENTRAL_STATION · visual: Yvaine Calloway"

## Hypotheses
- **hyp_suspect2_took**: Cassian Ashford took Freight Turnstile Scanner from North Gate Print Shop.
- **hyp_custodian_took**: Yvaine Calloway took Freight Turnstile Scanner from North Gate Print Shop.
- **hyp_culprit_stole**: Sebastian Thorne took Freight Turnstile Scanner from North Gate Print Shop. **[SOLUTION]**
- **hyp_culprit_innocent**: Sebastian Thorne remained in Vesper Central Station and never entered North Gate Print Shop.

## Truth & Reveal Explanation
- **Culprit:** char_sebastian
- **Liars:** char_sebastian (clue_culprit_testimony)
- **Key Evidence Sets:** [clue_custodian_office_access, clue_suspect2_transit_access, clue_culprit_vault_access]

### Chronological Explanation
1. **[1216]** Official custody records proved Yvaine Calloway held registered custody of Freight Turnstile Scanner until 20:20, disproving claims of earlier possession by others. *(Clues: clue_custody_log, clue_culprit_testimony)*
2. **[1216]** Cassian Ashford badged into door_dock_turnstile at 20:16, ruling out their presence at North Gate Print Shop. *(Clues: clue_suspect2_transit_access)*
3. **[1218]** Sebastian Thorne was recorded badging into door_printshop_dock at 20:18, shattering their office alibi and placing them inside North Gate Print Shop. *(Clues: clue_culprit_vault_access, clue_culprit_testimony)*
4. **[1220]** Sebastian Thorne took Freight Turnstile Scanner directly from North Gate Print Shop at 20:20. *(Clues: clue_culprit_vault_access)*
