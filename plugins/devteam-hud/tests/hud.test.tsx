import type { AgentInfo, CommandRunInput, SessionUsage } from 'claude-code'
import { expect, test } from 'claude-code/testing'

import { asksApproval, parseGateBlock, parseGuard, parseMessage, roleOf } from '../hooks/lib'

const SURFACES = ['terminal', 'desktop', 'vscode', 'mobile'] as const

const PANE = {
  plugin: 'devteam-hud',
  component: 'Pane',
  requestId: 'devteam',
  props: {
    title: 'DevTeam',
    isFocused: false,
    bodyColumns: 60,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 40 },
    view: {},
  },
} as const

const BAND = {
  plugin: 'devteam-hud',
  component: 'AbovePrompt',
  props: {
    hasSurvey: false,
    isCollapsed: false,
    isWorking: false,
    maxRows: 10,
    bodyColumns: 80,
    scroll: { offset: 0, bodyRows: 10 },
    view: {},
  },
} as const

const STATUS_RUN: CommandRunInput = {
  command: 'devteam-status',
  args: '',
  origin: { kind: 'composer' },
  presentation: { isFullscreen: true, columns: 80 },
}

const AGENT = {
  description: 'backend',
  kind: 'in_process_teammate',
  taskStatus: 'running',
  startTime: 0,
  cwd: '/repo',
  tokenSamples: [] as number[],
  hasRow: true,
} as const

const TEAM: AgentInfo[] = [
  {
    ...AGENT,
    id: 'a1',
    name: 'backend',
    teammateId: 'backend@feat',
    type: 'teammate',
    status: 'running' as const,
    label: 'POST /api/invoices/recurring',
    model: 'claude-sonnet-5-5',
    tokenCount: 12400,
    cost: { usd: 0.42 },
  },
  {
    ...AGENT,
    id: 'a2',
    name: 'qa',
    teammateId: 'qa@feat',
    type: 'teammate',
    status: 'idle' as const,
    label: 'writing contract tests',
    model: 'claude-opus-5-5',
    tokenCount: 8000,
    cost: { usd: 0.8 },
  },
]

const GATE_BLOCK = [
  'DevTeam quality gate: task "Implement recurring API" cannot be completed yet — project checks fail.',
  '',
  '✗ unit tests (`pnpm test`) — exit code 1',
  'FAIL recurring.test.ts',
  '  expected 3 got 4',
  '',
  'Fix the failures in files you own, then mark the task completed again.',
].join('\n')

const GUARD_TEXT = [
  'DevTeam guard blocked this command: force push',
  '  git push --force origin main',
  'This needs Dex. Explain what you want to do and why.',
].join('\n')

// ---------------------------------------------------------------- lib

test('lib: roles, messages, guard and gate parsing', async () => {
  expect(roleOf('devteam:security-reviewer', 'x')).toBe('security')
  expect(roleOf('teammate', 'backend-2')).toBe('backend')
  expect(roleOf('teammate', 'mario')).toBe('other')

  expect(parseMessage('[BLOCKER] missing demo tenant fixture\nmore')).toEqual({
    tag: 'BLOCKER',
    text: 'missing demo tenant fixture',
  })
  expect(parseMessage('just text').tag).toBe(undefined)

  expect(parseGuard(GUARD_TEXT)).toEqual({ reason: 'force push', command: 'git push --force origin main' })
  expect(parseGuard('npm ERR!')).toBe(null)

  const failed = parseGateBlock(GATE_BLOCK)
  expect(failed.length).toBe(1)
  expect(failed[0]?.name).toBe('unit tests')
  expect(failed[0]?.reason).toBe('exit code 1')
  expect(failed[0]?.tail).toEqual(['FAIL recurring.test.ts', '  expected 3 got 4'])

  expect(asksApproval('Piano pronto.\n⏸ In attesa della tua approvazione', false)).toBe(true)
  expect(asksApproval('Piano: 4 teammate. Procedo?', true)).toBe(true)
  expect(asksApproval('Piano: 4 teammate. Procedo?', false)).toBe(false)
  expect(asksApproval('Fatto, ho chiuso il task.', true)).toBe(false)
})

// ---------------------------------------------------------------- 1. pane

test('the pane says how to start when there is no team', async $ => {
  for (const surface of SURFACES) {
    const ui = await $.ui.mount({ ...PANE, surface })
    expect((await ui.find({ type: 'Text', text: /Nessun team/ }))?.text).toBe('Nessun team attivo.')
    await ui.unmount()
  }
})

test('the pane lists the teammates, on every surface', async ($, on) => {
  on('agent.list', () => ({ value: TEAM }))
  on('command.register', () => ({ value: { command: 'x' } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('session.usage', () => ({ value: { cost: { usd: 3 } } as unknown as SessionUsage }))
  on('command.run', () => ({ text: '' }))

  await $.command.run(STATUS_RUN)

  for (const surface of SURFACES) {
    const ui = await $.ui.mount({ ...PANE, surface })
    expect((await ui.find({ type: 'Text', text: /backend/ }))?.text).toBe('● backend')
    expect((await ui.find({ type: 'Text', text: /writing contract tests/ }))?.text).toContain('writing contract tests')
    expect((await ui.find({ type: 'Text', text: /2 teammate/ }))?.text).toContain('$1.22')
    await ui.unmount()
  }
})

// ---------------------------------------------------------------- 2. band

test('a [BLOCKER] shows above the prompt until it is seen', async ($, on) => {
  on('agent.list', () => ({ value: TEAM }))
  on('session.send', () => ({ isDelivered: true as const }))

  await $.session.send({ to: 'main', text: '[BLOCKER] missing demo tenant fixture', origin: { kind: 'model' }, agentId: 'a2' })

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...BAND, surface })
    expect((await ui.find({ type: 'Text', text: /missing demo tenant/ }))?.text).toBe('missing demo tenant fixture')
    await ui.unmount()
  }

  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  await ui.press({ key: 'seen-qa' })
  expect(await ui.find({ type: 'Text', text: /missing demo tenant/ })).toBe(undefined)
  await ui.unmount()
})

test('the lead asking for approval shows Approve, which answers for the person', async ($, on) => {
  const submitted: string[] = []
  on('turn.complete', () => ({ text: '' }))
  on('prompt.submit', (_, e) => {
    submitted.push(e.text)
    return { text: e.text }
  })

  await $.turn.complete({
    answer: 'Piano pronto: 4 teammate, 9 task.\n⏸ In attesa della tua approvazione',
    durationMs: 1,
    isAborted: false,
    turnId: 't1',
    reason: 'answer',
  })

  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  expect((await ui.find({ type: 'Text', text: /aspetta il tuo ok/ }))?.text).toContain('Il piano aspetta il tuo ok')
  await ui.press({ key: 'approve' })
  expect(submitted).toEqual(['Approvato: procedi con il piano.'])
  expect(await ui.find({ type: 'Text', text: /aspetta il tuo ok/ })).toBe(undefined)
  await ui.unmount()
})

// ---------------------------------------------------------------- 3. cards

test('a failed gate draws a card under the TaskUpdate row', async ($, on) => {
  on('classic.TaskCompleted', () => ({ block: GATE_BLOCK }))
  on('fs.read', () => ({ value: JSON.stringify({ checks: [{ name: 'typecheck', run: 'x' }, { name: 'unit tests', run: 'y' }] }) }))
  on('session.root', () => ({ value: '/repo' }))

  await $.classic.TaskCompleted({
    task_id: '7',
    task_subject: 'Implement recurring API',
    teammate_name: 'backend',
    team_name: 'feat',
  })

  for (const surface of SURFACES) {
    const ui = await $.ui.mount({
      plugin: 'devteam-hud',
      surface,
      component: 'ToolUse',
      requestId: 'tu1',
      props: {
        tool_use_id: 'tu1',
        tool: 'TaskUpdate',
        input: { taskId: '7', status: 'completed' },
        isRunning: false,
        isErrored: true,
        isInterrupted: false,
        output: GATE_BLOCK,
      },
    })
    expect((await ui.find({ type: 'Text', text: /gate fallito/ }))?.text).toContain('✕')
    expect((await ui.find({ type: 'Text', text: /✓ typecheck/ }))?.text).toBe('✓ typecheck')
    expect((await ui.find({ type: 'Text', text: /expected 3 got 4/ }))?.text).toContain('expected 3 got 4')
    await ui.unmount()
  }
})

test('a guardrail refusal draws a card with copy command', async ($, on) => {
  const copied: string[] = []
  on('ui.copy', (_, e) => {
    copied.push(e.text)
    return { value: { isCopied: true } }
  })

  const ui = await $.ui.mount({
    plugin: 'devteam-hud',
    surface: 'desktop',
    component: 'ToolUse',
    requestId: 'tu2',
    props: {
      tool_use_id: 'tu2',
      tool: 'Bash',
      input: { command: 'git push --force origin main' },
      isRunning: false,
      isErrored: true,
      isInterrupted: false,
      output: GUARD_TEXT,
    },
  })
  expect((await ui.find({ type: 'Text', text: /force push/ }))?.text).toBe('force push')
  await ui.press({ key: 'copy-tu2' })
  expect(copied).toEqual(['git push --force origin main'])
  await ui.unmount()
})

// ---------------------------------------------------------------- 5. status command

test('/devteam-status summarizes team and cost', async ($, on) => {
  on('agent.list', () => ({ value: TEAM }))
  on('session.usage', () => ({ value: { cost: { usd: 3 } } as unknown as SessionUsage }))
  on('command.run', () => ({ text: '' }))

  const r = await $.command.run(STATUS_RUN)
  expect(r.text).toContain('**backend** (sonnet) — al lavoro')
  expect(r.text).toContain('team $1.22')
})

// ---------------------------------------------------------------- 4. status line

const crowd = (n: number): AgentInfo[] =>
  Array.from({ length: n }, (_, i) => ({ ...TEAM[0]!, id: `c${i}`, name: `backend-${i}`, status: 'running' as const }))

test('the status line counts the team and warns above costWarnAt', async ($, on) => {
  const lines: (string | undefined)[] = []
  const toasts: string[] = []
  on('agent.list', () => ({ value: crowd(6) }))
  on('ui.status', (_, e) => {
    lines.push(e.text)
    return { value: undefined }
  })
  on('ui.toast', (_, e) => {
    toasts.push(e.text)
    return { value: undefined }
  })
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('session.usage', () => ({ value: { cost: { usd: 3 } } as unknown as SessionUsage }))
  on('command.run', () => ({ text: '' }))

  await $.command.run(STATUS_RUN)
  expect(lines.at(-1)).toBe('DevTeam · 6 al lavoro / 6 teammate · ~$2.52 (stima) ⚠')
  expect(toasts.some(x => x.includes('6 teammate attivi'))).toBe(true)
})

// ---------------------------------------------------------------- 6. look and language

test('the DevTeam look is painted only when the option is on', { options: { theme: true } }, async ($, on) => {
  let painted = 0
  on('command.register', () => ({ value: { command: 'x' } }))
  on('theme.set', () => {
    painted++
    return { value: { isDrawn: true as const, requestId: 'r1' } }
  })
  on('agent.list', () => ({ value: [] }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  expect(painted).toBe(1)
})

test('no look by default', async ($, on) => {
  let painted = 0
  on('command.register', () => ({ value: { command: 'x' } }))
  on('theme.set', () => {
    painted++
    return { value: { isDrawn: true as const, requestId: 'r1' } }
  })
  on('agent.list', () => ({ value: [] }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  expect(painted).toBe(0)
})

test('the panel speaks English when asked', { options: { language: 'en' } }, async $ => {
  const ui = await $.ui.mount({ ...PANE, surface: 'mobile' })
  expect((await ui.find({ type: 'Text', text: /No active team/ }))?.text).toBe('No active team.')
  await ui.unmount()
})
