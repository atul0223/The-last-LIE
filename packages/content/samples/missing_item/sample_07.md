# The Silent Handover at North Gate Print Shop (case_gen_470048)

- **Mystery Type:** missing_item
- **Difficulty:** Declared: 3 | Measured: 3 (Score: 16.5)
- **Estimated Duration:** 14 minutes
- **Date:** 2026-10-24
- **Setting:** Vesper City incidents across The Grand Vesper Hotel, North Gate Print Shop, The Vesper Chronicle Newsroom.

## Briefing
The disappearance of Transit Cipher Ledger from The Grand Vesper Hotel triggered an audit. Conflicting accounts from Nadia Grayson, Eleanor Belmont, Beatrix Sterling, and Damian Ramsay contradict physical registers. Trace the evidence to recover the truth.

## Cast of Characters
- **Damian Ramsay** (Chief Conservator): Archive Clerk in Vesper City involved in the incident.
- **Nadia Grayson** (Visiting Researcher): Vault Curator in Vesper City involved in the incident.
- **Eleanor Belmont** (Archive Clerk): Visiting Researcher in Vesper City involved in the incident.
- **Beatrix Sterling** (Vault Curator): Security Guard in Vesper City involved in the incident.

## Locations
- **The Grand Vesper Hotel**: Neoclassical luxury hotel situated north of the central rail terminus.
- **North Gate Print Shop**: Industrial printing press facility with mechanical composing bays and ink tanks.
- **The Vesper Chronicle Newsroom**: Editorial offices, library archives, and news telegraph desks.

## Evidence & Clues
- **[clue_missing_item_testimony]** (testimony, testimony, Default)
  > "Damian Ramsay stated: 'I remained in North Gate Print Shop from 20:10 to 20:30 attending to administrative filings.'"
- **[clue_custody_log]** (document, physical, Default)
  > "Official Register: Nadia Grayson verified registered custody of Transit Cipher Ledger in The Grand Vesper Hotel until 20:20."
- **[clue_custodian_office_access]** (access_log, physical, Default)
  > "Office Reader: Nadia Grayson badged through door_printshop_dock at 20:26."
- **[clue_culprit_vault_access]** (access_log, physical, Unlocked via clue_missing_item_testimony)
  > "Vault Terminal: Damian Ramsay scanned access badge at door_hotel_lobby at 20:18."
- **[clue_suspect2_transit_access]** (access_log, physical, Default)
  > "Turnstile Log: Eleanor Belmont verified entry at door_newsroom_press at 20:16."
- **[clue_redherring_1]** (access_log, physical, Default [tags: red_herring])
  > "[20:28] ACCESS_LOG · NEWSROOM_PRESS · badge: Eleanor Belmont"
- **[clue_redherring_2]** (access_log, physical, Default [tags: red_herring])
  > "[20:38] ACCESS_LOG · PRINTSHOP_DOCK · badge: Nadia Grayson"

## Hypotheses
- **hyp_culprit_guilty**: Damian Ramsay entered The Grand Vesper Hotel and took Transit Cipher Ledger. **[SOLUTION]**
- **hyp_custodian_guilty**: Nadia Grayson entered The Grand Vesper Hotel and took Transit Cipher Ledger.
- **hyp_suspect2_guilty**: Eleanor Belmont entered The Grand Vesper Hotel and took Transit Cipher Ledger.
- **hyp_culprit_innocent**: Damian Ramsay remained in North Gate Print Shop and never approached The Grand Vesper Hotel.

## Truth & Reveal Explanation
- **Culprit:** char_damian
- **Liars:** char_damian (clue_missing_item_testimony)
- **Key Evidence Sets:** [clue_custodian_office_access, clue_suspect2_transit_access, clue_culprit_vault_access]

### Chronological Explanation
1. **[1216]** Access records at door_hotel_lobby proved Damian Ramsay entered the vault at 20:18, shattering claims of staying in North Gate Print Shop. *(Clues: clue_culprit_vault_access, clue_missing_item_testimony)*
2. **[1218]** Terminal badge logs confirmed Damian Ramsay accessed door_hotel_lobby at 20:18, putting them inside the vault during the theft. *(Clues: clue_culprit_vault_access)*
3. **[1216]** Eleanor Belmont badged into door_newsroom_press at 20:16, ruling out their presence at The Grand Vesper Hotel. *(Clues: clue_suspect2_transit_access)*
4. **[1220]** Damian Ramsay took Transit Cipher Ledger from The Grand Vesper Hotel before departing. *(Clues: clue_culprit_vault_access)*
