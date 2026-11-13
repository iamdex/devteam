# DevTeam — un team di sviluppo senior fatto di agenti Claude Code

Plugin per Claude Code che ti dà un team di agenti specializzati, ognuno senior nel proprio ruolo, che **parlano tra loro** tramite gli *agent teams* di Claude Code (mailbox + task list condivisa). La sessione principale fa da **Tech Lead**, tu sei il product owner: approvi il piano, il team lo esegue, QA e security verificano.

Il team è generico e riusabile su tutti i progetti. Il contesto specifico di ogni repo vive nel suo `CLAUDE.md` (sezione `## DevTeam`) e in `.claude/devteam.json`.

## Il team

| Teammate | Agente | Modello | Responsabilità unica |
| --- | --- | --- | --- |
| *lead* | sessione principale | quello che usi (consigliato Opus) | coordina, ti chiede l'ok, sintetizza |
| `product` | `devteam:product-manager` | Opus | utente e problema, MVP, user story con criteri di accettazione, flusso UX, metriche |
| `growth` | `devteam:growth-strategist` | Opus | posizionamento, prezzi, go-to-market, funnel, copy, vendita alle PMI, ASO |
| `architect` | `devteam:architect` | Opus | design, contratti tra layer, task con ownership dei file |
| `backend` | `devteam:backend-engineer` | Sonnet | API, logica, integrazioni, voice agent (TS/Node, .NET) |
| `data` | `devteam:data-engineer` | Sonnet | schema, migrazioni, RLS, pgvector, performance query |
| `frontend` | `devteam:frontend-engineer` | Sonnet | web: React, Next.js, landing, dashboard, SEO |
| `mobile` | `devteam:mobile-engineer` | Sonnet | Expo/React Native: app e giochi, EAS, push, acquisti in-app |
| `ios` | `devteam:ios-engineer` | Sonnet | Swift/SwiftUI nativo iOS e macOS, StoreKit 2, moduli nativi per Expo |
| `devops` | `devteam:devops-engineer` | Sonnet | Docker, Dokploy, CI, env, backup — prepara, non esegue in prod |
| `store` | `devteam:store-release-manager` | Sonnet | App Store Connect e Play Console: listing, privacy label/Data safety, IAP, TestFlight/track di test, review e rifiuti, rollout |
| `qa` | `devteam:qa-engineer` | Opus | test, edge case, verdetto PASS/FAIL con evidenze |
| `security` | `devteam:security-reviewer` | Opus | review di sicurezza read-only (anche OWASP LLM) |
| `claude` | `devteam:claude-platform-specialist` | Sonnet | Claude API, Agent SDK, MCP, Claude Code — verifica sempre sulla doc attuale |

Il modello di ogni ruolo è nel frontmatter del file in `plugins/devteam/agents/` (`model:`): cambialo lì, oppure chiedi al lead un modello specifico quando lancia il team.

## Comandi

| Comando | Cosa fa |
| --- | --- |
| `/devteam:setup` | una volta per macchina: abilita gli agent teams, display mode, permessi sicuri |
| `/devteam:onboard` | una volta per progetto: analizza il repo e scrive la sezione `## DevTeam` in `CLAUDE.md` + `.claude/devteam.json` |
| `/devteam:feature <descrizione>` | il flusso completo: design → **tua approvazione** → build in parallelo → QA/security → riepilogo |
| `/devteam:review [branch\|PR]` | review parallela (security + QA + architettura) con verifica incrociata dei finding |
| `/devteam:debug <bug>` | indagine a ipotesi concorrenti: ogni investigatore prova a smontare le teorie degli altri |
| `/devteam:release <app versione>` | prepara il rilascio sugli store: readiness, listing, privacy, test, rollout → checklist di invio per te |
| `/devteam:strategy <idea>` | product + growth + architect valutano un'idea: MVP, prezzo, go-to-market, fattibilità e costi → vai / non ora |

Gli agenti si possono usare anche da soli, come subagent normali: "usa devteam:security-reviewer per controllare src/auth".

## Installazione

1. Pubblica questo repo su GitHub (privato va bene), poi in Claude Code:
   ```
   /plugin marketplace add <tuo-utente>/devteam
   /plugin install devteam@espertini-devteam
   ```
   In alternativa, da una cartella locale: `/plugin marketplace add /percorso/devteam`.
2. Lancia `/devteam:setup` e **riavvia Claude Code**. Gli agent teams sono sperimentali e disattivati di default: il setup aggiunge `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` al tuo `~/.claude/settings.json` (un plugin non può impostarlo da solo).
3. In ogni progetto: `/devteam:onboard`, controlla i due file generati e committali.

Requisiti: Claude Code recente (agent teams da v2.1.32; testato con 2.1.325), `jq` oppure `python3` per gli hook, `tmux` solo se vuoi i pannelli separati.

## Come lavora (`/devteam:feature`)

1. **Capire e dimensionare** — se il lavoro è piccolo il lead te lo dice e lo fa da solo: un team costa più token. Se la richiesta è più un'idea che una specifica, `product` scrive prima il brief con i criteri di accettazione.
2. **Design** — `architect` produce approccio, contratti (API, tipi, schema, env) e task con file assegnati.
3. **Approvazione** — il lead ti presenta piano, team, task, rischi. **Non parte niente senza il tuo ok.**
4. **Build** — i teammate lavorano in parallelo, si scambiano `[CONTRACT]`, `[QUESTION]`, `[BLOCKER]`, `[HANDOFF]`; `qa` scrive i test sui contratti mentre gli altri implementano.
5. **Verifica** — verdetto QA mappato sui criteri di accettazione; security review se si tocca auth, dati, pagamenti, LLM, infra.
6. **Riepilogo** — cosa è stato fatto, file, comandi eseguiti, punti aperti, commit proposto. Commit, push, deploy e migrazioni remote restano a te.

Puoi parlare con qualsiasi teammate direttamente: ↑/↓ nel pannello agenti, Invio per aprirlo, Ctrl+T per la task list.

## Gate di qualità e guardrail (hook)

- **TaskCreated** — dentro un team, ogni task deve avere `Owner:`, `Files:` e `Acceptance:` nella descrizione (i task di review/plan/research solo `Owner:`). È ciò che evita due agenti sullo stesso file.
- **TaskCompleted** — prima che un task di implementazione venga chiuso, esegue i `checks` di `.claude/devteam.json` (typecheck, lint, unit test). Se falliscono, il task resta aperto e l'agente riceve l'output dell'errore.
- **PreToolUse (Bash)** — blocca comandi irreversibili o da produzione e chiede di passare da te: force push, `git reset --hard`, `git clean -f`, `git stash`, `git checkout -- .` (cancellerebbero il lavoro non committato degli altri teammate), `rm -rf` su root/home/wildcard, `supabase db push`, reset di DB remoti, `DROP DATABASE`, cancellazione volumi Docker, `ssh`/`scp`/`rsync`, `npm publish`, `eas submit`, `fastlane deliver`/`pilot`/`supply`, upload con `xcrun altool`.

Il guardrail vale per tutte le sessioni in cui il plugin è attivo. Si disattiva per progetto con `"guard": false` in `.claude/devteam.json`, o per sessione con la variabile `DEVTEAM_GUARD=0`.

### `.claude/devteam.json`

```json
{
  "gateTasks": true,
  "requireTaskOwnership": true,
  "checkTimeoutSeconds": 600,
  "skipGatePattern": "^(review|plan|design|research|investigate|analy[sz]e|verify|document|explore)\\b",
  "checks": [
    { "name": "typecheck", "run": "pnpm typecheck" },
    { "name": "lint", "run": "pnpm lint" },
    { "name": "unit tests", "run": "pnpm test" }
  ]
}
```

Nel gate metti solo controlli veloci e affidabili; i test e2e li lancia `qa`. Se il progetto è "rosso" in partenza, il gate bloccherà ogni task: sistemalo prima o metti `"gateTasks": false` temporaneamente.

## Costi e limiti da sapere

- Ogni teammate è una sessione Claude completa: i token crescono con il numero di teammate. 3–5 teammate per feature è il punto giusto.
- Gli agent teams sono **sperimentali**: `/resume` non ripristina i teammate in-process, lo stato dei task a volte resta indietro, un solo team per sessione, i teammate non possono creare altri teammate.
- Funzionano solo in sessioni **interattive** (non con `claude -p` / Agent SDK). Per un team autonomo sul server servirà un'architettura diversa (v2).
- Non tutti i ruoli servono sempre: il lead attiva solo quelli con un task (di solito 3–5). `growth` entra nelle feature solo se c'è un lato commerciale (copy, pricing, store).
- I teammate non vedono la conversazione del lead: per questo il lead scrive brief completi e il contesto stabile sta in `CLAUDE.md`.
- Mentre gli agent teams sono attivi, i subagent a cui Claude dà un nome partono come teammate.

## Struttura del repo

```
.claude-plugin/marketplace.json     marketplace "espertini-devteam"
plugins/devteam/
  .claude-plugin/plugin.json
  agents/        13 ruoli senior (prompt, modello, tool)
  skills/        comandi (feature, review, debug, strategy, release, onboard, setup)
                 + conoscenza (definition-of-done, code-review-checklist,
                   stack-typescript, stack-dotnet, stack-supabase,
                   stack-react-web, stack-expo, stack-swiftui,
                   stack-voice-agents, stack-docker-dokploy)
  hooks/hooks.json
  scripts/       hook (bash + jq/python3/node)
  templates/     CLAUDE.devteam.md, devteam.json
tests/hooks.sh   test degli hook
```

## Estendere

- **Nuovo ruolo**: aggiungi `plugins/devteam/agents/<ruolo>.md` copiando la sezione "Team protocol" e aggiungilo alla tabella nella skill `feature`.
- **Nuove convenzioni di stack**: una skill `skills/stack-<nome>/SKILL.md` con una `description` precisa su quando usarla.
- Dopo una modifica: `claude plugin validate ./plugins/devteam`, `bash tests/hooks.sh`, alza `version` in `plugin.json` e fai `/plugin update`.
