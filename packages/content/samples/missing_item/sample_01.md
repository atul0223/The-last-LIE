# The Vesper Central Station Disappearance (case_gen_111117)

- **Mystery Type:** missing_item
- **Difficulty:** Declared: 1 | Measured: 1 (Score: 8)
- **Estimated Duration:** 6 minutes
- **Date:** 2026-10-24
- **Setting:** Vesper City incidents across Vesper Central Station, North Freight Dock.

## Briefing
An inventory audit revealed the theft of Freight Turnstile Scanner from Vesper Central Station. Statements from Stella Sterling, Lenore Oakhaven, and Victor Kessler contain critical inconsistencies with electronic monitoring. Determine who took the item.

## Cast of Characters
- **Lenore Oakhaven** (Archive Clerk): Archive Clerk in Vesper City involved in the incident.
- **Stella Sterling** (Chief Conservator): Vault Curator in Vesper City involved in the incident.
- **Victor Kessler** (Security Officer): Visiting Researcher in Vesper City involved in the incident.

## Locations
- **Vesper Central Station**: Subterranean rail hub connecting municipal lines to northern freight corridors.
- **North Freight Dock**: Enclosed cargo staging bay equipped with security turnstiles and rolling shutters.

## Evidence & Clues
- **[clue_missing_item_testimony]** (testimony, testimony, Default)
  > "Lenore Oakhaven stated: 'I remained in North Freight Dock from 20:10 to 20:30 attending to administrative filings.'"
- **[clue_custody_log]** (document, physical, Default)
  > "Official Register: Stella Sterling verified registered custody of Freight Turnstile Scanner in Vesper Central Station until 20:20."
- **[clue_custodian_office_access]** (access_log, physical, Default)
  > "Office Reader: Stella Sterling badged through door_dock_turnstile at 20:26."
- **[clue_culprit_vault_access]** (access_log, physical, Default)
  > "Vault Terminal: Lenore Oakhaven scanned access badge at door_station_gate at 20:18."
- **[clue_redherring_1]** (cctv, physical, Default [tags: red_herring])
  > "[20:20] CCTV_FEED · NORTH_FREIGHT_DOCK · subject: Stella Sterling"

## Hypotheses
- **hyp_custodian_guilty**: Stella Sterling entered Vesper Central Station and took Freight Turnstile Scanner.
- **hyp_culprit_guilty**: Lenore Oakhaven entered Vesper Central Station and took Freight Turnstile Scanner. **[SOLUTION]**
- **hyp_culprit_innocent**: Lenore Oakhaven remained in North Freight Dock and never approached Vesper Central Station.

## Truth & Reveal Explanation
- **Culprit:** char_lenore
- **Liars:** char_lenore (clue_missing_item_testimony)
- **Key Evidence Sets:** [clue_custodian_office_access, clue_culprit_vault_access]

### Chronological Explanation
1. **[1216]** Access records at door_station_gate proved Lenore Oakhaven entered the vault at 20:18, shattering claims of staying in North Freight Dock. *(Clues: clue_culprit_vault_access, clue_missing_item_testimony)*
2. **[1218]** Terminal badge logs confirmed Lenore Oakhaven accessed door_station_gate at 20:18, putting them inside the vault during the theft. *(Clues: clue_culprit_vault_access)*
3. **[1220]** Lenore Oakhaven took Freight Turnstile Scanner from Vesper Central Station before departing. *(Clues: clue_culprit_vault_access)*
