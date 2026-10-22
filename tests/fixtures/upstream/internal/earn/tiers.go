package earn

// DeleteTier deletes a tier that never had paid members.
func (s *Service) DeleteTier(ctx context.Context, ws *store.Workspace, p *authz.Principal, id string) error {
	tid, err := uuid.Parse(id)
	if err != nil {
		return api.NotFound("Tier")
	}
	t, err := s.Q.EarnTier(ctx, store.EarnTierParams{ID: tid, WorkspaceID: ws.ID})
	if err != nil {
		return api.MapError(err, "Tier")
	}
	if n, err := s.Q.EarnTierSubscriptions(ctx, &tid); err != nil {
		return err
	} else if n > 0 {
		return problem(ctx, http.StatusConflict, "tier_has_members", "tier.hasMembers", i18n.Args{"count": n})
	}
	return db.Tx(ctx, s.Pool, func(tx pgx.Tx) error {
		q := store.New(tx)
		if err := q.EarnTierDelete(ctx, store.EarnTierDeleteParams{ID: tid, WorkspaceID: ws.ID, At: &[]time.Time{s.now()}[0]}); err != nil {
			return err
		}
		return s.Audit.LogWith(ctx, q, audit.Event{WorkspaceID: &ws.ID, Action: "earn.tier_deleted", TargetType: "earn_tier", TargetID: tid.String(), TargetName: t.Name,
			Before: map[string]any{"name": t.Name, "visibility": t.Visibility}})
	})
}
