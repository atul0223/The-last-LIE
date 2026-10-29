# The Forged Wire at North Gate Print Shop (case_fm_6507)

- **Mystery Type:** forged_message
- **Difficulty:** Declared: 1 | Measured: 1 (Score: 8)
- **Estimated Duration:** 7 minutes
- **Date:** 2026-11-06
- **Setting:** A forged telegraph dispatch was transmitted from North Gate Print Shop to disrupt operations at The Grand Vesper Hotel.

## Briefing
An unauthorized message msg_dispatch was sent from High-Speed Rotary Press. Suspect Walter Althaus claims Sebastian Mercer was the sender. Inspect carrier headers and terminal sessions to expose the imposter.

## Cast of Characters
- **Walter Althaus** (Wire Editor): Wire Editor in Vesper City involved in the incident.
- **Sebastian Mercer** (Managing Editor): Managing Editor in Vesper City involved in the incident.
- **Bram Preston** (Press Foreman): Press Foreman in Vesper City involved in the incident.

## Locations
- **North Gate Print Shop**: Industrial printing press facility with mechanical composing bays and ink tanks.
- **The Grand Vesper Hotel**: Neoclassical luxury hotel situated north of the central rail terminus.

## Evidence & Clues
- **[clue_carrier_log]** (message, physical, Default)
  > "Carrier Dispatch Log: Message msg_dispatch routed from High-Speed Rotary Press to Bram Preston at 20:15. (Carrier header records no authenticated sender id)."
- **[clue_culprit_testimony]** (testimony, testimony, Default)
  > "Walter Althaus stated: 'I saw Sebastian Mercer log into High-Speed Rotary Press and send message msg_dispatch at 20:15 before leaving.'"
- **[clue_victim_alibi_access]** (access_log, physical, Default)
  > "Turnstile Log: Sebastian Mercer badged into door_hotel_lobby at 20:14."
- **[clue_terminal_session]** (device_log, physical, Default)
  > "Terminal Audit Trail: High-Speed Rotary Press authenticated user session for Walter Althaus at 20:15 with badge access at door_printshop_dock."
- **[clue_redherring_1]** (cctv, physical, Default [tags: red_herring])
  > "[20:10] CCTV_FEED · THE_GRAND_VESPER_HOTEL · subject: Sebastian Mercer"

## Hypotheses
- **hyp_culprit_forged**: Walter Althaus transmitted the forged dispatch from High-Speed Rotary Press. **[SOLUTION]**
- **hyp_victim_sent**: Sebastian Mercer sent the message from North Gate Print Shop.
- **hyp_culprit_innocent**: Walter Althaus was at The Grand Vesper Hotel and did not operate High-Speed Rotary Press.

## Truth & Reveal Explanation
- **Culprit:** char_walter
- **Liars:** char_walter (clue_culprit_testimony)
- **Key Evidence Sets:** [clue_victim_alibi_access, clue_terminal_session]

### Chronological Explanation
1. **[1214]** Sebastian Mercer badged into door_hotel_lobby at 20:14, proving they were not present in North Gate Print Shop to operate High-Speed Rotary Press. *(Clues: clue_victim_alibi_access)*
2. **[1215]** Terminal session logs verified that Walter Althaus was logged into High-Speed Rotary Press at 20:15, shattering their claim that Sebastian Mercer sent the dispatch. *(Clues: clue_terminal_session, clue_culprit_testimony)*
3. **[1215]** Walter Althaus transmitted the forged message msg_dispatch from High-Speed Rotary Press at 20:15. *(Clues: clue_carrier_log, clue_terminal_session)*
