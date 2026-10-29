# EAS Preview Build & Installation Guide

This guide details how to build and distribute internal EAS preview builds of *The Last Lie* to playtesters' physical iOS and Android devices without requiring app store publication.

---

## 1. Prerequisites

1. **Expo CLI & EAS CLI**:
   ```bash
   pnpm add -g eas-cli
   eas login
   ```
2. **Project Setup**:
   Ensure `eas.json` is configured in `apps/mobile/eas.json`.

---

## 2. Configuration (`eas.json`)

The preview build profile builds internal standalone binaries:

```json
{
  "cli": {
    "version": ">= 12.0.0"
  },
  "build": {
    "preview": {
      "distribution": "internal",
      "channel": "preview",
      "android": {
        "buildType": "apk"
      },
      "ios": {
        "simulator": false
      }
    }
  }
}
```

---

## 3. Building the Preview Packages

### Android (.apk Direct Install)
Run from `apps/mobile`:
```bash
eas build --profile preview --platform android
```
- EAS outputs an `.apk` download URL when the build completes.
- Testers can download the `.apk` directly to their Android phone via browser.

### iOS (Internal / Ad-Hoc / TestFlight)
1. **Register Tester Devices**:
   ```bash
   eas device:create
   ```
   (Testers open the registration link on their iPhone to add their device UDID to the Apple Developer account).
2. **Run iOS Build**:
   ```bash
   eas build --profile preview --platform ios
   ```
- EAS builds an `.ipa` provisioned for all registered devices.
- Testers install it directly via the EAS build URL opened in Safari.

---

## 4. Distribution to Playtesters

1. **Direct QR Code / Download Link**:
   - Provide the EAS build URL (e.g. `https://expo.dev/accounts/.../builds/...`).
   - The tester scans the QR code or clicks the download link.
2. **Android Installation Instructions**:
   - Tap "Download anyway" if warned about downloading from outside Google Play.
   - Tap "Open" -> "Install".
   - If prompted: "Allow installation from unknown sources for this browser".
3. **iOS Installation Instructions**:
   - Open link in Safari.
   - Tap "Install".
   - If prompted: Go to *Settings > General > VPN & Device Management* and tap *Trust Developer Certificate*.

---

## 5. Web Fallback (Immediate Zero-Install Testing)

If a tester's device has strict IT/MDM management or provisioning delays:
```bash
npx expo export --platform web --output-dir dist-web
npx serve dist-web
```
Provide the local tunnel or deployed static URL for instant web-browser playtesting.
