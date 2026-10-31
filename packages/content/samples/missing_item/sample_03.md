# The Vault Breach at North Gate Print Shop at Shift Change (case_mi_5566)

- **Mystery Type:** missing_item
- **Difficulty:** Declared: 3 | Measured: 3 (Score: 16.5)
- **Estimated Duration:** 11 minutes
- **Date:** 2026-11-05
- **Setting:** A high-value object went missing from North Gate Print Shop during evening shifts.

## Briefing
The scheduled transfer of Transit Cipher Ledger failed when it was discovered missing from North Gate Print Shop. Yvaine Chen, Astrid Whitman, Lenore Castile, and Dorian Mercer were present in the facility during the shift. Examine the access records to discover who seized the item.

## Cast of Characters
- **Dorian Mercer** (Archive Clerk): Archive Clerk in Vesper City involved in the incident.
- **Yvaine Chen** (Vault Curator): Vault Curator in Vesper City involved in the incident.
- **Astrid Whitman** (Visiting Researcher): Visiting Researcher in Vesper City involved in the incident.
- **Lenore Castile** (Security Guard): Security Guard in Vesper City involved in the incident.

## Locations
- **North Gate Print Shop**: Industrial printing press facility with mechanical composing bays and ink tanks.
- **North Freight Dock**: Enclosed cargo staging bay equipped with security turnstiles and rolling shutters.
- **The Vesper Chronicle Newsroom**: Editorial offices, library archives, and news telegraph desks.

## Evidence & Clues
- **[clue_custody_log]** (document, physical, Default)
  > "Official Register: Yvaine Chen verified registered custody of Transit Cipher Ledger in North Gate Print Shop until 20:20."
- **[clue_culprit_testimony]** (testimony, testimony, Default)
  > "Dorian Mercer stated: 'I remained in North Freight Dock from 20:10 to 20:30. In fact, Astrid Whitman was already holding Transit Cipher Ledger earlier around 20:12.'"
- **[clue_custodian_office_access]** (access_log, physical, Default)
  > "Office Reader: Yvaine Chen badged through door_dock_turnstile at 20:26."
- **[clue_culprit_vault_access]** (access_log, physical, Unlocked via clue_culprit_testimony)
  > "Vault Security Gate: Dorian Mercer scanned access badge at door_printshop_dock at 20:18."
- **[clue_suspect2_transit_access]** (access_log, physical, Default)
  > "Corridor Turnstile: Astrid Whitman scanned access at door_newsroom_press at 20:16."
- **[clue_redherring_1]** (cctv, physical, Default [tags: red_herring])
  > "[20:10] SECURITY_CAMERA · THE_VESPER_CHRONICLE_NEWSROOM · visual: Lenore Castile"
- **[clue_redherring_2]** (cctv, physical, Default [tags: red_herring])
  > "[20:10] CCTV_FEED · THE_VESPER_CHRONICLE_NEWSROOM · subject: Astrid Whitman"

## Hypotheses
- **hyp_culprit_stole**: Dorian Mercer took Transit Cipher Ledger from North Gate Print Shop. **[SOLUTION]**
- **hyp_culprit_innocent**: Dorian Mercer remained in North Freight Dock and never entered North Gate Print Shop.
- **hyp_suspect2_took**: Astrid Whitman took Transit Cipher Ledger from North Gate Print Shop.
- **hyp_custodian_took**: Yvaine Chen took Transit Cipher Ledger from North Gate Print Shop.

## Truth & Reveal Explanation
- **Culprit:** char_dorian
- **Liars:** char_dorian (clue_culprit_testimony)
- **Key Evidence Sets:** [clue_custodian_office_access, clue_suspect2_transit_access, clue_culprit_vault_access]

### Chronological Explanation
1. **[1216]** Official custody records proved Yvaine Chen held registered custody of Transit Cipher Ledger until 20:20, disproving claims of earlier possession by others. *(Clues: clue_custody_log, clue_culprit_testimony)*
2. **[1216]** Astrid Whitman badged into door_newsroom_press at 20:16, ruling out their presence at North Gate Print Shop. *(Clues: clue_suspect2_transit_access)*
3. **[1218]** Dorian Mercer was recorded badging into door_printshop_dock at 20:18, shattering their office alibi and placing them inside North Gate Print Shop. *(Clues: clue_culprit_vault_access, clue_culprit_testimony)*
4. **[1220]** Dorian Mercer took Transit Cipher Ledger directly from North Gate Print Shop at 20:20. *(Clues: clue_culprit_vault_access)*
