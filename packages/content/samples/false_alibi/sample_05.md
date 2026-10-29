# Shadows Over North Gate Print Shop (case_fa_1236)

- **Mystery Type:** false_alibi
- **Difficulty:** Declared: 1 | Measured: 1 (Score: 8)
- **Estimated Duration:** 7 minutes
- **Date:** 2026-11-04
- **Setting:** An unauthorized incident occurred at North Gate Print Shop under cover of evening routines.

## Briefing
High-Speed Rotary Press was compromised at North Gate Print Shop. Suspect Walter Althaus claims to have been at The Grand Vesper Hotel throughout the entire evening. Unravel the contradictions to identify the perpetrator.

## Cast of Characters
- **Walter Althaus** (Primary Suspect): Primary Suspect in Vesper City involved in the incident.
- **Sebastian Mercer** (Staff Member): Staff Member in Vesper City involved in the incident.
- **Bram Preston** (Associate): Associate in Vesper City involved in the incident.

## Locations
- **North Gate Print Shop**: Industrial printing press facility with mechanical composing bays and ink tanks.
- **The Grand Vesper Hotel**: Neoclassical luxury hotel situated north of the central rail terminus.

## Evidence & Clues
- **[clue_culprit_testimony]** (testimony, testimony, Default)
  > "Walter Althaus stated: 'I spent the entire evening from 20:10 to 20:30 at The Grand Vesper Hotel attending to routine matters.'"
- **[clue_suspect1_testimony]** (testimony, testimony, Default)
  > "Sebastian Mercer stated: 'I was present in The Grand Vesper Hotel between 20:10 and 20:30. I did not see any unauthorized activity.'"
- **[clue_suspect1_alibi_access]** (access_log, physical, Default)
  > "Access Reader: Sebastian Mercer badged through door_hotel_lobby at 20:15."
- **[clue_culprit_crime_access]** (access_log, physical, Default)
  > "Security Terminal: Walter Althaus scanned access badge at door_printshop_dock at 20:18."
- **[clue_redherring_1]** (access_log, physical, Default [tags: red_herring])
  > "[20:28] HOTEL_LOBBY · badge: Sebastian Mercer"

## Hypotheses
- **hyp_culprit_guilty**: Walter Althaus took High-Speed Rotary Press from North Gate Print Shop. **[SOLUTION]**
- **hyp_suspect1_guilty**: Sebastian Mercer was present at North Gate Print Shop during the incident.
- **hyp_culprit_innocent**: Walter Althaus was at The Grand Vesper Hotel and did not enter North Gate Print Shop.

## Truth & Reveal Explanation
- **Culprit:** char_walter
- **Liars:** char_walter (clue_culprit_testimony)
- **Key Evidence Sets:** [clue_suspect1_alibi_access, clue_culprit_crime_access]

### Chronological Explanation
1. **[1215]** Sebastian Mercer was logged badging into door_hotel_lobby at 20:15, proving their presence at The Grand Vesper Hotel and ruling out their presence at North Gate Print Shop. *(Clues: clue_suspect1_alibi_access)*
2. **[1218]** Walter Althaus was captured scanning their badge at door_printshop_dock at 20:18, completely shattering their fabricated alibi. *(Clues: clue_culprit_crime_access, clue_culprit_testimony)*
3. **[1220]** Walter Althaus took High-Speed Rotary Press from North Gate Print Shop at 20:20 before departing. *(Clues: clue_culprit_crime_access)*
