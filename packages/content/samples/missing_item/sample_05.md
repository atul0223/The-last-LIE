# The Theft at North Gate Print Shop During Handover (case_gen_936899)

- **Mystery Type:** missing_item
- **Difficulty:** Declared: 1 | Measured: 1 (Score: 8)
- **Estimated Duration:** 6 minutes
- **Date:** 2026-10-24
- **Setting:** Vesper City incidents across North Gate Print Shop, The Grand Vesper Hotel.

## Briefing
At 20:20, High-Speed Rotary Press went missing from North Gate Print Shop. A custodial discrepancy involves three individuals: Bram Preston, Sebastian Mercer, and Walter Althaus. Examine access and custody records to expose the culprit.

## Cast of Characters
- **Walter Althaus** (Chief Conservator): Archive Clerk in Vesper City involved in the incident.
- **Sebastian Mercer** (Vault Curator): Vault Curator in Vesper City involved in the incident.
- **Bram Preston** (Archive Clerk): Visiting Researcher in Vesper City involved in the incident.

## Locations
- **North Gate Print Shop**: Industrial printing press facility with mechanical composing bays and ink tanks.
- **The Grand Vesper Hotel**: Neoclassical luxury hotel situated north of the central rail terminus.

## Evidence & Clues
- **[clue_missing_item_testimony]** (testimony, testimony, Default)
  > "Walter Althaus stated: 'I saw Bram Preston holding High-Speed Rotary Press in their custody between 20:12 and 20:25.'"
- **[clue_custody_log]** (document, physical, Default)
  > "Official Register: Sebastian Mercer verified registered custody of High-Speed Rotary Press in North Gate Print Shop until 20:20."
- **[clue_custodian_office_access]** (access_log, physical, Default)
  > "Office Reader: Sebastian Mercer badged through door_hotel_lobby at 20:26."
- **[clue_culprit_vault_access]** (access_log, physical, Default)
  > "Vault Terminal: Walter Althaus scanned access badge at door_printshop_dock at 20:18."
- **[clue_redherring_1]** (access_log, physical, Default [tags: red_herring])
  > "[20:16] HOTEL_LOBBY · badge: Bram Preston"

## Hypotheses
- **hyp_culprit_guilty**: Walter Althaus entered North Gate Print Shop and took High-Speed Rotary Press. **[SOLUTION]**
- **hyp_custodian_guilty**: Sebastian Mercer entered North Gate Print Shop and took High-Speed Rotary Press.
- **hyp_culprit_innocent**: Walter Althaus remained in The Grand Vesper Hotel and never approached North Gate Print Shop.

## Truth & Reveal Explanation
- **Culprit:** char_walter
- **Liars:** char_walter (clue_missing_item_testimony)
- **Key Evidence Sets:** [clue_custodian_office_access, clue_culprit_vault_access]

### Chronological Explanation
1. **[1216]** Official custody records proved Sebastian Mercer held exclusive custody of High-Speed Rotary Press until 20:20, disproving false claims of possession. *(Clues: clue_custody_log, clue_missing_item_testimony)*
2. **[1218]** Terminal badge logs confirmed Walter Althaus accessed door_printshop_dock at 20:18, putting them inside the vault during the theft. *(Clues: clue_culprit_vault_access)*
3. **[1220]** Walter Althaus took High-Speed Rotary Press from North Gate Print Shop before departing. *(Clues: clue_culprit_vault_access)*
