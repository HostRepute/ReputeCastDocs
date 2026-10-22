package revenue

// The conversion API's error codes (Earn › Settings › Attribution lists them).
const (
	CodeMissingIdentity  = "missing_identity"
	CodeInvalidValue     = "invalid_value"
	CodeInvalidCurrency  = "invalid_currency"
	CodeOccurredAtRange  = "occurred_at_out_of_range"
	CodeIdempotencyReuse = "idempotency_key_reused"
)

// coded is a 422 for one field with the conversion API's own code.
func coded(ctx context.Context, code, location, key string) *api.Problem {
	p := api.Invalid(location, text(ctx, key, nil))
	p.Code = code
	return p
}

func (s *Service) Record(ctx context.Context, ws *store.Workspace, p *authz.Principal, in ConversionInput, idemKey string, test bool) (ConversionResult, error) {
	in.ClickToken, in.Email, in.Name = strings.TrimSpace(in.ClickToken), strings.ToLower(strings.TrimSpace(in.Email)), strings.TrimSpace(in.Name)
	if in.ClickToken == "" && in.Email == "" {
		return ConversionResult{}, coded(ctx, CodeMissingIdentity, "body", "problem.missingIdentity")
	}
}
