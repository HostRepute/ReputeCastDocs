package webhooks

// Events is the catalogue of events, in display order.
var Events = []WebhookEventInfo{
	{Name: "contact.subscribed", Group: "Contacts"},
	{Name: "contact.unsubscribed", Group: "Contacts"},
	{Name: "contact.updated", Group: "Contacts"},
	{Name: "contact.erased", Group: "Contacts"},
	// Grow (design expansion phase 5): referral programs.
	{Name: "referral.counted", Group: "Referrals"},
	{Name: "referral.held", Group: "Referrals"},
}
