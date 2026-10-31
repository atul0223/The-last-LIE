# The Custody Gap at Vesper Central Station (case_gen_288900)

- **Mystery Type:** missing_item
- **Difficulty:** Declared: 3 | Measured: 3 (Score: 16.5)
- **Estimated Duration:** 14 minutes
- **Date:** 2026-10-24
- **Setting:** Vesper City incidents across North Gate Print Shop, Vesper Central Station, North Freight Dock.

## Briefing
The disappearance of Freight Turnstile Scanner from North Gate Print Shop triggered an audit. Conflicting accounts from Octavia Harrington, Cassian Ashford, Yvaine Calloway, and Sebastian Thorne contradict physical registers. Trace the evidence to recover the truth.

## Cast of Characters
- **Sebastian Thorne** (Archive Clerk): Archive Clerk in Vesper City involved in the incident.
- **Yvaine Calloway** (Chief Conservator): Vault Curator in Vesper City involved in the incident.
- **Cassian Ashford** (Visiting Researcher): Visiting Researcher in Vesper City involved in the incident.
- **Octavia Harrington** (Security Officer): Security Guard in Vesper City involved in the incident.

## Locations
- **North Gate Print Shop**: Industrial printing press facility with mechanical composing bays and ink tanks.
- **Vesper Central Station**: Subterranean rail hub connecting municipal lines to northern freight corridors.
- **North Freight Dock**: Enclosed cargo staging bay equipped with security turnstiles and rolling shutters.

## Evidence & Clues
- **[clue_missing_item_testimony]** (testimony, testimony, Default)
  > "Sebastian Thorne stated: 'I saw Cassian Ashford holding Freight Turnstile Scanner in their custody between 20:12 and 20:25.'"
- **[clue_custody_log]** (document, physical, Default)
  > "Official Register: Yvaine Calloway verified registered custody of Freight Turnstile Scanner in North Gate Print Shop until 20:20."
- **[clue_custodian_office_access]** (access_log, physical, Default)
  > "Office Reader: Yvaine Calloway badged through door_station_gate at 20:26."
- **[clue_culprit_vault_access]** (access_log, physical, Unlocked via clue_missing_item_testimony)
  > "Vault Terminal: Sebastian Thorne scanned access badge at door_printshop_dock at 20:18."
- **[clue_suspect2_transit_access]** (access_log, physical, Default)
  > "Turnstile Log: Cassian Ashford verified entry at door_dock_turnstile at 20:16."
- **[clue_redherring_1]** (access_log, physical, Default [tags: red_herring])
  > "[20:02] STATION_GATE · badge: Yvaine Calloway"
- **[clue_redherring_2]** (access_log, physical, Default [tags: red_herring])
  > "[20:28] ENTRY_GATE · DOCK_TURNSTILE · authorized: Cassian Ashford"

## Hypotheses
- **hyp_suspect2_guilty**: Cassian Ashford entered North Gate Print Shop and took Freight Turnstile Scanner.
- **hyp_culprit_innocent**: Sebastian Thorne remained in Vesper Central Station and never approached North Gate Print Shop.
- **hyp_culprit_guilty**: Sebastian Thorne entered North Gate Print Shop and took Freight Turnstile Scanner. **[SOLUTION]**
- **hyp_custodian_guilty**: Yvaine Calloway entered North Gate Print Shop and took Freight Turnstile Scanner.

## Truth & Reveal Explanation
- **Culprit:** char_sebastian
- **Liars:** char_sebastian (clue_missing_item_testimony)
- **Key Evidence Sets:** [clue_custodian_office_access, clue_suspect2_transit_access, clue_culprit_vault_access]

### Chronological Explanation
1. **[1216]** Official custody records proved Yvaine Calloway held exclusive custody of Freight Turnstile Scanner until 20:20, disproving false claims of possession. *(Clues: clue_custody_log, clue_missing_item_testimony)*
2. **[1218]** Terminal badge logs confirmed Sebastian Thorne accessed door_printshop_dock at 20:18, putting them inside the vault during the theft. *(Clues: clue_culprit_vault_access)*
3. **[1216]** Cassian Ashford badged into door_dock_turnstile at 20:16, ruling out their presence at North Gate Print Shop. *(Clues: clue_suspect2_transit_access)*
4. **[1220]** Sebastian Thorne took Freight Turnstile Scanner from North Gate Print Shop before departing. *(Clues: clue_culprit_vault_access)*
