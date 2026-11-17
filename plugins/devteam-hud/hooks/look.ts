// The DevTeam look: the colors of the DevTeam site (deep night, violet → cyan).
// Opt-in through the `theme` option; desktop and mobile apps draw it, the
// terminal keeps its own colors.
import type { ThemeSetArgs } from 'claude-code'

import { makeColors } from './make-colors.js'

const { theme, problems } = makeColors({
  label: 'DevTeam',
  roles: { accent: '#a78bfa', danger: '#f87171', success: '#4ade80', warning: '#fb923c', pro: '#22d3ee' },
  light: {
    gray: {
      anchors: {
        'surface-0': '#eceef5',
        'surface-1': '#f5f6fb',
        'surface-2': '#fbfbfe',
        'text-primary': '#0f1220',
        'text-secondary': '#3d4459',
        'text-muted': '#555d72',
      },
    },
  },
  dark: {
    gray: {
      anchors: {
        'surface-0': '#07080d',
        'surface-1': '#10131d',
        'surface-2': '#151927',
        'surface-3': '#1b2030',
        'text-primary': '#e9ecf5',
        'text-secondary': '#b4bccd',
        'text-muted': '#8e97ac',
      },
    },
  },
})

export const LOOK: ThemeSetArgs = { colors: theme }

/** The line that would stop Desktop painting the look, if any. */
export const UNPAINTED = problems.find(line => line.startsWith("Desktop won't paint"))
