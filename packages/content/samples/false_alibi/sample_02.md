# The Hidden Inquiry at The Grand Vesper Hotel (case_fa_4554)

- **Mystery Type:** false_alibi
- **Difficulty:** Declared: 2 | Measured: 2 (Score: 13.5)
- **Estimated Duration:** 9 minutes
- **Date:** 2026-11-04
- **Setting:** An unauthorized incident occurred at The Grand Vesper Hotel under cover of evening routines.

## Briefing
Security at The Grand Vesper Hotel reported High-Speed Rotary Press missing from its station. Corin Cross, Alistair Wainwright, and Octavia Brauer were on site during the evening hours, each offering an explanation. Review the movement logs to expose the false alibi.

## Cast of Characters
- **Octavia Brauer** (Primary Suspect): Primary Suspect in Vesper City involved in the incident.
- **Alistair Wainwright** (Staff Member): Staff Member in Vesper City involved in the incident.
- **Corin Cross** (Associate): Associate in Vesper City involved in the incident.

## Locations
- **The Grand Vesper Hotel**: Neoclassical luxury hotel situated north of the central rail terminus.
- **Vesper Central Station**: Subterranean rail hub connecting municipal lines to northern freight corridors.
- **North Gate Print Shop**: Industrial printing press facility with mechanical composing bays and ink tanks.

## Evidence & Clues
- **[clue_culprit_testimony]** (testimony, testimony, Default)
  > "Octavia Brauer stated: 'I spent the entire evening from 20:10 to 20:30 at Vesper Central Station attending to routine matters.'"
- **[clue_suspect1_testimony]** (testimony, testimony, Default)
  > "Alistair Wainwright stated: 'I was present in Vesper Central Station between 20:10 and 20:30. I did not see any unauthorized activity.'"
- **[clue_suspect1_alibi_access]** (access_log, physical, Default)
  > "Access Reader: Alistair Wainwright badged through door_station_gate at 20:15."
- **[clue_culprit_crime_access]** (access_log, physical, Unlocked via clue_culprit_testimony)
  > "Security Terminal: Octavia Brauer scanned access badge at door_hotel_lobby at 20:18."
- **[clue_suspect2_alibi_access]** (access_log, physical, Default)
  > "Turnstile Log: Corin Cross verified entry at door_printshop_dock at 20:16."
- **[clue_redherring_1]** (access_log, physical, Default [tags: red_herring])
  > "[20:29] ACCESS_LOG · PRINTSHOP_DOCK · badge: Corin Cross"
- **[clue_redherring_2]** (access_log, physical, Default [tags: red_herring])
  > "[20:05] STATION_GATE · badge: Alistair Wainwright"

## Hypotheses
- **hyp_suspect1_guilty**: Alistair Wainwright entered The Grand Vesper Hotel and took High-Speed Rotary Press.
- **hyp_culprit_innocent**: Octavia Brauer remained at Vesper Central Station and did not enter The Grand Vesper Hotel.
- **hyp_suspect2_guilty**: Corin Cross entered The Grand Vesper Hotel and took High-Speed Rotary Press.
- **hyp_culprit_guilty**: Octavia Brauer entered The Grand Vesper Hotel and took High-Speed Rotary Press. **[SOLUTION]**

## Truth & Reveal Explanation
- **Culprit:** char_octavia
- **Liars:** char_octavia (clue_culprit_testimony)
- **Key Evidence Sets:** [clue_suspect1_alibi_access, clue_suspect2_alibi_access, clue_culprit_crime_access]

### Chronological Explanation
1. **[1215]** Alistair Wainwright was logged badging into door_station_gate at 20:15, proving their presence at Vesper Central Station and ruling out their presence at The Grand Vesper Hotel. *(Clues: clue_suspect1_alibi_access)*
2. **[1216]** Corin Cross badged through door_printshop_dock at 20:16, establishing their presence at North Gate Print Shop. *(Clues: clue_suspect2_alibi_access)*
3. **[1218]** Octavia Brauer was captured scanning their badge at door_hotel_lobby at 20:18, completely shattering their fabricated alibi. *(Clues: clue_culprit_crime_access, clue_culprit_testimony)*
4. **[1220]** Octavia Brauer took High-Speed Rotary Press from The Grand Vesper Hotel at 20:20 before departing. *(Clues: clue_culprit_crime_access)*
