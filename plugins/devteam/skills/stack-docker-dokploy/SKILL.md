---
name: stack-docker-dokploy
description: DevTeam conventions for Docker images, docker compose, Dokploy deployments on a VPS (Traefik, domains, env, volumes), GitHub Actions CI, backups and server hygiene. Use when writing or reviewing Dockerfiles, compose files, CI workflows or deployment config.
---

# Docker / Dokploy / CI conventions

Check the Dokploy docs for the installed version before relying on a specific UI option or API. Project conventions in CLAUDE.md win.

## Dockerfile
- Multi-stage: `deps` → `build` → `runtime`. Pin base images to a specific version tag (e.g. `node:22-slim`), optionally by digest.
- Install from the lockfile (`npm ci`, `pnpm install --frozen-lockfile`, `dotnet restore --locked-mode` when configured).
- Run as a non-root user; `HEALTHCHECK` or a healthcheck in compose; listen on `0.0.0.0` and the port from env.
- `.dockerignore` excludes `.git`, `node_modules`, `.env*`, build outputs, tests if not needed.
- Handle `SIGTERM` (use `node` directly or `tini`, not `npm start`, as PID 1).

## docker compose
- One compose file per environment pattern; services reference env vars, never inline secrets.
- Named volumes for persistent data; document what each volume holds and how it's backed up.
- `restart: unless-stopped`, resource limits for noisy services, explicit internal networks.

## Dokploy
- Applications: build from the repo (Dockerfile or Nixpacks per project) or from an image tag; compose deployments for multi-service stacks.
- Domains and TLS via Dokploy's Traefik integration; don't hand-edit Traefik config unless necessary and documented.
- Environment variables set in Dokploy, mirrored (names only, with examples) in `.env.example`.
- Every deployable change must have a rollback path: redeploy previous image/commit; DB migrations backward compatible with the previous release.
- Changes on the server, in Dokploy, DNS or registries are performed by Dex — provide a precise runbook.

## CI (GitHub Actions)
- On PR: install with cache → typecheck → lint → test → build (and `docker build` if a Dockerfile changed).
- Pin third-party actions to a version (or SHA for sensitive workflows); least-privilege `permissions:`; secrets only in environment-scoped secrets.
- Deploy jobs only from `main`/tags, with manual approval for production when the repo supports environments.

## Server hygiene & backups
- SSH keys only, firewall allowing only 22/80/443 (and what's strictly needed), automatic security updates.
- Database backups scheduled with retention, copied off the server; restore procedure written and tested.
- Disk usage monitored (images and logs grow); prune only dangling images in automation, never volumes.
