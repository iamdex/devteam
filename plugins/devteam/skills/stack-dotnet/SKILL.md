---
name: stack-dotnet
description: DevTeam conventions for C#/.NET services — project layout, dependency injection, validation, EF Core, error handling, async, logging and testing. Use when writing or reviewing .NET code.
---

# .NET conventions

Project-specific conventions in CLAUDE.md always win over this file. Match the target framework and language version already in the `.csproj`.

## Structure
- Respect the existing solution layout (e.g. Api / Application / Domain / Infrastructure, or vertical slices). Don't introduce a new architectural style in one feature.
- Nullable reference types enabled; treat warnings as seriously as errors in new code.
- Configuration through `IOptions<T>` bound from appsettings/env, validated on start (`ValidateDataAnnotations().ValidateOnStart()`).

## API
- Minimal APIs or controllers — whichever the project uses. Return `ProblemDetails` for errors with correct status codes.
- Validate requests (FluentValidation or data annotations, per project) at the boundary.
- Authorization via policies; resource-level checks for tenant ownership inside handlers/services.

## Async
- `async` all the way; pass `CancellationToken` through every async call; never `.Result`/`.Wait()`.
- `HttpClient` via `IHttpClientFactory`, with timeouts and resilience (Polly / `Microsoft.Extensions.Http.Resilience`) only for idempotent calls.

## Data (EF Core)
- Migrations generated with `dotnet ef migrations add`, reviewed by reading the generated SQL (`dotnet ef migrations script`) before applying.
- `AsNoTracking()` for read-only queries; project to DTOs; avoid N+1 (check generated SQL for hot paths).
- Never `EnsureDeleted`/`EnsureCreated` outside tests.

## Logging
- `ILogger<T>` with message templates (`"Order {OrderId} failed"`), not string interpolation. No secrets or PII.

## Testing
- xUnit/NUnit per project. Unit tests for domain logic, `WebApplicationFactory` integration tests for endpoints, Testcontainers for a real database when feasible.
- `dotnet build -warnaserror` (if configured) and `dotnet test` must pass.
