# Disappearance of the Freight Turnstile Scanner (case_mi_1998)

- **Mystery Type:** missing_item
- **Difficulty:** Declared: 2 | Measured: 2 (Score: 13.5)
- **Estimated Duration:** 9 minutes
- **Date:** 2026-11-05
- **Setting:** A high-value object went missing from The Grand Vesper Hotel during evening shifts.

## Briefing
Freight Turnstile Scanner disappeared from The Grand Vesper Hotel. Staff member Alistair Finch claims to have been working in The Vesper Chronicle Newsroom and denies entering the vault. Correlate custody logs and entry records to expose the thief.

## Cast of Characters
- **Alistair Finch** (Archive Clerk): Archive Clerk in Vesper City involved in the incident.
- **Cassian Calloway** (Vault Curator): Vault Curator in Vesper City involved in the incident.
- **Orion Grayson** (Visiting Researcher): Visiting Researcher in Vesper City involved in the incident.

## Locations
- **The Grand Vesper Hotel**: Neoclassical luxury hotel situated north of the central rail terminus.
- **The Vesper Chronicle Newsroom**: Editorial offices, library archives, and news telegraph desks.
- **Vesper Central Station**: Subterranean rail hub connecting municipal lines to northern freight corridors.

## Evidence & Clues
- **[clue_custody_log]** (document, physical, Default)
  > "Official Register: Cassian Calloway verified registered custody of Freight Turnstile Scanner in The Grand Vesper Hotel until 20:20."
- **[clue_culprit_testimony]** (testimony, testimony, Default)
  > "Alistair Finch stated: 'I remained in The Vesper Chronicle Newsroom from 20:10 to 20:30. In fact, Orion Grayson was already holding Freight Turnstile Scanner earlier around 20:12.'"
- **[clue_custodian_office_access]** (access_log, physical, Default)
  > "Office Reader: Cassian Calloway badged through door_newsroom_press at 20:26."
- **[clue_culprit_vault_access]** (access_log, physical, Unlocked via clue_culprit_testimony)
  > "Vault Security Gate: Alistair Finch scanned access badge at door_hotel_lobby at 20:18."
- **[clue_suspect2_transit_access]** (access_log, physical, Default)
  > "Corridor Turnstile: Orion Grayson scanned access at door_station_gate at 20:16."
- **[clue_redherring_1]** (cctv, physical, Default [tags: red_herring])
  > "[20:15] SECURITY_CAMERA · THE_GRAND_VESPER_HOTEL · visual: Alistair Finch"
- **[clue_redherring_2]** (access_log, physical, Default [tags: red_herring])
  > "[20:02] NEWSROOM_PRESS · badge: Cassian Calloway"

## Hypotheses
- **hyp_culprit_stole**: Alistair Finch took Freight Turnstile Scanner from The Grand Vesper Hotel. **[SOLUTION]**
- **hyp_custodian_took**: Cassian Calloway took Freight Turnstile Scanner from The Grand Vesper Hotel after hours.
- **hyp_suspect2_took**: Orion Grayson took Freight Turnstile Scanner from The Grand Vesper Hotel.
- **hyp_culprit_innocent**: Alistair Finch remained in The Vesper Chronicle Newsroom and never entered The Grand Vesper Hotel.

## Truth & Reveal Explanation
- **Culprit:** char_alistair
- **Liars:** char_alistair (clue_culprit_testimony)
- **Key Evidence Sets:** [clue_custodian_office_access, clue_suspect2_transit_access, clue_culprit_vault_access]

### Chronological Explanation
1. **[1216]** Official custody records proved Cassian Calloway held registered custody of Freight Turnstile Scanner until 20:20, disproving claims of earlier possession by others. *(Clues: clue_custody_log, clue_culprit_testimony)*
2. **[1216]** Orion Grayson badged into door_station_gate at 20:16, ruling out their presence at The Grand Vesper Hotel. *(Clues: clue_suspect2_transit_access)*
3. **[1218]** Alistair Finch was recorded badging into door_hotel_lobby at 20:18, shattering their office alibi and placing them inside The Grand Vesper Hotel. *(Clues: clue_culprit_vault_access, clue_culprit_testimony)*
4. **[1220]** Alistair Finch took Freight Turnstile Scanner directly from The Grand Vesper Hotel at 20:20. *(Clues: clue_culprit_vault_access)*
