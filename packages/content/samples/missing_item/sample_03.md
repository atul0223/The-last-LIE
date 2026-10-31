# The Mystery of the Cold Transit Cipher Ledger Before Dawn (case_gen_501610)

- **Mystery Type:** missing_item
- **Difficulty:** Declared: 3 | Measured: 3 (Score: 16.5)
- **Estimated Duration:** 14 minutes
- **Date:** 2026-10-24
- **Setting:** Vesper City incidents across North Gate Print Shop, North Freight Dock, The Vesper Chronicle Newsroom.

## Briefing
An inventory audit revealed the theft of Transit Cipher Ledger from North Gate Print Shop. Statements from Lenore Castile, Dorian Mercer, Yvaine Chen, and Astrid Whitman contain critical inconsistencies with electronic monitoring. Determine who took the item.

## Cast of Characters
- **Dorian Mercer** (Vault Curator): Archive Clerk in Vesper City involved in the incident.
- **Yvaine Chen** (Visiting Researcher): Vault Curator in Vesper City involved in the incident.
- **Astrid Whitman** (Chief Conservator): Visiting Researcher in Vesper City involved in the incident.
- **Lenore Castile** (Security Officer): Security Guard in Vesper City involved in the incident.

## Locations
- **North Gate Print Shop**: Industrial printing press facility with mechanical composing bays and ink tanks.
- **North Freight Dock**: Enclosed cargo staging bay equipped with security turnstiles and rolling shutters.
- **The Vesper Chronicle Newsroom**: Editorial offices, library archives, and news telegraph desks.

## Evidence & Clues
- **[clue_missing_item_testimony]** (testimony, testimony, Default)
  > "Dorian Mercer stated: 'I saw Astrid Whitman holding Transit Cipher Ledger in their custody between 20:12 and 20:25.'"
- **[clue_custody_log]** (document, physical, Default)
  > "Official Register: Yvaine Chen verified registered custody of Transit Cipher Ledger in North Gate Print Shop until 20:20."
- **[clue_custodian_office_access]** (access_log, physical, Default)
  > "Office Reader: Yvaine Chen badged through door_dock_turnstile at 20:26."
- **[clue_culprit_vault_access]** (access_log, physical, Unlocked via clue_missing_item_testimony)
  > "Vault Terminal: Dorian Mercer scanned access badge at door_printshop_dock at 20:18."
- **[clue_suspect2_transit_access]** (access_log, physical, Default)
  > "Turnstile Log: Astrid Whitman verified entry at door_newsroom_press at 20:16."
- **[clue_redherring_1]** (cctv, physical, Default [tags: red_herring])
  > "[20:10] SECURITY_CAMERA · THE_VESPER_CHRONICLE_NEWSROOM · visual: Astrid Whitman"
- **[clue_redherring_2]** (access_log, physical, Default [tags: red_herring])
  > "[20:28] ACCESS_LOG · NEWSROOM_PRESS · badge: Astrid Whitman"

## Hypotheses
- **hyp_culprit_innocent**: Dorian Mercer remained in North Freight Dock and never approached North Gate Print Shop.
- **hyp_suspect2_guilty**: Astrid Whitman entered North Gate Print Shop and took Transit Cipher Ledger.
- **hyp_custodian_guilty**: Yvaine Chen entered North Gate Print Shop and took Transit Cipher Ledger.
- **hyp_culprit_guilty**: Dorian Mercer entered North Gate Print Shop and took Transit Cipher Ledger. **[SOLUTION]**

## Truth & Reveal Explanation
- **Culprit:** char_dorian
- **Liars:** char_dorian (clue_missing_item_testimony)
- **Key Evidence Sets:** [clue_custodian_office_access, clue_suspect2_transit_access, clue_culprit_vault_access]

### Chronological Explanation
1. **[1216]** Official custody records proved Yvaine Chen held exclusive custody of Transit Cipher Ledger until 20:20, disproving false claims of possession. *(Clues: clue_custody_log, clue_missing_item_testimony)*
2. **[1218]** Terminal badge logs confirmed Dorian Mercer accessed door_printshop_dock at 20:18, putting them inside the vault during the theft. *(Clues: clue_culprit_vault_access)*
3. **[1216]** Astrid Whitman badged into door_newsroom_press at 20:16, ruling out their presence at North Gate Print Shop. *(Clues: clue_suspect2_transit_access)*
4. **[1220]** Dorian Mercer took Transit Cipher Ledger from North Gate Print Shop before departing. *(Clues: clue_culprit_vault_access)*
