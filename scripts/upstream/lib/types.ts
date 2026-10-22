/** One data catalog guarded by the drift check (scripts/upstream/check-drift.ts). */
export type Catalog = {
  /** Display name, e.g. 'permissions'. */
  name: string
  /** Repo-relative YAML file whose ids are compared, e.g. 'src/data/permissions.yaml'. */
  dataFile: string
  /** Reads the upstream checkout at `root` and returns the identifier set found in code. */
  extract(root: string): string[]
  /** Maps the YAML rows to comparable ids (default: every row's `id`). */
  dataIds?(rows: Record<string, unknown>[]): string[]
}
