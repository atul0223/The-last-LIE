# Deception on the Wire at North Freight Dock (case_fm_3790)

- **Mystery Type:** forged_message
- **Difficulty:** Declared: 3 | Measured: 3 (Score: 16.5)
- **Estimated Duration:** 11 minutes
- **Date:** 2026-11-06
- **Setting:** A forged telegraph dispatch was transmitted from North Gate Print Shop to disrupt operations at North Freight Dock.

## Briefing
An unauthorized message msg_dispatch was sent from Transit Cipher Ledger. Suspect Dorian Mercer claims Yvaine Chen was the sender. Inspect carrier headers and terminal sessions to expose the imposter.

## Cast of Characters
- **Dorian Mercer** (Wire Editor): Wire Editor in Vesper City involved in the incident.
- **Yvaine Chen** (Managing Editor): Managing Editor in Vesper City involved in the incident.
- **Astrid Whitman** (Press Foreman): Press Foreman in Vesper City involved in the incident.
- **Lenore Castile** (Telegraph Operator): Telegraph Operator in Vesper City involved in the incident.

## Locations
- **North Gate Print Shop**: Industrial printing press facility with mechanical composing bays and ink tanks.
- **North Freight Dock**: Enclosed cargo staging bay equipped with security turnstiles and rolling shutters.
- **The Vesper Chronicle Newsroom**: Editorial offices, library archives, and news telegraph desks.

## Evidence & Clues
- **[clue_carrier_log]** (message, physical, Default)
  > "Carrier Dispatch Log: Message msg_dispatch routed from Transit Cipher Ledger to Astrid Whitman at 20:15. (Carrier header records no authenticated sender id)."
- **[clue_culprit_testimony]** (testimony, testimony, Default)
  > "Dorian Mercer stated: 'I saw Yvaine Chen log into Transit Cipher Ledger and send message msg_dispatch at 20:15 before leaving.'"
- **[clue_victim_alibi_access]** (access_log, physical, Default)
  > "Turnstile Log: Yvaine Chen badged into door_dock_turnstile at 20:14."
- **[clue_terminal_session]** (device_log, physical, Unlocked via clue_culprit_testimony)
  > "Terminal Audit Trail: Transit Cipher Ledger authenticated user session for Dorian Mercer at 20:15 with badge access at door_printshop_dock."
- **[clue_recipient_alibi_access]** (access_log, physical, Default)
  > "Gate Log: Astrid Whitman scanned access badge at door_newsroom_press at 20:16."
- **[clue_redherring_1]** (cctv, physical, Default [tags: red_herring])
  > "[20:10] SECURITY_CAMERA · THE_VESPER_CHRONICLE_NEWSROOM · visual: Lenore Castile"
- **[clue_redherring_2]** (cctv, physical, Default [tags: red_herring])
  > "[20:10] CCTV_FEED · THE_VESPER_CHRONICLE_NEWSROOM · subject: Astrid Whitman"

## Hypotheses
- **hyp_culprit_forged**: Dorian Mercer transmitted the forged dispatch from Transit Cipher Ledger. **[SOLUTION]**
- **hyp_victim_sent**: Yvaine Chen sent the message from North Gate Print Shop.
- **hyp_recipient_sent**: Astrid Whitman was present in North Gate Print Shop and sent the message.
- **hyp_culprit_innocent**: Dorian Mercer was at North Freight Dock and did not operate Transit Cipher Ledger.

## Truth & Reveal Explanation
- **Culprit:** char_dorian
- **Liars:** char_dorian (clue_culprit_testimony)
- **Key Evidence Sets:** [clue_victim_alibi_access, clue_recipient_alibi_access, clue_terminal_session]

### Chronological Explanation
1. **[1214]** Yvaine Chen badged into door_dock_turnstile at 20:14, proving they were not present in North Gate Print Shop to operate Transit Cipher Ledger. *(Clues: clue_victim_alibi_access)*
2. **[1215]** Terminal session logs verified that Dorian Mercer was logged into Transit Cipher Ledger at 20:15, shattering their claim that Yvaine Chen sent the dispatch. *(Clues: clue_terminal_session, clue_culprit_testimony)*
3. **[1216]** Astrid Whitman was logged at door_newsroom_press at 20:16, confirming their legitimate station. *(Clues: clue_recipient_alibi_access)*
4. **[1215]** Dorian Mercer transmitted the forged message msg_dispatch from Transit Cipher Ledger at 20:15. *(Clues: clue_carrier_log, clue_terminal_session)*
