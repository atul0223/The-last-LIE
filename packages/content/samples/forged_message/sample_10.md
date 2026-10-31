# The Phantom Message from Freight Turnstile Scanner Over the Wire (case_fm_7197)

- **Mystery Type:** forged_message
- **Difficulty:** Declared: 3 | Measured: 3 (Score: 16.5)
- **Estimated Duration:** 11 minutes
- **Date:** 2026-11-06
- **Setting:** A forged telegraph dispatch was transmitted from North Gate Print Shop to disrupt operations at Vesper Central Station.

## Briefing
A forged wire instruction was relayed through Freight Turnstile Scanner during the deadline rush. Investigative inquiries focus on Octavia Harrington, Cassian Ashford, Sebastian Thorne, and Yvaine Calloway, each linked to communications that evening. Trace the terminal timestamps to prove who transmitted the fake dispatch.

## Cast of Characters
- **Sebastian Thorne** (Wire Editor): Wire Editor in Vesper City involved in the incident.
- **Yvaine Calloway** (Managing Editor): Managing Editor in Vesper City involved in the incident.
- **Cassian Ashford** (Press Foreman): Press Foreman in Vesper City involved in the incident.
- **Octavia Harrington** (Telegraph Operator): Telegraph Operator in Vesper City involved in the incident.

## Locations
- **North Gate Print Shop**: Industrial printing press facility with mechanical composing bays and ink tanks.
- **Vesper Central Station**: Subterranean rail hub connecting municipal lines to northern freight corridors.
- **North Freight Dock**: Enclosed cargo staging bay equipped with security turnstiles and rolling shutters.

## Evidence & Clues
- **[clue_carrier_log]** (message, physical, Default)
  > "Carrier Dispatch Log: Message msg_dispatch routed from Freight Turnstile Scanner to Cassian Ashford at 20:15. (Carrier header records no authenticated sender id)."
- **[clue_culprit_testimony]** (testimony, testimony, Default)
  > "Sebastian Thorne stated: 'I saw Yvaine Calloway log into Freight Turnstile Scanner and send message msg_dispatch at 20:15 before leaving.'"
- **[clue_victim_alibi_access]** (access_log, physical, Default)
  > "Turnstile Log: Yvaine Calloway badged into door_station_gate at 20:14."
- **[clue_terminal_session]** (device_log, physical, Unlocked via clue_culprit_testimony)
  > "Terminal Audit Trail: Freight Turnstile Scanner authenticated user session for Sebastian Thorne at 20:15 with badge access at door_printshop_dock."
- **[clue_recipient_alibi_access]** (access_log, physical, Default)
  > "Gate Log: Cassian Ashford scanned access badge at door_dock_turnstile at 20:16."
- **[clue_redherring_1]** (access_log, physical, Default [tags: red_herring])
  > "[20:29] DOCK_TURNSTILE · badge: Cassian Ashford"
- **[clue_redherring_2]** (cctv, physical, Default [tags: red_herring])
  > "[20:10] SECURITY_CAMERA · VESPER_CENTRAL_STATION · visual: Yvaine Calloway"

## Hypotheses
- **hyp_recipient_sent**: Cassian Ashford transmitted the unauthorized dispatch from Freight Turnstile Scanner.
- **hyp_victim_sent**: Yvaine Calloway transmitted the unauthorized dispatch from Freight Turnstile Scanner.
- **hyp_culprit_forged**: Sebastian Thorne transmitted the unauthorized dispatch from Freight Turnstile Scanner. **[SOLUTION]**
- **hyp_culprit_innocent**: Sebastian Thorne remained at Vesper Central Station and did not operate Freight Turnstile Scanner.

## Truth & Reveal Explanation
- **Culprit:** char_sebastian
- **Liars:** char_sebastian (clue_culprit_testimony)
- **Key Evidence Sets:** [clue_victim_alibi_access, clue_recipient_alibi_access, clue_terminal_session]

### Chronological Explanation
1. **[1214]** Yvaine Calloway badged into door_station_gate at 20:14, proving they were not present in North Gate Print Shop to operate Freight Turnstile Scanner. *(Clues: clue_victim_alibi_access)*
2. **[1215]** Terminal session logs verified that Sebastian Thorne was logged into Freight Turnstile Scanner at 20:15, shattering their claim that Yvaine Calloway sent the dispatch. *(Clues: clue_terminal_session, clue_culprit_testimony)*
3. **[1216]** Cassian Ashford was logged at door_dock_turnstile at 20:16, confirming their legitimate station. *(Clues: clue_recipient_alibi_access)*
4. **[1215]** Sebastian Thorne transmitted the forged message msg_dispatch from Freight Turnstile Scanner at 20:15. *(Clues: clue_carrier_log, clue_terminal_session)*
