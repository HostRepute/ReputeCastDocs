package mcpserver

const (
	mjmlTemplate   = "reputecast://campaigns/{id}.mjml"
	reportTemplate = "reputecast://campaigns/{id}/report.csv"
	auditResource  = "reputecast://audit/recent.json"
)

	srv.AddResourceTemplate(&mcp.ResourceTemplate{Name: "campaign-mjml", Title: "Campaign MJML", URITemplate: mjmlTemplate, MIMEType: "text/mjml",
		Description: "The MJML source of a campaign. Needs campaigns:view."},
	srv.AddResourceTemplate(&mcp.ResourceTemplate{Name: "campaign-report", Title: "Campaign report (CSV)", URITemplate: reportTemplate, MIMEType: "text/csv",
		Description: "Results by sending and mailbox provider. Needs reports:view."},
	srv.AddResource(&mcp.Resource{Name: "audit-log", Title: "Audit log (latest 100 entries)", URI: auditResource, MIMEType: "application/json",
		Description: "The workspace audit log, newest first. Needs audit:view."},
	srv.AddPrompt(&mcp.Prompt{Name: "draft_weekly_digest", Title: "Draft the weekly digest",
		Description: "Draft the next Weekly Digest from what performed well recently.",
		Arguments:   []*mcp.PromptArgument{{Name: "topics", Description: "Topics or links to include, comma-separated"}}},
	srv.AddPrompt(&mcp.Prompt{Name: "explain_auto_pause", Title: "Explain this auto-pause",
		Description: "Explain why a send paused automatically and what the options are.",
		Arguments:   []*mcp.PromptArgument{{Name: "campaign", Description: "The paused campaign's name or id", Required: true}}},
