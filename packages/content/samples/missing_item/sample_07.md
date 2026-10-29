# The Handover at North Gate Print Shop (case_mi_2852)

- **Mystery Type:** missing_item
- **Difficulty:** Declared: 3 | Measured: 3 (Score: 16.5)
- **Estimated Duration:** 11 minutes
- **Date:** 2026-11-05
- **Setting:** A high-value object went missing from The Grand Vesper Hotel during evening shifts.

## Briefing
Transit Cipher Ledger disappeared from The Grand Vesper Hotel. Staff member Damian Ramsay claims to have been working in North Gate Print Shop and denies entering the vault. Correlate custody logs and entry records to expose the thief.

## Cast of Characters
- **Damian Ramsay** (Archive Clerk): Archive Clerk in Vesper City involved in the incident.
- **Nadia Grayson** (Vault Curator): Vault Curator in Vesper City involved in the incident.
- **Eleanor Belmont** (Visiting Researcher): Visiting Researcher in Vesper City involved in the incident.
- **Beatrix Sterling** (Security Guard): Security Guard in Vesper City involved in the incident.

## Locations
- **The Grand Vesper Hotel**: Neoclassical luxury hotel situated north of the central rail terminus.
- **North Gate Print Shop**: Industrial printing press facility with mechanical composing bays and ink tanks.
- **The Vesper Chronicle Newsroom**: Editorial offices, library archives, and news telegraph desks.

## Evidence & Clues
- **[clue_custody_log]** (document, physical, Default)
  > "Official Register: Nadia Grayson verified registered custody of Transit Cipher Ledger in The Grand Vesper Hotel until 20:20."
- **[clue_culprit_testimony]** (testimony, testimony, Default)
  > "Damian Ramsay stated: 'I remained in North Gate Print Shop from 20:10 to 20:30. In fact, Eleanor Belmont was already holding Transit Cipher Ledger earlier around 20:12.'"
- **[clue_custodian_office_access]** (access_log, physical, Default)
  > "Office Reader: Nadia Grayson badged through door_printshop_dock at 20:26."
- **[clue_culprit_vault_access]** (access_log, physical, Unlocked via clue_culprit_testimony)
  > "Vault Security Gate: Damian Ramsay scanned access badge at door_hotel_lobby at 20:18."
- **[clue_suspect2_transit_access]** (access_log, physical, Default)
  > "Corridor Turnstile: Eleanor Belmont scanned access at door_newsroom_press at 20:16."
- **[clue_redherring_1]** (access_log, physical, Default [tags: red_herring])
  > "[20:05] ACCESS_LOG · NEWSROOM_PRESS · badge: Eleanor Belmont"
- **[clue_redherring_2]** (access_log, physical, Default [tags: red_herring])
  > "[20:17] ACCESS_LOG · NEWSROOM_PRESS · badge: Beatrix Sterling"

## Hypotheses
- **hyp_culprit_stole**: Damian Ramsay took Transit Cipher Ledger from The Grand Vesper Hotel. **[SOLUTION]**
- **hyp_custodian_took**: Nadia Grayson took Transit Cipher Ledger from The Grand Vesper Hotel after hours.
- **hyp_suspect2_took**: Eleanor Belmont took Transit Cipher Ledger from The Grand Vesper Hotel.
- **hyp_culprit_innocent**: Damian Ramsay remained in North Gate Print Shop and never entered The Grand Vesper Hotel.

## Truth & Reveal Explanation
- **Culprit:** char_damian
- **Liars:** char_damian (clue_culprit_testimony)
- **Key Evidence Sets:** [clue_custodian_office_access, clue_suspect2_transit_access, clue_culprit_vault_access]

### Chronological Explanation
1. **[1216]** Official custody records proved Nadia Grayson held registered custody of Transit Cipher Ledger until 20:20, disproving claims of earlier possession by others. *(Clues: clue_custody_log, clue_culprit_testimony)*
2. **[1216]** Eleanor Belmont badged into door_newsroom_press at 20:16, ruling out their presence at The Grand Vesper Hotel. *(Clues: clue_suspect2_transit_access)*
3. **[1218]** Damian Ramsay was recorded badging into door_hotel_lobby at 20:18, shattering their office alibi and placing them inside The Grand Vesper Hotel. *(Clues: clue_culprit_vault_access, clue_culprit_testimony)*
4. **[1220]** Damian Ramsay took Transit Cipher Ledger directly from The Grand Vesper Hotel at 20:20. *(Clues: clue_culprit_vault_access)*
