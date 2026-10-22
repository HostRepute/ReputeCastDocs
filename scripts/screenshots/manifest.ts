/**
 * Every app screenshot the docs use. Capture with `pnpm shots` (scripts/screenshots/capture.ts); pages show
 * them with <Screenshot id="…">. Paths marked "qa-map: <Board>" are copied verbatim from that board's entry
 * in hostrepute/reputecast web/scripts/qa-map.ts.
 *
 * Features without Vietnamese UI upstream (no messages.vi.ts) are captured in English only; the drift check
 * (pnpm upstream:check) reports when one of them gains Vietnamese files.
 */

export type Shot = {
  id: string // file name, kebab-case
  path: string // app path; '{kind:Name}' placeholders resolved through the API
  feature: string // upstream web/src/features/<folder> the screen lives in ('shell', 'publicpages' allowed)
  sample?: 'acme' | 'northwind' | 'fresh' // default 'acme'
  user?: 'linh' | 'aisha' | 'tomas' | 'anon' | 'owner' // default 'linh'; 'owner' = fresh install owner
  viewport?: 'desktop' | 'tablet' | 'mobile' // 1440×900 dsf1 | 834×1112 dsf1 | 390×844 dsf2; default desktop
  fullPage?: boolean // default false (viewport only)
  clip?: string // CSS selector: capture only this element at dsf 2
  before?: ({ click: string } | { hover: string } | { press: string } | { fill: [string, string] } | { wait: number })[]
  waitFor?: string // selector that must be visible before capture
  mask?: string[] // selectors masked (volatile values)
  markers?: { n: number; selector: string }[] // numbered callouts; selectors must be structural (ids, hrefs, data-*, roles), never text
  locales?: ('en' | 'vi')[] // default both
  demoSend?: { campaign: string; scenario: 'normal' | 'outlook-complaints' | 'postal-outage'; elapsed: string }
}

/** Features with no Vietnamese message files upstream yet: their shots are English only. */
export const englishOnlyFeatures = [
  'whatsapp',
  'push',
  'transactional',
  'products',
  'pages',
  'commerce',
  'website',
  'ai',
  'verification',
  'placement',
  'surveys',
  'polls',
  'conditional',
  'digests',
  'page-languages',
  'publicpages',
]

const ws = '/w/acme-newsletter'
const en: Shot['locales'] = ['en']

export const shots: Shot[] = [
  { id: 'sign-in', path: '/sign-in', feature: 'auth', user: 'anon' },
  { id: 'setup-password', path: '/setup', feature: 'auth', sample: 'fresh', user: 'owner' },
  {
    id: 'overview',
    path: `${ws}`,
    feature: 'overview',
    markers: [
      { n: 1, selector: 'section[aria-labelledby="ov-health-h"]' },
      { n: 2, selector: 'section[aria-labelledby="ov-next-h"]' },
      { n: 3, selector: 'section[aria-labelledby="ov-providers-h"] > :has(> article)' },
    ],
  },
  { id: 'overview-mobile', path: `${ws}`, feature: 'overview', viewport: 'mobile' },

  // Sending providers and the connect wizard
  { id: 'providers-catalog', path: `${ws}/providers/connect`, feature: 'connect' },
  {
    id: 'connect-ses-connection',
    path: `${ws}/providers/connect/ses?setup={setup:ses}&step=connection`,
    feature: 'connect',
  },
  {
    id: 'connect-domain',
    path: `${ws}/providers/connect/ses?setup={setup:ses}&step=domain`,
    feature: 'connect',
    // DKIM (first of three), Return-path / MAIL FROM, SPF for the sending domain, DMARC, verification status.
    markers: [
      { n: 1, selector: 'main table tbody tr:nth-child(1)' },
      { n: 2, selector: 'main table tbody tr:nth-child(4)' },
      { n: 3, selector: 'main table tbody tr:nth-child(6)' },
      { n: 4, selector: 'main table tbody tr:nth-child(7)' },
      { n: 5, selector: 'main span[role="status"]' },
    ],
  },
  { id: 'connect-test-send', path: `${ws}/providers/connect/ses?setup={setup:ses}&step=test`, feature: 'connect' },
  { id: 'connect-streams', path: `${ws}/providers/connect/ses?setup={setup:ses}&step=streams`, feature: 'connect' },
  { id: 'connect-done', path: `${ws}/providers/connect/ses?setup={setup:ses}&step=done`, feature: 'connect' },
  {
    id: 'connect-mailgun-error',
    path: `${ws}/providers/connect/mailgun?setup={setup:mailgun}&step=connection`,
    feature: 'connect',
  },
  { id: 'providers-list', path: `${ws}/providers`, feature: 'providers' },
  { id: 'providers-routing', path: `${ws}/providers/routing`, feature: 'providers' },
  { id: 'providers-routing-mobile', path: `${ws}/providers/routing`, feature: 'providers', viewport: 'mobile' },
  { id: 'providers-warmup', path: `${ws}/providers/warmup`, feature: 'providers' },
  { id: 'providers-events', path: `${ws}/providers/events`, feature: 'providers' },
  { id: 'providers-adapters', path: `${ws}/providers/adapters`, feature: 'providers' },
  { id: 'settings-senders', path: `${ws}/settings/senders`, feature: 'senders' },
  { id: 'settings-sender-domain', path: `${ws}/settings/senders/{domain:news.acme.io}`, feature: 'senders' },
  { id: 'settings-providers', path: `${ws}/settings/providers`, feature: 'settings' },

  // Campaigns, composer, Send Readiness, live monitor, reports
  { id: 'campaigns-list', path: `${ws}/campaigns`, feature: 'campaigns' },
  { id: 'campaigns-list-mobile', path: `${ws}/campaigns`, feature: 'campaigns', viewport: 'mobile' },
  {
    id: 'composer',
    path: `${ws}/campaigns/{campaign:Weekly Digest #142}/edit?select=2`,
    feature: 'composer',
    // Blocks panel, canvas, inspector, top bar actions.
    markers: [
      { n: 1, selector: 'aside:has([id$="-trigger-blocks"])' },
      { n: 2, selector: '#main [role="region"]' },
      { n: 3, selector: 'aside:has([id$="-trigger-style"])' },
      { n: 4, selector: 'header > :last-child' },
    ],
  },
  { id: 'composer-empty', path: `${ws}/campaigns/{campaign:Untitled campaign}/edit`, feature: 'composer' },
  { id: 'composer-code', path: `${ws}/campaigns/{campaign:Weekly Digest #142}/edit?view=mjml`, feature: 'composer' },
  {
    id: 'composer-preview',
    path: `${ws}/campaigns/{campaign:Weekly Digest #142}/edit?view=preview`,
    feature: 'composer',
  },
  {
    id: 'composer-mobile',
    path: `${ws}/campaigns/{campaign:Weekly Digest #142}/edit?select=2`,
    feature: 'composer',
    viewport: 'mobile',
  },
  {
    id: 'composer-warnings',
    path: `${ws}/campaigns/{campaign:Flash sale: 48 hours only}/edit?select=1&panel=deliverability`,
    feature: 'composer',
  },
  {
    id: 'composer-visibility',
    path: `${ws}/campaigns/{campaign:Weekly Digest #143}/edit?select=7&panel=settings&left=layers`,
    feature: 'conditional',
    locales: en,
  },
  {
    id: 'composer-poll',
    path: `${ws}/campaigns/{campaign:Weekly Digest #143}/edit?select=9&panel=settings`,
    feature: 'polls',
    locales: en,
  },
  {
    id: 'composer-languages',
    path: `${ws}/campaigns/{campaign:Weekly Digest #143}/edit?language=de`,
    feature: 'composer',
  },
  {
    id: 'composer-compare',
    path: `${ws}/campaigns/{campaign:Weekly Digest #143}/edit?language=de&view=compare`,
    feature: 'composer',
  },
  {
    id: 'composer-accessibility',
    path: `${ws}/campaigns/{campaign:Weekly Digest #143}/edit?select=1-0-0&panel=accessibility`,
    feature: 'composer',
  },
  {
    id: 'survey-builder',
    path: `${ws}/forms/surveys/{survey:Beta feedback · October 2026}?q=q3`,
    feature: 'surveys',
    locales: en,
  },
  {
    id: 'poll-results',
    path: `${ws}/campaigns/{campaign:Weekly Digest #141}/report`,
    feature: 'polls',
    locales: en,
    clip: 'main section.pr',
  },
  {
    id: 'review-send',
    path: `${ws}/campaigns/{campaign:Weekly Digest #142}/review`,
    feature: 'review',
    // Verdict, check groups, audience estimate, schedule and send actions.
    markers: [
      { n: 1, selector: 'main [role="status"]' },
      { n: 2, selector: 'main section[aria-label]' },
      { n: 3, selector: 'section[aria-labelledby="rv-audience"]' },
      { n: 4, selector: 'main [role="status"] .rv-vacts' },
    ],
  },
  {
    id: 'review-send-blocked',
    path: `${ws}/campaigns/{campaign:Flash sale: 48 hours only}/review`,
    feature: 'review',
  },
  {
    id: 'review-send-mobile',
    path: `${ws}/campaigns/{campaign:Weekly Digest #142}/review`,
    feature: 'review',
    viewport: 'mobile',
  },
  { id: 'approval-policy', path: `${ws}/settings/approvals`, feature: 'approvals' },
  { id: 'approval-inbox', path: `${ws}/approvals`, feature: 'approvals' },
  {
    id: 'live-monitor',
    path: `${ws}/campaigns/{campaign:Weekly Digest #142}/live`,
    feature: 'live',
    demoSend: { campaign: 'Weekly Digest #142', scenario: 'normal', elapsed: '20m' },
  },
  {
    id: 'live-monitor-mobile',
    path: `${ws}/campaigns/{campaign:Weekly Digest #142}/live`,
    feature: 'live',
    viewport: 'mobile',
    demoSend: { campaign: 'Weekly Digest #142', scenario: 'normal', elapsed: '20m' },
  },
  {
    id: 'live-monitor-paused',
    path: `${ws}/campaigns/{campaign:Weekly Digest #142}/live`,
    feature: 'live',
    demoSend: { campaign: 'Weekly Digest #142', scenario: 'outlook-complaints', elapsed: '20m' },
  },
  {
    id: 'live-monitor-outage',
    path: `${ws}/campaigns/{campaign:Weekly Digest #142}/live`,
    feature: 'live',
    demoSend: { campaign: 'Weekly Digest #142', scenario: 'postal-outage', elapsed: '17m' },
  },
  {
    id: 'report',
    path: `${ws}/campaigns/{campaign:October Product Update}/report`,
    feature: 'reports',
    fullPage: true,
    // Human vs machine opens, click map, per mailbox provider and per sending provider tables.
    markers: [
      { n: 1, selector: 'section[aria-labelledby="rep-eng-h"]' },
      { n: 2, selector: 'section[aria-labelledby="rep-map-h"]' },
      { n: 3, selector: 'section[aria-labelledby="rep-mb-h"]' },
      { n: 4, selector: 'section[aria-labelledby="rep-sp-h"]' },
    ],
  },
  {
    id: 'report-mobile',
    path: `${ws}/campaigns/{campaign:October Product Update}/report`,
    feature: 'reports',
    viewport: 'mobile',
  },
  {
    id: 'report-ab',
    path: `${ws}/campaigns/{campaign:October Product Update}/report`,
    feature: 'reports',
    clip: 'section[aria-labelledby="rep-ab-h"]',
  },
  {
    id: 'digest-overview',
    path: `${ws}/campaigns/digests/{digest:Engineering blog roundup}`,
    feature: 'digests',
    locales: en,
  },

  // Audience and imports
  { id: 'contacts', path: `${ws}/audience`, feature: 'audience' },
  { id: 'contacts-mobile', path: `${ws}/audience`, feature: 'audience', viewport: 'mobile' },
  { id: 'contact-profile', path: `${ws}/audience/contacts/{contact:sam.rivera@outlook.com}`, feature: 'audience' },
  { id: 'segments', path: `${ws}/audience/segments`, feature: 'audience' },
  { id: 'list-health', path: `${ws}/audience/health`, feature: 'audience' },
  { id: 'suppressions', path: `${ws}/audience/suppressions`, feature: 'audience' },
  { id: 'import-source', path: `${ws}/import`, feature: 'imports' },
  { id: 'import-fields', path: `${ws}/import/{import:draft}/fields`, feature: 'imports' },
  { id: 'import-consent', path: `${ws}/import/{import:draft}/consent`, feature: 'imports' },
  { id: 'import-preview', path: `${ws}/import/{import:draft}/preview`, feature: 'imports' },
  { id: 'import-report', path: `${ws}/import/{import:brevo}/report`, feature: 'imports' },
  { id: 'scoring-rules', path: `${ws}/audience/scoring`, feature: 'scoring' },
  { id: 'growth-sources', path: `${ws}/audience/growth`, feature: 'growth' },
  {
    id: 'verification-services',
    path: `${ws}/settings/integrations/verification`,
    feature: 'verification',
    locales: en,
  },
  {
    id: 'verification-job',
    path: `${ws}/audience/verification/{verification:Sunset}`,
    feature: 'verification',
    locales: en,
  },

  // Automations
  { id: 'automations-list', path: `${ws}/automations`, feature: 'automations' },
  { id: 'automation-flow', path: `${ws}/automations/{automation:Welcome series}?step=n3`, feature: 'automations' },
  { id: 'automation-channels', path: `${ws}/automations/{automation:Acme Summit reminders}`, feature: 'automations' },

  // Transactional
  { id: 'transactional', path: `${ws}/transactional`, feature: 'transactional', locales: en },
  { id: 'transactional-guide', path: `${ws}/transactional/guide?step=1`, feature: 'transactional', locales: en },
  {
    id: 'transactional-template',
    path: `${ws}/transactional/templates/password-reset`,
    feature: 'transactional',
    locales: en,
  },
  {
    id: 'transactional-publish',
    path: `${ws}/transactional/templates/trial-ending?publish=1`,
    feature: 'transactional',
    locales: en,
  },
  { id: 'transactional-messages', path: `${ws}/transactional/messages`, feature: 'transactional', locales: en },
  { id: 'transactional-setup', path: `${ws}/transactional/setup`, feature: 'transactional', locales: en },
  { id: 'transactional-settings', path: `${ws}/transactional/settings`, feature: 'transactional', locales: en },

  // Forms, public pages, website, landing pages
  { id: 'form-builder', path: `${ws}/forms?form={form:Newsletter signup}`, feature: 'forms' },
  {
    id: 'form-builder-mobile',
    path: `${ws}/forms?form={form:Newsletter signup}`,
    feature: 'forms',
    viewport: 'mobile',
  },
  { id: 'public-subscribe', path: '/p/acme-newsletter/subscribe', feature: 'publicpages', user: 'anon', locales: en },
  { id: 'public-archive', path: '/p/acme-newsletter/archive', feature: 'publicpages', user: 'anon', locales: en },
  { id: 'forms-branding', path: `${ws}/forms/branding`, feature: 'forms' },
  { id: 'website-posts', path: `${ws}/forms/website`, feature: 'website', locales: en },
  { id: 'website-home', path: `${ws}/forms/website/home`, feature: 'website', locales: en },
  {
    id: 'website-post-composer',
    path: `${ws}/forms/website/posts/{post:Inside our Postgres migration: the runbook}`,
    feature: 'website',
    locales: en,
  },
  { id: 'pages-list', path: `${ws}/forms/pages`, feature: 'pages', locales: en },
  {
    id: 'page-builder',
    path: `${ws}/forms/pages/{page:The Deliverability Field Guide}?select=buy`,
    feature: 'pages',
    locales: en,
  },

  // Grow and Earn
  { id: 'grow-overview', path: `${ws}/grow`, feature: 'grow' },
  { id: 'referrals', path: `${ws}/grow/referrals`, feature: 'grow' },
  { id: 'recommendations', path: `${ws}/grow/recommendations`, feature: 'grow' },
  { id: 'earn-overview', path: `${ws}/earn`, feature: 'earn' },
  { id: 'earn-connect', path: '/w/acme-engineering-blog/earn/connect', feature: 'earn' },
  { id: 'earn-plans', path: `${ws}/earn/plans`, feature: 'earn' },
  { id: 'earn-upgrade-page', path: `${ws}/earn/plans/upgrade-page`, feature: 'earn' },
  { id: 'earn-members', path: `${ws}/earn/members`, feature: 'earn' },
  { id: 'earn-gifts', path: `${ws}/earn/gifts`, feature: 'earn' },
  { id: 'earn-sponsors', path: `${ws}/earn/sponsors`, feature: 'earn' },
  { id: 'products', path: `${ws}/earn/products?order={order:1311}`, feature: 'products', locales: en },

  // SMS, push and WhatsApp
  { id: 'sms-providers', path: `${ws}/providers/sms`, feature: 'sms' },
  { id: 'sms-routing', path: `${ws}/providers/sms/rules`, feature: 'sms' },
  { id: 'sms-composer', path: `${ws}/campaigns/{campaign:Summit: doors open}/sms`, feature: 'sms' },
  { id: 'sms-report', path: `${ws}/campaigns/{campaign:Summit: 8 days to go}/sms-report`, feature: 'sms' },
  { id: 'push-setup', path: `${ws}/providers/push`, feature: 'push', locales: en },
  {
    id: 'push-composer',
    path: `${ws}/campaigns/{campaign:New post: Feature flags at scale}/push`,
    feature: 'push',
    locales: en,
  },
  { id: 'whatsapp', path: `${ws}/providers/whatsapp`, feature: 'whatsapp', locales: en },

  // Integrations and AI
  { id: 'integrations-catalog', path: `${ws}/settings/integrations`, feature: 'integrations' },
  { id: 'integrations-zapier', path: `${ws}/settings/integrations/zapier`, feature: 'integrations' },
  { id: 'integrations-wordpress', path: `${ws}/settings/integrations/wordpress`, feature: 'integrations' },
  {
    id: 'integrations-shopify',
    path: `${ws}/settings/integrations/stores/{store:Acme Merch}`,
    feature: 'commerce',
    locales: en,
  },
  { id: 'ai-settings', path: `${ws}/settings/integrations/ai`, feature: 'ai', locales: en },
  { id: 'ai-composer', path: `${ws}/campaigns/{campaign:Weekly Digest #143}/edit`, feature: 'ai', locales: en },
  { id: 'settings-hostrepute', path: `${ws}/settings/integrations/hostrepute`, feature: 'hostrepute' },

  // Deliverability
  {
    id: 'deliverability',
    path: `${ws}/deliverability`,
    feature: 'deliverability',
    fullPage: true,
    markers: [
      { n: 1, selector: 'section[aria-labelledby="h-assets"]' },
      { n: 2, selector: 'section[aria-labelledby="h-blocklists"]' },
      { n: 3, selector: 'section[aria-labelledby="h-provider-health"]' },
    ],
  },
  { id: 'deliverability-mobile', path: `${ws}/deliverability`, feature: 'deliverability', viewport: 'mobile' },
  { id: 'placement-tests', path: `${ws}/deliverability/placement`, feature: 'placement', locales: en },
  {
    id: 'placement-result',
    path: `${ws}/deliverability/placement/{placement:Weekly Digest #142 · SES vs Postal}`,
    feature: 'placement',
    locales: en,
  },
  { id: 'placement-seeds', path: `${ws}/deliverability/placement/seeds`, feature: 'placement', locales: en },

  // Workspace, team, account and instance admin
  { id: 'workspace-settings', path: `${ws}/settings`, feature: 'workspace' },
  { id: 'settings-team', path: `${ws}/settings/team`, feature: 'team' },
  { id: 'team-viewer', path: `${ws}/settings/team`, feature: 'team', user: 'aisha' },
  { id: 'roles', path: `${ws}/settings/roles`, feature: 'roles' },
  { id: 'role-editor', path: `${ws}/settings/roles/new?from={role:Content Writer}`, feature: 'roles' },
  { id: 'account-security', path: `${ws}/account`, feature: 'account' },
  // Same page as account-security: capture only the Language & region card.
  { id: 'language-region', path: `${ws}/account`, feature: 'language', clip: '#language' },
  { id: 'notifications', path: `${ws}/notifications`, feature: 'notifications' },
  { id: 'settings-audit', path: `${ws}/settings/audit`, feature: 'audit' },
  { id: 'settings-keys', path: `${ws}/settings/keys`, feature: 'keys' },
  { id: 'settings-mcp', path: `${ws}/settings/mcp`, feature: 'keys' },
  { id: 'settings-webhooks', path: `${ws}/settings/webhooks`, feature: 'webhooks' },
  { id: 'instance-users', path: `${ws}/admin/users`, feature: 'admin' },
  { id: 'instance-auth', path: `${ws}/admin/authentication`, feature: 'admin' },
  { id: 'instance-settings', path: `${ws}/admin/instance`, feature: 'admin' },
  { id: 'sso-setup', path: `${ws}/admin/sso/{sso:Microsoft Entra ID}`, feature: 'admin' },

  // Agency accounts (the Northwind Studio sample)
  { id: 'agency-overview', path: '/w/northwind-studio/agency', feature: 'agency', sample: 'northwind', user: 'tomas' },
  {
    id: 'agency-usage',
    path: '/w/northwind-studio/agency/usage',
    feature: 'agency',
    sample: 'northwind',
    user: 'tomas',
  },
]
