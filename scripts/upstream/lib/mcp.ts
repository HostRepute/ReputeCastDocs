// Drift catalog for src/data/mcp.yaml: the tools, resources and prompts the upstream MCP server registers
// (internal/mcpserver). Ids: 'tool:<name>' plus 'tool:<name>=<permission>' (the key the registration checks),
// 'resource:<URI or URI template>' and 'prompt:<name>'.
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseStringConstants } from './permissions.ts'
import type { Catalog } from './types.ts'

/**
 * Registrations in the given files of one Go package: `tool(s, srv, "name", authz.Perm, …)` calls,
 * `srv.AddResource(Template)(&mcp.Resource(Template){… URI(Template): <const or literal>` and `srv.AddPrompt(&mcp.Prompt{Name: …`.
 * `permissions` maps authz constant names to keys (parseStringConstants of internal/authz).
 */
export function parseMcpServer(sources: string[], permissions: Map<string, string>): string[] {
  const go = sources.map((s) => s.replace(/^[ \t]*\/\/.*$/gm, '')).join('\n')
  const constants = parseStringConstants(go)
  const ids: string[] = []
  for (const [, name, perm] of go.matchAll(/\btool\(\s*\w+,\s*\w+,\s*"(\w+)",\s*authz\.(\w+)/g)) {
    const key = permissions.get(perm)
    if (!key) throw new Error(`mcp: tool ${name} checks unknown permission authz.${perm}`)
    ids.push(`tool:${name}`, `tool:${name}=${key}`)
  }
  for (const [, ref] of go.matchAll(
    /\.AddResource(?:Template)?\(&mcp\.Resource(?:Template)?\{[^}]*?\bURI(?:Template)?: (\w+|"[^"]*")/g,
  )) {
    const uri = ref.startsWith('"') ? ref.slice(1, -1) : constants.get(ref)
    if (uri === undefined) throw new Error(`mcp: cannot resolve resource URI ${ref}`)
    ids.push(`resource:${uri}`)
  }
  for (const [, name] of go.matchAll(/\.AddPrompt\(&mcp\.Prompt\{Name: "([^"]+)"/g)) ids.push(`prompt:${name}`)
  return ids
}

export const catalogs: Catalog[] = [
  {
    name: 'mcp',
    dataFile: 'src/data/mcp.yaml',
    extract(root) {
      const dir = join(root, 'internal/mcpserver')
      const files = readdirSync(dir).filter((f) => f.endsWith('.go') && !f.endsWith('_test.go'))
      const permissions = parseStringConstants(readFileSync(join(root, 'internal/authz/permissions.go'), 'utf8'))
      return parseMcpServer(
        files.map((f) => readFileSync(join(dir, f), 'utf8')),
        permissions,
      )
    },
    dataIds: (rows) =>
      rows.flatMap((r) => [
        `${r.type}:${r.id}`,
        ...(r.type === 'tool' && r.permission ? [`tool:${r.id}=${r.permission}`] : []),
      ]),
  },
]
