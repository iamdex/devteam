/** One DevTeam teammate (or devteam:* subagent) as the HUD shows it. */
export type TeamMember = {
  id: string
  /** Name the team addresses it by (e.g. "backend"). */
  name: string
  /** DevTeam role key (backend, qa, ...) or "other". */
  role: string
  /** Short model name: opus, sonnet, haiku, or the raw id. */
  model: string
  status: 'pending' | 'running' | 'waiting' | 'idle' | 'completed' | 'failed' | 'killed'
  /** What it is doing now (its latest progress summary). */
  label: string
  tokens: number
  /** Estimated cost in USD, when the engine keeps one. */
  usd?: number
}

export type MessageTag = 'CONTRACT' | 'QUESTION' | 'BLOCKER' | 'HANDOFF'

/** One message between agents (SendMessage). */
export type TeamMessage = {
  from: string
  to: string
  tag?: MessageTag
  /** First line, tag stripped, trimmed. */
  text: string
  at: number
}

export type TeamTask = {
  id: string
  subject: string
  owner?: string
  status: 'pending' | 'in_progress' | 'completed'
}

/** The outcome of the DevTeam quality gate on one TaskCompleted. */
export type GateResult = {
  taskId: string
  subject: string
  teammate?: string
  ok: boolean
  passed: string[]
  failed: { name: string; reason: string; tail: string[] }[]
  at: number
}

/** A Bash command the DevTeam guardrail refused. */
export type GuardBlock = {
  reason: string
  command: string
  agent: string
  at: number
}

/** A [BLOCKER] still waiting for the human or the lead. */
export type Blocker = {
  from: string
  text: string
  at: number
}

/** The lead is waiting for the human's go-ahead on a plan. */
export type Approval = {
  /** The lead's question, first lines. */
  text: string
  at: number
}

declare module 'claude-code' {
  interface PluginState {
    'devteam-hud': {
      team: Shaped<TeamMember[]>
      messages: Shaped<TeamMessage[]>
      tasks: Shaped<TeamTask[]>
      gates: Shaped<GateResult[]>
      blocks: Shaped<GuardBlock[]>
      blockers: Shaped<Blocker[]>
      approval: Shaped<Approval | null>
    }
  }
}
