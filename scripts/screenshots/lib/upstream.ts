/**
 * Drives the upstream ReputeCast checkout for the screenshot run: recreates the dev database, runs CLI
 * commands (migrate, install, seed, demo send) and waits for the running dev server.
 *
 * Mirrors hostrepute/reputecast's Makefile (`make seed`, DEV_DB, PG_PORT read from .env) so the run uses the
 * same database as `make dev`.
 */
import { execFile } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { setTimeout as sleep } from 'node:timers/promises'
import { promisify } from 'node:util'

const run = promisify(execFile)

export type Upstream = {
  /** The upstream checkout. */
  src: string
  /** The Postgres port of the dev services. */
  pgPort: string
  /** The CLI binary built from the checkout (see buildCli). */
  bin: string
  /** The app origin; seed and install store it as the instance's public URL, as `make dev` serves it. */
  publicUrl: string
}

/** PG_PORT from the environment, else from the checkout's .env (as the Makefile reads it), else 5432. */
function pgPortOf(src: string): string {
  if (process.env.PG_PORT) return process.env.PG_PORT
  const env = resolve(src, '.env')
  const line = existsSync(env) ? /^PG_PORT=(.*)$/m.exec(readFileSync(env, 'utf8')) : null
  return line?.[1]?.trim() || '5432'
}

export function upstreamFromEnv(tmpDir: string, publicUrl: string): Upstream {
  const src = resolve(process.env.REPUTECAST_SRC ?? '../ReputeCast')
  if (!existsSync(resolve(src, 'cmd/reputecast'))) throw new Error(`REPUTECAST_SRC=${src} is not a ReputeCast checkout`)
  return { src, pgPort: pgPortOf(src), bin: resolve(tmpDir, 'reputecast'), publicUrl }
}

const databaseURL = (u: Upstream, db: string) =>
  `postgres://reputecast:reputecast@localhost:${u.pgPort}/${db}?sslmode=disable`

/** Builds ./cmd/reputecast once per run (same code `go run ./cmd/reputecast` would compile each time). */
export async function buildCli(u: Upstream): Promise<void> {
  mkdirSync(resolve(u.bin, '..'), { recursive: true })
  await run('go', ['build', '-o', u.bin, './cmd/reputecast'], { cwd: u.src, maxBuffer: 64 << 20 })
}

/** Runs the CLI in the checkout against the dev database (development mode); returns stdout. */
export async function reputecast(u: Upstream, args: string[]): Promise<string> {
  try {
    const { stdout } = await run(u.bin, args, {
      cwd: u.src,
      maxBuffer: 64 << 20,
      env: {
        ...process.env,
        REPUTECAST_ENV: 'development',
        REPUTECAST_DATABASE__URL: databaseURL(u, 'reputecast'),
        REPUTECAST_HTTP__PUBLIC_URL: u.publicUrl,
      },
    })
    return stdout
  } catch (err) {
    // execFile's error carries the process output.
    const stderr = err instanceof Error && 'stderr' in err && typeof err.stderr === 'string' ? err.stderr : ''
    const tail = stderr.trim().split('\n').slice(-5).join('\n') || String(err)
    throw new Error(`reputecast ${args.join(' ')} failed: ${tail}`, { cause: err })
  }
}

/** Drops and recreates the dev database (ends the dev server's connections; it reconnects). */
export async function recreateDatabase(u: Upstream): Promise<void> {
  await run('psql', [
    databaseURL(u, 'postgres'),
    '-q',
    '-c',
    'DROP DATABASE IF EXISTS reputecast WITH (FORCE)',
    '-c',
    'CREATE DATABASE reputecast',
  ])
}

/** The temporary password `reputecast install` prints ("  Password    abcd-efgh-…   (temporary: …)"). */
export function parseTempPassword(stdout: string): string {
  const m = /^\s*Password\s+(\S+)\s+\(temporary/m.exec(stdout)
  if (!m) throw new Error(`no temporary password in the install output:\n${stdout}`)
  return m[1]!
}

/**
 * Waits until the dev server answers through the app origin. /readyz isn't proxied by the Vite dev server,
 * so this asks GET /api/v1/meta, which reads the database.
 */
export async function waitForApi(app: string, timeoutMs = 60_000): Promise<void> {
  const deadline = Date.now() + timeoutMs
  let last = ''
  while (Date.now() < deadline) {
    try {
      const r = await fetch(`${app}/api/v1/meta`)
      if (r.ok && r.headers.get('content-type')?.includes('application/json')) return
      last = `${r.status}`
    } catch (err) {
      last = (err as Error).message
    }
    await sleep(1000)
  }
  throw new Error(`the ReputeCast API at ${app} isn't answering (${last}); is upstream \`make dev\` running?`)
}
