# The Midnight Handover at North Freight Dock (case_mi_9949)

- **Mystery Type:** missing_item
- **Difficulty:** Declared: 1 | Measured: 1 (Score: 8)
- **Estimated Duration:** 7 minutes
- **Date:** 2026-11-05
- **Setting:** A high-value object went missing from Vesper Central Station during evening shifts.

## Briefing
Freight Turnstile Scanner disappeared from Vesper Central Station during the evening custodial window. Records confirm three individuals held access to the area: Lenore Oakhaven, Victor Kessler, and Stella Sterling. Compare custody registers and badge scans to expose who took the artifact.

## Cast of Characters
- **Lenore Oakhaven** (Archive Clerk): Archive Clerk in Vesper City involved in the incident.
- **Stella Sterling** (Vault Curator): Vault Curator in Vesper City involved in the incident.
- **Victor Kessler** (Visiting Researcher): Visiting Researcher in Vesper City involved in the incident.

## Locations
- **Vesper Central Station**: Subterranean rail hub connecting municipal lines to northern freight corridors.
- **North Freight Dock**: Enclosed cargo staging bay equipped with security turnstiles and rolling shutters.

## Evidence & Clues
- **[clue_custody_log]** (document, physical, Default)
  > "Official Register: Stella Sterling verified registered custody of Freight Turnstile Scanner in Vesper Central Station until 20:20."
- **[clue_culprit_testimony]** (testimony, testimony, Default)
  > "Lenore Oakhaven stated: 'I remained in North Freight Dock from 20:10 to 20:30. In fact, Victor Kessler was already holding Freight Turnstile Scanner earlier around 20:12.'"
- **[clue_custodian_office_access]** (access_log, physical, Default)
  > "Office Reader: Stella Sterling badged through door_dock_turnstile at 20:26."
- **[clue_culprit_vault_access]** (access_log, physical, Default)
  > "Vault Security Gate: Lenore Oakhaven scanned access badge at door_station_gate at 20:18."
- **[clue_redherring_1]** (cctv, physical, Default [tags: red_herring])
  > "[20:15] CCTV_FEED · VESPER_CENTRAL_STATION · subject: Lenore Oakhaven"

## Hypotheses
- **hyp_culprit_stole**: Lenore Oakhaven took Freight Turnstile Scanner from Vesper Central Station. **[SOLUTION]**
- **hyp_custodian_took**: Stella Sterling took Freight Turnstile Scanner from Vesper Central Station.
- **hyp_culprit_innocent**: Lenore Oakhaven remained in North Freight Dock and never entered Vesper Central Station.

## Truth & Reveal Explanation
- **Culprit:** char_lenore
- **Liars:** char_lenore (clue_culprit_testimony)
- **Key Evidence Sets:** [clue_custodian_office_access, clue_culprit_vault_access]

### Chronological Explanation
1. **[1216]** Official custody records proved Stella Sterling held registered custody of Freight Turnstile Scanner until 20:20, disproving claims of earlier possession by others. *(Clues: clue_custody_log, clue_culprit_testimony)*
2. **[1218]** Lenore Oakhaven was recorded badging into door_station_gate at 20:18, shattering their office alibi and placing them inside Vesper Central Station. *(Clues: clue_culprit_vault_access, clue_culprit_testimony)*
3. **[1220]** Lenore Oakhaven took Freight Turnstile Scanner directly from Vesper Central Station at 20:20. *(Clues: clue_culprit_vault_access)*
