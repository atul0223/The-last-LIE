# The Phantom Message from Freight Turnstile Scanner (case_fm_7078)

- **Mystery Type:** forged_message
- **Difficulty:** Declared: 1 | Measured: 1 (Score: 8)
- **Estimated Duration:** 7 minutes
- **Date:** 2026-11-06
- **Setting:** A forged telegraph dispatch was transmitted from Vesper Central Station to disrupt operations at North Freight Dock.

## Briefing
An unauthorized message msg_dispatch was sent from Freight Turnstile Scanner. Suspect Lenore Oakhaven claims Stella Sterling was the sender. Inspect carrier headers and terminal sessions to expose the imposter.

## Cast of Characters
- **Lenore Oakhaven** (Wire Editor): Wire Editor in Vesper City involved in the incident.
- **Stella Sterling** (Managing Editor): Managing Editor in Vesper City involved in the incident.
- **Victor Kessler** (Press Foreman): Press Foreman in Vesper City involved in the incident.

## Locations
- **Vesper Central Station**: Subterranean rail hub connecting municipal lines to northern freight corridors.
- **North Freight Dock**: Enclosed cargo staging bay equipped with security turnstiles and rolling shutters.

## Evidence & Clues
- **[clue_carrier_log]** (message, physical, Default)
  > "Carrier Dispatch Log: Message msg_dispatch routed from Freight Turnstile Scanner to Victor Kessler at 20:15. (Carrier header records no authenticated sender id)."
- **[clue_culprit_testimony]** (testimony, testimony, Default)
  > "Lenore Oakhaven stated: 'I saw Stella Sterling log into Freight Turnstile Scanner and send message msg_dispatch at 20:15 before leaving.'"
- **[clue_victim_alibi_access]** (access_log, physical, Default)
  > "Turnstile Log: Stella Sterling badged into door_dock_turnstile at 20:14."
- **[clue_terminal_session]** (device_log, physical, Default)
  > "Terminal Audit Trail: Freight Turnstile Scanner authenticated user session for Lenore Oakhaven at 20:15 with badge access at door_station_gate."
- **[clue_redherring_1]** (cctv, physical, Default [tags: red_herring])
  > "[20:10] CCTV_FEED · NORTH_FREIGHT_DOCK · subject: Stella Sterling"

## Hypotheses
- **hyp_culprit_forged**: Lenore Oakhaven transmitted the forged dispatch from Freight Turnstile Scanner. **[SOLUTION]**
- **hyp_victim_sent**: Stella Sterling sent the message from Vesper Central Station.
- **hyp_culprit_innocent**: Lenore Oakhaven was at North Freight Dock and did not operate Freight Turnstile Scanner.

## Truth & Reveal Explanation
- **Culprit:** char_lenore
- **Liars:** char_lenore (clue_culprit_testimony)
- **Key Evidence Sets:** [clue_victim_alibi_access, clue_terminal_session]

### Chronological Explanation
1. **[1214]** Stella Sterling badged into door_dock_turnstile at 20:14, proving they were not present in Vesper Central Station to operate Freight Turnstile Scanner. *(Clues: clue_victim_alibi_access)*
2. **[1215]** Terminal session logs verified that Lenore Oakhaven was logged into Freight Turnstile Scanner at 20:15, shattering their claim that Stella Sterling sent the dispatch. *(Clues: clue_terminal_session, clue_culprit_testimony)*
3. **[1215]** Lenore Oakhaven transmitted the forged message msg_dispatch from Freight Turnstile Scanner at 20:15. *(Clues: clue_carrier_log, clue_terminal_session)*
