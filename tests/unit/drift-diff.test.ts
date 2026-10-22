import { describe, expect, it } from 'vitest'
import { diffIds } from '../../scripts/upstream/lib/diff.ts'

describe('diffIds', () => {
  it('reports ids added upstream and ids removed upstream, sorted', () => {
    expect(diffIds(['b', 'a', 'gone'], ['a', 'c', 'b', 'new'])).toEqual({ added: ['c', 'new'], removed: ['gone'] })
  })

  it('is empty when the sets match regardless of order and duplicates', () => {
    expect(diffIds(['a', 'b', 'a'], ['b', 'a'])).toEqual({ added: [], removed: [] })
  })
})
