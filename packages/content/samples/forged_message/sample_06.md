# The Phantom Message from Freight Turnstile Scanner (case_fm_1998)

- **Mystery Type:** forged_message
- **Difficulty:** Declared: 2 | Measured: 2 (Score: 13.5)
- **Estimated Duration:** 9 minutes
- **Date:** 2026-11-06
- **Setting:** A forged telegraph dispatch was transmitted from The Grand Vesper Hotel to disrupt operations at The Vesper Chronicle Newsroom.

## Briefing
An unauthorized message msg_dispatch was sent from Freight Turnstile Scanner. Suspect Alistair Finch claims Cassian Calloway was the sender. Inspect carrier headers and terminal sessions to expose the imposter.

## Cast of Characters
- **Alistair Finch** (Wire Editor): Wire Editor in Vesper City involved in the incident.
- **Cassian Calloway** (Managing Editor): Managing Editor in Vesper City involved in the incident.
- **Orion Grayson** (Press Foreman): Press Foreman in Vesper City involved in the incident.

## Locations
- **The Grand Vesper Hotel**: Neoclassical luxury hotel situated north of the central rail terminus.
- **The Vesper Chronicle Newsroom**: Editorial offices, library archives, and news telegraph desks.
- **Vesper Central Station**: Subterranean rail hub connecting municipal lines to northern freight corridors.

## Evidence & Clues
- **[clue_carrier_log]** (message, physical, Default)
  > "Carrier Dispatch Log: Message msg_dispatch routed from Freight Turnstile Scanner to Orion Grayson at 20:15. (Carrier header records no authenticated sender id)."
- **[clue_culprit_testimony]** (testimony, testimony, Default)
  > "Alistair Finch stated: 'I saw Cassian Calloway log into Freight Turnstile Scanner and send message msg_dispatch at 20:15 before leaving.'"
- **[clue_victim_alibi_access]** (access_log, physical, Default)
  > "Turnstile Log: Cassian Calloway badged into door_newsroom_press at 20:14."
- **[clue_terminal_session]** (device_log, physical, Unlocked via clue_culprit_testimony)
  > "Terminal Audit Trail: Freight Turnstile Scanner authenticated user session for Alistair Finch at 20:15 with badge access at door_hotel_lobby."
- **[clue_recipient_alibi_access]** (access_log, physical, Default)
  > "Gate Log: Orion Grayson scanned access badge at door_station_gate at 20:16."
- **[clue_redherring_1]** (cctv, physical, Default [tags: red_herring])
  > "[20:10] SECURITY_CAMERA · THE_VESPER_CHRONICLE_NEWSROOM · visual: Cassian Calloway"
- **[clue_redherring_2]** (access_log, physical, Default [tags: red_herring])
  > "[20:05] NEWSROOM_PRESS · badge: Cassian Calloway"

## Hypotheses
- **hyp_culprit_forged**: Alistair Finch transmitted the forged dispatch from Freight Turnstile Scanner. **[SOLUTION]**
- **hyp_victim_sent**: Cassian Calloway sent the message from The Grand Vesper Hotel.
- **hyp_recipient_sent**: Orion Grayson was present in The Grand Vesper Hotel and sent the message.
- **hyp_culprit_innocent**: Alistair Finch was at The Vesper Chronicle Newsroom and did not operate Freight Turnstile Scanner.

## Truth & Reveal Explanation
- **Culprit:** char_alistair
- **Liars:** char_alistair (clue_culprit_testimony)
- **Key Evidence Sets:** [clue_victim_alibi_access, clue_recipient_alibi_access, clue_terminal_session]

### Chronological Explanation
1. **[1214]** Cassian Calloway badged into door_newsroom_press at 20:14, proving they were not present in The Grand Vesper Hotel to operate Freight Turnstile Scanner. *(Clues: clue_victim_alibi_access)*
2. **[1215]** Terminal session logs verified that Alistair Finch was logged into Freight Turnstile Scanner at 20:15, shattering their claim that Cassian Calloway sent the dispatch. *(Clues: clue_terminal_session, clue_culprit_testimony)*
3. **[1216]** Orion Grayson was logged at door_station_gate at 20:16, confirming their legitimate station. *(Clues: clue_recipient_alibi_access)*
4. **[1215]** Alistair Finch transmitted the forged message msg_dispatch from Freight Turnstile Scanner at 20:15. *(Clues: clue_carrier_log, clue_terminal_session)*
