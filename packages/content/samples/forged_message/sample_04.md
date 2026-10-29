# The Forged Wire at North Freight Dock (case_fm_3089)

- **Mystery Type:** forged_message
- **Difficulty:** Declared: 4 | Measured: 4 (Score: 20)
- **Estimated Duration:** 13 minutes
- **Date:** 2026-11-06
- **Setting:** A forged telegraph dispatch was transmitted from North Freight Dock to disrupt operations at The Vesper Chronicle Newsroom.

## Briefing
An unauthorized message msg_dispatch was sent from Naval Brass Chronometer. Suspect Damian Volkov claims Miriam Vance was the sender. Inspect carrier headers and terminal sessions to expose the imposter.

## Cast of Characters
- **Damian Volkov** (Wire Editor): Wire Editor in Vesper City involved in the incident.
- **Miriam Vance** (Managing Editor): Managing Editor in Vesper City involved in the incident.
- **Valerie Vance** (Press Foreman): Press Foreman in Vesper City involved in the incident.
- **Katrina Chambers** (Telegraph Operator): Telegraph Operator in Vesper City involved in the incident.

## Locations
- **North Freight Dock**: Enclosed cargo staging bay equipped with security turnstiles and rolling shutters.
- **The Vesper Chronicle Newsroom**: Editorial offices, library archives, and news telegraph desks.
- **The Grand Vesper Hotel**: Neoclassical luxury hotel situated north of the central rail terminus.

## Evidence & Clues
- **[clue_carrier_log]** (message, physical, Default)
  > "Carrier Dispatch Log: Message msg_dispatch routed from Naval Brass Chronometer to Valerie Vance at 20:15. (Carrier header records no authenticated sender id)."
- **[clue_culprit_testimony]** (testimony, testimony, Default)
  > "Damian Volkov stated: 'I saw Miriam Vance log into Naval Brass Chronometer and send message msg_dispatch at 20:15 before leaving.'"
- **[clue_victim_alibi_access]** (access_log, physical, Default)
  > "Turnstile Log: Miriam Vance badged into door_newsroom_press at 20:14."
- **[clue_terminal_session]** (device_log, physical, Unlocked via clue_culprit_testimony)
  > "Terminal Audit Trail: Naval Brass Chronometer authenticated user session for Damian Volkov at 20:15 with badge access at door_dock_turnstile."
- **[clue_recipient_alibi_access]** (access_log, physical, Unlocked via clue_carrier_log)
  > "Gate Log: Valerie Vance scanned access badge at door_hotel_lobby at 20:16."
- **[clue_suspect3_alibi_access]** (access_log, physical, Default)
  > "Security Log: Katrina Chambers logged badge at door_hotel_lobby at 20:17."
- **[clue_redherring_1]** (cctv, physical, Default [tags: red_herring])
  > "[20:10] SECURITY_CAMERA · THE_GRAND_VESPER_HOTEL · visual: Katrina Chambers"
- **[clue_redherring_2]** (access_log, physical, Default [tags: red_herring])
  > "[20:29] ACCESS_LOG · HOTEL_LOBBY · badge: Valerie Vance"

## Hypotheses
- **hyp_culprit_forged**: Damian Volkov transmitted the forged dispatch from Naval Brass Chronometer. **[SOLUTION]**
- **hyp_victim_sent**: Miriam Vance sent the message from North Freight Dock.
- **hyp_recipient_sent**: Valerie Vance was present in North Freight Dock and sent the message.
- **hyp_suspect3_sent**: Katrina Chambers was present in North Freight Dock and sent the message.

## Truth & Reveal Explanation
- **Culprit:** char_damian
- **Liars:** char_damian (clue_culprit_testimony)
- **Key Evidence Sets:** [clue_victim_alibi_access, clue_recipient_alibi_access, clue_suspect3_alibi_access, clue_terminal_session]

### Chronological Explanation
1. **[1214]** Miriam Vance badged into door_newsroom_press at 20:14, proving they were not present in North Freight Dock to operate Naval Brass Chronometer. *(Clues: clue_victim_alibi_access)*
2. **[1215]** Terminal session logs verified that Damian Volkov was logged into Naval Brass Chronometer at 20:15, shattering their claim that Miriam Vance sent the dispatch. *(Clues: clue_terminal_session, clue_culprit_testimony)*
3. **[1216]** Valerie Vance was logged at door_hotel_lobby at 20:16, confirming their legitimate station. *(Clues: clue_recipient_alibi_access)*
4. **[1217]** Katrina Chambers was badged into door_hotel_lobby at 20:17, ruling out their presence at North Freight Dock. *(Clues: clue_suspect3_alibi_access)*
5. **[1215]** Damian Volkov transmitted the forged message msg_dispatch from Naval Brass Chronometer at 20:15. *(Clues: clue_carrier_log, clue_terminal_session)*
