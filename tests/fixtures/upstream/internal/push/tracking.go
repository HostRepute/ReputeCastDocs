package push

func init() {
	webhooks.Events = append(webhooks.Events,
		webhooks.WebhookEventInfo{Name: "push.clicked", Group: "Push", Description: "A reader clicked a notification or one of its buttons (once per notification)."},
	)
}
