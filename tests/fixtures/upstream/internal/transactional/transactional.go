package transactional

// Error codes of the transactional API (brief §3.2). Each answer says in
// its detail what to fix.
const (
	CodeTemplateNotFound     = "template_not_found"
	CodeTemplateNotPublished = "template_not_published"
	CodeMissingVariables     = "missing_variables"
	CodeInvalidRecipient     = "invalid_recipient"
	CodeRecipientSuppressed  = "recipient_suppressed"
	CodeSenderNotVerified    = "sender_not_verified"
	CodeAttachmentsTooLarge  = "attachments_too_large"
	CodeRateLimited          = "rate_limited"
	CodeNoHealthyRoute       = "no_healthy_route"
	// CodeIdempotencyReused answers a key sent again with another body.
	CodeIdempotencyReused = "idempotency_key_reused"
	// CodeTemplateNotAllowed answers a key limited to other templates.
	CodeTemplateNotAllowed = "template_not_allowed"
	// Template editing.
	CodeVersionConflict   = "version_conflict"
	CodeBreakingChange    = "breaking_change"
	CodeApprovalRequired  = "approval_required"
	CodeTemplateDoesntRun = "template_does_not_render"
	CodeAgentsNeverSend   = "agents_never_send"
)

func problem(status int, code, detail string) *Problem {
	return &Problem{Problem: *api.Err(status, code, detail)}
}
