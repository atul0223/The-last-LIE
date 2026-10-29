# Case 0003: The Man from Platform 4 — Solution Walkthrough

## 1. Overview of the Mystery

- **Mystery Type:** `hidden_identity`
- **Target Difficulty:** 2 (Intermediate)
- **Setting:** Vesper Central Station (`loc_station`) and The Grand Vesper Hotel (`loc_hotel`), with a 15-minute inter-district travel time.
- **Incident Summary:** At 22:00 on November 4, 2026, the Transit Cipher Ledger (`obj_cipher_ledger`), an encrypted dispatch notebook containing sensitive railway junction codes, was intercepted during a clandestine relay at Vesper Central Station. Intelligence warned that an undercover identity broker known as "The Chameleon" had infiltrated Vesper City using an assumed persona to seize the notebook.

### What Really Happened (Ground Truth Timeline)

- **21:05–21:20 (1265–1280):** Diplomatic attache Irene Frost (`char_irene`) holds the Transit Cipher Ledger under secure deposit in the Grand Vesper Hotel safe before releasing it to scheduled station courier transfer.
- **21:10 (1270):** Station maintenance technician Kendra Pike (`char_kendra`) badges through the concourse gate (`door_station_gate`) on a routine mechanical check.
- **21:15–21:35 (1275–1295):** Irene Frost retreats to her private suite (Suite 402) at the Grand Vesper Hotel (`loc_hotel`). At 21:25 (1285), she scans her keycard into Suite 402 (`door_hotel_suite`).
- **21:20–21:25 (1280–1285):** Visiting antiquarian Lucas Mercer (`char_lucas`)—in reality the undercover broker "The Chameleon"—checks into the Grand Vesper Hotel lobby to establish an alibi, but slips out the side cab stand immediately at 21:25.
- **21:20–21:40 (1280–1300):** Station dispatcher Julian Croft (`char_julian`) receives the sealed courier transfer at Vesper Central Station. At 21:25 (1285), he places the cipher ledger into automated luggage locker #7 for designated pickup.
- **21:25–21:40 (1285–1300):** Lucas travels from the hotel to Vesper Central Station via express cab (15 minutes travel time).
- **21:42–21:58 (1302–1318):** Lucas arrives at Vesper Central Station (`loc_station`).
- **21:45–21:55 (1305–1315):** Platform 4 CCTV records Lucas Mercer standing near the luggage locker bay.
- **21:48 (1308):** Lucas Mercer opens locker #7 and takes the Transit Cipher Ledger.
- **21:55 (1315):** Lucas boards the outbound northern express with the stolen ledger.

### Who Lied and Why

- **Lucas Mercer (`char_lucas`):** Lucas is the sole culprit and sole liar. To hide his presence at the crime scene, he claimed he was lounging in the Grand Vesper Hotel lobby from 21:20 to 21:40 (`[1280, 1300)`).
- **The Decisive Contradiction (`presence.travel`):** Platform 4 CCTV records Lucas at Vesper Central Station starting at 21:45 (`1305`). Because travel between the Grand Vesper Hotel and Vesper Central Station requires a minimum of 15 minutes, Lucas could not have been at the hotel until 21:40 and then appeared at the station at 21:45 (a gap of only 5 minutes). This impossible transit exposes his fabricated alibi and identifies him as "The Chameleon".

---

## 2. Cast of Characters (I–P Names)

1. **Irene Frost (`char_irene`):** Diplomatic Attache. Delivered the ledger to hotel safe custody before retiring to Suite 402.
2. **Julian Croft (`char_julian`):** Station Night Dispatcher. Placed the ledger into station locker storage.
3. **Kendra Pike (`char_kendra`):** Platform Maintenance Technician (Red Herring). Scanned concourse gate during routine patrol.
4. **Lucas Mercer (`char_lucas`):** Visiting Antiquarian / "The Chameleon" (Culprit & Liar). Claimed a hotel lobby alibi while intercepting the ledger at the station.

---

## 3. Step-by-Step Detective Walkthrough

### Step 1: Initial Briefing and Default Evidence

The detective starts with 5 default clues:
1. **`clue_irene_testimony`:** Irene claims she was in her hotel suite from 21:15 to 21:35 reviewing conference papers.
2. **`clue_julian_testimony`:** Julian claims he was in the station freight office from 21:20 to 21:40 logging cargo manifests.
3. **`clue_lucas_testimony`:** Lucas claims he was in the Grand Vesper Hotel lobby from 21:20 to 21:40 having tea before turning in.
4. **`clue_hotel_custody_receipt`:** Hotel safe record confirms Irene Frost held registered custody of the ledger from 21:05 to 21:20.
5. **`clue_platform_maintenance_log` (Red Herring):** Station concourse reader logs Kendra Pike scanning her service pass at 21:10.

### Step 2: Eliminate Decoy 1 via `access.presence`

- **Decoy Hypothesis 1 (`hyp_irene_operative`):** _"Irene Frost used an attache alias to take the ledger during a secret meet at the station."_
  - Claims: Irene was at `loc_station` from 21:20 to 21:35 (`[1280, 1295)`).
- **Investigation:** Inspect Irene's unlocked hotel records.
- **Unlock Clue 6 (`clue_hotel_keycard_log`):** Electronic lock record proves Irene Frost unlocked Suite 402 (`door_hotel_suite` at `loc_hotel`) at **21:25** (`1285`).
- **Contradiction (`access.presence`):** Irene cannot access a hotel door at 21:25 while present at the central station over `[1280, 1295)`.
- **Result:** Decoy Hypothesis 1 is conclusively eliminated.

### Step 3: Eliminate Decoy 2 via `possess.exclusive`

- **Decoy Hypothesis 2 (`hyp_julian_operative`):** _"Julian Croft retained custody of the cipher ledger to sell to foreign syndicates."_
  - Claims: Julian had exclusive possession of `obj_cipher_ledger` from 21:10 to 21:30 (`[1270, 1290)`).
- **Physical Evidence (`clue_hotel_custody_receipt`):** Hotel safe records prove Irene Frost had registered exclusive custody of the ledger from 21:05 to 21:20 (`[1265, 1280)`).
- **Contradiction (`possess.exclusive`):** Both suspects cannot simultaneously possess the ledger during the overlapping interval 21:10–21:20 (`[1270, 1280)`).
- **Result:** Decoy Hypothesis 2 is conclusively eliminated.

### Step 4: Expose Lucas Mercer via `presence.travel`

- **Lucas's Alibi (`clue_lucas_testimony`):** Lucas claims he was at the Grand Vesper Hotel (`loc_hotel`) from 21:20 to 21:40 (`[1280, 1300)`).
- **Unlock Clue 8 (`clue_station_cctv`):** Platform 4 CCTV camera records Lucas Mercer at Vesper Central Station (`loc_station`) from 21:45 to 21:55 (`[1305, 1315)`).
- **The Decisive Travel Contradiction (`presence.travel`):** The minimum transit time between `loc_hotel` and `loc_station` is 15 minutes. The elapsed gap between Lucas's claimed hotel departure at 21:40 and his station appearance at 21:45 is only 5 minutes.
- **Result:** Lucas Mercer's alibi is shattered. He is positively placed at the station platform where the theft occurred.

### Step 5: Deductive Synthesis & Solution

1. Decoy 1 is eliminated by `clue_hotel_keycard_log` (`access.presence`).
2. Decoy 2 is eliminated by `clue_hotel_custody_receipt` (`possess.exclusive`).
3. Lucas Mercer is positively identified at the scene of the crime via `clue_station_cctv`, and his alibi is disproven via `presence.travel`.
4. **Conclusion:** Solution Hypothesis **`hyp_lucas_operative`** (_"Lucas Mercer is 'The Chameleon' who retrieved the ledger at Vesper Central Station."_) is the sole surviving truth.

**Key Evidence Set:** `["clue_hotel_keycard_log", "clue_hotel_custody_receipt", "clue_station_cctv"]`
Satisfies all reachability, uniqueness, positive culprit evidence, and fair-play requirements.
