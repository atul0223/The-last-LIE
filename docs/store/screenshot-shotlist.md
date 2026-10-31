# App Store & Google Play Screenshot Shot-List & Composition Guide

*Target Devices:*
- **iOS 6.7" Super Retina:** 1290 x 2796 px (iPhone 15/16 Pro Max)
- **iOS 6.5" Retina:** 1242 x 2688 px (iPhone 11 Pro Max / XS Max)
- **iOS 12.9" iPad Pro:** 2048 x 2732 px (6th Generation)
- **Android Phone:** 1080 x 2400 px (9:20 or 9:16 aspect ratio)

---

## Screenshot Matrix (6 Key Slides)

### Slide 1: The Evidence Board (Hero Image)
- **In-App Screen:** `apps/mobile/app/case/[sessionId].tsx` (Board Slot)
- **Scene Setup:** An active case (`case_0001` or `case_0003`) with 5 evidence cards arranged on the dark grid canvas, connected by an amber/gold contradiction yarn line.
- **Top Caption:** **CONNECT THE EVIDENCE**
- **Sub-caption:** Link contradictory statements and access logs on your interactive board.
- **Visual Focus:** Pannable card nodes, pinch-to-zoom indicator, highlighted glowing contradiction line between two conflicting statements.

### Slide 2: The Briefing & Suspect Interrogation
- **In-App Screen:** `apps/mobile/app/case/[sessionId].tsx` (Briefing & Evidence Slot)
- **Scene Setup:** High-contrast noir dossier showing case title, mystery overview, suspect portraits, and locked/unlocked testimony cards.
- **Top Caption:** **EXAMINE WITNESS STATEMENTS**
- **Sub-caption:** Reconstruct timelines and question every suspect's alibi.
- **Visual Focus:** Clean typography, suspect badges, unread clue status badges.

### Slide 3: Theory Submission & Deductive Accusation
- **In-App Screen:** `apps/mobile/app/case/[sessionId].tsx` (Theory Slot)
- **Scene Setup:** The hypothesis selection sheet with 3 competing hypotheses, selected culprit card, and pinned supporting evidence badges.
- **Top Caption:** **CONSTRUCT YOUR THEORY**
- **Sub-caption:** Choose your suspect and back up your claim with bulletproof proof.
- **Visual Focus:** Big amber "SUBMIT DEDUCTION" CTA, clean hypothesis selection cards.

### Slide 4: The Reveal Breakdown & Fair-Play Verdict
- **In-App Screen:** `apps/mobile/app/case/[sessionId].tsx` (Reveal Slot)
- **Scene Setup:** Master score card showing 100/100 Perfect Deduction, timeline reconstruct beats, and XP mastery progress.
- **Top Caption:** **DISCOVER THE TRUTH**
- **Sub-caption:** Chronological explanation beats reveal exactly how the lie was exposed.
- **Visual Focus:** Point breakdown, link evaluation checks, "Case Solved" insignia.

### Slide 5: The Conspiracy Map
- **In-App Screen:** `apps/mobile/app/(tabs)/progress.tsx` (Conspiracy Map Tab)
- **Scene Setup:** 2D Skia canvas showing connected circular nodes (characters, organizations, operations) of *The Quiet* with glowing edges.
- **Top Caption:** **UNCOVER THE CONSPIRACY**
- **Sub-caption:** Connect clues across cases to expose the shadow cabal behind the city.
- **Visual Focus:** Interactive force-directed network graph, node dossier preview sheet.

### Slide 6: Friend Challenges & Daily Streaks
- **In-App Screen:** `apps/mobile/app/(tabs)/challenges.tsx` + `ResultCard`
- **Scene Setup:** Two investigator cards side-by-side comparing solve times, clue efficiency, and deduction accuracy with a 7-day streak badge.
- **Top Caption:** **OUTSMART YOUR FRIENDS**
- **Sub-caption:** Share spoiler-free challenge links and compare deductive speed.
- **Visual Focus:** Sleek shareable result card with QR code and HMAC challenge code.
