# The Vault Breach at The Grand Vesper Hotel (case_mi_8534)

- **Mystery Type:** missing_item
- **Difficulty:** Declared: 2 | Measured: 2 (Score: 13.5)
- **Estimated Duration:** 9 minutes
- **Date:** 2026-11-05
- **Setting:** A high-value object went missing from The Grand Vesper Hotel during evening shifts.

## Briefing
High-Speed Rotary Press disappeared from The Grand Vesper Hotel. Staff member Octavia Brauer claims to have been working in Vesper Central Station and denies entering the vault. Correlate custody logs and entry records to expose the thief.

## Cast of Characters
- **Octavia Brauer** (Archive Clerk): Archive Clerk in Vesper City involved in the incident.
- **Alistair Wainwright** (Vault Curator): Vault Curator in Vesper City involved in the incident.
- **Corin Cross** (Visiting Researcher): Visiting Researcher in Vesper City involved in the incident.

## Locations
- **The Grand Vesper Hotel**: Neoclassical luxury hotel situated north of the central rail terminus.
- **Vesper Central Station**: Subterranean rail hub connecting municipal lines to northern freight corridors.
- **North Gate Print Shop**: Industrial printing press facility with mechanical composing bays and ink tanks.

## Evidence & Clues
- **[clue_custody_log]** (document, physical, Default)
  > "Official Register: Alistair Wainwright verified registered custody of High-Speed Rotary Press in The Grand Vesper Hotel until 20:20."
- **[clue_culprit_testimony]** (testimony, testimony, Default)
  > "Octavia Brauer stated: 'I remained in Vesper Central Station from 20:10 to 20:30. In fact, Corin Cross was already holding High-Speed Rotary Press earlier around 20:12.'"
- **[clue_custodian_office_access]** (access_log, physical, Default)
  > "Office Reader: Alistair Wainwright badged through door_station_gate at 20:26."
- **[clue_culprit_vault_access]** (access_log, physical, Unlocked via clue_culprit_testimony)
  > "Vault Security Gate: Octavia Brauer scanned access badge at door_hotel_lobby at 20:18."
- **[clue_suspect2_transit_access]** (access_log, physical, Default)
  > "Corridor Turnstile: Corin Cross scanned access at door_printshop_dock at 20:16."
- **[clue_redherring_1]** (access_log, physical, Default [tags: red_herring])
  > "[20:02] ACCESS_LOG · STATION_GATE · badge: Alistair Wainwright"
- **[clue_redherring_2]** (access_log, physical, Default [tags: red_herring])
  > "[20:28] PRINTSHOP_DOCK · badge: Corin Cross"

## Hypotheses
- **hyp_culprit_stole**: Octavia Brauer took High-Speed Rotary Press from The Grand Vesper Hotel. **[SOLUTION]**
- **hyp_custodian_took**: Alistair Wainwright took High-Speed Rotary Press from The Grand Vesper Hotel after hours.
- **hyp_suspect2_took**: Corin Cross took High-Speed Rotary Press from The Grand Vesper Hotel.
- **hyp_culprit_innocent**: Octavia Brauer remained in Vesper Central Station and never entered The Grand Vesper Hotel.

## Truth & Reveal Explanation
- **Culprit:** char_octavia
- **Liars:** char_octavia (clue_culprit_testimony)
- **Key Evidence Sets:** [clue_custodian_office_access, clue_suspect2_transit_access, clue_culprit_vault_access]

### Chronological Explanation
1. **[1216]** Official custody records proved Alistair Wainwright held registered custody of High-Speed Rotary Press until 20:20, disproving claims of earlier possession by others. *(Clues: clue_custody_log, clue_culprit_testimony)*
2. **[1216]** Corin Cross badged into door_printshop_dock at 20:16, ruling out their presence at The Grand Vesper Hotel. *(Clues: clue_suspect2_transit_access)*
3. **[1218]** Octavia Brauer was recorded badging into door_hotel_lobby at 20:18, shattering their office alibi and placing them inside The Grand Vesper Hotel. *(Clues: clue_culprit_vault_access, clue_culprit_testimony)*
4. **[1220]** Octavia Brauer took High-Speed Rotary Press directly from The Grand Vesper Hotel at 20:20. *(Clues: clue_culprit_vault_access)*
