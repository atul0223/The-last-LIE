# The Break in Custody at Vesper Central Station in the Sub-Vault (case_gen_275428)

- **Mystery Type:** missing_item
- **Difficulty:** Declared: 2 | Measured: 2 (Score: 13.5)
- **Estimated Duration:** 10 minutes
- **Date:** 2026-10-24
- **Setting:** Vesper City incidents across The Grand Vesper Hotel, Vesper Central Station, North Gate Print Shop.

## Briefing
The disappearance of High-Speed Rotary Press from The Grand Vesper Hotel triggered an audit. Conflicting accounts from Corin Cross, Octavia Brauer, and Alistair Wainwright contradict physical registers. Trace the evidence to recover the truth.

## Cast of Characters
- **Octavia Brauer** (Security Officer): Archive Clerk in Vesper City involved in the incident.
- **Alistair Wainwright** (Visiting Researcher): Vault Curator in Vesper City involved in the incident.
- **Corin Cross** (Archive Clerk): Visiting Researcher in Vesper City involved in the incident.

## Locations
- **The Grand Vesper Hotel**: Neoclassical luxury hotel situated north of the central rail terminus.
- **Vesper Central Station**: Subterranean rail hub connecting municipal lines to northern freight corridors.
- **North Gate Print Shop**: Industrial printing press facility with mechanical composing bays and ink tanks.

## Evidence & Clues
- **[clue_missing_item_testimony]** (testimony, testimony, Default)
  > "Corin Cross stated: 'I had High-Speed Rotary Press in my personal work tray between 20:12 and 20:25 before returning it.'"
- **[clue_custody_log]** (document, physical, Default)
  > "Official Register: Alistair Wainwright verified registered custody of High-Speed Rotary Press in The Grand Vesper Hotel until 20:20."
- **[clue_custodian_office_access]** (access_log, physical, Default)
  > "Office Reader: Alistair Wainwright badged through door_station_gate at 20:26."
- **[clue_culprit_vault_access]** (access_log, physical, Unlocked via clue_missing_item_testimony)
  > "Vault Terminal: Octavia Brauer scanned access badge at door_hotel_lobby at 20:18."
- **[clue_suspect2_transit_access]** (access_log, physical, Default)
  > "Turnstile Log: Corin Cross verified entry at door_printshop_dock at 20:16."
- **[clue_redherring_1]** (access_log, physical, Default [tags: red_herring])
  > "[20:02] ACCESS_LOG · STATION_GATE · badge: Alistair Wainwright"
- **[clue_redherring_2]** (access_log, physical, Default [tags: red_herring])
  > "[20:28] PRINTSHOP_DOCK · badge: Corin Cross"

## Hypotheses
- **hyp_culprit_innocent**: Octavia Brauer remained in Vesper Central Station and never approached The Grand Vesper Hotel.
- **hyp_culprit_guilty**: Octavia Brauer entered The Grand Vesper Hotel and took High-Speed Rotary Press. **[SOLUTION]**
- **hyp_suspect2_guilty**: Corin Cross entered The Grand Vesper Hotel and took High-Speed Rotary Press.
- **hyp_custodian_guilty**: Alistair Wainwright entered The Grand Vesper Hotel and took High-Speed Rotary Press.

## Truth & Reveal Explanation
- **Culprit:** char_octavia
- **Liars:** char_corin (clue_missing_item_testimony)
- **Key Evidence Sets:** [clue_custodian_office_access, clue_suspect2_transit_access, clue_culprit_vault_access]

### Chronological Explanation
1. **[1216]** Official custody records proved Alistair Wainwright held exclusive custody of High-Speed Rotary Press until 20:20, disproving false claims of possession. *(Clues: clue_custody_log, clue_missing_item_testimony)*
2. **[1218]** Terminal badge logs confirmed Octavia Brauer accessed door_hotel_lobby at 20:18, putting them inside the vault during the theft. *(Clues: clue_culprit_vault_access)*
3. **[1216]** Corin Cross badged into door_printshop_dock at 20:16, ruling out their presence at The Grand Vesper Hotel. *(Clues: clue_suspect2_transit_access)*
4. **[1220]** Octavia Brauer took High-Speed Rotary Press from The Grand Vesper Hotel before departing. *(Clues: clue_culprit_vault_access)*
