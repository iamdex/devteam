---
name: stack-typescript
description: DevTeam conventions for TypeScript/Node.js backends and shared TypeScript code — project structure, validation, error handling, config, logging, testing. Use when writing or reviewing TypeScript server code or shared types.
---

# TypeScript / Node.js conventions

Project-specific conventions in CLAUDE.md always win over this file.

## Architecture
- Prefer **one linear backend service** over orchestration tools or many microservices. Split only with a concrete scaling or ownership reason.
- Layering: `routes/handlers` (HTTP, parsing) → `services` (business logic, no HTTP types) → `repositories/clients` (DB, third parties). Handlers are thin.
- Shared contracts (request/response schemas, domain types) live in one place and are imported by both server and client in monorepos.

## Types & validation
- `strict: true`, no implicit `any`, `noUncheckedIndexedAccess` if the project uses it.
- Validate all external input with a schema library (zod or the project's choice) and **derive** TypeScript types from schemas (`z.infer`) instead of duplicating them.
- Parse env vars once at startup into a typed config object; crash early on missing required vars.

## Errors
- Domain errors as typed classes or discriminated unions; map them to HTTP status codes in one error-handling middleware.
- Never `catch {}` silently. Re-throw with context or handle explicitly.
- Every outbound `fetch`/SDK call has a timeout (`AbortSignal.timeout(ms)`), and retries only for idempotent operations.

## Async & resources
- No floating promises (`@typescript-eslint/no-floating-promises`). Use `Promise.all` for independent work, bounded concurrency for batches.
- Close DB pools, queues and servers on `SIGTERM` for clean container shutdowns.

## Logging
- Structured logs (pino or the project's logger) with request id and tenant id; no secrets, tokens, full prompts with PII, or payment data.

## Testing
- The project's runner (vitest/jest/node:test). Unit tests for services, integration tests for routes with a real local DB when feasible (Supabase local, Testcontainers) rather than deep mocks.
- Tests are deterministic: fake timers and seeded data, no reliance on network.

## Dependencies
- Before adding a package: is it maintained, how big, does the standard library or an existing dependency already do it? Use the lockfile's package manager consistently (npm/pnpm/yarn/bun — never mix).
