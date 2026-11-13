---
name: stack-react-native
description: DevTeam conventions for React Native with Expo and for React web UIs — navigation, state, data fetching, performance (lists, animations, games), accessibility, and Expo build/config. Use when writing or reviewing client UI code.
---

# React Native / Expo & React conventions

Respect the Expo SDK and React versions already in the project; check the Expo docs for the installed SDK before using an API. Project conventions in CLAUDE.md win.

## Structure
- Follow the existing router (Expo Router file-based routes or React Navigation). Screens thin; logic in hooks; reusable UI in components.
- Server state with the project's data layer (TanStack Query, SWR, Supabase client hooks). Don't copy server data into global stores. Global client state (Zustand/Redux/context) only for truly global UI state.

## Data & states
- Every async view handles loading, empty, error (with retry) and success.
- Optimistic updates only with rollback on error.
- Types for API data come from shared contracts/generated types.

## Performance
- Lists: `FlatList`/`FlashList` with stable `keyExtractor`, `getItemLayout` when sizes are fixed; never `.map()` long lists inside a `ScrollView`.
- Animations & gestures: Reanimated + Gesture Handler on the UI thread. For game loops, keep per-frame work off the JS thread where possible and avoid React state updates every frame (use shared values; consider Skia for heavy drawing).
- Images: correct sizes, caching (`expo-image`), no huge local assets.
- Memoize (`memo`, `useMemo`, `useCallback`) where profiling or obvious hot paths justify it — not everywhere.

## Platform & builds
- Prefer Expo modules; anything needing custom native code requires a development build — say so in your report.
- Changes to `app.json`/`app.config.*`, config plugins, permissions, bundle ids or EAS config are escalated to the lead (they affect store builds).
- Test on both iOS and Android behaviour where it differs (keyboard, safe areas, back button, permissions).

## Accessibility & UX
- `accessibilityLabel`, `accessibilityRole`, hit targets ≥ 44pt, dynamic font sizes respected, sufficient contrast.
- Web: semantic HTML, keyboard navigation, visible focus.

## Security
- Only public keys in the client (e.g. Supabase anon key). Tokens in `expo-secure-store`, not AsyncStorage. Never rely on client checks for authorization.

## Testing
- Jest + React Native Testing Library for component logic; Maestro/Detox (or Playwright for web) for critical end-to-end flows if the project has them.
