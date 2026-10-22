package api

// unavailable answers 503 when the database can't say who is asking (the
// request may be retried; the session and key stay valid).
func (a *Authenticator) unavailable(ctx context.Context, what string, err error) *Problem {
	if a.Log != nil {
		a.Log.WarnContext(ctx, "authentication lookup failed", "what", what, "err", err)
	}
	return Err(http.StatusServiceUnavailable, CodeUnavailable, "Couldn't check who you are right now. Try again in a moment.")
}
