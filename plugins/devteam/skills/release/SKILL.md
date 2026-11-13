---
name: release
description: Prepare an App Store / Google Play release with the DevTeam — store-release-manager leads readiness, listing and privacy disclosures, mobile/ios engineers fix blockers, growth provides store copy, QA verifies the release build. Ends with a submission checklist Dex executes.
argument-hint: "<app or version, e.g. 'Grimhold 1.2.0 iOS+Android' or 'first release'>"
disable-model-invocation: true
---

# DevTeam — store release

You are the **lead** preparing a store release: `$ARGUMENTS`. Nobody uploads, submits or publishes: the output is a checklist Dex executes. Talk to Dex in Italian.

## 1. Frame

- Identify the app(s), platforms (iOS, macOS, Android), version, whether it's a first release or an update, and the build pipeline (Expo/EAS, Xcode, fastlane). Read CLAUDE.md, `app.json`/`app.config.*`, `eas.json`, Xcode project settings, existing `store/` or `fastlane/` folders.
- Ask Dex only what's missing: target countries, pricing/IAP changes, release date, whether store accounts already exist.

## 2. Team

Spawn only what's needed (as teammates if agent teams are enabled, otherwise as subagents):

- `store` — `devteam:store-release-manager`: owns the readiness checklist, listing pack, privacy disclosures, IAP setup, testing and rollout plan.
- `mobile` — `devteam:mobile-engineer` (Expo) and/or `ios` — `devteam:ios-engineer`: fix the blockers `store` raises in app code/config (version bump, permissions strings, privacy manifest, account deletion, restore purchases…).
- `growth` — `devteam:growth-strategist`: store copy, keywords, screenshot captions — only for first releases or listing refreshes.
- `qa` — `devteam:qa-engineer`: verifies the release candidate on the reviewer-critical flows (first launch, login with demo account, purchase/restore, permissions, offline, crash-free).

Tasks follow the DevTeam format (`Owner:`, `Files:`, `Acceptance:`).

## 3. Report to Dex (Italian)

```
Release <app> <versione> — pronta: ✅ / ⚠️ con riserve / ❌ bloccata
Blocchi risolti / ancora aperti
Checklist di invio (in ordine): comandi o passi esatti per iOS e per Android
Listing: dove sono i testi e gli asset, cosa caricare a mano
Privacy label / Data safety: risposte da inserire
Piano di rilascio: test, rollout graduale, soglie per fermarsi
Rischi di rifiuto e come li abbiamo coperti
```

Shut the team down when done.
