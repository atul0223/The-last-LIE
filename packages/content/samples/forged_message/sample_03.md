# The Ghost Signal from Transit Cipher Ledger (case_gen_501610)

- **Mystery Type:** forged_message
- **Difficulty:** Declared: 3 | Measured: 3 (Score: 16.5)
- **Estimated Duration:** 14 minutes
- **Date:** 2026-10-24
- **Setting:** Vesper City incidents across North Gate Print Shop, North Freight Dock, The Vesper Chronicle Newsroom.

## Briefing
An illicit wire communication was detected originating from North Gate Print Shop. Accounts given by Lenore Castile, Dorian Mercer, Yvaine Chen, and Astrid Whitman contain fabricated details regarding device access. Determine who sent the message.

## Cast of Characters
- **Dorian Mercer** (Wire Editor): Wire Editor in Vesper City involved in the incident.
- **Yvaine Chen** (Telegraph Operator): Lead Reporter in Vesper City involved in the incident.
- **Astrid Whitman** (Communications Officer): Desk Assistant in Vesper City involved in the incident.
- **Lenore Castile** (Desk Assistant): Telegraph Operator in Vesper City involved in the incident.

## Locations
- **North Gate Print Shop**: Industrial printing press facility with mechanical composing bays and ink tanks.
- **North Freight Dock**: Enclosed cargo staging bay equipped with security turnstiles and rolling shutters.
- **The Vesper Chronicle Newsroom**: Editorial offices, library archives, and news telegraph desks.

## Evidence & Clues
- **[clue_dispatch_testimony]** (testimony, testimony, Default)
  > "Dorian Mercer stated: 'The wire transmission from Transit Cipher Ledger at 20:15 was authorized and sent directly by Yvaine Chen.'"
- **[clue_terminal_session]** (device_log, physical, Unlocked via clue_dispatch_testimony)
  > "Terminal Session Log: Transit Cipher Ledger was actively operated by Dorian Mercer at 20:15 inside North Gate Print Shop."
- **[clue_victim_alibi_access]** (access_log, physical, Default)
  > "Pressroom Card Reader: Yvaine Chen badged into door_dock_turnstile at 20:14."
- **[clue_recipient_alibi_access]** (access_log, physical, Default)
  > "Access Log: Astrid Whitman checked in at door_newsroom_press at 20:16."
- **[clue_redherring_1]** (cctv, physical, Default [tags: red_herring])
  > "[20:10] SECURITY_CAMERA · NORTH_FREIGHT_DOCK · visual: Yvaine Chen"
- **[clue_redherring_2]** (access_log, physical, Default [tags: red_herring])
  > "[20:28] ACCESS_LOG · DOCK_TURNSTILE · badge: Yvaine Chen"

## Hypotheses
- **hyp_culprit_guilty**: Dorian Mercer transmitted the forged dispatch from Transit Cipher Ledger in North Gate Print Shop. **[SOLUTION]**
- **hyp_recipient_guilty**: Astrid Whitman transmitted the dispatch from Transit Cipher Ledger in North Gate Print Shop.
- **hyp_culprit_innocent**: Dorian Mercer remained in North Freight Dock and did not use Transit Cipher Ledger.
- **hyp_victim_guilty**: Yvaine Chen transmitted the dispatch from Transit Cipher Ledger in North Gate Print Shop.

## Truth & Reveal Explanation
- **Culprit:** char_dorian
- **Liars:** char_dorian (clue_dispatch_testimony)
- **Key Evidence Sets:** [clue_victim_alibi_access, clue_recipient_alibi_access, clue_terminal_session]

### Chronological Explanation
1. **[1214]** Yvaine Chen badged into door_dock_turnstile at 20:14, proving they were not present in North Gate Print Shop to operate Transit Cipher Ledger. *(Clues: clue_victim_alibi_access)*
2. **[1215]** Terminal session logs verified that Dorian Mercer was logged into Transit Cipher Ledger at 20:15, shattering claims that Yvaine Chen sent the dispatch. *(Clues: clue_terminal_session, clue_dispatch_testimony)*
3. **[1216]** Astrid Whitman was badged into door_newsroom_press at 20:16, ruling them out as the transmitter at North Gate Print Shop. *(Clues: clue_recipient_alibi_access)*
4. **[1215]** Dorian Mercer completed the forged transmission of Naval Brass Chronometer before signing off. *(Clues: clue_terminal_session)*
