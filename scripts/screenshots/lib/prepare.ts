/**
 * Prepares the Acme demo for the shots that need state the seed doesn't have (`prepare` in the manifest), through the
 * public HTTP API of the running dev server, as the demo's people and an MCP client would:
 *
 * - connects Acme Newsletter to the recorded model (lib/model-fixture.ts) as an OpenAI-compatible server, tests tool
 *   calling and turns the agent on;
 * - saves a brand voice by hand, then learns one from three sent campaigns and saves it (revision 2);
 * - leaves two agent runs (one with a plan ready to build, one built and waiting for review) and one Draft from a
 *   brief proposal waiting for review;
 * - registers an external MCP client, allows it for Acme Newsletter as Linh, shares one sent campaign with it and has
 *   it propose a new draft over MCP.
 *
 * The upstream checkout is not changed.
 */
import { createHash, randomBytes } from 'node:crypto'
import type { APIRequestContext } from '@playwright/test'
import { AGENT_BRIEF, AGENT_LINK, DRAFT_BRIEF, DRAFT_LINK, EXTERNAL_PROPOSAL } from '../manifest.ts'
import { FIXTURE_MODEL } from './model-fixture.ts'

const WS = 'acme-newsletter'

async function ok<T>(r: Awaited<ReturnType<APIRequestContext['get']>>, what: string): Promise<T> {
  if (!r.ok()) throw new Error(`${what} answered ${r.status()}: ${(await r.text()).slice(0, 300)}`)
  const text = await r.text()
  return (text ? JSON.parse(text) : undefined) as T
}

type Run = { id: string; state: string; version: number; planRevision: number; pauseReason?: string }

async function waitForRun(api: APIRequestContext, app: string, id: string, states: string[]): Promise<Run> {
  const deadline = Date.now() + 120_000
  for (;;) {
    const run = await ok<Run>(await api.get(`${app}/api/v1/workspaces/${WS}/ai/agent/runs/${id}`), 'get-ai-agent-run')
    if (states.includes(run.state)) return run
    if (run.state === 'paused') throw new Error(`agent run ${id} paused: ${run.pauseReason}`)
    if (Date.now() > deadline) throw new Error(`agent run ${id} is still ${run.state} after two minutes`)
    await new Promise((r) => setTimeout(r, 1000))
  }
}

/**
 * Saves a brand voice by hand (revision 1), then learns a suggestion from three sent campaigns with the workspace's
 * model and saves it (revision 2), as a person does in Brand kit › Brand voice.
 */
async function prepareVoice(api: APIRequestContext, app: string): Promise<void> {
  const base = `${app}/api/v1/workspaces/${WS}`
  const current = await ok<{ revision?: number }>(await api.get(`${base}/brand-kit/voice`), 'get-brand-voice')
  const revision = current.revision ?? 0
  await ok(
    await api.put(`${base}/brand-kit/voice`, {
      data: {
        baseRevision: revision,
        content: {
          tone: 'Friendly and precise',
          address: 'You',
          sentenceLength: 'Short',
          preferredWords: '',
          avoidedWords: '',
          examples: '',
        },
      },
    }),
    'save-brand-voice',
  )
  const campaigns = await ok<{ items: Campaign[] }>(
    await api.get(`${base}/campaigns?pageSize=100&channel=email&status=sent`),
    'list-campaigns',
  )
  const ids = ['October Product Update', 'Engineering blog roundup #2', 'Beta Program: October check-in']
    .map((name) => campaigns.items.find((c) => c.name === name)?.id)
    .filter(Boolean)
  const learned = await ok<{ requestId: string; content: unknown }>(
    await api.post(`${base}/ai/brand-voice`, { data: { campaignIds: ids, sharingReviewed: true } }),
    'learn-brand-voice',
  )
  await ok(
    await api.put(`${base}/brand-kit/voice`, {
      data: { baseRevision: revision + 1, content: learned.content, suggestionId: learned.requestId },
    }),
    'save-brand-voice',
  )
}

/**
 * Prepares what the `prepare` shots show: the recorded model at `modelUrl` with the agent on, then the brand voice
 * (learned with that model), the agent runs and the Draft from a brief proposal (which use that voice), and the
 * external connection with its proposal.
 */
export async function prepare(api: APIRequestContext, app: string, modelUrl: string): Promise<void> {
  await connectModel(api, app, modelUrl)
  await prepareVoice(api, app)
  await prepareAgent(api, app)
  await prepareExternal(api, app)
}

/** Replaces Acme Newsletter's model with the recorded one at `baseUrl`, tests tool calling and turns the agent on. */
async function connectModel(api: APIRequestContext, app: string, baseUrl: string): Promise<void> {
  const ai = `${app}/api/v1/workspaces/${WS}/ai`
  await ok(await api.delete(`${ai}/connection`), 'disconnect-ai-model')
  await ok(
    await api.put(`${ai}/connection`, {
      data: {
        provider: 'compatible',
        label: 'Ollama',
        baseUrl,
        model: FIXTURE_MODEL,
        capKind: 'usd',
        capUsd: 25,
        inputPrice: 0.4,
        outputPrice: 1.6,
      },
    }),
    'connect-ai-model',
  )
  await ok(await api.post(`${ai}/agent/test`), 'test-ai-agent-tools')
  const settings = await ok<{ revision: number }>(await api.get(`${ai}/agent/settings`), 'get-ai-agent-settings')
  await ok(
    await api.put(`${ai}/agent/settings`, {
      data: {
        enabled: true,
        limits: { toolCalls: 40, tokens: 300_000, costMicros: 2_000_000 },
        revision: settings.revision,
      },
    }),
    'set-ai-agent-settings',
  )
}

/** Leaves a run built and waiting for review, a run with its plan ready to build, and one undecided draft proposal. */
async function prepareAgent(api: APIRequestContext, app: string): Promise<void> {
  const ai = `${app}/api/v1/workspaces/${WS}/ai`
  const start = async () =>
    ok<Run>(
      await api.post(`${ai}/agent/runs`, {
        data: {
          sharingReviewed: true,
          brief: AGENT_BRIEF,
          language: 'en',
          kind: 'campaign',
          links: [AGENT_LINK],
          requestKey: randomBytes(16).toString('hex'),
        },
      }),
      'start-ai-agent',
    )
  // The run in review first, so the run list shows the ready one on top.
  const built = await waitForRun(api, app, (await start()).id, ['ready'])
  await ok(
    await api.post(`${ai}/agent/runs/${built.id}/actions`, {
      data: { action: 'build', version: built.version, planRevision: built.planRevision },
    }),
    'act-on-ai-agent-run',
  )
  await waitForRun(api, app, built.id, ['review'])
  await waitForRun(api, app, (await start()).id, ['ready'])
  // A one-shot proposal left undecided: "Proposals awaiting your review" lists it for 24 hours.
  await ok(
    await api.post(`${ai}/drafts/campaigns`, {
      data: {
        sharingReviewed: true,
        brief: DRAFT_BRIEF,
        name: 'Scheduled rollouts',
        language: 'en',
        links: [DRAFT_LINK],
      },
    }),
    'draft-campaign',
  )
}

const b64url = (b: Buffer) => b.toString('base64url')

/** The redirect an MCP client registered: an HTTPS callback the browser never follows in the shots. */
const CALLBACK = 'https://chatgpt.com/connector_platform_oauth_redirect'

type Client = { client_id: string }

/** Registers a client (RFC 7591) and starts an authorization request; returns its consent path and PKCE verifier. */
export async function startAuthorization(
  api: APIRequestContext,
  app: string,
  clientName = 'ChatGPT',
): Promise<{ consentPath: string; verifier: string; client: string; state: string }> {
  const client = await ok<Client>(
    await api.post(`${app}/oauth/mcp/register`, {
      headers: { 'Content-Type': 'application/json' },
      data: {
        client_name: clientName,
        redirect_uris: [CALLBACK],
        token_endpoint_auth_method: 'none',
        grant_types: ['authorization_code', 'refresh_token'],
        response_types: ['code'],
      },
    }),
    'register',
  )
  const verifier = b64url(randomBytes(32))
  const challenge = b64url(createHash('sha256').update(verifier).digest())
  const state = b64url(randomBytes(12))
  const query = new URLSearchParams({
    client_id: client.client_id,
    redirect_uri: CALLBACK,
    response_type: 'code',
    scope: 'editorial:read reports:read drafts:propose',
    state,
    resource: `${app}/mcp/connect`,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  })
  const r = await api.get(`${app}/oauth/mcp/authorize?${query}`, { maxRedirects: 0 })
  const location = r.headers()['location']
  if (r.status() !== 303 || !location) throw new Error(`authorize answered ${r.status()}: ${await r.text()}`)
  const u = new URL(location, app)
  return { consentPath: `${u.pathname}${u.search}`, verifier, client: client.client_id, state }
}

type Campaign = { id: string; name: string }

/**
 * Demo campaigns to share with the external client, in order of preference. Their images must be ones the dev server
 * serves (the WordPress import's aren't), and campaigns with polls, feeds or conditional blocks are refused.
 */
const SOURCE_CAMPAIGNS = ['Partner webinar', 'Feature flags preview', 'Re-engagement wave 2']

/** One JSON-RPC call to the external MCP endpoint (Streamable HTTP, JSON or one SSE event back). */
async function mcp(
  api: APIRequestContext,
  app: string,
  token: string,
  session: string | undefined,
  method: string,
  params: unknown,
  id?: number,
): Promise<{ session?: string; result?: { structuredContent?: unknown; isError?: boolean; content?: unknown } }> {
  const r = await api.post(`${app}/mcp/connect`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json, text/event-stream',
      'Content-Type': 'application/json',
      'MCP-Protocol-Version': '2025-11-25',
      ...(session ? { 'Mcp-Session-Id': session } : {}),
    },
    data: { jsonrpc: '2.0', method, params, ...(id === undefined ? {} : { id }) },
  })
  if (!r.ok()) throw new Error(`MCP ${method} answered ${r.status()}: ${(await r.text()).slice(0, 300)}`)
  const text = await r.text()
  const json = text.startsWith('{') ? text : (/^data: (.*)$/m.exec(text)?.[1] ?? '{}')
  return { session: r.headers()['mcp-session-id'] ?? session, ...(JSON.parse(json || '{}') as object) }
}

/**
 * Allows a client for Acme Newsletter as the signed-in member, shares one sent campaign with it and has it propose a
 * new draft from that source over MCP. Leaves one connection and one proposal waiting for review.
 */
async function prepareExternal(api: APIRequestContext, app: string): Promise<void> {
  const auth = await startAuthorization(api, app)
  const request = new URL(auth.consentPath, app).searchParams.get('request')!
  await ok(await api.get(`${app}/api/v1/mcp-connect/consent?request=${encodeURIComponent(request)}`), 'get-mcp-consent')
  const decided = await ok<{ redirect: string }>(
    await api.post(`${app}/api/v1/workspaces/${WS}/mcp-connect/consent`, {
      data: {
        request,
        scopes: ['editorial:read', 'reports:read', 'drafts:propose'],
        lists: [],
        senderDomains: [],
        allowedIps: [],
      },
    }),
    'decide-mcp-consent',
  )
  const code = new URL(decided.redirect).searchParams.get('code')
  if (!code) throw new Error(`consent redirect without a code: ${decided.redirect}`)
  const token = await ok<{ access_token: string }>(
    await api.post(`${app}/oauth/mcp/token`, {
      form: {
        grant_type: 'authorization_code',
        code,
        code_verifier: auth.verifier,
        redirect_uri: CALLBACK,
        client_id: auth.client,
        resource: `${app}/mcp/connect`,
      },
    }),
    'token',
  )
  const connections = await ok<{ items: { id: string }[] }>(
    await api.get(`${app}/api/v1/workspaces/${WS}/mcp-connect/connections`),
    'list-mcp-connections',
  )
  const campaigns = await ok<{ items: Campaign[] }>(
    await api.get(`${app}/api/v1/workspaces/${WS}/campaigns?pageSize=100&channel=email`),
    'list-campaigns',
  )
  // Campaigns whose blocks can't be projected for a model (polls, feeds, conditional blocks) are refused; share the
  // first of these that the projection accepts.
  const selectPath = `${app}/api/v1/workspaces/${WS}/mcp-connect/connections/${connections.items[0]!.id}/sources`
  let shared = false
  for (const name of SOURCE_CAMPAIGNS) {
    const source = campaigns.items.find((c) => c.name === name)
    if (!source) continue
    const r = await api.post(selectPath, { data: { sharingReviewed: true, kind: 'campaign', id: source.id } })
    if (r.ok()) {
      shared = true
      break
    }
  }
  if (!shared) throw new Error(`none of ${SOURCE_CAMPAIGNS.join(', ')} could be shared with the external client`)
  const init = await mcp(
    api,
    app,
    token.access_token,
    undefined,
    'initialize',
    {
      protocolVersion: '2025-11-25',
      capabilities: {},
      clientInfo: { name: 'docs-screenshots', version: '1.0.0' },
    },
    1,
  )
  await mcp(api, app, token.access_token, init.session, 'notifications/initialized', {})
  const call = async (name: string, args: unknown, id: number) => {
    const out = await mcp(api, app, token.access_token, init.session, 'tools/call', { name, arguments: args }, id)
    if (out.result?.isError) throw new Error(`MCP ${name} failed: ${JSON.stringify(out.result.content)}`)
    return out.result?.structuredContent as Record<string, unknown>
  }
  const listed = (await call('list_sources', {}, 2)) as { sources: { handle: string; kind: string }[] }
  const handle = listed.sources.find((s) => s.kind === 'campaign')!.handle
  const read = (await call('read_source', { source: handle }, 3)) as {
    text: string
    links: string[]
    images?: string[]
    tokens: string[]
  }
  // Every link and image of the source must stay in the proposal; text tokens stay in text.
  const greeting = read.tokens[0] ? `Hi ${read.tokens[0]},` : 'Hi there,'
  const images = (read.images ?? []).map((src) => `<mj-image src="${src}" alt="Acme" width="120px" />`).join('')
  const buttons = read.links.map((href) => `<mj-button href="${href}">Open the webinar page</mj-button>`).join('')
  const mjml =
    `<mjml><mj-body><mj-section><mj-column>${images}` +
    '<mj-text font-size="22px" font-weight="700">The recording is ready</mj-text>' +
    `<mj-text font-size="16px" line-height="1.6">${greeting} thanks for joining us on Thursday. The full session ` +
    'on building on the Acme API with our partners is online now, with an answer to every question from the ' +
    'chat.</mj-text>' +
    buttons +
    '</mj-column></mj-section></mj-body></mjml>'
  await call(
    'propose_email',
    {
      key: randomBytes(8).toString('hex'),
      kind: 'campaign',
      source: handle,
      change: false,
      name: EXTERNAL_PROPOSAL,
      email: {
        subject: 'The partner webinar recording is ready',
        preheader: 'Watch the 45-minute session on building on the Acme API, with the questions from the chat.',
        mjml,
      },
    },
    4,
  )
}
