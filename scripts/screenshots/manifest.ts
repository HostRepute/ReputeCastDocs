/**
 * Every app screenshot the docs use. Capture with `pnpm shots` (scripts/screenshots/capture.ts); pages show
 * them with <Screenshot id="…">. Paths marked "qa-map: <Board>" are copied verbatim from that board's entry
 * in hostrepute/reputecast web/scripts/qa-map.ts.
 *
 * Public pages show the newsletter's own content languages, not the app's, and the Acme sample's page copy is
 * English: they are captured in English only. Every app screen is captured in every docs locale (English, German,
 * Spanish, French and Vietnamese), which are the app's languages too.
 */

import type { Lang } from '../../src/lib/locales.ts'
import type { BadgeSide } from './lib/markers.ts'

export type Shot = {
  id: string // file name, kebab-case
  path: string // app path; '{kind:Name}' placeholders resolved through the API
  feature: string // upstream web/src/features/<folder> the screen lives in ('shell', 'publicpages' allowed)
  sample?: 'acme' | 'northwind' | 'fresh' // default 'acme'
  user?: 'linh' | 'aisha' | 'tomas' | 'anon' | 'owner' // default 'linh'; 'owner' = fresh install owner
  // 1440×900 dsf1 | 834×1112 dsf1 | 390×844 dsf2 | 1280×800 dsf2 (the docs home page's hero); default desktop
  viewport?: 'desktop' | 'tablet' | 'mobile' | 'hero'
  // The device's colour scheme (default light). Members on Same as device, as the demo's are, see the app in it.
  theme?: 'dark'
  fullPage?: boolean // default false (viewport only)
  clip?: string // CSS selector: capture only this element at dsf 2
  before?: (
    | { click: string; position?: { x: number; y: number } } // position: from the element's top-left corner
    | { dblclick: string }
    | { hover: string }
    | { press: string }
    // text to type; a search that matches the screen's words takes one per locale ({ en, de, es, fr, vi })
    | { fill: [string, string | Record<Lang, string>] }
    | { wait: number }
  )[]
  waitFor?: string // selector that must be visible before capture
  mask?: string[] // selectors masked (volatile values)
  // numbered callouts; selectors must be structural (ids, hrefs, data-*, roles), never text. `badge` overrides the
  // side the number goes on (default: the first side with room, see badgeSide in lib/markers.ts).
  markers?: { n: number; selector: string; badge?: BadgeSide }[]
  locales?: Lang[] // default every docs locale
  // `reputecast demo send`; `canary` defaults to the CLI's (on in the normal scenario, off in the others)
  demoSend?: {
    campaign: string
    scenario: 'normal' | 'steady' | 'outlook-complaints' | 'postal-outage'
    elapsed: string
    canary?: 'on' | 'off'
  }
}

/** Features whose shots are English only: public pages, which show the newsletter's languages (see above). */
export const englishOnlyFeatures = ['publicpages']

const ws = '/w/acme-newsletter'
const en: Shot['locales'] = ['en']

// The demo's second workspace (Linh is Admin there): it doesn't receive mail yet, and Amazon SES is its only provider.
const blog = '/w/acme-engineering-blog'

// Receiving mail (M58). The boards InboundStates and InboundSetup are manual in qa-map.ts (they need clicks), so these
// shots open the Senders page (qa-map: SettingsSenders, `${ws}/settings/senders`) and click. The dialog's Continue on
// step 2 saves the route, so the shots stop at step 2.
const receivingCard = 'section[aria-labelledby="rcv-h"]'
const receivingDialog = '[role="dialog"]'

/** `n` presses of one key: moves through a <select>'s options by keyboard (the field list's order is the same in every locale). */
const presses = (key: string, n: number): NonNullable<Shot['before']> =>
  Array.from({ length: n }, () => ({ press: key }))

// The trigger step's settings in the right panel.
const triggerProp = '.fe-right .fe-prop[aria-labelledby="p-kind"]'

// The builder's left column: the form picker, Type, Fields, Steps, Lists, … ("Where and when" is the one `.last`
// section that isn't the download's).
const formLeft = '.fb-left > .fb-sec'
const typeSec = `${formLeft}:nth-child(2)`
const fieldsSec = `${formLeft}:nth-child(3)`
const stepsSec = `${formLeft}:nth-child(4)`
const whereWhen = `${formLeft}.last:not(.fl-after)`
const stepCard = `${stepsSec} > .card`
// The A/B test card, under Last 30 days while a test runs.
const abCard = '.fb-right > .fb-sec.last'

// Website › Comments: the list's rows.
const commentRow = (n: number) => `.wc-list > .wc-row:nth-child(${n})`

// The Website tracking page's cards, in page order: the header, Sites, then the grid (Last events; How people are
// recognised and What's kept in the second column).
const trackingSites = 'main section.ih-dhead + section.card'
const trackingGrid = `${trackingSites} + div`

export const shots: Shot[] = [
  { id: 'sign-in', path: '/sign-in', feature: 'auth', user: 'anon' },
  { id: 'setup-password', path: '/setup', feature: 'auth', sample: 'fresh', user: 'owner' },
  {
    id: 'overview',
    path: `${ws}`,
    feature: 'overview',
    markers: [
      { n: 1, selector: 'section[aria-labelledby="ov-health-h"]' },
      // Left of it, the number would sit on the health card's "Deliverability details" link.
      { n: 2, selector: 'section[aria-labelledby="ov-next-h"]', badge: 'left-end' },
      { n: 3, selector: 'section[aria-labelledby="ov-providers-h"] > :has(> article)' },
    ],
  },
  { id: 'overview-mobile', path: `${ws}`, feature: 'overview', viewport: 'mobile' },
  // The command palette (⌘K on a Mac, Ctrl+K elsewhere), searching every kind the role can open.
  {
    id: 'command-palette',
    path: `${ws}/campaigns`,
    feature: 'shell',
    before: [{ press: 'ControlOrMeta+k' }, { fill: ['[role="dialog"] input', 'digest'] }, { wait: 1500 }],
  },

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
      // Left of the status, the number would cover its first word.
      { n: 5, selector: 'main span[role="status"]', badge: 'right' },
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
  // qa-map: ProvidersTrafficRules
  { id: 'traffic-rules', path: `${ws}/providers/traffic-rules`, feature: 'traffic' },
  // The same page's second and third cards: mailbox provider responses (reply rules) and canary defaults.
  {
    id: 'traffic-rules-replies',
    path: `${ws}/providers/traffic-rules`,
    feature: 'traffic',
    clip: 'main section >> nth=1',
  },
  {
    id: 'traffic-rules-canary',
    path: `${ws}/providers/traffic-rules`,
    feature: 'traffic',
    clip: 'main section >> nth=2',
  },
  { id: 'providers-events', path: `${ws}/providers/events`, feature: 'providers' },
  { id: 'providers-adapters', path: `${ws}/providers/adapters`, feature: 'providers' },
  { id: 'settings-senders', path: `${ws}/settings/senders`, feature: 'senders' },
  { id: 'settings-sender-domain', path: `${ws}/settings/senders/{domain:news.acme.io}`, feature: 'senders' },
  { id: 'settings-providers', path: `${ws}/settings/providers`, feature: 'settings' },

  // Campaigns, composer, Send Readiness, live monitor, reports
  { id: 'campaigns-list', path: `${ws}/campaigns`, feature: 'campaigns' },
  { id: 'campaigns-list-mobile', path: `${ws}/campaigns`, feature: 'campaigns', viewport: 'mobile' },
  // Rows selected: the bulk bar (tags, archive, delete) above the table.
  {
    id: 'campaigns-bulk',
    path: `${ws}/campaigns`,
    feature: 'campaigns',
    before: [{ click: 'main thead input[type="checkbox"]' }, { wait: 500 }],
  },
  // qa-map: CampaignsCalendar
  { id: 'campaigns-calendar', path: `${ws}/campaigns/calendar`, feature: 'campaigns' },
  {
    id: 'composer',
    path: `${ws}/campaigns/{campaign:Weekly Digest #142}/edit?select=2`,
    feature: 'composer',
    // Blocks panel, canvas, inspector, the Write / Design / Code switch, Review & send.
    markers: [
      // Above the panel the number would cover the subject; inside the canvas's top-left it sits on the grey margin.
      { n: 1, selector: 'aside:has([id$="-trigger-blocks"])', badge: 'right-end' },
      { n: 2, selector: '#main [role="region"]', badge: 'inside' },
      { n: 3, selector: 'aside:has([id$="-trigger-style"])' },
      { n: 4, selector: 'header [role="tablist"]', badge: 'bottom' },
      { n: 5, selector: 'header > :last-child', badge: 'bottom' },
    ],
  },
  { id: 'composer-empty', path: `${ws}/campaigns/{campaign:Untitled campaign}/edit`, feature: 'composer' },
  { id: 'composer-code', path: `${ws}/campaigns/{campaign:Weekly Digest #142}/edit?view=mjml`, feature: 'composer' },
  // qa-map: ComposerWrite
  { id: 'composer-write', path: `${ws}/campaigns/{campaign:Weekly Digest #142}/edit?view=write`, feature: 'composer' },
  {
    id: 'composer-comments',
    path: `${ws}/campaigns/{campaign:Weekly Digest #142}/edit?select=2&panel=comments`,
    feature: 'composer',
  },
  // qa-map: BrandKit
  { id: 'brand-kit', path: `${ws}/settings/brand-kit`, feature: 'brandkit' },
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
  },
  {
    id: 'composer-poll',
    path: `${ws}/campaigns/{campaign:Weekly Digest #143}/edit?select=9&panel=settings`,
    feature: 'polls',
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
  },
  {
    id: 'poll-results',
    path: `${ws}/campaigns/{campaign:Weekly Digest #141}/report`,
    feature: 'polls',
    clip: 'main section.pr',
  },
  {
    // The docs home page's hero (src/components/overrides/Hero.astro): Send Readiness at 2×, no markers.
    id: 'home-hero',
    path: `${ws}/campaigns/{campaign:Weekly Digest #142}/review`,
    feature: 'review',
    viewport: 'hero',
  },
  {
    id: 'review-send',
    path: `${ws}/campaigns/{campaign:Weekly Digest #142}/review`,
    feature: 'review',
    // Verdict, the issues that need attention (passed checks collapse below), audience estimate, schedule actions.
    markers: [
      { n: 1, selector: 'main [role="status"]' },
      { n: 2, selector: 'section[aria-labelledby="rv-attn"]' },
      // Left of these, the numbers would cover the Web card's Edit button and the banner's text.
      { n: 3, selector: 'section[aria-labelledby="rv-audience"]', badge: 'left-end' },
      { n: 4, selector: 'main [role="status"] .rv-vacts', badge: 'bottom' },
    ],
  },
  {
    id: 'review-send-blocked',
    path: `${ws}/campaigns/{campaign:Flash sale: 48 hours only}/review`,
    feature: 'review',
    // Opening the draft re-runs its checks in the background; the verdict banner is a <section> once they finish.
    waitFor: 'main section.rv-verdict',
  },
  {
    id: 'review-send-mobile',
    path: `${ws}/campaigns/{campaign:Weekly Digest #142}/review`,
    feature: 'review',
    viewport: 'mobile',
  },
  { id: 'approval-policy', path: `${ws}/settings/approvals`, feature: 'approvals' },
  { id: 'approval-inbox', path: `${ws}/approvals`, feature: 'approvals' },
  // qa-map: SettingsSendingRules
  { id: 'sending-rules', path: `${ws}/settings/sending-rules`, feature: 'sending-rules' },
  {
    // The Marketing cap card (review 2026-11 AT-9), switched on so its numbers show (3 in 7 days); nothing is saved.
    id: 'sending-rules-cap',
    path: `${ws}/settings/sending-rules`,
    feature: 'sending-rules',
    clip: 'section.card:has(input[max="90"])',
    before: [{ click: 'section.card:has(input[max="90"]) input[role="switch"]' }],
  },
  {
    // The steady scenario is the normal one without the simulated provider's chance throttling (and without a canary).
    id: 'live-monitor',
    path: `${ws}/campaigns/{campaign:Weekly Digest #142}/live`,
    feature: 'live',
    demoSend: { campaign: 'Weekly Digest #142', scenario: 'steady', elapsed: '20m' },
  },
  {
    // qa-map: LiveMonitorCanary (the normal scenario starts with a canary; at 8 minutes it is still watching).
    id: 'live-monitor-canary',
    path: `${ws}/campaigns/{campaign:Weekly Digest #142}/live`,
    feature: 'live',
    demoSend: { campaign: 'Weekly Digest #142', scenario: 'normal', elapsed: '8m' },
  },
  {
    id: 'live-monitor-mobile',
    path: `${ws}/campaigns/{campaign:Weekly Digest #142}/live`,
    feature: 'live',
    viewport: 'mobile',
    demoSend: { campaign: 'Weekly Digest #142', scenario: 'steady', elapsed: '20m' },
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
    // Headline tiles (each compared with the last issues), insights, click map, per mailbox provider, share links.
    markers: [
      { n: 1, selector: 'main section[aria-label]' },
      { n: 2, selector: 'section[aria-labelledby="rep-ins-h"]' },
      { n: 3, selector: 'section[aria-labelledby="rep-map-h"]' },
      { n: 4, selector: 'section[aria-labelledby="rep-mb-h"]' },
      { n: 5, selector: 'section[aria-labelledby="rep-share-h"]' },
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
  // The report's Follow up menu, first choice: the resend-to-non-openers dialog.
  {
    id: 'campaign-followup',
    path: `${ws}/campaigns/{campaign:October Product Update}/report`,
    feature: 'campaigns',
    before: [{ click: 'button.btn[aria-haspopup="menu"]' }, { click: '[role="menuitem"] >> nth=0' }, { wait: 800 }],
    clip: '[role="dialog"]',
  },
  {
    id: 'digest-overview',
    path: `${ws}/campaigns/digests/{digest:Engineering blog roundup}`,
    feature: 'digests',
  },

  // Audience and imports
  { id: 'contacts', path: `${ws}/audience`, feature: 'audience' },
  { id: 'contacts-mobile', path: `${ws}/audience`, feature: 'audience', viewport: 'mobile' },
  // Every contact on the page selected: the bulk bar and "Select all N matching".
  {
    id: 'contacts-bulk',
    path: `${ws}/audience`,
    feature: 'audience',
    before: [{ click: 'main thead input[type="checkbox"]' }, { wait: 800 }],
  },
  // qa-map: AudienceListsFields
  { id: 'lists-fields', path: `${ws}/audience/lists`, feature: 'audience' },
  { id: 'contact-profile', path: `${ws}/audience/contacts/{contact:sam.rivera@outlook.com}`, feature: 'audience' },
  { id: 'segments', path: `${ws}/audience/segments`, feature: 'audience' },
  { id: 'list-health', path: `${ws}/audience/health`, feature: 'audience' },
  // The same page's Sunset policy card: the switch, the editable numbers and the erase step.
  {
    id: 'sunset-policy',
    path: `${ws}/audience/health`,
    feature: 'audience',
    clip: 'section[aria-labelledby="policy-h"]',
  },
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
  },
  {
    id: 'verification-job',
    path: `${ws}/audience/verification/{verification:Sunset}`,
    feature: 'verification',
  },

  // Automations
  { id: 'automations-list', path: `${ws}/automations`, feature: 'automations' },
  { id: 'automation-flow', path: `${ws}/automations/{automation:Welcome series}?step=n3`, feature: 'automations' },
  { id: 'automation-channels', path: `${ws}/automations/{automation:Acme Summit reminders}`, feature: 'automations' },
  // The trigger step selected: more triggers, re-entry and leaving the list.
  { id: 'automation-trigger', path: `${ws}/automations/{automation:Welcome series}?step=n1`, feature: 'automations' },
  // The right panel's Stats tab with no step selected (a click on the empty canvas): the sequence, email by email.
  {
    id: 'automation-sequence',
    path: `${ws}/automations/{automation:Welcome series}?panel=stats`,
    feature: 'automations',
    before: [{ click: '.react-flow__pane', position: { x: 24, y: 400 } }, { wait: 1000 }],
  },
  // The "Wait 2 days" step's Stats tab, then the contacts waiting at it.
  {
    id: 'automation-step-contacts',
    path: `${ws}/automations/{automation:Welcome series}?step=n5`,
    feature: 'automations',
    before: [
      { click: '[id$="-trigger-stats"] >> nth=1' },
      { click: '[id$="-content-stats"] .fe-prop > button' },
      { wait: 1200 },
    ],
  },

  // Transactional
  { id: 'transactional', path: `${ws}/transactional`, feature: 'transactional' },
  { id: 'transactional-guide', path: `${ws}/transactional/guide?step=1`, feature: 'transactional' },
  {
    id: 'transactional-template',
    path: `${ws}/transactional/templates/password-reset`,
    feature: 'transactional',
  },
  {
    id: 'transactional-publish',
    path: `${ws}/transactional/templates/trial-ending?publish=1`,
    feature: 'transactional',
  },
  { id: 'transactional-messages', path: `${ws}/transactional/messages`, feature: 'transactional' },
  { id: 'transactional-setup', path: `${ws}/transactional/setup`, feature: 'transactional' },
  { id: 'transactional-settings', path: `${ws}/transactional/settings`, feature: 'transactional' },

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
  { id: 'website-posts', path: `${ws}/forms/website`, feature: 'website' },
  { id: 'website-home', path: `${ws}/forms/website/home`, feature: 'website' },
  {
    id: 'website-post-composer',
    path: `${ws}/forms/website/posts/{post:Inside our Postgres migration: the runbook}`,
    feature: 'website',
  },
  { id: 'pages-list', path: `${ws}/forms/pages`, feature: 'pages' },
  {
    id: 'page-builder',
    path: `${ws}/forms/pages/{page:The Deliverability Field Guide}?select=buy`,
    feature: 'pages',
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
  { id: 'products', path: `${ws}/earn/products?order={order:1311}`, feature: 'products' },

  // SMS, push and WhatsApp
  { id: 'sms-providers', path: `${ws}/providers/sms`, feature: 'sms' },
  { id: 'sms-routing', path: `${ws}/providers/sms/rules`, feature: 'sms' },
  { id: 'sms-composer', path: `${ws}/campaigns/{campaign:Summit: doors open}/sms`, feature: 'sms' },
  { id: 'sms-report', path: `${ws}/campaigns/{campaign:Summit: 8 days to go}/sms-report`, feature: 'sms' },
  { id: 'push-setup', path: `${ws}/providers/push`, feature: 'push' },
  {
    id: 'push-composer',
    path: `${ws}/campaigns/{campaign:New post: Feature flags at scale}/push`,
    feature: 'push',
  },
  { id: 'whatsapp', path: `${ws}/providers/whatsapp`, feature: 'whatsapp' },

  // Integrations and AI
  { id: 'integrations-catalog', path: `${ws}/settings/integrations`, feature: 'integrations' },
  { id: 'integrations-zapier', path: `${ws}/settings/integrations/zapier`, feature: 'integrations' },
  { id: 'integrations-wordpress', path: `${ws}/settings/integrations/wordpress`, feature: 'integrations' },
  {
    id: 'integrations-shopify',
    path: `${ws}/settings/integrations/stores/{store:Acme Merch}`,
    feature: 'commerce',
  },
  { id: 'ai-settings', path: `${ws}/settings/integrations/ai`, feature: 'ai' },
  {
    // A Shorten suggestion on #143's intro: edit the text block (the canvas is an iframe), then the text toolbar's
    // first AI action, after its last separator. The demo model answers in a moment.
    id: 'ai-composer',
    path: `${ws}/campaigns/{campaign:Weekly Digest #143}/edit`,
    feature: 'ai',
    before: [
      {
        dblclick:
          '#main iframe >> nth=0 >> internal:control=enter-frame >> div:has-text("schedule flag changes") >> nth=-1',
      },
      { click: '.rte > .rsep:last-of-type + button >> visible=true' },
      { wait: 4000 },
    ],
  },
  { id: 'settings-hostrepute', path: `${ws}/settings/integrations/hostrepute`, feature: 'hostrepute' },

  // Deliverability
  {
    id: 'deliverability',
    path: `${ws}/deliverability`,
    feature: 'deliverability',
    fullPage: true,
    // Top to bottom: domain and IP cards, provider account health, blocklists.
    markers: [
      { n: 1, selector: 'section[aria-labelledby="h-assets"]' },
      { n: 2, selector: 'section[aria-labelledby="h-provider-health"]' },
      { n: 3, selector: 'section[aria-labelledby="h-blocklists"]' },
    ],
  },
  { id: 'deliverability-mobile', path: `${ws}/deliverability`, feature: 'deliverability', viewport: 'mobile' },
  { id: 'placement-tests', path: `${ws}/deliverability/placement`, feature: 'placement' },
  {
    id: 'placement-result',
    path: `${ws}/deliverability/placement/{placement:Weekly Digest #142 · SES vs Postal}`,
    feature: 'placement',
  },
  { id: 'placement-seeds', path: `${ws}/deliverability/placement/seeds`, feature: 'placement' },

  // Workspace, team, account and instance admin
  { id: 'workspace-settings', path: `${ws}/settings`, feature: 'workspace' },
  // The General page's Data retention card.
  {
    id: 'data-retention',
    path: `${ws}/settings`,
    feature: 'workspace',
    clip: 'section[aria-labelledby="retention-h"]',
  },
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
  { id: 'bot-filter', path: `${ws}/admin/bot-filter`, feature: 'admin' },
  // qa-map: InstanceSystem
  { id: 'instance-system', path: `${ws}/admin/system`, feature: 'admin' },
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

  // Receiving mail, sender defaults, deliverability and provider screens
  // InboundStates › Not set up, on the second workspace's Senders page
  {
    id: 'receiving-not-set-up',
    path: `${blog}/settings/senders`,
    feature: 'senders',
    clip: receivingCard,
    waitFor: receivingCard,
  },
  // qa-map: SettingsSenders · InboundStates › Receiving (the demo receives through Postmark on reply.news.acme.io)
  {
    id: 'receiving-card',
    path: `${ws}/settings/senders`,
    feature: 'senders',
    clip: receivingCard,
    waitFor: `${receivingCard} table`,
    markers: [
      // The title with its status, the actions, the route line, the MX table and the report addresses.
      { n: 1, selector: `${receivingCard} .sec > div:first-child` },
      { n: 2, selector: `${receivingCard} .sec > div:last-child` },
      // These three span the card, so their numbers can't go beside them, and on top they would cover the line
      // above: the route line's under its empty right end, the table's on its Type heading, the addresses' at the
      // empty right end of the table's row.
      { n: 3, selector: `${receivingCard} > div:nth-child(2)`, badge: 'bottom-end' },
      { n: 4, selector: `${receivingCard} table`, badge: 'inside' },
      { n: 5, selector: `${receivingCard} > div:last-of-type`, badge: 'top-end' },
    ],
  },
  // qa-map: SettingsSenders · InboundSetup › step 1, opened with Edit on the card
  {
    id: 'receiving-setup-how',
    path: `${ws}/settings/senders`,
    feature: 'senders',
    before: [{ click: `${receivingCard} .sec button >> nth=1` }, { wait: 800 }],
    waitFor: `${receivingCard} .sec button`,
    clip: receivingDialog,
  },
  // qa-map: SettingsSenders · InboundSetup › step 2 for a provider (Continue on step 1 doesn't save)
  {
    id: 'receiving-setup-domain',
    path: `${ws}/settings/senders`,
    feature: 'senders',
    before: [
      { click: `${receivingCard} .sec button >> nth=1` },
      { wait: 800 },
      { click: `${receivingDialog} .df button >> nth=-1` },
      { wait: 800 },
    ],
    waitFor: `${receivingCard} .sec button`,
    clip: receivingDialog,
  },
  // InboundSetup › step 2 for a mailbox, from Set up receiving on the second workspace's Senders page
  {
    id: 'receiving-setup-mailbox',
    path: `${blog}/settings/senders`,
    feature: 'senders',
    before: [
      { click: `${receivingCard} .sec button` },
      { wait: 800 },
      { click: `${receivingDialog} label:has(input[value="mailbox"])` },
      { click: `${receivingDialog} .df button >> nth=-1` },
      { wait: 800 },
    ],
    waitFor: `${receivingCard} .sec button`,
    clip: receivingDialog,
  },
  // qa-map: SettingsSenders · the Defaults card: reply handling, the mailto: switch (G-1) and UTM tags (G-13)
  {
    id: 'settings-senders-defaults',
    path: `${ws}/settings/senders`,
    feature: 'senders',
    clip: 'section[aria-labelledby="defaults-h"]',
    waitFor: 'section[aria-labelledby="defaults-h"] select',
    markers: [
      { n: 1, selector: 'section[aria-labelledby="defaults-h"] label:has(option[value="__inbox"])' },
      { n: 2, selector: 'section[aria-labelledby="defaults-h"] .sd-trow >> nth=0' },
      { n: 3, selector: 'section[aria-labelledby="defaults-h"] div:has(> .sd-chips)' },
    ],
  },
  // The event log filtered to hard bounces (the URL's type filter): each sending provider's raw bounce beside its
  // normalized event. The unfiltered log fills with the demo's latest deliveries.
  { id: 'providers-events-bounces', path: `${ws}/providers/events?type=hard_bounce`, feature: 'providers' },
  // qa-map: Deliverability · the DMARC card while reports arrive at dmarc@ the receiving domain (M58 G-19)
  {
    id: 'deliverability-dmarc',
    path: `${ws}/deliverability`,
    feature: 'deliverability',
    clip: 'section[aria-labelledby="h-dmarc"]',
    waitFor: 'section[aria-labelledby="h-dmarc"] table',
  },
  // qa-map: Deliverability · the Postmaster card without domain or IP reputation, fed by HostRepute (M55 G-4)
  {
    id: 'deliverability-postmaster',
    path: `${ws}/deliverability`,
    feature: 'deliverability',
    clip: 'section[aria-labelledby="h-postmaster"]',
    waitFor: 'section[aria-labelledby="h-postmaster"]',
  },
  // Discount codes, countdown timers and the composer's new blocks
  // qa-map: DiscountCodes
  {
    id: 'discount-codes',
    path: `${ws}/campaigns/codes`,
    feature: 'coupons',
    // The Active and Archived chips, the pools table, the totals and who gets the low-code alerts.
    markers: [
      { n: 1, selector: '.cp-fchips' },
      { n: 2, selector: 'section[aria-labelledby="cp-pools-h"] table' },
      { n: 3, selector: '.cp-foot' },
    ],
  },
  // The New pool dialog over the list (?new=1 opens it, as the composer's Create one link does), with a name typed
  // and Acme Merch's Shopify store picked as the source so the discount's settings show; nothing is created.
  {
    id: 'discount-codes-new',
    path: `${ws}/campaigns/codes?new=1`,
    feature: 'coupons',
    waitFor: '[role="dialog"] label.cp-src',
    // The store's discount fields make the dialog taller than the desktop viewport; the tablet one holds it whole.
    viewport: 'tablet',
    before: [
      { fill: ['[role="dialog"] input[maxlength="80"]', 'Spring 20%'] },
      { click: '[role="dialog"] label.cp-src >> nth=1' },
      { wait: 800 },
    ],
    clip: '[role="dialog"]',
  },
  // qa-map: DiscountCodePool (Acme Merch's Shopify pool, a batch of 500 codes half created).
  {
    id: 'discount-code-pool',
    path: `${ws}/campaigns/codes/{pool:Welcome 15%}`,
    feature: 'coupons',
    fullPage: true,
    // The header with its actions, the four numbers, the batch being created, where it's used, its Liquid.
    markers: [
      { n: 1, selector: 'section.cp-dhead' },
      { n: 2, selector: '.cp-stats' },
      { n: 3, selector: 'section[aria-labelledby="cp-bt-h"]' },
      { n: 4, selector: 'section[aria-labelledby="cp-ui-h"]' },
      { n: 5, selector: 'section[aria-labelledby="cp-lq-h"]' },
    ],
  },
  // ComposerTimedBlocks: the Countdown block of the Black Friday draft selected, its settings in the inspector.
  {
    id: 'composer-countdown',
    path: `${ws}/campaigns/{campaign:Black Friday Early Access}/edit?select=1-0-0`,
    feature: 'countdown',
    markers: [
      { n: 1, selector: '#main [role="region"]', badge: 'inside' },
      { n: 2, selector: 'aside:has([id$="-trigger-style"])' },
    ],
  },
  // ComposerTimedBlocks: the same draft's Discount code block selected, with its pool, label and button.
  {
    id: 'composer-discount-code',
    path: `${ws}/campaigns/{campaign:Black Friday Early Access}/edit?select=2-0-1`,
    feature: 'coupons',
    markers: [
      { n: 1, selector: '#main [role="region"]', badge: 'inside' },
      { n: 2, selector: 'aside:has([id$="-trigger-style"])' },
    ],
  },
  // Report breakdowns, the holdout group on Sending rules and Review & send
  // qa-map: Report (M57 G-12). October Product Update was sent after the demo started recording breakdowns.
  {
    id: 'report-mail-clients',
    path: `${ws}/campaigns/{campaign:October Product Update}/report`,
    feature: 'reports',
    clip: 'section[aria-labelledby="rep-dev-h"]',
  },
  {
    id: 'report-countries',
    path: `${ws}/campaigns/{campaign:October Product Update}/report`,
    feature: 'reports',
    clip: 'section[aria-labelledby="rep-geo-h"]',
  },
  {
    id: 'report-open-times',
    path: `${ws}/campaigns/{campaign:October Product Update}/report`,
    feature: 'reports',
    clip: 'section[aria-labelledby="rep-time-h"]',
  },
  // qa-map: SettingsSendingRules. The Holdout group card (M63 G-33): on at 5% of campaigns and automations; its
  // status line links to Audience › Holdout, which only the open group shows.
  {
    id: 'sending-rules-holdout',
    path: `${ws}/settings/sending-rules`,
    feature: 'sending-rules',
    clip: 'section.card:has(a[href$="/audience/holdout"])',
  },
  // Black Friday Early Access has no Send Readiness run in the demo: opening its Review & send runs the checks in the
  // background, and the verdict banner is a <section> once they finish. The draft leaves the holdout group out, and
  // its Discount code block shows codes from Acme Merch's Shopify pool, which has fewer free codes than recipients.
  {
    // The audience card's holdout line and "Include the holdout group" (M63 G-33).
    id: 'review-send-holdout',
    path: `${ws}/campaigns/{campaign:Black Friday Early Access}/review`,
    feature: 'review',
    waitFor: 'main section.rv-verdict',
    clip: 'section[aria-labelledby="rv-audience"]',
  },
  {
    // The Links card (M57 G-13): this campaign's own "Add UTM tags", with the workspace's default under it.
    id: 'review-send-utm',
    path: `${ws}/campaigns/{campaign:Black Friday Early Access}/review`,
    feature: 'review',
    waitFor: 'main section.rv-verdict',
    clip: 'section[aria-labelledby="rv-links"]',
  },
  {
    // The Discount codes row (M59 G-22), the first block in Needs attention, before the missing sender.
    id: 'review-send-discount-codes',
    path: `${ws}/campaigns/{campaign:Black Friday Early Access}/review`,
    feature: 'review',
    waitFor: 'main section.rv-verdict',
    clip: 'section[aria-labelledby="rv-attn"] .rv-srow.s-bad >> nth=0',
  },
  // Replies, the holdout group, segments and contacts
  // qa-map: Replies (the Open view with Sam Rivera's reply, the newest, selected).
  // Views with counts, search, the list, the reply beside it, its actions with the j / k / e hint.
  {
    id: 'replies',
    path: `${ws}/audience/replies`,
    feature: 'replies',
    markers: [
      { n: 1, selector: '.rp-chips' },
      { n: 2, selector: '.rp-search' },
      { n: 3, selector: 'section.rp-list' },
      { n: 4, selector: 'section.rp-detail .rcontact' },
      { n: 5, selector: '.rp-actions' },
    ],
  },
  // qa-map: RepliesPhone. At 1100 px and below a reply opens as its own view with Back.
  {
    id: 'replies-mobile',
    path: `${ws}/audience/replies`,
    feature: 'replies',
    viewport: 'mobile',
    before: [{ click: '.rrow .rl >> nth=0' }, { wait: 800 }],
  },
  // RepliesStates' dialog: Unsubscribe contact on Diego Alvarez's reply, the one marked Asks to unsubscribe (never
  // confirmed).
  {
    id: 'replies-unsubscribe',
    path: `${ws}/audience/replies`,
    feature: 'replies',
    before: [
      { click: '.rrow:has(.badge.warn) .rl' },
      { wait: 800 },
      { click: '.rp-actions button.danger' },
      { wait: 500 },
    ],
    clip: '[role="dialog"]',
  },
  // qa-map: AudienceHoldout. Window and Recompute, the verdict, the tiles, the two-bar comparison.
  {
    id: 'holdout',
    path: `${ws}/audience/holdout`,
    feature: 'holdout',
    markers: [
      { n: 1, selector: '.ho-seg' },
      { n: 2, selector: '.ho-seg + div' },
      { n: 3, selector: 'section[aria-labelledby="ho-v"]' },
      { n: 4, selector: '.ho-tiles' },
      { n: 5, selector: 'section[aria-labelledby="ho-cmp"]' },
    ],
  },
  // The comparison card switched to its table view: contacts, converters, orders, revenue and site visitors per group.
  {
    id: 'holdout-table',
    path: `${ws}/audience/holdout`,
    feature: 'holdout',
    before: [{ click: 'section[aria-labelledby="ho-cmp"] .seg button >> nth=1' }, { wait: 500 }],
    clip: 'section[aria-labelledby="ho-cmp"]',
  },
  // Sam Rivera's Activity card: "Replied to October Product Update · Open reply" and the day on shop.acme.io.
  {
    id: 'contact-activity',
    path: `${ws}/audience/contacts/{contact:sam.rivera@outlook.com}`,
    feature: 'audience',
    waitFor: 'section[aria-labelledby="activity-h"] a[href*="/audience/replies"]',
    clip: 'section[aria-labelledby="activity-h"]',
  },
  // A new segment with the M62 and M63 fields, never saved: Viewed a product (in the last 30 days, Acme Merch's
  // Apparel collection), Last seen on the site (in the last 7 days) and In the holdout group (No). Each field is
  // picked by its place in the field list (in_holdout 33, site_viewed_product 49, site_last_seen 50).
  {
    id: 'segment-site-holdout',
    path: `${ws}/audience/segments/new`,
    feature: 'audience',
    before: [
      { wait: 800 },
      { fill: ['input.segname', 'Apparel browsers this week'] },
      // Condition 1: Viewed a product, Acme Merch · Apparel (the first collection after Any product).
      { click: '.scond >> nth=0 >> select >> nth=0' },
      ...presses('ArrowDown', 49),
      { press: 'Enter' },
      { wait: 500 },
      { click: '.scond >> nth=0 >> select >> nth=3' },
      { press: 'ArrowDown' },
      { press: 'Enter' },
      // Condition 2: Last seen on the site in the last 7 days.
      { click: '.sgroup > button' },
      { wait: 300 },
      { click: '.scond >> nth=1 >> select >> nth=0' },
      ...presses('ArrowDown', 50),
      { press: 'Enter' },
      { wait: 500 },
      { fill: ['.scond >> nth=1 >> input', '7'] },
      // Condition 3: In the holdout group is No.
      { click: '.sgroup > button' },
      { wait: 300 },
      { click: '.scond >> nth=2 >> select >> nth=0' },
      ...presses('ArrowDown', 33),
      { press: 'Enter' },
      { wait: 500 },
      { click: '.scond >> nth=2 >> select >> nth=2' },
      { press: 'ArrowDown' },
      { press: 'Enter' },
      // Off the last select, so no focus ring shows.
      { click: 'h1' },
      { wait: 1500 },
    ],
    markers: [
      { n: 1, selector: '.scond >> nth=0' },
      { n: 2, selector: '.scond >> nth=1' },
      { n: 3, selector: '.scond >> nth=2' },
    ],
  },
  // Growth's By source card, with Lead ads · Field Guide download among the sources (M66).
  {
    id: 'growth-by-source',
    path: `${ws}/audience/growth`,
    feature: 'growth',
    clip: 'section[aria-labelledby="gr-src"]',
  },
  // The automation palette and store flows
  // qa-map: AutomationsComplete (manual board; strip 9 "Browsing and stock" and the Lead ads trigger). The whole
  // editor of the demo's Browse abandonment flow, so the palette shows every trigger group: Store (with Website
  // tracking's store flows), Paid members (Acme has a live Stripe connection) and Lead ads (Acme Marketing's forms).
  {
    id: 'automation-palette',
    path: `${ws}/automations/{automation:Browse abandonment}`,
    feature: 'automations',
    fullPage: true,
    markers: [
      // Above the groups, the numbers would cover their headings; the canvas beside them has room.
      { n: 1, selector: '.fe-left .grp + div >> nth=1', badge: 'right' },
      { n: 2, selector: '.fe-left .grp + div >> nth=2', badge: 'right' },
      { n: 3, selector: '.fe-left .grp + div >> nth=3', badge: 'right' },
    ],
  },
  // The Browse abandonment flow with its trigger selected: Viewed a product on Acme Merch after 4 hours, any product,
  // after 1 view, with the note that shop.acme.io sends the store's product views.
  {
    id: 'store-flow-browse',
    path: `${ws}/automations/{automation:Browse abandonment}?step=n1`,
    feature: 'automations',
    markers: [
      { n: 1, selector: '.react-flow__node[data-id="n1"]' },
      { n: 2, selector: `${triggerProp} div.lbl:has(#tk-wait-l)` },
      { n: 3, selector: `${triggerProp} fieldset[aria-describedby="tk-coll-hint"]` },
      { n: 4, selector: `${triggerProp} div.lbl:has(#tk-views-l)` },
      { n: 5, selector: `${triggerProp} [role="note"]` },
    ],
  },
  // The Back in stock flow's trigger settings: the store, "Also people who viewed it" (off) and who hears.
  {
    id: 'store-flow-stock',
    path: `${ws}/automations/{automation:Back in stock}?step=n1`,
    feature: 'automations',
    clip: triggerProp,
    // Above the hint's left end, the number would sit on the days field; top-end is empty space under the switch.
    markers: [
      { n: 1, selector: `${triggerProp} input[role="switch"]` },
      { n: 2, selector: `${triggerProp} div:has(> input[role="switch"]) + span`, badge: 'top-end' },
    ],
  },
  // The Welcome series' trigger settings: Stop when the contact replies (Acme receives mail and keeps replies in the
  // inbox, so it can be ticked) and Add another trigger.
  {
    id: 'automation-trigger-settings',
    path: `${ws}/automations/{automation:Welcome series}?step=n1`,
    feature: 'automations',
    clip: triggerProp,
    // Above their left ends, the numbers would sit on the checkboxes above; the right ends have room.
    markers: [
      { n: 1, selector: `${triggerProp} label.fe-chk:has(+ div button)`, badge: 'top-end' },
      { n: 2, selector: `${triggerProp} label.fe-chk + div:has(button)`, badge: 'top-end' },
    ],
  },
  // Signup form steps, where and when, A/B tests and popups
  // Type › Popup on the Newsletter signup form (the draft only): the triggers, exit intent and hiding.
  {
    id: 'form-popup-triggers',
    path: `${ws}/forms?form={form:Newsletter signup}`,
    feature: 'forms',
    before: [{ click: `${typeSec} .fb-seg > button:nth-child(2)` }],
    clip: typeSec,
    markers: [
      { n: 1, selector: `${typeSec} > .grid` },
      { n: 2, selector: `${typeSec} > label.fb-check >> nth=0` },
      { n: 3, selector: `${typeSec} > label.fb-check >> nth=1` },
    ],
  },
  // Steps › Several steps on the Newsletter signup form (the draft only): email on step 1, the rest on step 2.
  {
    id: 'form-steps-builder',
    path: `${ws}/forms?form={form:Newsletter signup}`,
    feature: 'forms',
    before: [{ click: `${stepsSec} .fb-seg > button:nth-child(2)` }],
    clip: stepsSec,
    markers: [
      { n: 1, selector: `${stepsSec} > .fb-seg` },
      { n: 2, selector: `${stepCard} >> nth=0` },
      { n: 3, selector: `${stepCard} >> nth=1 >> .cursor-grab` },
      { n: 4, selector: `${stepCard} >> nth=1 >> span.k` },
      { n: 5, selector: `${stepsSec} > button` },
    ],
  },
  // The preview's step 2 of 2 after Several steps (the draft only), reached with the preview's own Next.
  {
    id: 'form-steps-preview',
    path: `${ws}/forms?form={form:Newsletter signup}`,
    feature: 'forms',
    before: [{ click: `${stepsSec} .fb-seg > button:nth-child(2)` }, { click: '.pf .pf-nav button' }],
    clip: '.pf',
    markers: [
      { n: 1, selector: '.pf .pf-stepof' },
      { n: 2, selector: '.pf .pf-nav button >> nth=0' },
    ],
  },
  // Add custom field › Choice question, filled in (never applied).
  {
    id: 'form-choice-dialog',
    path: `${ws}/forms?form={form:Newsletter signup}`,
    feature: 'forms',
    before: [
      { click: `${fieldsSec} button.btn.sm` },
      { click: '[role="menu"] [role="menuitem"] >> nth=-1' },
      { fill: ['[role="dialog"] input.in >> nth=0', 'What do you work on?'] },
      { fill: ['[role="dialog"] tbody tr:nth-child(1) input >> nth=0', 'Deliverability'] },
      { fill: ['[role="dialog"] tbody tr:nth-child(2) input >> nth=0', 'Product news'] },
      { click: '[role="dialog"] .dh' },
    ],
    clip: '[role="dialog"]',
    markers: [
      { n: 1, selector: '[role="dialog"] label.fb-check >> nth=0' },
      { n: 2, selector: '[role="dialog"] .rounded-lg' },
    ],
  },
  // Where and when, its dialog filled in (never applied): pages that start with /blog/, on desktops. Only the
  // tablet's height fits the whole dialog (the overlay clips what's below the window).
  {
    id: 'form-where-when',
    path: `${ws}/forms?form={form:Newsletter signup}`,
    feature: 'forms',
    viewport: 'tablet',
    before: [
      { click: `${whereWhen} button` },
      { click: '[role="dialog"] select >> nth=0' },
      { press: 'ArrowDown' },
      { press: 'Enter' },
      { click: '[role="dialog"] select >> nth=1' },
      { press: 'ArrowDown' },
      { press: 'ArrowDown' },
      { press: 'Enter' },
      { fill: ['[role="dialog"] input.mono', '/blog/'] },
      { click: '[role="dialog"] input[type="checkbox"] >> nth=0' },
      { click: '[role="dialog"] .dh' },
    ],
    clip: '[role="dialog"]',
    markers: [
      { n: 1, selector: '[role="dialog"] [role="group"] >> nth=0' },
      { n: 2, selector: '[role="dialog"] [role="group"] >> nth=1' },
      { n: 3, selector: '[role="dialog"] [role="group"] >> nth=2' },
      { n: 4, selector: '[role="dialog"] [role="group"] >> nth=3' },
      { n: 5, selector: '[role="dialog"] [role="group"] >> nth=5' },
    ],
  },
  // Where and when › Visitors: Not in a segment, Active in last 30 days (never applied).
  {
    id: 'form-targeting-segment',
    path: `${ws}/forms?form={form:Newsletter signup}`,
    feature: 'forms',
    before: [
      { click: `${whereWhen} button` },
      { click: '[role="dialog"] input[type="radio"] >> nth=4' },
      { click: '[role="dialog"] [role="group"] >> nth=4 >> select' },
      { press: 'ArrowDown' },
      { press: 'ArrowDown' },
      { press: 'Enter' },
      { click: '[role="dialog"] .dh' },
    ],
    clip: '[role="dialog"] [role="group"] >> nth=4',
  },
  // qa-map: FormBuilderABTest
  {
    id: 'form-ab-test',
    path: `${ws}/forms?form={form:Footer mini form}&variant=B`,
    feature: 'forms',
    markers: [
      { n: 1, selector: '.fb-bar > [role="group"].tabs' },
      { n: 2, selector: '.fb-bar > button.btn' },
      { n: 3, selector: '.fb-bar > span.k >> nth=0' },
      { n: 4, selector: '.pf' },
      { n: 5, selector: fieldsSec },
    ],
  },
  // The A/B test card under Last 30 days: B leads with 97% confidence.
  {
    id: 'form-ab-results',
    path: `${ws}/forms?form={form:Footer mini form}&variant=B`,
    feature: 'forms',
    clip: abCard,
  },
  // Keep B and end test › the End the A/B test dialog (never confirmed).
  {
    id: 'form-ab-end',
    path: `${ws}/forms?form={form:Footer mini form}&variant=B`,
    feature: 'forms',
    before: [{ click: `${abCard} button.pri` }],
    clip: '[role="dialog"]',
  },
  // Post import, comments, share buttons and the website settings
  // The review of the demo's Substack export (acme-weekly-substack-export.zip), waiting to be imported: what the
  // export holds, dates, images, tiers and authors. qa-map: WebsiteImport
  {
    id: 'website-import-review',
    path: `${ws}/forms/website/import?import={postImport:ready}`,
    feature: 'website',
    markers: [
      { n: 1, selector: '.ws-stats[role="group"]' },
      { n: 2, selector: '.wi-grid2 > .wi-col:nth-child(1) > section:nth-child(1)' },
      { n: 3, selector: '.wi-grid2 > .wi-col:nth-child(1) > section:nth-child(2)' },
      { n: 4, selector: '.wi-grid2 > .wi-col:nth-child(2) > section:nth-child(1)' },
      { n: 5, selector: '.wi-grid2 > .wi-col:nth-child(2) > section:nth-child(2)' },
    ],
  },
  // The same review's posts, each with its decision. qa-map: WebsiteImport
  {
    id: 'website-import-posts',
    path: `${ws}/forms/website/import?import={postImport:ready}`,
    feature: 'website',
    clip: 'section.card:has(table.wi-tbl)',
  },
  // Website › Comments, Waiting for review: the status tabs, search and post filter, a comment held for its links
  // and a row's menu. qa-map: WebsiteComments
  {
    id: 'website-comments',
    path: `${ws}/forms/website/comments`,
    feature: 'website',
    markers: [
      { n: 1, selector: 'nav.wc-tabs' },
      { n: 2, selector: '.wc-filters' },
      { n: 3, selector: `${commentRow(3)} .meta` },
      { n: 4, selector: `${commentRow(1)} .acts` },
    ],
  },
  // Website › Comments, the Published tab (the WebsiteComments board's screen), the pinned comment's menu open, nothing
  // chosen.
  {
    id: 'website-comments-menu',
    path: `${ws}/forms/website/comments?status=published`,
    feature: 'website',
    before: [{ click: `${commentRow(1)} .acts button` }],
  },
  // Website › Access › Comments: who can comment, which comments wait, who moderates.
  {
    id: 'website-access-comments',
    path: `${ws}/forms/website/access`,
    feature: 'website',
    clip: 'section[aria-labelledby="ac-comments"]',
  },
  // The post composer's Web tab: the post's Comments setting and the site's, in words.
  {
    id: 'website-post-comments-setting',
    path: `${ws}/forms/website/posts/{post:Inside our Postgres migration: the runbook}`,
    feature: 'website',
    clip: '.wtab-sec:has(#wt-comments)',
  },
  // Website › Home & navigation › Navigation, with Share buttons on posts at its end.
  {
    id: 'website-navigation',
    path: `${ws}/forms/website/home`,
    feature: 'website',
    clip: 'section[aria-labelledby="hn-nav"]',
  },
  // Website › Home & navigation › Search engines and feeds, with the llms.txt address.
  {
    id: 'website-search-feeds',
    path: `${ws}/forms/website/home`,
    feature: 'website',
    clip: 'section[aria-labelledby="hn-seo"]',
  },
  // A published post's share row, as a visitor sees it.
  {
    id: 'public-post-share',
    path: '/p/acme-newsletter/posts/what-shipped-in-october',
    feature: 'publicpages',
    user: 'anon',
    locales: en,
    clip: 'section.st-share',
  },
  // The same post's first comment thread as a visitor sees it: pinned, a Team reply and a member's reply.
  {
    id: 'public-post-comments',
    path: '/p/acme-newsletter/posts/what-shipped-in-october',
    feature: 'publicpages',
    user: 'anon',
    locales: en,
    clip: 'section#comments ol.st-cms > li:first-child',
  },
  // Team subscriptions, pausing and sponsor self-booking
  // Teams (M65 G-38): Insider's team page, yearly by default. qa-map: PublicUpgradeTeam
  {
    id: 'public-upgrade-team',
    path: '/p/acme-newsletter/upgrade/insider/team',
    feature: 'publicpages',
    user: 'anon',
    locales: en,
    // Billing period, seats stepper, the total, Continue to payment.
    markers: [
      { n: 1, selector: 'nav.tm-period' },
      { n: 2, selector: 'fieldset.tm-fs' },
      { n: 3, selector: '.tm-sum' },
      { n: 4, selector: 'form[data-team-form] button.btn-pri' },
    ],
  },
  // The tier editor's Group prices card (EarnPlanEditors): Insider is the first tier on Plans & offers.
  {
    id: 'earn-tier-group-prices',
    path: `${ws}/earn/plans`,
    feature: 'earn',
    before: [{ click: 'main a[href*="/earn/plans/tiers/"]:not([href$="/new"])' }, { wait: 1500 }],
    clip: 'section[aria-labelledby="ea-group"]',
  },
  // The team buyer's panel: Acme Inc's 10 seats on Insider yearly (EarnMemberPanelStates).
  {
    id: 'earn-member-team',
    path: `${ws}/earn/members?q=priya%40acme-inc.example`,
    feature: 'earn',
    before: [{ click: 'table.tbl tbody tr:first-child td.ea-member button' }, { wait: 1500 }],
    // The status line, the seats, the actions (they reach every seat).
    markers: [
      { n: 1, selector: '.ea-sheet .ea-status' },
      { n: 2, selector: 'section[aria-labelledby="ea-seats"]' },
      { n: 3, selector: '.ea-sheet-foot' },
    ],
  },
  // Paid members filtered to Paused (EarnMembersStates).
  {
    id: 'earn-members-paused',
    path: `${ws}/earn/members?status=paused`,
    feature: 'earn',
    // The Paused chip, the note, the member's badge and resume date.
    markers: [
      { n: 1, selector: '.ea-chips .ea-schip[aria-pressed="true"]' },
      { n: 2, selector: 'main .note[role="note"]' },
      { n: 3, selector: 'table.tbl tbody tr:first-child' },
    ],
  },
  // The paused member's panel, with Resume now (EarnMemberPanelStates).
  {
    id: 'earn-member-paused',
    path: `${ws}/earn/members?status=paused`,
    feature: 'earn',
    before: [{ click: 'table.tbl tbody tr:first-child td.ea-member button' }, { wait: 1500 }],
    markers: [
      { n: 1, selector: '.ea-sheet .ea-status' },
      { n: 2, selector: '.ea-sheet-foot > button:nth-child(2)' },
    ],
  },
  // Earn › Settings › Payments › Pausing (G-39).
  {
    id: 'earn-pausing',
    path: `${ws}/earn/settings`,
    feature: 'earn',
    clip: 'section[aria-labelledby="ea-pausing"]',
  },
  // Sponsor self-booking (G-40). qa-map: EarnSponsorRequests
  {
    id: 'earn-sponsor-requests',
    path: `${ws}/earn/sponsors?tab=requests`,
    feature: 'earn',
    // The tab; a request waiting for review; one approved and waiting for payment; one paid through Stripe.
    markers: [
      { n: 1, selector: '#sp-tab-requests' },
      { n: 2, selector: 'table.sp-tbl tbody tr:nth-child(2)' },
      { n: 3, selector: 'table.sp-tbl tbody tr:nth-child(5)' },
      { n: 4, selector: 'table.sp-tbl tbody tr:nth-child(7)' },
    ],
  },
  {
    id: 'earn-sponsor-selfserve',
    path: `${ws}/earn/sponsors?tab=requests`,
    feature: 'earn',
    clip: 'section[aria-labelledby="sp-selfserve"]',
    // The switch, the media kit's address, its numbers, the self-serve slot.
    markers: [
      { n: 1, selector: 'section[aria-labelledby="sp-selfserve"] input[role="switch"]' },
      { n: 2, selector: 'section[aria-labelledby="sp-selfserve"] input[aria-labelledby="sp-kit-url"]' },
      { n: 3, selector: 'section[aria-labelledby="sp-selfserve"] fieldset' },
      { n: 4, selector: 'section[aria-labelledby="sp-selfserve"] .sp-ssrow' },
    ],
  },
  // The slot editor's self-serve fields, from the card's Edit slot (opened, never saved).
  {
    id: 'earn-sponsor-slot-selfserve',
    path: `${ws}/earn/sponsors?tab=requests`,
    feature: 'earn',
    before: [{ click: 'section[aria-labelledby="sp-selfserve"] .sp-ssrow button' }, { wait: 1000 }],
    clip: '.dlg',
  },
  // Fabrikam Studio's request for #147, waiting for review.
  {
    id: 'earn-sponsor-request',
    path: `${ws}/earn/sponsors?tab=requests`,
    feature: 'earn',
    before: [{ click: 'table.sp-tbl button[aria-label$="· Fabrikam Studio"]' }, { wait: 1500 }],
    // What the sponsor sent, the creative as the Sponsor block shows it, what approving does, Decline and Approve.
    markers: [
      { n: 1, selector: '.ea-sheet-body > section:nth-of-type(1)' },
      { n: 2, selector: '.ea-sheet-body > section:nth-of-type(3)' },
      { n: 3, selector: '.ea-sheet-body > section:nth-of-type(4)' },
      { n: 4, selector: '.ea-sheet-foot' },
    ],
  },
  // The approve dialog, opened and never submitted.
  {
    id: 'earn-sponsor-approve',
    path: `${ws}/earn/sponsors?tab=requests`,
    feature: 'earn',
    before: [
      { click: 'table.sp-tbl button[aria-label$="· Fabrikam Studio"]' },
      { wait: 1500 },
      { click: '.ea-sheet-foot > button:last-child' },
      { wait: 800 },
    ],
    clip: '.dlg',
  },
  // qa-map: PublicSponsorKit
  {
    id: 'public-sponsor-kit',
    path: '/p/acme-newsletter/sponsor',
    feature: 'publicpages',
    user: 'anon',
    locales: en,
    fullPage: true,
    // The numbers, About and Audience, the slot, the open issues.
    markers: [
      { n: 1, selector: 'section[aria-labelledby="kit-st"]' },
      { n: 2, selector: 'main.sp section.card:not([aria-labelledby])' },
      { n: 3, selector: 'article.sp-slot' },
      { n: 4, selector: '.sp-issues' },
    ],
  },
  // Website tracking, Meta Lead Ads and the integrations catalog
  // qa-map: TrackingSites. Acme Merch (https://shop.acme.io, linked to the Acme Merch store) is selected; Docs has
  // no store.
  {
    id: 'tracking-sites',
    path: `${ws}/settings/integrations/tracking`,
    feature: 'tracking',
    fullPage: true,
    markers: [
      { n: 1, selector: 'main section.ih-dhead .ih-dact' },
      { n: 2, selector: trackingSites },
      { n: 3, selector: `${trackingGrid} > section.card` },
      { n: 4, selector: `${trackingGrid} > div > section.card:nth-child(1)` },
      { n: 5, selector: `${trackingGrid} > div > section.card:nth-child(2)` },
    ],
  },
  // TrackingSetup's first step: Add site opens the dialog (never saved).
  {
    id: 'tracking-add-site',
    path: `${ws}/settings/integrations/tracking`,
    feature: 'tracking',
    before: [{ click: 'main section.ih-dhead .ih-dact button' }, { wait: 500 }],
  },
  // TrackingSetup's second step for an existing site: Set up on Acme Merch's row shows its snippets.
  {
    id: 'tracking-snippet',
    path: `${ws}/settings/integrations/tracking`,
    feature: 'tracking',
    before: [{ click: `${trackingSites} table tbody tr:nth-child(1) td:last-child button` }, { wait: 500 }],
  },
  // qa-map: IntegrationsLeadAds. Acme Marketing with its Pages Acme Inc and Acme Labs.
  {
    id: 'lead-ads',
    path: `${ws}/settings/integrations/leads/{leadConnection:Acme Marketing}`,
    feature: 'leads',
    markers: [
      { n: 1, selector: 'section[aria-labelledby="la-how"]' },
      { n: 2, selector: 'section[aria-labelledby="la-forms"]' },
      { n: 3, selector: 'section[aria-labelledby="la-act"]' },
      { n: 4, selector: 'section[aria-labelledby="la-rec"]' },
    ],
  },
  // LeadAdsFormMapping: Map on Field Guide download (the second form: single opt-in with its consent checkbox).
  {
    id: 'lead-ads-mapping',
    path: `${ws}/settings/integrations/leads/{leadConnection:Acme Marketing}`,
    feature: 'leads',
    before: [{ click: 'section[aria-labelledby="la-forms"] table tbody tr:nth-child(2) button' }, { wait: 1500 }],
  },
  // The Acme Merch store page's Sync card, down to its Discount codes row (Allowed, the pools that create codes).
  {
    id: 'integrations-shopify-sync',
    path: `${ws}/settings/integrations/stores/{store:Acme Merch}`,
    feature: 'commerce',
    clip: 'section[aria-labelledby="cm-sync"]',
  },
  // The catalog searched for "consent": the Commerce group (Shopify, WooCommerce, Website tracking) and the Lead
  // ads group (Meta Lead Ads).
  {
    id: 'integrations-catalog-new',
    path: `${ws}/settings/integrations`,
    feature: 'integrations',
    // The search matches the words each card shows, so it is the app language's word for consent.
    before: [
      {
        fill: [
          '.ih-search input',
          { en: 'consent', de: 'Einwilligung', es: 'consentimiento', fr: 'consentement', vi: 'đồng ý' },
        ],
      },
      { wait: 500 },
    ],
    markers: [
      { n: 1, selector: 'section[aria-labelledby="g-commerce"]' },
      { n: 2, selector: 'section[aria-labelledby="g-leads"]' },
    ],
  },
  // Allowed IPs and the transactional SDK samples
  // qa-map: SettingsKeys. Allowed IPs… of the "Data warehouse sync" key (two networks, last used inside them).
  // The dialog only opens; nothing is saved.
  {
    id: 'settings-keys-allowed-ips',
    path: `${ws}/settings/keys`,
    feature: 'keys',
    waitFor: 'main table tbody tr',
    before: [{ click: 'main tr:has-text("Data warehouse sync") button >> nth=0' }, { wait: 800 }],
    markers: [
      { n: 1, selector: '[role="dialog"] textarea' },
      // The field's spans: the hint, where the key was last used, the caller's own address.
      { n: 2, selector: '[role="dialog"] .lbl > span.k:nth-of-type(2)' },
      { n: 3, selector: '[role="dialog"] .lbl > span.k:nth-of-type(3)' },
    ],
  },
  // qa-map: TransactionalSetup. The Code samples card: Python through the SDK, with the SDK · HTTP switch.
  {
    id: 'transactional-setup-sdk',
    path: `${ws}/transactional/setup`,
    feature: 'transactional',
    clip: 'section.card:has(.tx-cbx)',
    markers: [
      { n: 1, selector: 'section.card:has(.tx-cbx) select' },
      { n: 2, selector: '.tx-cbx .sw' },
    ],
  },
  // Instance admin: file storage and version
  // qa-map: InstanceSystem. The same page's File storage card: the backend, the folder or bucket and what it holds.
  {
    id: 'instance-file-storage',
    path: `${ws}/admin/system`,
    feature: 'admin',
    clip: 'section[aria-labelledby="sys-files-h"]',
  },
  // qa-map: InstanceSettings. The Version & updates card: installed and latest release, the upgrade command, the check.
  {
    id: 'instance-version',
    path: `${ws}/admin/instance`,
    feature: 'admin',
    clip: 'section[aria-labelledby="ver-h"]',
  },
  // Appearance, the dark theme and the sending summary
  // qa-map: AppearanceStates (the card on ${ws}/account#appearance, after Language & region). The device is light
  // and Linh is on Same as device, so it shows "It's light now". Never pick a theme here: that saves on her account.
  { id: 'appearance', path: `${ws}/account`, feature: 'appearance', clip: '#appearance' },
  // qa-map: ShellUserMenu. The account menu, opened, with the Theme row's three icons.
  {
    id: 'user-menu-theme',
    path: `${ws}`,
    feature: 'shell',
    before: [{ click: 'button.ubtn' }, { wait: 500 }],
    clip: '[role="menu"]',
    markers: [{ n: 1, selector: '[role="menu"] .mtheme' }],
  },
  // qa-map: MainDark. The Overview with the device in dark mode: Linh follows the device, so the app is dark.
  { id: 'overview-dark', path: `${ws}`, feature: 'overview', theme: 'dark' },
  // qa-map: Notifications. The page's last card: the sending summary by email (M57 G-14).
  { id: 'notifications-summary', path: `${ws}/notifications`, feature: 'notifications', clip: '#summary' },
]
