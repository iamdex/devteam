// devteam-hud: see the DevTeam work and decide at the right moment.
//
//  1. Team pane       one row per teammate: role color, model, status, what it does,
//                     plus tasks, the latest messages, gates and guardrail blocks.
//  2. "Your turn"     a row above the prompt when the lead waits for plan approval
//                     or a teammate raises a [BLOCKER], with buttons.
//  3. Visible gates   a card under each TaskUpdate the quality gate judged, and under
//                     each Bash command the guardrail refused (with "copy command").
//  4. Cost            status line: active teammates and estimated cost, warning
//                     above `costWarnAt` teammates.
//  5. /devteam-status a text summary; /devteam-hud opens the pane.
//  6. Look            the DevTeam colors in the desktop and mobile apps (opt-in).
import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type {
  Approval,
  Blocker,
  GateResult,
  GuardBlock,
  TeamMember,
  TeamMessage,
  TeamTask,
} from '../types'
import {
  ACTIVE,
  STR,
  addressName,
  approvalSummary,
  asksApproval,
  clip,
  colorOf,
  gateChecks,
  isGateBlock,
  isTeamAgent,
  kTokens,
  parseGateBlock,
  parseGuard,
  parseMessage,
  roleOf,
  shortModel,
  usd,
} from './lib'
import type { Lang, Strings } from './lib'
import { LOOK, UNPAINTED } from './look'

type $ = EngineInterface

const PANE = 'devteam'
const P = 'devteam-hud' as const

// Each shape tag declines what an earlier version stored, which outlives a reload.
const team = atom({ plugin: 'devteam-hud', key: 'team' } as const, [] as TeamMember[], { shape: 'team-1' })
const messages = atom({ plugin: 'devteam-hud', key: 'messages' } as const, [] as TeamMessage[], { shape: 'messages-1' })
const tasks = atom({ plugin: 'devteam-hud', key: 'tasks' } as const, [] as TeamTask[], { shape: 'tasks-1' })
const gates = atom({ plugin: 'devteam-hud', key: 'gates' } as const, [] as GateResult[], { shape: 'gates-1' })
const blocks = atom({ plugin: 'devteam-hud', key: 'blocks' } as const, [] as GuardBlock[], { shape: 'blocks-1' })
const blockers = atom({ plugin: 'devteam-hud', key: 'blockers' } as const, [] as Blocker[], { shape: 'blockers-1' })
const approval = atom({ plugin: 'devteam-hud', key: 'approval' } as const, null as Approval | null, { shape: 'approval-1' })

const STATUS_COLOR: Record<TeamMember['status'], string> = {
  pending: '#9aa3b8',
  running: '#4ade80',
  waiting: '#facc15',
  idle: '#60a5fa',
  completed: '#6b7389',
  failed: '#f87171',
  killed: '#6b7389',
}
const TAG_COLOR: Record<string, string> = {
  CONTRACT: '#22d3ee',
  QUESTION: '#facc15',
  BLOCKER: '#f87171',
  HANDOFF: '#4ade80',
}

// Module state: options read at register, the rest rebuilt by the next poll
// after a reload.
let t: Strings = STR.it
let warnAt = 5
let autoOpen = true
const names = new Map<string, string>()
let timer: { cancel(): void } | undefined
let lastTeam = ''
let lastStatus: string | undefined
let hasOpened = false
let hasWarned = false
let isInFlow = false
let docks: boolean | undefined

const now = () => Date.now()

async function nameOf($: $, agentId: string | undefined): Promise<string> {
  if (agentId === undefined) return t.lead
  const known = names.get(agentId)
  if (known !== undefined) return known
  const a = (await $.agent.list()).find(x => x.id === agentId)
  return a?.name ?? a?.teammateId?.replace(/@.*$/, '') ?? 'agent'
}

async function refresh($: $): Promise<void> {
  const list = await $.agent.list()
  const members: TeamMember[] = list.filter(isTeamAgent).map(a => {
    const name = a.name ?? a.teammateId?.replace(/@.*$/, '') ?? a.description
    names.set(a.id, name)
    return {
      id: a.id,
      name,
      role: roleOf(a.type, name),
      model: shortModel(a.model),
      status: a.status,
      label: clip((a.label.split('\n').find(l => l.trim()) ?? '').trim(), 160),
      tokens: a.tokenCount,
      usd: a.cost?.usd,
    }
  })
  const key = JSON.stringify(members)
  if (key !== lastTeam) {
    lastTeam = key
    await update($, team, () => members)
  }

  if (members.length === 0) {
    if (lastStatus !== undefined) $.ui.status((lastStatus = undefined))
    return
  }
  isInFlow = true
  const active = members.filter(m => ACTIVE.has(m.status)).length
  const working = members.filter(m => m.status === 'running').length
  const teamUsd = members.reduce<number | undefined>(
    (sum, m) => (m.usd === undefined ? sum : (sum ?? 0) + m.usd),
    undefined,
  )
  const isOver = active > warnAt
  const line =
    `DevTeam · ${t.working(working)} / ${t.teammates(active)}` +
    (teamUsd === undefined ? '' : ` · ~${usd(teamUsd)} (${t.estimate})`) +
    (isOver ? ' ⚠' : '')
  if (line !== lastStatus) $.ui.status((lastStatus = line))

  if (isOver && !hasWarned) {
    hasWarned = true
    $.ui.toast(t.costWarn(active), { timeoutMs: 8000 })
  }
  if (!isOver) hasWarned = false

  if (!hasOpened && active > 0) {
    hasOpened = true
    // Opened unasked only where it is a sidebar, or where the surface does not say.
    if (autoOpen && docks !== false) {
      $.ui.open({ id: PANE, title: t.paneTitle }).catch(() => $.ui.toast(t.toastTeam))
    }
    else $.ui.toast(t.toastTeam)
  }
}

async function statusText($: $): Promise<string> {
  const members = await read($, team)
  const ts = await read($, tasks)
  const gs = await read($, gates)
  const bs = await read($, blocks)
  const bl = await read($, blockers)
  const ap = await read($, approval)
  const out: string[] = [`## ${t.statusHeader}`, '']
  if (members.length === 0) out.push(t.statusNone)
  for (const m of members) {
    out.push(`- **${m.name}** (${m.model}) — ${t.status[m.status]}${m.label ? ` · ${m.label}` : ''}`)
  }
  if (ap) out.push('', `**⏸ ${t.approvalPending}:** ${ap.text}`)
  if (bl.length) out.push('', `**⛔ ${t.blockersOpen}**`, ...bl.map(b => `- ${b.from}: ${b.text}`))
  if (ts.length) {
    const open = ts.filter(x => x.status === 'pending').length
    const doing = ts.filter(x => x.status === 'in_progress')
    const done = ts.filter(x => x.status === 'completed').length
    out.push('', `**${t.tasks}:** ${t.taskCounts(open, doing.length, done)}`)
    for (const x of doing) out.push(`- ${x.subject}${x.owner ? ` — ${x.owner}` : ''}`)
  }
  if (gs.length) {
    out.push('', `**${t.lastGates}**`)
    for (const g of gs.slice(-5).reverse()) {
      out.push(
        `- ${g.ok ? '✓' : '✕'} ${g.subject}${g.teammate ? ` (${g.teammate})` : ''}` +
          (g.ok ? '' : ` — ${g.failed.map(f => `${f.name}: ${f.reason}`).join('; ')}`),
      )
    }
  }
  if (bs.length) {
    out.push('', `**${t.lastBlocks}**`)
    for (const b of bs.slice(-5).reverse()) out.push(`- ${b.agent}: \`${b.command}\` — ${b.reason}`)
  }
  if (members.length) {
    const teamUsd = members.reduce((s, m) => s + (m.usd ?? 0), 0)
    const session = (await $.session.usage()).cost?.usd
    out.push('', t.costLine(usd(teamUsd), usd(session)) + ` (${t.estimate})`)
  }
  return out.join('\n')
}

export const register: Register = (on, options) => {
  const lang: Lang = options.language === 'en' ? 'en' : 'it'
  t = STR[lang]
  warnAt = typeof options.costWarnAt === 'number' ? options.costWarnAt : 5
  autoOpen = options.autoOpen !== false

  // ------------------------------------------------------------ session

  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'devteam-hud', description: 'DevTeam: open the team panel' })
    await $.command.register({ name: 'devteam-status', description: 'DevTeam: team, tasks, gates and cost at a glance' })

    if (options.theme === true) {
      if (UNPAINTED !== undefined) $.ui.toast(UNPAINTED)
      const set = await $.theme.set(LOOK)
      if (!set.isDrawn && e.surface !== 'terminal') $.ui.toast(set.reason)
    }

    timer?.cancel()
    timer = $.clock.every(2000, () => {
      refresh($).catch(() => undefined)
    })
    refresh($).catch(() => undefined)

    return next(e)
  })

  on('session.end', ($, e, next) => {
    timer?.cancel()
    timer = undefined
    return next(e)
  })

  // ------------------------------------------------------------ commands (5)

  on('command.run', { command: 'devteam-hud' }, async $ => {
    hasOpened = true
    const opened = await $.ui.open({ id: PANE, title: t.paneTitle, focus: true })
    return { text: opened.isPlaced ? t.openedPane : opened.reason }
  })

  on('command.run', { command: 'devteam-status' }, async $ => {
    await refresh($)
    return { text: await statusText($) }
  })

  // ------------------------------------------------------------ messages (1, 2)

  on('session.send', async ($, e, next) => {
    const sent = await next(e)
    const from = await nameOf($, e.agentId)
    const msg = parseMessage(e.text)
    const row: TeamMessage = { from, to: addressName(e.to), tag: msg.tag, text: msg.text, at: now() }
    await update($, messages, list => [...list, row].slice(-40))
    if (msg.tag === 'BLOCKER') {
      await update($, blockers, list => [...list.filter(b => b.from !== from), { from, text: msg.text, at: row.at }])
      $.ui.toast(t.toastBlocker(from), { timeoutMs: 8000 })
    } else if (from !== t.lead) {
      // A later message from the same teammate means it moved on.
      await update($, blockers, list => list.filter(b => b.from !== from))
    }
    return sent
  }).catch(($, e, next) => next(e))

  // ------------------------------------------------------------ tasks (1, 3)

  on('classic.TaskCreated', async ($, e, next) => {
    const r = await next(e)
    if (r.block === undefined) {
      const task: TeamTask = { id: e.task_id, subject: e.task_subject, owner: e.teammate_name, status: 'pending' }
      await update($, tasks, list => [...list.filter(x => x.id !== task.id), task].slice(-100))
    }
    return r
  }).catch(($, e, next) => next(e))

  on('tool.call', { tool: 'TaskUpdate' }, async ($, e, next) => {
    const r = await next(e)
    if (r.deny === undefined && r.isError !== true) {
      await update($, tasks, list =>
        e.status === 'deleted'
          ? list.filter(x => x.id !== e.taskId)
          : list.map(x =>
              x.id !== e.taskId
                ? x
                : {
                    ...x,
                    subject: e.subject ?? x.subject,
                    owner: e.owner ?? x.owner,
                    status: e.status === undefined || e.status === 'deleted' ? x.status : e.status,
                  },
            ),
      )
    }
    return r
  }).catch(($, e, next) => next(e))

  on('classic.TaskCompleted', async ($, e, next) => {
    const r = await next(e)
    const isTeamTask = e.team_name !== undefined || /^\s*owner:/im.test(e.task_description ?? '')
    if (!isTeamTask) return r
    if (r.block !== undefined && !isGateBlock(r.block)) return r // blocked by something else

    let config: string | null = null
    try {
      config = await $.fs.read(`${await $.session.root()}/.claude/devteam.json`)
    } catch {
      config = null
    }
    const checks = gateChecks(config, e.task_subject)
    const failed = r.block !== undefined ? parseGateBlock(r.block) : []
    const gate: GateResult = {
      taskId: e.task_id,
      subject: e.task_subject,
      teammate: e.teammate_name,
      ok: r.block === undefined,
      passed: checks.filter(n => !failed.some(f => f.name === n)),
      failed,
      at: now(),
    }
    await update($, gates, list => [...list, gate].slice(-30))
    if (gate.ok) {
      await update($, tasks, list => list.map(x => (x.id === gate.taskId ? { ...x, status: 'completed' } : x)))
    } else {
      $.ui.toast(t.toastGate(clip(gate.subject, 60)), { timeoutMs: 8000 })
    }
    return r
  }).catch(($, e, next) => next(e))

  // ------------------------------------------------------------ guardrail (3)

  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    const r = await next(e)
    if (r.isError === true || r.deny !== undefined) {
      const g = parseGuard(r.deny ?? r.text ?? (typeof r.result === 'string' ? r.result : undefined))
      if (g) {
        const agent = await nameOf($, e.agentId)
        await update($, blocks, list => [...list, { ...g, agent, at: now() }].slice(-20))
      }
    }
    return r
  }).catch(($, e, next) => next(e))

  // ------------------------------------------------------------ approval (2)

  on('prompt.submit', async ($, e, next) => {
    if (e.command?.name.startsWith('devteam:')) isInFlow = true
    // Anything the person sends answers the lead's question.
    if (e.origin.kind !== 'plugin' || e.origin.name === P) await update($, approval, () => null)
    return next(e)
  }).catch(($, e, next) => next(e))

  on('turn.complete', async ($, e, next) => {
    const r = await next(e)
    if (e.agentId === undefined && !e.isAborted && asksApproval(e.answer, isInFlow)) {
      await update($, approval, () => ({ text: approvalSummary(e.answer), at: now() }))
    }
    return r
  })

  // ------------------------------------------------------------ band above the prompt (2)

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.viewport?.isFullscreen !== undefined) docks = e.viewport.isFullscreen
    if (e.props.hasSurvey) return next(e)
    const ap = await read($, approval)
    const bl = await read($, blockers)
    if (ap === null && bl.length === 0) return next(e)

    const { Box, Text, Button } = $.ui.resolve(e)
    const width = Math.max(20, e.props.bodyColumns)

    return (
      <Box flexDirection="column" width={width}>
        {ap !== null && (
          <Box flexDirection="row" flexWrap="wrap" columnGap={1}>
            <Text color="#facc15" bold>
              ⏸ {t.approvalTitle}
            </Text>
            <Text dimColor wrap="truncate">
              {ap.text}
            </Text>
          </Box>
        )}
        {ap !== null && (
          <Box flexDirection="row" columnGap={1}>
            <Button
              key="approve"
              label={t.approve}
              variant="primary"
              onPress={async () => {
                await update($, approval, () => null)
                await $.prompt.submit({ text: t.approveText, asUser: true })
              }}
            />
            <Button
              key="change"
              label={t.change}
              onPress={async () => {
                await update($, approval, () => null)
                await $.prompt.fill({ text: t.changeText, mode: 'replace' })
              }}
            />
            <Button key="later" label={t.later} role="dismiss" onPress={() => update($, approval, () => null)} />
          </Box>
        )}
        {bl.slice(-2).map(b => (
          <Box key={`blocker-${b.from}`} flexDirection="row" flexWrap="wrap" columnGap={1}>
            <Text color="#f87171" bold>
              ⛔ {t.blockerTitle(b.from)}
            </Text>
            <Text wrap="truncate">{b.text}</Text>
            <Button
              key={`reply-${b.from}`}
              label={t.reply}
              onPress={() => $.prompt.fill({ text: t.replyText(b.from), mode: 'replace' })}
            />
            <Button
              key={`seen-${b.from}`}
              label={t.seen}
              role="dismiss"
              onPress={() => update($, blockers, list => list.filter(x => x.from !== b.from))}
            />
          </Box>
        ))}
      </Box>
    )
  })

  // ------------------------------------------------------------ the team pane (1)

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    const members = await read($, team)
    const ts = await read($, tasks)
    const msgs = await read($, messages)
    const gs = await read($, gates)
    const bs = await read($, blocks)
    const bl = await read($, blockers)
    const width = Math.max(24, e.props.bodyColumns)
    const blockedBy = new Set(bl.map(b => b.from))

    if (members.length === 0) {
      return (
        <Box flexDirection="column" width={width}>
          <Text bold>{t.noTeam}</Text>
          <Text dimColor>{t.noTeamHint}</Text>
        </Box>
      )
    }

    const active = members.filter(m => ACTIVE.has(m.status)).length
    const working = members.filter(m => m.status === 'running').length
    const teamUsd = members.reduce((s, m) => s + (m.usd ?? 0), 0)
    const hasCost = members.some(m => m.usd !== undefined)
    const open = ts.filter(x => x.status === 'pending').length
    const doing = ts.filter(x => x.status === 'in_progress')
    const done = ts.filter(x => x.status === 'completed').length

    return (
      <Box flexDirection="column" width={width} rowGap={1}>
        <Text dimColor>
          {t.teammates(active)} · {t.working(working)}
          {hasCost ? ` · ~${usd(teamUsd)} (${t.estimate})` : ''}
        </Text>

        <Box flexDirection="column">
          {members.map(m => (
            <Box key={`m-${m.id}`} flexDirection="column">
              <Box flexDirection="row" columnGap={1}>
                <Text color={colorOf(m.role)} bold>
                  ● {m.name}
                </Text>
                <Text dimColor>{m.model}</Text>
                <Text color={STATUS_COLOR[m.status]}>{t.status[m.status]}</Text>
                <Text dimColor>{kTokens(m.tokens)} tok</Text>
              </Box>
              {blockedBy.has(m.name) ? (
                <Text color="#f87171" wrap="truncate">
                  {'  '}⛔ {bl.find(b => b.from === m.name)?.text}
                </Text>
              ) : m.label ? (
                <Text dimColor wrap="truncate">
                  {'  '}
                  {m.label}
                </Text>
              ) : null}
            </Box>
          ))}
        </Box>

        {ts.length > 0 && (
          <Box flexDirection="column">
            <Text bold>
              {t.tasks} <Text dimColor>{t.taskCounts(open, doing.length, done)}</Text>
            </Text>
            {doing.slice(0, 6).map(x => (
              <Text key={`t-${x.id}`} wrap="truncate">
                {'  '}◐ {x.subject}
                {x.owner ? ` — ${x.owner}` : ''}
              </Text>
            ))}
          </Box>
        )}

        {msgs.length > 0 && (
          <Box flexDirection="column">
            <Text bold>{t.messages}</Text>
            {msgs
              .slice(-6)
              .reverse()
              .map(m => (
                <Text wrap="truncate">
                  {'  '}
                  {m.tag ? <Text color={TAG_COLOR[m.tag]}>[{m.tag}] </Text> : null}
                  <Text dimColor>
                    {m.from} → {m.to}:
                  </Text>{' '}
                  {m.text}
                </Text>
              ))}
          </Box>
        )}

        {gs.length > 0 && (
          <Box flexDirection="column">
            <Text bold>{t.gates}</Text>
            {gs
              .slice(-4)
              .reverse()
              .map(g => (
                <Text wrap="truncate" color={g.ok ? '#4ade80' : '#f87171'}>
                  {'  '}
                  {g.ok ? '✓' : '✕'} {g.subject}
                  {g.ok ? '' : ` — ${g.failed.map(f => f.name).join(', ')}`}
                </Text>
              ))}
          </Box>
        )}

        {bs.length > 0 && (
          <Box flexDirection="column">
            <Text bold>{t.guard}</Text>
            {bs
              .slice(-3)
              .reverse()
              .map(b => (
                <Text wrap="truncate">
                  {'  '}
                  <Text color="#f87171">✕ {b.agent}</Text> <Text dimColor>{b.command}</Text>
                </Text>
              ))}
          </Box>
        )}
      </Box>
    )
  })

  // ------------------------------------------------------------ cards under tool rows (3)

  on('ui.render', { component: 'ToolUse' }, async ($, e, next) => {
    const p = e.props
    if (p.tool === 'Bash' && p.isErrored) {
      const text = typeof p.output === 'string' ? p.output : JSON.stringify(p.output ?? '')
      const g = parseGuard(text)
      if (g === null) return next(e)
      const row = await next(e)
      const { Box, Text, Button } = $.ui.resolve(e)
      return (
        <Box flexDirection="column" borderStyle="round" borderColor="#f87171">
          {row}
          <Box flexDirection="column" paddingX={1}>
            <Text color="#f87171" bold>
              🛡 {t.guardCardTitle}
            </Text>
            <Text>{g.reason}</Text>
            <Text dimColor>{t.guardCardHint}</Text>
            <Box flexDirection="row">
              <Button
                key={`copy-${p.tool_use_id}`}
                label={t.copy}
                onPress={async () => {
                  await $.ui.copy({ text: g.command })
                  $.ui.toast(t.copied)
                }}
              />
            </Box>
          </Box>
        </Box>
      )
    }

    if (p.tool === 'TaskUpdate') {
      const input = (p.input ?? {}) as { taskId?: string; status?: string }
      if (input.status !== 'completed' || input.taskId === undefined) return next(e)
      const gate = (await read($, gates)).filter(g => g.taskId === input.taskId).pop()
      if (gate === undefined) return next(e)
      const row = await next(e)
      const { Box, Text } = $.ui.resolve(e)
      const color = gate.ok ? '#4ade80' : '#f87171'
      return (
        <Box flexDirection="column" borderStyle="round" borderColor={color}>
          {row}
          <Box flexDirection="column" paddingX={1}>
            <Text color={color} bold>
              {gate.ok ? '✓' : '✕'}{' '}
              {gate.ok ? (gate.passed.length ? t.gatePassed : t.gateNoChecks) : t.gateFailed}
            </Text>
            <Box flexDirection="row" flexWrap="wrap" columnGap={2}>
              {gate.passed.map(n => (
                <Text color="#4ade80">✓ {n}</Text>
              ))}
              {gate.failed.map(f => (
                <Text color="#f87171">✕ {f.name}</Text>
              ))}
            </Box>
            {gate.failed.map(f => (
              <Box flexDirection="column">
                <Text dimColor>
                  {f.name}: {f.reason}
                </Text>
                {f.tail.map(l => (
                  <Text dimColor wrap="truncate">
                    {'  '}
                    {l}
                  </Text>
                ))}
              </Box>
            ))}
          </Box>
        </Box>
      )
    }

    return next(e)
  })
}
