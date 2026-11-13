---
name: stack-expo
description: DevTeam conventions for React Native apps built with Expo — SDK versioning, Expo Router, development builds and config plugins, EAS Build/Submit/Update, performance for lists, animations and 2D games, offline, push, in-app purchases, accessibility and testing. Use when writing or reviewing Expo / React Native code.
---

# Expo / React Native conventions

The Expo SDK version in `package.json` decides which APIs exist. Check `https://docs.expo.dev/llms.txt` (then the specific page) for that SDK before using an API. Project conventions in CLAUDE.md win.

## Dependencies & SDK
- `npx expo install <pkg>` (not plain npm/pnpm add) so native packages match the SDK; `npx expo-doctor` after changes.
- SDK upgrades are their own task: follow the official upgrade guide for each version step, read the changelog, regenerate native projects if the app uses CNG (`npx expo prebuild --clean`), test on both platforms.
- Prefer Expo SDK modules; third-party native libraries must support the project's architecture (New Architecture status) — check before adding.

## Project structure
- Expo Router: routes in `app/`, layouts for stacks/tabs, typed routes if enabled; screens thin, logic in hooks, UI in components.
- Server state with TanStack Query / Supabase client hooks; global client state (Zustand/context) only for real global UI state.
- Continuous Native Generation: don't hand-edit `ios/`/`android/` if they're generated — use config plugins (`app.config.ts`).

## Builds & releases (EAS)
- `eas.json` profiles: `development` (dev client), `preview` (internal distribution), `production`.
- Versioning: app `version` for users; build numbers via remote versioning or `autoIncrement`.
- EAS Update: channels mapped to build profiles, `runtimeVersion` policy (e.g. `fingerprint`/`appVersion`) so an OTA update never reaches a binary with different native code. Production updates and `eas submit` are Dex's actions.
- Secrets as EAS environment variables, never in `app.config` committed values (only public `EXPO_PUBLIC_*` values reach the client — and they are public).

## Performance
- Lists: FlashList/FlatList with stable keys; never map long lists in a ScrollView.
- Animations/gestures: Reanimated + Gesture Handler (UI thread). Games: game state in shared values or a plain game loop object, render with Skia for many sprites, avoid React re-renders per frame, preload audio/images, test on low-end Android.
- `expo-image` with caching; correct image sizes; lazy-load heavy screens.
- Startup: keep the splash until fonts/critical data are ready (`expo-splash-screen`), avoid heavy work at import time.

## Device features
- Permissions: request in context with a pre-prompt explaining why; handle "denied" and "limited" states.
- Push: `expo-notifications`, store tokens server-side per device, handle token refresh and opt-out.
- Offline: cache server state, queue writes, show sync status.
- Purchases: the project's IAP library (RevenueCat or similar); entitlements validated server-side; restore purchases button.
- Secure storage: `expo-secure-store` for tokens; never AsyncStorage for secrets.

## UX & accessibility
- Safe areas, keyboard avoidance, Android back behaviour, dark mode, `accessibilityLabel`/`accessibilityRole`, hit targets ≥ 44pt, font scaling respected.

## Testing
- Jest (`jest-expo`) + React Native Testing Library for logic-heavy components; Maestro for critical end-to-end flows; test on a real Android device before release.
