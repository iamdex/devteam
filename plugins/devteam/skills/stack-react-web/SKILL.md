---
name: stack-react-web
description: DevTeam conventions for React web apps and sites — Next.js App Router or Vite SPAs, server vs client components, data fetching, forms, styling, SEO, Core Web Vitals, accessibility and testing. Use when writing or reviewing web frontend code or landing pages.
---

# React web conventions

Check the docs for the framework version in `package.json` (Next.js changes its defaults across majors). Project conventions in CLAUDE.md win.

## Structure
- Next.js App Router: server components by default, `"use client"` only for interactive leaves; data fetching on the server; route handlers or server actions only where the project already uses them.
- Vite SPA: routing per the project's router; code-split routes with lazy imports.
- Components small and composable; reuse the design system (shadcn/ui, Tailwind tokens, …) before adding new primitives.

## Data
- Server state with the project's library (TanStack Query, SWR, server components); loading/empty/error/success for every async view; optimistic updates with rollback.
- Forms: schema validation shared with the backend (zod), accessible error messages, disabled submit while pending, idempotent submits.
- Environment: only `NEXT_PUBLIC_*`/`VITE_*` values reach the browser — and they are public.

## SEO & marketing pages
- `metadata` (title, description, Open Graph, Twitter), canonical URL, `sitemap.xml`, `robots.txt`, structured data (Organization, Product, FAQ) where meaningful, `lang` attribute correct (`it` for Italian sites).
- Content and headings from `growth-strategist`; one primary CTA per section; analytics events named per the product brief.

## Performance (acceptance criteria for public pages)
- LCP: optimized hero image (`next/image` or responsive `srcset`, priority), fonts with `display: swap` and subsetting.
- CLS: reserve space for images/embeds; no layout shift from late banners.
- INP: avoid long tasks on interaction; defer non-critical third-party scripts.
- Check bundle size impact of every new dependency.

## Accessibility
- Semantic HTML, landmark regions, labels, keyboard navigation and visible focus, contrast AA, `prefers-reduced-motion`, accessible cookie banner.

## Testing
- Vitest/Jest + Testing Library for components with logic; Playwright for critical flows (signup, checkout, booking); Lighthouse/axe checks on public pages.
