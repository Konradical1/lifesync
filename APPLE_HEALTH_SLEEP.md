# Apple Health sleep integration

JournalX2 can read sleep start/end times from Apple Health (HealthKit) and use them to create or prefill sleep events.

## Requirements

- **iOS only** (HealthKit is not available on Android; for Android you could use Health Connect later).
- **Development build** – HealthKit uses native modules, so this does **not** work in Expo Go. Use a custom dev client, e.g. `npx expo run:ios` or EAS Build.
- **react-native-health** – Install and link the native module (see below).

## Setup

### 1. Install the package

```bash
npm install react-native-health
cd ios && pod install && cd ..
```

### 2. iOS capability and permissions

1. Open the iOS project in Xcode (`ios/` folder or open from Expo).
2. Select your target → **Signing & Capabilities** → **+ Capability** → add **HealthKit**.
3. In **Info.plist** (or `app.json` → `expo.ios.infoPlist`), add:

   - **NSHealthShareUsageDescription** – e.g. `"JournalX2 uses sleep data from Apple Health to log your sleep times."`
   - **NSHealthUpdateUsageDescription** – e.g. `"JournalX2 can save sleep data to Apple Health."` (optional if you only read)

### 3. Rebuild

After adding the native module and HealthKit capability, create a new development build. Sleep import will only work in that build, not in Expo Go.

## How it works

- **Sleep event format in the app:** Each sleep event has `date` (YYYY-MM-DD), `startTime` and `endTime` (24h, e.g. `"23:00"`, `"07:00"`). Overnight sleep is supported (e.g. start on day 1, end on day 2).
- **HealthKit:** Sleep is returned as one or more samples per night (e.g. INBED, ASLEEP, AWAKE). The app merges all segments for a given night into one block (earliest start → latest end) and converts to one sleep event per night.
- **Import flow:** On the “Log Sleep” screen, “Import from Apple Health” requests HealthKit permission (if needed), fetches sleep samples for the last 7 days, and prefills the form with the most recent night so you can adjust and save.

## Files

- **`src/api/appleHealth.js`** – Optional bridge: only runs when `react-native-health` is installed and the app is on iOS. Exposes `isAppleHealthSleepAvailable()` and `fetchSleepSamplesAsync(startDate, endDate)` returning `{ date, startTime, endTime }[]` in app format.
- **Sleep screen** – Uses this API to show “Import from Apple Health” and prefill start/end times when available.

## Android

Apple Health is iOS-only. For Android you could add a similar flow using **Health Connect** (e.g. `react-native-health-connect` or similar) and a shared “health” API that chooses the right implementation per platform.
