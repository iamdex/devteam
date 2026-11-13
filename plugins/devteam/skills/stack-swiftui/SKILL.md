---
name: stack-swiftui
description: DevTeam conventions for Swift and SwiftUI apps on iOS, iPadOS and macOS — project setup, state with Observation, navigation, Swift concurrency, persistence and document-based apps, StoreKit 2, testing and App Store/notarization prep, plus Swift modules for Expo apps. Use when writing or reviewing Swift code.
---

# Swift / SwiftUI conventions

Deployment targets and Swift language mode in the project decide which APIs are available. Check Apple's documentation for the target OS version before using a SwiftUI or framework API. Project conventions in CLAUDE.md win.

## Project
- Xcode project or Swift Package; shared code in local packages when the app has multiple targets (app, widget, extension, macOS/iOS).
- Strict concurrency per the project setting; fix warnings in new code, don't silence them with `@unchecked Sendable` without a comment explaining why it's safe.
- SwiftLint/SwiftFormat if configured; follow their rules.

## State & architecture
- `@Observable` models (Observation framework) for app/feature state on supported OS versions; `@State` for view-local state; dependencies via `@Environment` or initializer injection.
- Views are a function of state; side effects in models/services; no networking in `body`.
- Navigation: `NavigationStack` with typed paths on iPhone, `NavigationSplitView` for iPad/Mac sidebars; deep links mapped to navigation paths.

## Concurrency
- `async/await` and structured concurrency; `.task {}` for view-scoped work (auto-cancelled); `@MainActor` for UI-facing models; actors for shared mutable state; no `DispatchQueue.main.sync`.

## Persistence & files
- SwiftData or Core Data per project, with versioned schemas/migrations.
- Document/file-as-source-of-truth apps (e.g. markdown notes on disk): `FileDocument`/`ReferenceFileDocument` or explicit file I/O with `NSFileCoordinator`/`NSFilePresenter`, watch for external changes, atomic writes, conflict handling, security-scoped bookmarks to remember user-picked folders in sandboxed macOS apps, iCloud Drive via ubiquity containers only if needed.

## macOS specifics
- Menu `Commands` with keyboard shortcuts, `Settings` scene, multiple windows (`WindowGroup`, `openWindow`), toolbar customization, drag & drop, sandbox entitlements kept minimal, Hardened Runtime and notarization for distribution outside the App Store.

## Monetization
- StoreKit 2: products from App Store Connect, `Product.purchase()`, verify `VerificationResult`, listen to `Transaction.updates`, `AppStore.sync()` for restore, StoreKit configuration file for local testing.

## Security
- Keychain for tokens/secrets; no secrets embedded in the app; ATS respected; privacy manifest (`PrivacyInfo.xcprivacy`) and usage descriptions for every permission.

## Expo native modules
- Expo Modules API in Swift (`Module` definition with `Function`/`AsyncFunction`/`Events`); keep the JS contract typed and agreed with `mobile-engineer`; requires a development build.

## Testing & release
- Swift Testing or XCTest for models/services, UI tests for critical flows; run `xcodebuild test -scheme <scheme> -destination <...>` or `swift test`.
- Release prep: version/build numbers, archive scheme, signing settings, App Store metadata checklist — submission is Dex's action.
