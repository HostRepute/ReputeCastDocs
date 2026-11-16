/**
 * A recorded model for the AI agent screenshots: a tiny OpenAI-compatible chat completions server that answers the
 * agent's tool calls with a fixed plan and fixed drafts, so the run, plan and review screens can be captured without
 * a paid model. It answers only what the screenshots need: the connection test, the tool-calling test, one plan and
 * its drafts. Its texts are illustrative, not an evaluation of any model.
 *
 * Upstream reaches it as an "OpenAI-compatible" model on a loopback address, which the dev server allows only with
 * REPUTECAST_PROVIDERS__ALLOW_PRIVATE_NETWORKS=true.
 */
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'

export const FIXTURE_MODEL = 'qwen3-32b'

type ChatMessage = { role: string; content?: unknown; tool_calls?: unknown[]; tool_call_id?: string }
type ChatRequest = { model?: string; messages?: ChatMessage[]; tools?: { function: { name: string } }[] }
type ToolCall = { name: string; args: unknown }

/** The plan the fixture proposes for the docs' brief (AGENT_BRIEF in scripts/screenshots/manifest.ts). */
export const FIXTURE_PLAN = {
  summary: 'Announce feature flags: a campaign, a reminder a week later and a changelog post',
  items: [
    {
      handle: 'update_email',
      kind: 'campaign',
      name: 'Feature flags are generally available',
      purpose: 'Announce that feature flags are generally available and link to the docs.',
      bundle: 'announcement',
      dependsOn: [],
    },
    {
      handle: 'reminder_email',
      kind: 'campaign',
      name: 'Reminder: try feature flags',
      purpose: 'A short follow-up a week later for readers who want a nudge, with the same link.',
      bundle: 'reminder',
      dependsOn: [],
    },
    {
      handle: 'changelog_post',
      kind: 'post',
      name: 'Changelog: feature flags',
      purpose: 'A web post with the full changelog for readers who prefer the site.',
      bundle: 'changelog',
      dependsOn: [],
    },
  ],
  questions: [],
}

/** The first binding of a kind the server put into the request (`https://reputecast.invalid/link/1/end`). */
function binding(text: string, kind: 'link' | 'image'): string | undefined {
  return new RegExp(`https://reputecast\\.invalid/${kind}/[A-Za-z0-9_]+/end`).exec(text)?.[0]
}

function email(heading: string, body: string[], button: string, link: string | undefined): string {
  const paragraphs = body.map((p) => `<mj-text font-size="16px" line-height="1.6">${p}</mj-text>`).join('')
  const cta = link ? `<mj-button href="${link}">${button}</mj-button>` : ''
  return `<mjml><mj-body><mj-section><mj-column><mj-text font-size="24px" font-weight="600">${heading}</mj-text>${paragraphs}${cta}</mj-column></mj-section></mj-body></mjml>`
}

function drafts(text: string): ToolCall[] {
  const link = binding(text, 'link')
  return [
    {
      name: 'stage_campaign',
      args: {
        handle: 'update_email',
        email: {
          subject: 'Feature flags are generally available',
          preheader: 'Target rollouts by plan, region or percentage, with an audit trail for every change.',
          mjml: email(
            'Feature flags are generally available',
            [
              'Feature flags left beta this week. You can target a rollout by plan, region or percentage, and every change is recorded in the audit trail.',
              'Existing flags keep working as they are. New projects get flags by default.',
            ],
            'Read the docs',
            link,
          ),
        },
      },
    },
    {
      name: 'stage_campaign',
      args: {
        handle: 'reminder_email',
        email: {
          subject: 'Have you tried feature flags yet?',
          preheader: 'Five minutes to your first targeted rollout.',
          mjml: email(
            'Five minutes to your first rollout',
            ['Last week feature flags became generally available. The quickstart walks you through a first rollout.'],
            'Open the quickstart',
            link,
          ),
        },
      },
    },
    {
      name: 'stage_post',
      args: {
        handle: 'changelog_post',
        post: {
          title: 'Feature flags are generally available',
          excerpt: 'Targeting by plan, region or percentage, and an audit trail for every change.',
          mjml: email(
            'What changed',
            [
              'Targeting: roll a flag out by plan, region or a percentage of accounts.',
              'Audit trail: every change records who made it and when.',
              'Defaults: new projects get flags without any setup.',
            ],
            'Read the docs',
            link,
          ),
        },
      },
    },
  ]
}

const tokens = (s: string) => Math.max(1, Math.ceil(s.length / 4))

/** The text of every message part, in order (system, user, assistant and tool turns). */
function promptText(messages: ChatMessage[]): string {
  return messages.map((m) => (typeof m.content === 'string' ? m.content : JSON.stringify(m.content ?? ''))).join('\n')
}

/** The JSON inside `<name>…</name>` of the prompt (ai/prompts.go `tag`). */
function tagged<T>(text: string, name: string): T | undefined {
  const m = new RegExp(`<${name}>\\n([\\s\\S]*?)\\n</${name}>`).exec(text)
  try {
    return m ? (JSON.parse(m[1]!) as T) : undefined
  } catch {
    return undefined
  }
}

type DraftContext = { Brief?: string; Links?: string[]; Images?: string[]; Tokens?: string[] }

/** A one-shot campaign draft (ai/drafts.go): keeps every link, image and token binding it was given. */
function campaignDraft(text: string): string {
  const c = tagged<DraftContext>(text, 'draft_context') ?? {}
  const images = (c.Images ?? []).map((src) => `<mj-image src="${src}" alt="Acme" width="120px" />`).join('')
  const greeting = c.Tokens?.length ? `Hi ${c.Tokens.join(' ')},` : 'Hi there,'
  const buttons = (c.Links ?? []).map((href) => `<mj-button href="${href}">Read the docs</mj-button>`).join('')
  const mjml =
    `<mjml><mj-body><mj-section><mj-column>${images}` +
    `<mj-text font-size="24px" font-weight="600">Scheduled rollouts are here</mj-text>` +
    `<mj-text font-size="16px" line-height="1.6">${greeting}</mj-text>` +
    '<mj-text font-size="16px" line-height="1.6">You can now schedule a flag change for a time and time zone you ' +
    'pick. ReputeCast applies it on its own and records it in the audit trail.</mj-text>' +
    '<mj-text font-size="16px" line-height="1.6">Try it on a small rollout first: pick a flag, choose Schedule and ' +
    'set the time.</mj-text>' +
    `${buttons}</mj-column></mj-section></mj-body></mjml>`
  return JSON.stringify({
    subject: 'Schedule flag changes for any time zone',
    preheader: 'Pick a time, and the change goes out on its own.',
    mjml,
  })
}

/** A brand voice suggestion (ai/voice.go). */
const VOICE = {
  tone: 'Calm, specific and helpful. Lead with what changed, then why it matters.',
  address: 'Speak to the reader as you; we for the Acme team.',
  sentenceLength: 'Short sentences, one idea each. Paragraphs of two or three sentences.',
  preferredWords: 'ship, try, roll out, change, in a few minutes',
  avoidedWords: 'revolutionary, game-changing, seamless, leverage',
  examples: 'Scheduled rollouts are here. Pick a time, and the change goes out on its own.',
}

function answer(req: ChatRequest): { text?: string; calls?: ToolCall[] } {
  const tools = new Set((req.tools ?? []).map((t) => t.function.name))
  const messages = req.messages ?? []
  const text = promptText(messages)
  const afterTools = messages.at(-1)?.role === 'tool'
  if (tools.has('check_tools')) return { calls: [{ name: 'check_tools', args: { value: 'ready' } }] }
  if (tools.has('propose_plan'))
    return afterTools
      ? { text: 'The plan is ready for your review.' }
      : { text: 'Here is a plan for the update.', calls: [{ name: 'propose_plan', args: FIXTURE_PLAN }] }
  if (tools.has('stage_campaign'))
    return afterTools ? { text: 'All three drafts are staged for your review.' } : { calls: drafts(text) }
  if (text.includes('Draft one complete email in the requested language')) return { text: campaignDraft(text) }
  if (text.includes('Describe the writing style shared by these selected campaign samples'))
    return { text: JSON.stringify(VOICE) }
  return { text: 'Ready.' }
}

/** Starts the fixture on a loopback port (default: a free one); returns its base URL (with /v1) and the server. */
export async function startModelFixture(port = 0): Promise<{ baseUrl: string; server: Server }> {
  const server = createServer((req, res) => {
    const chunks: Buffer[] = []
    req.on('data', (c: Buffer) => chunks.push(c))
    req.on('end', () => {
      res.setHeader('Content-Type', 'application/json')
      if (req.method === 'GET' && req.url?.endsWith('/models')) {
        res.end(JSON.stringify({ object: 'list', data: [{ id: FIXTURE_MODEL, object: 'model' }] }))
        return
      }
      if (req.method !== 'POST' || !req.url?.endsWith('/chat/completions')) {
        res.statusCode = 404
        res.end(JSON.stringify({ error: { message: 'not found' } }))
        return
      }
      const body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}') as ChatRequest
      const out = answer(body)
      const calls = (out.calls ?? []).map((c, i) => ({
        id: `call_${Date.now().toString(36)}_${i}`,
        type: 'function',
        function: { name: c.name, arguments: JSON.stringify(c.args) },
      }))
      const reply = JSON.stringify(out)
      res.end(
        JSON.stringify({
          id: `chatcmpl-${Date.now().toString(36)}`,
          object: 'chat.completion',
          model: body.model ?? FIXTURE_MODEL,
          choices: [
            {
              index: 0,
              message: { role: 'assistant', content: out.text ?? null, ...(calls.length ? { tool_calls: calls } : {}) },
              finish_reason: calls.length ? 'tool_calls' : 'stop',
            },
          ],
          usage: { prompt_tokens: tokens(JSON.stringify(body)), completion_tokens: tokens(reply) },
        }),
      )
    })
  })
  await new Promise<void>((done) => server.listen(port, '127.0.0.1', done))
  const address = server.address() as AddressInfo
  return { baseUrl: `http://127.0.0.1:${address.port}/v1`, server }
}
