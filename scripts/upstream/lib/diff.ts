export type IdDiff = { added: string[]; removed: string[] }

/** `added` = ids upstream has but the data lacks; `removed` = ids the data has but upstream dropped. */
export function diffIds(data: Iterable<string>, upstream: Iterable<string>): IdDiff {
  const have = new Set(data)
  const want = new Set(upstream)
  return {
    added: [...want].filter((id) => !have.has(id)).sort(),
    removed: [...have].filter((id) => !want.has(id)).sort(),
  }
}
