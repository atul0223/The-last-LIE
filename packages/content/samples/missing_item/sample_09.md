# The Cold Handover at The Grand Vesper Hotel (case_mi_8661)

- **Mystery Type:** missing_item
- **Difficulty:** Declared: 2 | Measured: 2 (Score: 13.5)
- **Estimated Duration:** 9 minutes
- **Date:** 2026-11-05
- **Setting:** A high-value object went missing from Vesper Central Station during evening shifts.

## Briefing
Custodial logs at Vesper Central Station show an unrecorded removal of Freight Turnstile Scanner. Access was restricted to three staff members: Marcel Frost, Sebastian Mercer, and Lucas Vaughn. Evaluate their testimonies against physical evidence to identify the perpetrator.

## Cast of Characters
- **Marcel Frost** (Archive Clerk): Archive Clerk in Vesper City involved in the incident.
- **Lucas Vaughn** (Vault Curator): Vault Curator in Vesper City involved in the incident.
- **Sebastian Mercer** (Visiting Researcher): Visiting Researcher in Vesper City involved in the incident.

## Locations
- **Vesper Central Station**: Subterranean rail hub connecting municipal lines to northern freight corridors.
- **The Grand Vesper Hotel**: Neoclassical luxury hotel situated north of the central rail terminus.
- **North Gate Print Shop**: Industrial printing press facility with mechanical composing bays and ink tanks.

## Evidence & Clues
- **[clue_custody_log]** (document, physical, Default)
  > "Official Register: Lucas Vaughn verified registered custody of Freight Turnstile Scanner in Vesper Central Station until 20:20."
- **[clue_culprit_testimony]** (testimony, testimony, Default)
  > "Marcel Frost stated: 'I remained in The Grand Vesper Hotel from 20:10 to 20:30. In fact, Sebastian Mercer was already holding Freight Turnstile Scanner earlier around 20:12.'"
- **[clue_custodian_office_access]** (access_log, physical, Default)
  > "Office Reader: Lucas Vaughn badged through door_hotel_lobby at 20:26."
- **[clue_culprit_vault_access]** (access_log, physical, Unlocked via clue_culprit_testimony)
  > "Vault Security Gate: Marcel Frost scanned access badge at door_station_gate at 20:18."
- **[clue_suspect2_transit_access]** (access_log, physical, Default)
  > "Corridor Turnstile: Sebastian Mercer scanned access at door_printshop_dock at 20:16."
- **[clue_redherring_1]** (access_log, physical, Default [tags: red_herring])
  > "[20:05] PRINTSHOP_DOCK · badge: Sebastian Mercer"
- **[clue_redherring_2]** (cctv, physical, Default [tags: red_herring])
  > "[20:15] CCTV_FEED · VESPER_CENTRAL_STATION · subject: Marcel Frost"

## Hypotheses
- **hyp_culprit_innocent**: Marcel Frost remained in The Grand Vesper Hotel and never entered Vesper Central Station.
- **hyp_custodian_took**: Lucas Vaughn took Freight Turnstile Scanner from Vesper Central Station.
- **hyp_suspect2_took**: Sebastian Mercer took Freight Turnstile Scanner from Vesper Central Station.
- **hyp_culprit_stole**: Marcel Frost took Freight Turnstile Scanner from Vesper Central Station. **[SOLUTION]**

## Truth & Reveal Explanation
- **Culprit:** char_marcel
- **Liars:** char_marcel (clue_culprit_testimony)
- **Key Evidence Sets:** [clue_custodian_office_access, clue_suspect2_transit_access, clue_culprit_vault_access]

### Chronological Explanation
1. **[1216]** Official custody records proved Lucas Vaughn held registered custody of Freight Turnstile Scanner until 20:20, disproving claims of earlier possession by others. *(Clues: clue_custody_log, clue_culprit_testimony)*
2. **[1216]** Sebastian Mercer badged into door_printshop_dock at 20:16, ruling out their presence at Vesper Central Station. *(Clues: clue_suspect2_transit_access)*
3. **[1218]** Marcel Frost was recorded badging into door_station_gate at 20:18, shattering their office alibi and placing them inside Vesper Central Station. *(Clues: clue_culprit_vault_access, clue_culprit_testimony)*
4. **[1220]** Marcel Frost took Freight Turnstile Scanner directly from Vesper Central Station at 20:20. *(Clues: clue_culprit_vault_access)*
