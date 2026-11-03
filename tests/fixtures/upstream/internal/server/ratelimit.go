package server

import (
	"encoding/json"
	"net/http"
)

// tooMany answers a rate-limited request with a problem body written by hand.
func tooMany(w http.ResponseWriter, detail string) {
	body, _ := json.Marshal(map[string]any{"status": http.StatusTooManyRequests, "title": "Too Many Requests", "detail": detail, "code": "rate_limited"})
	w.Header().Set("Content-Type", "application/problem+json")
	w.WriteHeader(http.StatusTooManyRequests)
	_, _ = w.Write(body)
}

// attention is not a problem body (no title): its code is a notice, not an error.
func attention() []byte {
	b, _ := json.Marshal(map[string]any{"code": "site_silent", "host": "staging.acme.io"})
	return b
}
