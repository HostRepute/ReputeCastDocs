// Drift catalogs for src/data/permissions.yaml and src/data/roles.yaml, read from upstream internal/authz.
// Permission ids: every key in Defs (permissions.go) and AgencyDefs (agency.go).
// Role ids: each built-in role key ('editor') plus one '<role>=<permission>' id per permission it holds after
// implied keys are expanded, so a permission added to or dropped from a role shows up as drift.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Catalog } from './types.ts'

export type PermissionDef = { key: string; ownerOnly: boolean; implies: string[] }

const AUTHZ_FILES = ['internal/authz/permissions.go', 'internal/authz/agency.go']

/** Drops whole-line `//` comments so commented-out code never counts. */
const code = (src: string) => src.replace(/^[ \t]*\/\/.*$/gm, '')

/** Body of a top-level `var <name> = []T{ … }` composite literal. */
function sliceBody(src: string, name: string): string {
  const m = code(src).match(new RegExp(`^var ${name} = \\[\\]\\w+\\{\\n([\\s\\S]*?)^\\}`, 'm'))
  if (!m) throw new Error(`authz: no "var ${name}" slice found`)
  return m[1]
}

/**
 * String constants declared with `const`: inside `const ( … )` blocks or one per line, typed
 * (`CampaignsView Permission = "campaigns:view"`) or not (`RoleOwner = "owner"`). Variables and locals never count.
 */
export function parseStringConstants(...sources: string[]): Map<string, string> {
  const out = new Map<string, string>()
  const declared = /^\s*(\w+)(?:\s+[\w.]+)?\s*=\s*"([^"]*)"/gm
  for (const src of sources.map(code)) {
    for (const [, block] of src.matchAll(/^const \(\n([\s\S]*?)^\)/gm)) {
      for (const m of block.matchAll(declared)) out.set(m[1], m[2])
    }
    for (const m of src.matchAll(/^const (\w+)(?:\s+[\w.]+)?\s*=\s*"([^"]*)"/gm)) out.set(m[1], m[2])
  }
  return out
}

function resolve(constants: Map<string, string>, ident: string): string {
  const v = constants.get(ident)
  if (v === undefined) throw new Error(`authz: unknown constant ${ident}`)
  return v
}

/** Entries of a `[]Def` slice in catalogue order. */
export function parseDefs(src: string, slice: string, constants: Map<string, string>): PermissionDef[] {
  return [...sliceBody(src, slice).matchAll(/^\s*\{Key: (\w+),(.*)$/gm)].map(([, ident, rest]) => {
    const implies = rest.match(/Implies: \[\]Permission\{([^}]*)\}/)
    return {
      key: resolve(constants, ident),
      ownerOnly: /\bOwnerOnly: true\b/.test(rest),
      implies: implies ? implies[1].split(',').map((s) => resolve(constants, s.trim())) : [],
    }
  })
}

/** Every permission key: the workspace catalogue (Defs) followed by the instance-level agency keys (AgencyDefs). */
export function parsePermissionKeys(permissionsGo: string, agencyGo: string): string[] {
  const constants = parseStringConstants(permissionsGo, agencyGo)
  return [...parseDefs(permissionsGo, 'Defs', constants), ...parseDefs(agencyGo, 'AgencyDefs', constants)].map(
    (d) => d.key,
  )
}

const SET_BUILDERS: Record<string, true> = { NewSet: true, AgencySet: true, All: true, AllGrantable: true }

/**
 * Built-in roles (BuiltinRoles, ClientRoles, AgencyRoles) with their permissions expanded the way authz.NewSet does,
 * as role ids plus '<role>=<permission>' ids. Understands All(), AllGrantable(), viewAll and permission constants.
 */
export function parseRoleIds(permissionsGo: string, agencyGo: string): string[] {
  const constants = parseStringConstants(permissionsGo, agencyGo)
  const workspaceDefs = parseDefs(permissionsGo, 'Defs', constants)
  const implies = new Map(workspaceDefs.map((d) => [d.key, d.implies]))
  const viewAll = sliceBody(permissionsGo, 'viewAll')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((ident) => resolve(constants, ident))

  const ids: string[] = []
  const roleSlices: [string, string][] = [
    [permissionsGo, 'BuiltinRoles'],
    [agencyGo, 'ClientRoles'],
    [agencyGo, 'AgencyRoles'],
  ]
  for (const [src, slice] of roleSlices) {
    for (const entry of sliceBody(src, slice)
      .split(/(?=\{Key: )/)
      .filter((e) => e.startsWith('{Key: '))) {
      const role = resolve(constants, entry.match(/^\{Key: (\w+)/)![1])
      const at = entry.indexOf('Permissions:')
      if (at < 0) throw new Error(`authz: role ${role} has no Permissions`)
      const expr = entry
        .slice(at + 'Permissions:'.length)
        .replace(/"(?:\\.|[^"\\])*"/g, '""')
        .replace(/\/\/.*$/gm, '')
      const held = new Set<string>()
      const add = (key: string) => {
        if (held.has(key)) return
        held.add(key)
        for (const k of implies.get(key) ?? []) add(k)
      }
      if (/\bAll\(\)/.test(expr)) workspaceDefs.forEach((d) => add(d.key))
      if (/\bAllGrantable\(\)/.test(expr)) workspaceDefs.filter((d) => !d.ownerOnly).forEach((d) => add(d.key))
      if (/\bviewAll\b/.test(expr)) viewAll.forEach(add)
      // Capitalized identifiers that aren't package members (slices.Clone) or set builders must be permission keys.
      for (const m of expr.matchAll(/(?<![.\w])([A-Z]\w*)\b/g)) {
        if (!SET_BUILDERS[m[1]]) add(resolve(constants, m[1]))
      }
      ids.push(role, ...[...held].map((p) => `${role}=${p}`))
    }
  }
  return ids
}

const readAuthz = (root: string) => AUTHZ_FILES.map((f) => readFileSync(join(root, f), 'utf8')) as [string, string]

export const catalogs: Catalog[] = [
  {
    name: 'permissions',
    dataFile: 'src/data/permissions.yaml',
    extract: (root) => parsePermissionKeys(...readAuthz(root)),
  },
  {
    name: 'roles',
    dataFile: 'src/data/roles.yaml',
    extract: (root) => parseRoleIds(...readAuthz(root)),
    dataIds: (rows) => rows.flatMap((r) => [String(r.id), ...(r.permissions as string[]).map((p) => `${r.id}=${p}`)]),
  },
]
