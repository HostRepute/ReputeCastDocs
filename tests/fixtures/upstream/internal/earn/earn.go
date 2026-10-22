package earn

// lang is the reader's language for server text.
func lang(ctx context.Context) i18n.Lang { return i18n.LangFrom(ctx) }

// problem is an RFC 9457 answer with its text from the catalog.
func problem(ctx context.Context, status int, code, key string, args i18n.Args) *api.Problem {
	return api.Err(status, code, msgs.M(key).Text(lang(ctx), args))
}
