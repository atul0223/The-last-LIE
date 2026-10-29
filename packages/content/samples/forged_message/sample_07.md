# Deception on the Wire at North Gate Print Shop (case_fm_2852)

- **Mystery Type:** forged_message
- **Difficulty:** Declared: 3 | Measured: 3 (Score: 16.5)
- **Estimated Duration:** 11 minutes
- **Date:** 2026-11-06
- **Setting:** A forged telegraph dispatch was transmitted from The Grand Vesper Hotel to disrupt operations at North Gate Print Shop.

## Briefing
An unauthorized message msg_dispatch was sent from Transit Cipher Ledger. Suspect Damian Ramsay claims Nadia Grayson was the sender. Inspect carrier headers and terminal sessions to expose the imposter.

## Cast of Characters
- **Damian Ramsay** (Wire Editor): Wire Editor in Vesper City involved in the incident.
- **Nadia Grayson** (Managing Editor): Managing Editor in Vesper City involved in the incident.
- **Eleanor Belmont** (Press Foreman): Press Foreman in Vesper City involved in the incident.
- **Beatrix Sterling** (Telegraph Operator): Telegraph Operator in Vesper City involved in the incident.

## Locations
- **The Grand Vesper Hotel**: Neoclassical luxury hotel situated north of the central rail terminus.
- **North Gate Print Shop**: Industrial printing press facility with mechanical composing bays and ink tanks.
- **The Vesper Chronicle Newsroom**: Editorial offices, library archives, and news telegraph desks.

## Evidence & Clues
- **[clue_carrier_log]** (message, physical, Default)
  > "Carrier Dispatch Log: Message msg_dispatch routed from Transit Cipher Ledger to Eleanor Belmont at 20:15. (Carrier header records no authenticated sender id)."
- **[clue_culprit_testimony]** (testimony, testimony, Default)
  > "Damian Ramsay stated: 'I saw Nadia Grayson log into Transit Cipher Ledger and send message msg_dispatch at 20:15 before leaving.'"
- **[clue_victim_alibi_access]** (access_log, physical, Default)
  > "Turnstile Log: Nadia Grayson badged into door_printshop_dock at 20:14."
- **[clue_terminal_session]** (device_log, physical, Unlocked via clue_culprit_testimony)
  > "Terminal Audit Trail: Transit Cipher Ledger authenticated user session for Damian Ramsay at 20:15 with badge access at door_hotel_lobby."
- **[clue_recipient_alibi_access]** (access_log, physical, Default)
  > "Gate Log: Eleanor Belmont scanned access badge at door_newsroom_press at 20:16."
- **[clue_redherring_1]** (access_log, physical, Default [tags: red_herring])
  > "[20:06] ACCESS_LOG · NEWSROOM_PRESS · badge: Eleanor Belmont"
- **[clue_redherring_2]** (access_log, physical, Default [tags: red_herring])
  > "[20:17] ACCESS_LOG · NEWSROOM_PRESS · badge: Beatrix Sterling"

## Hypotheses
- **hyp_culprit_forged**: Damian Ramsay transmitted the forged dispatch from Transit Cipher Ledger. **[SOLUTION]**
- **hyp_victim_sent**: Nadia Grayson sent the message from The Grand Vesper Hotel.
- **hyp_recipient_sent**: Eleanor Belmont was present in The Grand Vesper Hotel and sent the message.
- **hyp_culprit_innocent**: Damian Ramsay was at North Gate Print Shop and did not operate Transit Cipher Ledger.

## Truth & Reveal Explanation
- **Culprit:** char_damian
- **Liars:** char_damian (clue_culprit_testimony)
- **Key Evidence Sets:** [clue_victim_alibi_access, clue_recipient_alibi_access, clue_terminal_session]

### Chronological Explanation
1. **[1214]** Nadia Grayson badged into door_printshop_dock at 20:14, proving they were not present in The Grand Vesper Hotel to operate Transit Cipher Ledger. *(Clues: clue_victim_alibi_access)*
2. **[1215]** Terminal session logs verified that Damian Ramsay was logged into Transit Cipher Ledger at 20:15, shattering their claim that Nadia Grayson sent the dispatch. *(Clues: clue_terminal_session, clue_culprit_testimony)*
3. **[1216]** Eleanor Belmont was logged at door_newsroom_press at 20:16, confirming their legitimate station. *(Clues: clue_recipient_alibi_access)*
4. **[1215]** Damian Ramsay transmitted the forged message msg_dispatch from Transit Cipher Ledger at 20:15. *(Clues: clue_carrier_log, clue_terminal_session)*
