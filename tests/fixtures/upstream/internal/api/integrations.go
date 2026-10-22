package api

// Error codes of calls made with an integration key (the integrations hub
// shows them in each integration's call log).
const (
	CodeKeyRevoked       = "key_revoked"
	CodeKeyExpired       = "key_expired"
	CodeOwnerDeactivated = "owner_deactivated"
	CodeNotForThisKey    = "integration_operation_denied"
)
