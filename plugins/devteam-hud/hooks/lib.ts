// Pure helpers for devteam-hud: roles, parsing, strings. No `$` in here, so the
// tests can call them directly.
import type { GateResult, MessageTag, TeamMember } from '../types'

// ---------------------------------------------------------------- roles

export type Role = { key: string; color: string }

/** The 13 DevTeam roles, the colors of their agent frontmatter (as the site draws them). */
export const ROLES: Record<string, Role> = {
  product: { key: 'product', color: '#a78bfa' },
  growth: { key: 'growth', color: '#fb923c' },
  architect: { key: 'architect', color: '#a78bfa' },
  backend: { key: 'backend', color: '#60a5fa' },
  data: { key: 'data', color: '#22d3ee' },
  frontend: { key: 'frontend', color: '#4ade80' },
  mobile: { key: 'mobile', color: '#4ade80' },
  ios: { key: 'ios', color: '#60a5fa' },
  devops: { key: 'devops', color: '#fb923c' },
  store: { key: 'store', color: '#22d3ee' },
  qa: { key: 'qa', color: '#facc15' },
  security: { key: 'security', color: '#f87171' },
  claude: { key: 'claude', color: '#f472b6' },
}
export const LEAD_COLOR = '#e9ecf5'
export const OTHER_COLOR = '#9aa3b8'

/** devteam:<agent file> → role key. */
const AGENT_TYPES: Record<string, string> = {
  'product-manager': 'product',
  'growth-strategist': 'growth',
  architect: 'architect',
  'backend-engineer': 'backend',
  'data-engineer': 'data',
  'frontend-engineer': 'frontend',
  'mobile-engineer': 'mobile',
  'ios-engineer': 'ios',
  'devops-engineer': 'devops',
  'store-release-manager': 'store',
  'qa-engineer': 'qa',
  'security-reviewer': 'security',
  'claude-platform-specialist': 'claude',
}

/** Which DevTeam role an agent plays, from its agent type or its team name. */
export function roleOf(type: string, name: string): string {
  const file = /^devteam:(.+)$/.exec(type)?.[1]
  const byType = file === undefined ? undefined : AGENT_TYPES[file]
  if (byType !== undefined) return byType
  const n = name.toLowerCase()
  if (ROLES[n]) return n
  // "backend-2", "qa_e2e", "security-review"...
  for (const key of Object.keys(ROLES)) if (n.startsWith(key)) return key
  return 'other'
}

export function colorOf(role: string): string {
  if (role === 'lead') return LEAD_COLOR
  return ROLES[role]?.color ?? OTHER_COLOR
}

/** Whether an agent of `$.agent.list()` belongs on the HUD. */
export function isTeamAgent(a: { kind: string; type: string; teammateId?: string }): boolean {
  return a.kind === 'in_process_teammate' || a.teammateId !== undefined || a.type.startsWith('devteam:')
}

export function shortModel(id: string | undefined): string {
  if (!id) return '—'
  const m = /(opus|sonnet|haiku|fable)/i.exec(id)?.[1]
  return m !== undefined ? m.toLowerCase() : id
}

export const ACTIVE: ReadonlySet<TeamMember['status']> = new Set(['pending', 'running', 'waiting', 'idle'])

// ---------------------------------------------------------------- messages

const TAG = /\[(CONTRACT|QUESTION|BLOCKER|HANDOFF)\]/i

export function parseMessage(text: string): { tag?: MessageTag; text: string } {
  const m = TAG.exec(text)?.[1]
  const tag = m !== undefined ? (m.toUpperCase() as MessageTag) : undefined
  const first =
    text
      .replace(TAG, '')
      .split('\n')
      .map(l => l.trim())
      .find(l => l.length > 0) ?? ''
  return { tag, text: clip(first, 160) }
}

export function clip(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s
}

/** "main" and friends are the lead. */
export function addressName(to: string): string {
  return /^(main|lead|team-lead)$/i.test(to) ? 'lead' : to.replace(/@.*$/, '')
}

// ---------------------------------------------------------------- approval

/** The marker the DevTeam skills put on the line that asks for approval. */
export const APPROVAL_MARKER = /⏸|in attesa (della tua|del tuo) (approvazione|ok)|awaiting your (approval|go-ahead)/i
const APPROVAL_QUESTION =
  /(procedo\s*\?|posso procedere|vuoi che (proceda|parta|partiamo)|approvi( il piano)?\s*\?|ok per (partire|procedere)|shall i proceed|should i proceed|ok to proceed|approve (the|this) plan)/i

/**
 * Whether the lead's last answer asks the human to approve a plan.
 * The marker always counts; a plain "Procedo?" counts only inside a DevTeam flow.
 */
export function asksApproval(answer: string, inDevteamFlow: boolean): boolean {
  if (APPROVAL_MARKER.test(answer)) return true
  if (!inDevteamFlow) return false
  const tail = answer.slice(-600)
  return APPROVAL_QUESTION.test(tail)
}

/** The last few non-empty lines of the lead's answer, for the band. */
export function approvalSummary(answer: string): string {
  const lines = answer
    .split('\n')
    .map(l => l.replace(/^[#>*\-\s]+/, '').replace(/\*\*/g, '').trim())
    .filter(Boolean)
  const marked = lines.findIndex(l => APPROVAL_MARKER.test(l) || APPROVAL_QUESTION.test(l))
  const line = (marked >= 0 ? lines[marked] : lines[lines.length - 1]) ?? ''
  return clip(line.replace(/⏸\s*/, ''), 140)
}

// ---------------------------------------------------------------- guardrail

const GUARD = /DevTeam guard blocked this command:\s*(.+)\n\s+(.+)/

export function parseGuard(text: string | undefined): { reason: string; command: string } | null {
  if (!text) return null
  const m = GUARD.exec(text)
  const reason = m?.[1]
  const command = m?.[2]
  return reason !== undefined && command !== undefined ? { reason: reason.trim(), command: command.trim() } : null
}

// ---------------------------------------------------------------- gate

/** Parses the block text of the DevTeam TaskCompleted gate (task-completed.sh). */
export function parseGateBlock(block: string): GateResult['failed'] {
  const failed: GateResult['failed'] = []
  let cur: GateResult['failed'][number] | null = null
  for (const raw of block.split('\n')) {
    const m = /^✗\s+(.+?)\s+\(`.*`\)\s+—\s+(.+)$/.exec(raw)
    if (m?.[1] !== undefined && m[2] !== undefined) {
      const next = { name: m[1], reason: m[2], tail: [] as string[] }
      failed.push(next)
      cur = next
      continue
    }
    if (/^(Fix the failures|If a failure is in files)/.test(raw)) cur = null
    if (cur && raw.trim()) cur.tail.push(raw)
  }
  for (const f of failed) f.tail = f.tail.slice(-4).map(l => clip(l, 200))
  return failed
}

export function isGateBlock(block: string | undefined): boolean {
  return !!block && block.includes('DevTeam quality gate')
}

/** Check names from .claude/devteam.json, honoring gateTasks and skipGatePattern. */
export function gateChecks(configText: string | null, subject: string): string[] {
  if (configText === null) return []
  try {
    const cfg = JSON.parse(configText) as {
      gateTasks?: boolean
      skipGatePattern?: string
      checks?: { name?: string; run?: string }[]
    }
    if (cfg.gateTasks === false) return []
    const skip =
      cfg.skipGatePattern ?? '^(review|plan|design|research|investigate|analy[sz]e|verify|document|explore)\\b'
    try {
      if (new RegExp(skip, 'i').test(subject)) return []
    } catch {
      // a bad pattern: the shell gate falls back the same way, gating the task
    }
    return (cfg.checks ?? []).filter(c => c.run).map(c => c.name ?? c.run ?? '')
  } catch {
    return []
  }
}

// ---------------------------------------------------------------- money

export function usd(n: number | undefined): string {
  if (n === undefined || !Number.isFinite(n)) return '—'
  return n < 10 ? `$${n.toFixed(2)}` : `$${Math.round(n)}`
}

export function kTokens(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(n >= 100_000 ? 0 : 1)}k` : String(n)
}

// ---------------------------------------------------------------- strings

export type Lang = 'it' | 'en'

export const STR = {
  it: {
    paneTitle: 'DevTeam',
    noTeam: 'Nessun team attivo.',
    noTeamHint: 'Lancia /devteam:feature, /devteam:review o /devteam:debug: i teammate compaiono qui.',
    status: {
      pending: 'in avvio',
      running: 'al lavoro',
      waiting: 'attende',
      idle: 'in attesa',
      completed: 'finito',
      failed: 'errore',
      killed: 'fermato',
    } as Record<TeamMember['status'], string>,
    teammates: (n: number) => (n === 1 ? '1 teammate' : `${n} teammate`),
    working: (n: number) => `${n} al lavoro`,
    estimate: 'stima',
    tasks: 'Task',
    taskCounts: (open: number, doing: number, done: number) => `${open} da fare · ${doing} in corso · ${done} fatti`,
    messages: 'Messaggi',
    gates: 'Gate di qualità',
    guard: 'Guardrail',
    blocked: 'bloccato',
    gatePassed: 'gate superato',
    gateFailed: 'gate fallito',
    gateNoChecks: 'chiuso (nessun check)',
    approvalTitle: 'Il piano aspetta il tuo ok',
    approve: 'Approva',
    change: 'Modifica',
    later: 'Più tardi',
    approveText: 'Approvato: procedi con il piano.',
    changeText: 'Modifica il piano: ',
    blockerTitle: (from: string) => `Blocker da ${from}`,
    reply: 'Rispondi',
    seen: 'Visto',
    replyText: (from: string) => `Sul blocker di ${from}: `,
    guardCardTitle: 'Bloccato dal guardrail DevTeam',
    guardCardHint: 'Se serve davvero, eseguilo tu.',
    copy: 'Copia comando',
    copied: 'Comando copiato',
    toastBlocker: (from: string) => `⛔ ${from} è bloccato: guarda la riga sopra il prompt`,
    toastGate: (subject: string) => `✕ Gate fallito: ${subject}`,
    toastTeam: 'Team DevTeam attivo: /devteam-hud apre il pannello',
    costWarn: (n: number) => `⚠ ${n} teammate attivi: costi alti, valuta di spezzare il lavoro`,
    openedPane: 'Pannello DevTeam aperto.',
    statusHeader: 'DevTeam — stato',
    statusNone: 'Nessun team attivo in questa sessione.',
    lead: 'lead',
    approvalPending: 'In attesa della tua approvazione',
    blockersOpen: 'Blocker aperti',
    lastGates: 'Ultimi gate',
    lastBlocks: 'Comandi bloccati',
    costLine: (team: string, session: string) => `Costo stimato: team ${team} · sessione ${session}`,
  },
  en: {
    paneTitle: 'DevTeam',
    noTeam: 'No active team.',
    noTeamHint: 'Run /devteam:feature, /devteam:review or /devteam:debug: teammates show up here.',
    status: {
      pending: 'starting',
      running: 'working',
      waiting: 'waiting',
      idle: 'idle',
      completed: 'done',
      failed: 'failed',
      killed: 'stopped',
    } as Record<TeamMember['status'], string>,
    teammates: (n: number) => (n === 1 ? '1 teammate' : `${n} teammates`),
    working: (n: number) => `${n} working`,
    estimate: 'estimate',
    tasks: 'Tasks',
    taskCounts: (open: number, doing: number, done: number) => `${open} to do · ${doing} in progress · ${done} done`,
    messages: 'Messages',
    gates: 'Quality gates',
    guard: 'Guardrail',
    blocked: 'blocked',
    gatePassed: 'gate passed',
    gateFailed: 'gate failed',
    gateNoChecks: 'closed (no checks)',
    approvalTitle: 'The plan is waiting for your go-ahead',
    approve: 'Approve',
    change: 'Change',
    later: 'Later',
    approveText: 'Approved: go ahead with the plan.',
    changeText: 'Change the plan: ',
    blockerTitle: (from: string) => `Blocker from ${from}`,
    reply: 'Reply',
    seen: 'Seen',
    replyText: (from: string) => `About ${from}'s blocker: `,
    guardCardTitle: 'Blocked by the DevTeam guardrail',
    guardCardHint: 'If it is really needed, run it yourself.',
    copy: 'Copy command',
    copied: 'Command copied',
    toastBlocker: (from: string) => `⛔ ${from} is blocked: see the row above the prompt`,
    toastGate: (subject: string) => `✕ Gate failed: ${subject}`,
    toastTeam: 'DevTeam team active: /devteam-hud opens the panel',
    costWarn: (n: number) => `⚠ ${n} active teammates: costs add up, consider splitting the work`,
    openedPane: 'DevTeam panel opened.',
    statusHeader: 'DevTeam — status',
    statusNone: 'No active team in this session.',
    lead: 'lead',
    approvalPending: 'Waiting for your approval',
    blockersOpen: 'Open blockers',
    lastGates: 'Latest gates',
    lastBlocks: 'Blocked commands',
    costLine: (team: string, session: string) => `Estimated cost: team ${team} · session ${session}`,
  },
}

export type Strings = (typeof STR)['it']
