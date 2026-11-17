# DevTeam HUD

Una mod per Claude Code che ti fa **vedere il DevTeam mentre lavora** e ti chiama al momento giusto. Funziona nel terminale, nell'app desktop, in VS Code e nell'app Claude per iPad e telefono (via Remote Control). Si affianca al plugin [`devteam`](../devteam): da sola non aggiunge agenti.

*English: a mod for Claude Code that shows the DevTeam at work — team panel, plan-approval and blocker row, visible quality gates and guardrail, cost in the status line, `/devteam-status`, optional DevTeam look. Set `language` to `en` for English.*

## Cosa fa

1. **Pannello del team.** Una riga per teammate: colore del ruolo, modello, stato (al lavoro, in attesa, finito…), cosa sta facendo, token. Sotto: task in corso, ultimi messaggi tra agenti (`[CONTRACT]`, `[QUESTION]`, `[BLOCKER]`, `[HANDOFF]`), ultimi gate e comandi bloccati. Si apre da solo quando parte un team (se lo schermo lo mostra come barra laterale), oppure con `/devteam-hud`.
2. **"Tocca a te" sopra il prompt.** Quando il lead aspetta l'ok sul piano compaiono **Approva**, **Modifica** e **Più tardi**. Quando un teammate manda un `[BLOCKER]` compaiono il messaggio, **Rispondi** e **Visto**.
3. **Gate e guardrail visibili.** Sotto ogni task chiuso dal gate di qualità compare una scheda con ✓/✕ per ogni check e le ultime righe dell'errore. Sotto ogni comando bloccato dal guardrail compaiono il motivo e **Copia comando**, se vuoi eseguirlo tu.
4. **Costi in status line.** `DevTeam · 3 al lavoro / 4 teammate · ~$1.80 (stima)`, con un avviso ⚠ e una notifica quando i teammate attivi superano la soglia. I costi sono stime del client: il dato vero è quello di fatturazione.
5. **`/devteam-status`.** Un riepilogo in testo di team, approvazione in sospeso, blocker, task, gate, comandi bloccati e costo.
6. **Tema DevTeam** (facoltativo). I colori del sito DevTeam nelle app desktop e mobile. Il terminale mantiene i suoi.

## Installazione

Nel terminale, dopo aver aggiunto il marketplace del DevTeam:

```
/plugin install devteam-hud@espertini-devteam
```

Serve una versione di Claude Code che supporti le mod con moduli di hook (testata con 2.1.326).

## Opzioni

Da `/config`, alla voce del plugin `devteam-hud`:

| Opzione | Default | Cosa fa |
| --- | --- | --- |
| `language` | `it` | lingua di pannello, riga e schede (`it` / `en`) |
| `autoOpen` | `true` | apre il pannello quando compaiono i teammate |
| `costWarnAt` | `5` | sopra quanti teammate attivi avvisare |
| `theme` | `false` | applica il tema DevTeam nelle app desktop e mobile |

## Come funziona

- Il pannello legge i teammate da `$.agent.list()` ogni 2 secondi. Mostra i teammate degli agent teams e, nelle sessioni cloud, i subagent `devteam:*`.
- I messaggi arrivano dall'evento `session.send` (SendMessage). Un `[BLOCKER]` resta aperto finché non premi **Visto** o finché lo stesso teammate non scrive di nuovo.
- Gli esiti del gate si leggono dall'hook `TaskCompleted` del plugin `devteam`: la mod si mette sopra e ne legge il risultato, senza rieseguire i check.
- La richiesta di approvazione si riconosce dalla riga `⏸ In attesa della tua approvazione`, con cui le skill `feature` e `debug` chiudono il piano. Dentro un flusso DevTeam basta anche un "Procedo?".

## Sviluppo

```
claude plugin validate plugins/devteam-hud
claude plugin test plugins/devteam-hud
```
