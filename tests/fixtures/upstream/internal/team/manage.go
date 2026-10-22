package team

// lastOwner is the 409 for removing, demoting or deactivating the last Owner.
func lastOwner(ctx context.Context, q *store.Queries, ws *store.Workspace, name string) *api.Problem {
	suggest := ""
	if rows, err := q.TeamListMembers(ctx, ws.ID); err == nil {
		for _, r := range rows {
			if r.Status == "active" && r.UserStatus == "active" && r.RoleKey == authz.RoleAdmin {
				suggest = displayName(r.UserName, r.Email)
				break
			}
		}
	}
	p := api.Err(http.StatusConflict, api.CodeLastOwner, mLastOwner.Text(i18n.LangFrom(ctx), i18n.Args{"name": name}))
	if suggest != "" {
		p = p.WithMeta("suggest", suggest)
	}
	return p
}
