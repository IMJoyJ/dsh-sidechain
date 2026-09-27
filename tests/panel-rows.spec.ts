/**
 * Unit tests for the sidechain panel's row derivation helpers.
 */

import { describe, expect, it } from 'vitest'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { SubagentCatalogEntry } from '@deepseek-ai/dsh-subagent/client'
import {
  resolveCatalogEntries, runningCount, sidechainRows, type SidechainCatalogEntry,
} from '../src/client/SidechainPanel'

const CHILD_A = '11111111-1111-4111-8111-111111111111' as SessionId
const CHILD_B = '22222222-2222-4222-8222-222222222222' as SessionId

function catalogEntry(partial: Partial<SubagentCatalogEntry> & { id: SessionId }): SubagentCatalogEntry {
  return { createdAt: 0, mode: 'continuable', ...partial } as SubagentCatalogEntry
}

function entry(partial: Partial<SidechainCatalogEntry> & { id: SessionId }): SidechainCatalogEntry {
  return { mode: 'continuable', activity: 'inactive', ...partial }
}

describe('sidechainRows', () => {
  it('returns [] for an absent catalog', () => {
    expect(sidechainRows(undefined, {})).toEqual([])
  })

  it('resolves child labels: entry label, then summary title, then id', () => {
    const rows = sidechainRows([
      entry({ id: CHILD_A, activity: 'running', mode: 'continuable', label: '调研 X' }),
      entry({ id: CHILD_B, mode: 'one-shot' }),
    ], {
      [CHILD_B]: {
        id: CHILD_B, title: '问答标题', displayTitle: '问答标题', running: false,
      },
    } as never)
    expect(rows).toEqual([
      { kind: 'child', id: CHILD_A, mode: 'continuable', activity: 'running', label: '调研 X' },
      { kind: 'child', id: CHILD_B, mode: 'one-shot', activity: 'inactive', label: '问答标题' },
    ])
  })

  it('falls back to the session id without any title source', () => {
    const rows = sidechainRows([entry({ id: CHILD_A, mode: 'one-shot' })], {})
    expect(rows[0]).toEqual({ kind: 'child', id: CHILD_A, mode: 'one-shot', activity: 'inactive', label: CHILD_A })
  })

  it('surfaces unknown-mode entries as unsupported diagnostics', () => {
    const rows = sidechainRows([entry({ id: CHILD_A, mode: 'unknown', label: 'mystery' })], {})
    expect(rows).toEqual([{ kind: 'diagnostic', id: CHILD_A, reason: 'unsupported' }])
  })
})

describe('resolveCatalogEntries', () => {
  it('returns [] for an absent catalog', () => {
    expect(resolveCatalogEntries(undefined, () => false)).toEqual([])
  })

  it('derives activity from the running predicate', () => {
    const entries = resolveCatalogEntries([
      catalogEntry({ id: CHILD_A, mode: 'continuable', label: 'a' }),
      catalogEntry({ id: CHILD_B, mode: 'one-shot' }),
      catalogEntry({ id: 'parent-1' as SessionId, mode: 'unknown' }),
    ], (id) => id === CHILD_A)
    expect(entries).toEqual([
      { id: CHILD_A, mode: 'continuable', label: 'a', activity: 'running' },
      { id: CHILD_B, mode: 'one-shot', activity: 'inactive' },
      { id: 'parent-1', mode: 'unknown', activity: 'inactive' },
    ])
  })
})

describe('runningCount', () => {
  it('counts only running child rows', () => {
    const rows = sidechainRows([
      entry({ id: CHILD_A, activity: 'running', mode: 'continuable', label: 'a' }),
      entry({ id: CHILD_B, mode: 'one-shot' }),
      entry({ id: 'parent-1' as SessionId, mode: 'unknown' }),
    ], {})
    expect(runningCount(rows)).toBe(1)
  })
})
