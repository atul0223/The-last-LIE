# App Icon & Splash Screen Visual Specifications

*Theme:* Dark Noir Investigative Aesthetic  
*Color Palette:*
- **Canvas / Background:** `#090D16` (Obsidian Blue-Black)
- **Card Surface:** `#111827` (Charcoal)
- **Accent / Yarn:** `#D97706` (Amber Gold)
- **Evidence Highlight:** `#38BDF8` (Cyan Blue)
- **Contradiction Alert:** `#EF4444` (Crimson)

---

## 1. App Icon Specifications

### A. Universal Master Asset
- **Dimensions:** 1024 x 1024 px PNG
- **Color Space:** sRGB, 8-bit per channel
- **Alpha Channel:** **NO ALPHA / NO TRANSPARENCY** (flat background `#090D16`).
- **Composition:** Centered stylized detective magnifying glass intersecting with an angular geometric line network ("the evidence web"). High-contrast amber silhouette on obsidian field.
- **Location in repo:** `apps/mobile/assets/icon.png`

### B. Android Adaptive Icon (`res/mipmap-*`)
- **Background Layer:** `apps/mobile/assets/adaptive-icon.png`
  - 1024 x 1024 px solid background `#090D16` or subtle radial gradient.
- **Foreground Layer:** 1024 x 1024 px PNG with transparency.
  - Safe zone: Center 66dp diameter circle (approx. 432 x 432 px safe center) containing the main emblem. Outside edge may be masked into circle, squircle, or rounded rect by Android OEM launchers.
- **Monochrome Icon (Android 13+ Themed Icons):**
  - Single-color vector / white silhouette on transparent background (`apps/mobile/assets/monochrome-icon.png`).

---

## 2. Splash Screen Specifications

- **Dimensions:** 1284 x 2778 px PNG (covers full iPhone 16 Pro Max / Samsung Galaxy Ultra display ratio without distortion).
- **Background Color:** `#090D16`.
- **Emblem Size:** Center 256 x 256 px brand monogram / magnifying glass emblem with subtle amber ambient glow.
- **Typography:** Optional understated "THE LAST LIE: INFINITE" in condensed tracking uppercase typography positioned 120px below emblem.
- **Resize Mode:** `contain` (configured in `apps/mobile/app.json`).
- **Location in repo:** `apps/mobile/assets/splash.png`

---

## 3. Configuration Check in `apps/mobile/app.json`

```json
{
  "expo": {
    "name": "THE LAST LIE",
    "slug": "the-last-lie",
    "icon": "./assets/icon.png",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#090D16"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#090D16"
      }
    }
  }
}
```
