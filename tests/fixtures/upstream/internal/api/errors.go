package api

// Error codes used across the API.
const (
	CodeUnauthenticated     = "unauthenticated"
	CodeSessionExpired      = "session_expired"
	CodePasswordChange      = "password_change_required"
	CodeTwoFactorSetup      = "two_factor_setup_required"
	CodePermissionDenied    = "permission_denied"
	CodeEscalation          = "escalation_denied"
	CodeNotFound            = "not_found"
	CodeConflict            = "conflict"
	CodeValidation          = "validation_failed"
	CodeRateLimited         = "rate_limited"
	CodeLocked              = "locked"
	CodeInstanceNotSetUp    = "instance_not_set_up"
	CodeHumansOnly          = "humans_only"
	CodeWorkspaceNotFound   = "workspace_not_found"
	CodeLastOwner           = "last_owner"
	CodeInvalidCredentials  = "invalid_credentials" //nolint:gosec // an error code, not a credential
	CodeProviderUnavailable = "provider_unavailable"
	CodeUnavailable         = "unavailable"
)

// Err builds a problem with a code.
func Err(status int, code, detail string) *Problem {
	return &Problem{ErrorModel: huma.ErrorModel{Status: status, Title: http.StatusText(status), Detail: detail}, Code: code}
}

// NotFound returns a 404 for a named thing ("Campaign").
func NotFound(what string) *Problem {
	return Err(http.StatusNotFound, CodeNotFound, fmt.Sprintf("%s not found.", what))
}

// Forbidden returns a 403 for a missing permission, naming who can help.
func Forbidden(perm authz.Permission, helpers []string) *Problem {
	p := Err(http.StatusForbidden, CodePermissionDenied, authz.DeniedMessage(perm, helpers))
	p.Permission = string(perm)
	p.Helpers = helpers
	return p
}
