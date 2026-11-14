package inbound

func init() {
	webhooks.Events = append(webhooks.Events,
		webhooks.WebhookEventInfo{Name: EventReplied, Group: "Replies", Description: "A contact replied to an email (including auto-replies).",
			DescriptionText: msgs.M("webhook.email.replied").Keep(nil)},
		webhooks.WebhookEventInfo{Name: EventReceived, Group: "Replies", Description: "Mail arrived at the receiving domain that isn't a reply.",
			DescriptionText: msgs.M("webhook.email.received").Keep(nil)},
	)
}
