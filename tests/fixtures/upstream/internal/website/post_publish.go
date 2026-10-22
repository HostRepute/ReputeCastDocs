package website

// The Website webhook events.
func init() {
	webhooks.Events = append(webhooks.Events,
		webhooks.WebhookEventInfo{Name: "post.published", Group: "Website", Description: "A post went live on the website, by a person, at its time or with its campaign's send."},
		webhooks.WebhookEventInfo{Name: "post.unpublished", Group: "Website", Description: "A post was taken off the website or deleted."},
	)
}
