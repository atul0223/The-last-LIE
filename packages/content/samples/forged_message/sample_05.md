# False Dispatches from High-Speed Rotary Press Across the Network (case_gen_936899)

- **Mystery Type:** forged_message
- **Difficulty:** Declared: 1 | Measured: 2 (Score: 10)
- **Estimated Duration:** 6 minutes
- **Date:** 2026-10-24
- **Setting:** Vesper City incidents across North Gate Print Shop, The Grand Vesper Hotel.

## Briefing
At 20:15, a compromised dispatch was routed from High-Speed Rotary Press inside North Gate Print Shop. An investigation focuses on three individuals: Bram Preston, Sebastian Mercer, and Walter Althaus. Examine terminal and access logs to uncover the true sender.

## Cast of Characters
- **Walter Althaus** (Telegraph Operator): Wire Editor in Vesper City involved in the incident.
- **Sebastian Mercer** (Desk Assistant): Lead Reporter in Vesper City involved in the incident.
- **Bram Preston** (Communications Officer): Desk Assistant in Vesper City involved in the incident.

## Locations
- **North Gate Print Shop**: Industrial printing press facility with mechanical composing bays and ink tanks.
- **The Grand Vesper Hotel**: Neoclassical luxury hotel situated north of the central rail terminus.

## Evidence & Clues
- **[clue_dispatch_testimony]** (testimony, testimony, Default)
  > "Walter Althaus stated: 'I saw Sebastian Mercer operating the transmitter High-Speed Rotary Press in North Gate Print Shop at 20:15.'"
- **[clue_victim_presence]** (cctv, physical, Default)
  > "Printshop CCTV: Optical feed confirmed Sebastian Mercer was inside The Grand Vesper Hotel from 20:10 to 20:25."
- **[clue_terminal_session]** (device_log, physical, Default)
  > "Terminal Session Log: High-Speed Rotary Press was actively operated by Walter Althaus at 20:15 inside North Gate Print Shop."
- **[clue_victim_alibi_access]** (access_log, physical, Default)
  > "Pressroom Card Reader: Sebastian Mercer badged into door_hotel_lobby at 20:14."
- **[clue_redherring_1]** (access_log, physical, Default [tags: red_herring])
  > "[20:16] HOTEL_LOBBY · badge: Bram Preston"

## Hypotheses
- **hyp_culprit_guilty**: Walter Althaus transmitted the forged dispatch from High-Speed Rotary Press in North Gate Print Shop. **[SOLUTION]**
- **hyp_victim_guilty**: Sebastian Mercer transmitted the dispatch from High-Speed Rotary Press in North Gate Print Shop.
- **hyp_culprit_innocent**: Walter Althaus remained in The Grand Vesper Hotel and did not use High-Speed Rotary Press.

## Truth & Reveal Explanation
- **Culprit:** char_walter
- **Liars:** char_walter (clue_dispatch_testimony)
- **Key Evidence Sets:** [clue_victim_alibi_access, clue_victim_presence, clue_terminal_session]

### Chronological Explanation
1. **[1214]** Sebastian Mercer badged into door_hotel_lobby at 20:14, proving they were not present in North Gate Print Shop to operate High-Speed Rotary Press. *(Clues: clue_victim_alibi_access)*
2. **[1215]** Printshop surveillance footage confirmed Sebastian Mercer was inside The Grand Vesper Hotel at 20:15, completely contradicting claims that they operated High-Speed Rotary Press. *(Clues: clue_victim_presence, clue_dispatch_testimony)*
3. **[1215]** Terminal authentication records proved Walter Althaus was the operator at High-Speed Rotary Press when the dispatch was generated. *(Clues: clue_terminal_session)*
4. **[1215]** Walter Althaus completed the forged transmission of Naval Brass Chronometer before signing off. *(Clues: clue_terminal_session)*
