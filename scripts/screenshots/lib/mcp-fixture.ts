/**
 * A fake remote MCP server for the AI assistant screenshots: a tiny Streamable HTTP server (JSON responses, no
 * sessions, no sign-in) with three issue-tracker tools, so the MCP servers page, the tool review and the assistant's
 * confirmation card can be captured without a real service. It answers only what the screenshots need: initialize,
 * tools/list and tools/call. Its names and texts are illustrative; no real tracker was tried.
 *
 * Upstream reaches it on a loopback address, which the dev server allows only with
 * REPUTECAST_PROVIDERS__ALLOW_PRIVATE_NETWORKS=true. It listens on a fixed port so the address the screenshots show
 * doesn't change between runs.
 */
import { createServer, type Server } from 'node:http'

export const MCP_FIXTURE_PORT = 47391
export const MCP_FIXTURE_NAME = 'Acme Tracker'

type Tool = { name: string; description: string; inputSchema: unknown; annotations: Record<string, unknown> }

/** The tools, in the order the server lists them: one that reads, one that writes, one left for review. */
export const MCP_FIXTURE_TOOLS: Tool[] = [
  {
    name: 'search_issues',
    description:
      'Search Acme Tracker issues by text. Returns up to 10 matching issues with their key, title, state and assignee.',
    inputSchema: {
      type: 'object',
      properties: { query: { type: 'string', description: 'Words to search for in titles and descriptions' } },
      required: ['query'],
    },
    annotations: { title: 'Search issues', readOnlyHint: true },
  },
  {
    name: 'create_issue',
    description: 'Create an issue in the Newsletter team with a title and an optional description.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'A short summary' },
        description: { type: 'string', description: 'Details, in Markdown' },
      },
      required: ['title'],
    },
    annotations: { title: 'Create issue', readOnlyHint: false, destructiveHint: false },
  },
  {
    name: 'add_comment',
    description: 'Add a comment to an existing issue, by its key (such as NEWS-142).',
    inputSchema: {
      type: 'object',
      properties: { issue: { type: 'string' }, body: { type: 'string' } },
      required: ['issue', 'body'],
    },
    annotations: { title: 'Add comment', readOnlyHint: false },
  },
]

type Rpc = { jsonrpc: '2.0'; id?: number | string; method: string; params?: Record<string, unknown> }

function answer(rpc: Rpc): unknown {
  switch (rpc.method) {
    case 'initialize':
      return {
        protocolVersion: rpc.params?.protocolVersion ?? '2025-11-25',
        capabilities: { tools: {} },
        serverInfo: { name: 'acme-tracker', version: '1.0.0' },
      }
    case 'tools/list':
      return { tools: MCP_FIXTURE_TOOLS }
    case 'tools/call': {
      const name = String(rpc.params?.name ?? '')
      const text =
        name === 'search_issues'
          ? 'NEWS-142 Outlook bounces after the October send (open, Daniel Park)\nNEWS-128 Weekly Digest images too wide on Gmail (done, Sofia Rossi)'
          : name === 'create_issue'
            ? 'Created NEWS-151.'
            : 'Comment added.'
      return { content: [{ type: 'text', text }], isError: false }
    }
    case 'ping':
      return {}
  }
  return undefined
}

/** Starts the fake server on MCP_FIXTURE_PORT; its MCP endpoint is `url`. */
export async function startMcpFixture(): Promise<{ server: Server; url: string }> {
  const server = createServer((req, res) => {
    if (req.method !== 'POST') {
      // No server-initiated stream: the client gives up on GET, as the specification allows.
      res.writeHead(405, { Allow: 'POST' }).end()
      return
    }
    let body = ''
    req.on('data', (chunk: Buffer) => (body += chunk.toString()))
    req.on('end', () => {
      let rpc: Rpc
      try {
        rpc = JSON.parse(body) as Rpc
      } catch {
        res.writeHead(400).end()
        return
      }
      // Notifications (initialized, cancelled) get no answer.
      if (rpc.id === undefined) {
        res.writeHead(202).end()
        return
      }
      const result = answer(rpc)
      const reply =
        result === undefined
          ? { jsonrpc: '2.0', id: rpc.id, error: { code: -32601, message: `Method not found: ${rpc.method}` } }
          : { jsonrpc: '2.0', id: rpc.id, result }
      res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify(reply))
    })
  })
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(MCP_FIXTURE_PORT, '127.0.0.1', resolve)
  })
  return { server, url: `http://127.0.0.1:${MCP_FIXTURE_PORT}/mcp` }
}
