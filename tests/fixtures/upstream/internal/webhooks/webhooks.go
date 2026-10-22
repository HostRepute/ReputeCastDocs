package webhooks

// Events is the catalogue of events, in display order.
var Events = []WebhookEventInfo{
	{"contact.subscribed", "Contacts", "A contact joined a list (after double opt-in when it's on)."},
	{"contact.unsubscribed", "Contacts", "A contact left a list or unsubscribed from everything."},
	{"contact.updated", "Contacts", "Fields, tags or preferences changed."},
	{"contact.erased", "Contacts", "Personal data was erased."},
	// Grow (design expansion phase 5): referral programs.
	{"referral.counted", "Referrals", "A referral counted: its subscriber confirmed and stayed through the hold."},
	{"referral.held", "Referrals", "A referral was held for review by a suspicion rule."},
}
