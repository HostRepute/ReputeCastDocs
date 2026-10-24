import { defineMessages } from '@/i18n'

/**
 * Instance admin › SSO providers › a provider (SSOSetup, SSOStates): its
 * five steps, saving and enabling. Provider names, claim names, scopes, URLs
 * and redirect URIs stay as they are. The presets' names, apps, hints and
 * docs links, discovery errors, the claims' notes and the test sign-in's
 * outcomes come from the server, in the app language.
 */
export const m = defineMessages('admin.ssoSetup', {
  // The page and step 1, the preset.
  docTitle: 'SSO provider',

  // Step 2, the connection. {app} is the preset's app ("Entra app registration"), from the server in the app language.
  connectionTitle: '2 · Connection',
  discoveryFailedTitle: 'Discovery failed',
  discoveryFailedLive: 'Step 2 · the saved issuer keeps working until a new one passes',

  // Step 3, the claim mapping. {idp} is the preset's short name ("Entra ID", "the IdP"), from the server in the app language.
  claimsTitle: '3 · Claim mapping',
  claimsCaption: 'Which claims fill the account',
  claimsTable: 'Claim mapping',
})
