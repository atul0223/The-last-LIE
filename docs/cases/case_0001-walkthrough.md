# Case 0001: The Missing Message — Solution Walkthrough

## 1. Overview of the Crime

At 23:47 on October 29, 2026, an SMS message was sent from Maya Lin's work phone to Arjun Mehta. The message read: _"Still finishing up the schematics in the studio, see you tomorrow."_

Arjun presented this message to investigators to construct a double alibi:

1. It established that Maya was ostensibly still in the 4th-floor design studio at 23:47.
2. It placed Arjun in the server annex at 23:47 as an innocent recipient of the communication.

In reality, Maya had already left the building at 23:41, accidentally leaving her unlocked phone on her drafting desk. Arjun entered the empty studio at 23:45, unlocked Maya's device at 23:47, and sent the forged message to his own handset to fabricate an alibi.

---

## 2. Cast of Characters

- **Maya Lin (`char_maya`):** Lead Designer. Claims she left the studio at 23:40 and forgot her device.
- **Arjun Mehta (`char_arjun`):** Systems Engineer. Claims he received an alibi text from Maya at 23:47.
- **Rhea Vance (`char_rhea`):** Junior Partner. Observed a silhouette in the studio at 23:45.
- **Marcus Kane (`char_marcus`):** Night Security Guard (Red Herring). Patrolled the courtyard at 23:30.

---

## 3. Step-by-Step Detective Walkthrough

### Step 1: Examine the Opening Evidence

- **Clue 1 (Carrier SMS Record):** Confirms an SMS from Maya's phone (`obj_phone_maya`) was delivered to Arjun at 23:47.
- **Clue 2 (Arjun's Testimony):** Arjun claims Maya sent the message herself while working late in the studio.
- **Clue 3 (Maya's Testimony):** Maya claims she departed the building around 23:40 and realized outside that her phone was missing.

### Step 2: Uncovering Physical Timeline Contradictions

- The player inspects Maya's exit route and requests the building access records.
- **Clue 4 (Lobby Keycard Log):** Turnstile log registers Maya's keycard exiting the lobby door (`door_lobby_exit`) at **23:41**.
- **Contradiction:** If Maya exited the lobby at 23:41, she could not have been in the 4th-floor studio at 23:47.
- This **eliminates Decoy Hypothesis 1** (_"Maya sent the message from the studio at 23:47"_).

### Step 3: Inspecting Device Authentication

- With Maya's physical departure proven at 23:41, the message sent at 23:47 must have been dispatched by someone else inside the studio.
- The player inspects the biometric and session logs of the device.
- **Clue 5 (Phone Unlock Log):** The device authentication log reveals that at **23:47**, Maya's phone was unlocked by session credentials belonging to **Arjun Mehta**.
- This **eliminates Decoy Hypothesis 2** (_"Rhea intercepted and sent the message from Maya's phone"_).

### Step 4: Final Deductive Synthesis

1. Maya physically exited at 23:41 (`clue_keycard_exit`).
2. Maya's phone remained in the studio and was operated by Arjun at 23:47 (`clue_device_log`).
3. Arjun sent the message to himself to forge an alibi.
4. **Conclusion:** Arjun Mehta is the culprit. Solution hypothesis: **"Arjun forged the message after Maya left."**

**Key Evidence Pair:** `["clue_keycard_exit", "clue_device_log"]`.
Together, these two clues decisively prove Maya's absence and Arjun's active forgery.
