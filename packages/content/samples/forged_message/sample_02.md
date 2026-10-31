# Dispatches from Nowhere: The High-Speed Rotary Press Affair (case_gen_403358)

- **Mystery Type:** forged_message
- **Difficulty:** Declared: 2 | Measured: 2 (Score: 13.5)
- **Estimated Duration:** 10 minutes
- **Date:** 2026-10-24
- **Setting:** Vesper City incidents across The Grand Vesper Hotel, Vesper Central Station, North Gate Print Shop.

## Briefing
At 20:15, a compromised dispatch was routed from High-Speed Rotary Press inside The Grand Vesper Hotel. An investigation focuses on three individuals: Alistair Wainwright, Octavia Brauer, and Corin Cross. Examine terminal and access logs to uncover the true sender.

## Cast of Characters
- **Octavia Brauer** (Lead Reporter): Wire Editor in Vesper City involved in the incident.
- **Alistair Wainwright** (Communications Officer): Lead Reporter in Vesper City involved in the incident.
- **Corin Cross** (Wire Editor): Desk Assistant in Vesper City involved in the incident.

## Locations
- **The Grand Vesper Hotel**: Neoclassical luxury hotel situated north of the central rail terminus.
- **Vesper Central Station**: Subterranean rail hub connecting municipal lines to northern freight corridors.
- **North Gate Print Shop**: Industrial printing press facility with mechanical composing bays and ink tanks.

## Evidence & Clues
- **[clue_dispatch_testimony]** (testimony, testimony, Default)
  > "Corin Cross stated: 'The wire transmission from High-Speed Rotary Press at 20:15 was authorized and sent directly by Alistair Wainwright.'"
- **[clue_terminal_session]** (device_log, physical, Unlocked via clue_dispatch_testimony)
  > "Terminal Session Log: High-Speed Rotary Press was actively operated by Octavia Brauer at 20:15 inside The Grand Vesper Hotel."
- **[clue_victim_alibi_access]** (access_log, physical, Default)
  > "Pressroom Card Reader: Alistair Wainwright badged into door_station_gate at 20:14."
- **[clue_recipient_alibi_access]** (access_log, physical, Default)
  > "Access Log: Corin Cross checked in at door_printshop_dock at 20:16."
- **[clue_redherring_1]** (access_log, physical, Default [tags: red_herring])
  > "[20:05] ACCESS_LOG · STATION_GATE · badge: Alistair Wainwright"
- **[clue_redherring_2]** (access_log, physical, Default [tags: red_herring])
  > "[20:29] PRINTSHOP_DOCK · badge: Corin Cross"

## Hypotheses
- **hyp_culprit_innocent**: Octavia Brauer remained in Vesper Central Station and did not use High-Speed Rotary Press.
- **hyp_culprit_guilty**: Octavia Brauer transmitted the forged dispatch from High-Speed Rotary Press in The Grand Vesper Hotel. **[SOLUTION]**
- **hyp_recipient_guilty**: Corin Cross transmitted the dispatch from High-Speed Rotary Press in The Grand Vesper Hotel.
- **hyp_victim_guilty**: Alistair Wainwright transmitted the dispatch from High-Speed Rotary Press in The Grand Vesper Hotel.

## Truth & Reveal Explanation
- **Culprit:** char_octavia
- **Liars:** char_corin (clue_dispatch_testimony)
- **Key Evidence Sets:** [clue_victim_alibi_access, clue_recipient_alibi_access, clue_terminal_session]

### Chronological Explanation
1. **[1214]** Alistair Wainwright badged into door_station_gate at 20:14, proving they were not present in The Grand Vesper Hotel to operate High-Speed Rotary Press. *(Clues: clue_victim_alibi_access)*
2. **[1215]** Terminal session logs verified that Octavia Brauer was logged into High-Speed Rotary Press at 20:15, shattering claims that Alistair Wainwright sent the dispatch. *(Clues: clue_terminal_session, clue_dispatch_testimony)*
3. **[1216]** Corin Cross was badged into door_printshop_dock at 20:16, ruling them out as the transmitter at The Grand Vesper Hotel. *(Clues: clue_recipient_alibi_access)*
4. **[1215]** Octavia Brauer completed the forged transmission of Naval Brass Chronometer before signing off. *(Clues: clue_terminal_session)*
