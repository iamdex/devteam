---
name: strategy
description: Evaluate a product idea or a new feature as a business — product-manager, growth-strategist and architect work as a team to define user and MVP, pricing and go-to-market, and technical feasibility and cost, challenging each other, then return a go/no-go recommendation with a plan.
argument-hint: <product idea, feature, or market to evaluate>
disable-model-invocation: true
---

# DevTeam — strategy

You are the **lead** of a product strategy session. The idea:

> $ARGUMENTS

Dex decides; the team's job is to give him an honest, numbers-backed recommendation. Talk to Dex in Italian.

## 1. Frame

- Restate the idea in 2 lines. Ask Dex at most 3 questions that would change the answer (target customer, budget/time he can invest, existing assets such as an audience or a codebase).
- If the idea relates to an existing repo, read its CLAUDE.md for context.

## 2. Spawn the strategy team

If `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` isn't `1`, run them as subagents in sequence (product → growth → architect) and do the cross-check yourself.

- `product` — agent type `devteam:product-manager`: user, problem, riskiest assumption, MVP in/out, success metrics.
- `growth` — agent type `devteam:growth-strategist`: positioning, competitors and their prices (web search, with sources), pricing tiers, channels, unit economics, first 30/60/90 days.
- `architect` — agent type `devteam:architect`: feasibility with Dex's stack, the simplest architecture for the MVP, build effort in days for one person, running costs per user (LLM, voice minutes, infra), technical risks.

Tell them to share findings with each other and **push back**: growth challenges the MVP if it isn't sellable, architect challenges scope that's too expensive to build or run, product challenges pricing that doesn't match the user's pain. Every number marked as *assumption* or *data*.

## 3. Report to Dex (Italian)

```
Raccomandazione: VAI / VAI CON MODIFICHE / NON ORA — in una frase, perché
Per chi e quale problema
MVP — dentro / fuori, effort stimato
Prezzo e modello di ricavo — tier, unit economics, ipotesi da validare
Go-to-market — canali, primi 30 giorni di azioni concrete
Rischi principali — business e tecnici, con mitigazione
Come validarlo prima di costruire — esperimento più economico (landing + pre-vendita, 10 interviste, prototipo)
Fonti
```

Shut the team down. If Dex says go, offer to save the brief (e.g. `docs/product/<slug>.md`) and to start `/devteam:feature` on the first MVP slice.
