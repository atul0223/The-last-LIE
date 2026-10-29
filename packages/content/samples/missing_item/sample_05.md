# The Missing High-Speed Rotary Press (case_mi_6507)

- **Mystery Type:** missing_item
- **Difficulty:** Declared: 1 | Measured: 1 (Score: 8)
- **Estimated Duration:** 7 minutes
- **Date:** 2026-11-05
- **Setting:** A high-value object went missing from North Gate Print Shop during evening shifts.

## Briefing
High-Speed Rotary Press disappeared from North Gate Print Shop. Staff member Walter Althaus claims to have been working in The Grand Vesper Hotel and denies entering the vault. Correlate custody logs and entry records to expose the thief.

## Cast of Characters
- **Walter Althaus** (Archive Clerk): Archive Clerk in Vesper City involved in the incident.
- **Sebastian Mercer** (Vault Curator): Vault Curator in Vesper City involved in the incident.
- **Bram Preston** (Visiting Researcher): Visiting Researcher in Vesper City involved in the incident.

## Locations
- **North Gate Print Shop**: Industrial printing press facility with mechanical composing bays and ink tanks.
- **The Grand Vesper Hotel**: Neoclassical luxury hotel situated north of the central rail terminus.

## Evidence & Clues
- **[clue_custody_log]** (document, physical, Default)
  > "Official Register: Sebastian Mercer verified registered custody of High-Speed Rotary Press in North Gate Print Shop until 20:20."
- **[clue_culprit_testimony]** (testimony, testimony, Default)
  > "Walter Althaus stated: 'I remained in The Grand Vesper Hotel from 20:10 to 20:30. In fact, Bram Preston was already holding High-Speed Rotary Press earlier around 20:12.'"
- **[clue_custodian_office_access]** (access_log, physical, Default)
  > "Office Reader: Sebastian Mercer badged through door_hotel_lobby at 20:26."
- **[clue_culprit_vault_access]** (access_log, physical, Default)
  > "Vault Security Gate: Walter Althaus scanned access badge at door_printshop_dock at 20:18."
- **[clue_redherring_1]** (cctv, physical, Default [tags: red_herring])
  > "[20:15] CCTV_FEED · NORTH_GATE_PRINT_SHOP · subject: Walter Althaus"

## Hypotheses
- **hyp_culprit_stole**: Walter Althaus took High-Speed Rotary Press from North Gate Print Shop. **[SOLUTION]**
- **hyp_custodian_took**: Sebastian Mercer took High-Speed Rotary Press from North Gate Print Shop after hours.
- **hyp_culprit_innocent**: Walter Althaus remained in The Grand Vesper Hotel and never entered North Gate Print Shop.

## Truth & Reveal Explanation
- **Culprit:** char_walter
- **Liars:** char_walter (clue_culprit_testimony)
- **Key Evidence Sets:** [clue_custodian_office_access, clue_culprit_vault_access]

### Chronological Explanation
1. **[1216]** Official custody records proved Sebastian Mercer held registered custody of High-Speed Rotary Press until 20:20, disproving claims of earlier possession by others. *(Clues: clue_custody_log, clue_culprit_testimony)*
2. **[1218]** Walter Althaus was recorded badging into door_printshop_dock at 20:18, shattering their office alibi and placing them inside North Gate Print Shop. *(Clues: clue_culprit_vault_access, clue_culprit_testimony)*
3. **[1220]** Walter Althaus took High-Speed Rotary Press directly from North Gate Print Shop at 20:20. *(Clues: clue_culprit_vault_access)*
