package integrations

// privateRefusal explains a webhook address the SSRF guard refuses.
func (s *Service) privateRefusal(ctx context.Context, raw string, err error) error {
	msg := err.Error()
	if strings.Contains(msg, "private") || strings.Contains(msg, "loopback") || strings.Contains(msg, "local hostname") {
		admins := s.Reachability(ctx).Admins
		ask := ""
		if len(admins) > 0 {
			ask = " Ask " + access.OrList(admins) + "."
		}
		pr := api.Invalid("body.url", fmt.Sprintf("%s. Webhooks to private addresses stay blocked until an instance admin allows them (webhooks.allow_private_networks).%s",
			capitalize(strings.TrimPrefix(msg, "address not allowed: ")), ask))
		pr.Code = "private_address"
		return pr
	}
	return api.Invalid("body.url", capitalize(msg)+".")
}
