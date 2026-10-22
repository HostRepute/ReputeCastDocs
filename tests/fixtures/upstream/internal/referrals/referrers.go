package referrals

// SetLinkStatus pauses or resumes a referrer's link. A paused link leads to
// the normal subscribe page, which doesn't say why.
func (s *Service) SetLinkStatus(ctx context.Context, ws *store.Workspace, programID, linkID uuid.UUID, status, note string) error {
	l, err := s.Q.ReferralLinkGet(ctx, store.ReferralLinkGetParams{WorkspaceID: ws.ID, ID: linkID})
	if err != nil || l.ProgramID != programID {
		return api.NotFound("Referrer")
	}
	if l.Status == status {
		key := "link.active"
		if status == "paused" {
			key = "link.paused"
		}
		return api.Err(http.StatusConflict, "link_"+status, s.text(ctx, msgs.M(key), nil))
	}
	name := displayName(l.ContactFirstName, l.ContactLastName, l.ContactEmail)
	return db.Tx(ctx, s.Pool, func(tx pgx.Tx) error {
		q := store.New(tx)
		now := s.now()
		if err := q.ReferralLinkSetStatus(ctx, store.ReferralLinkSetStatusParams{ID: linkID, Status: status, Now: now, By: actorUser(ctx), Note: strings.TrimSpace(note)}); err != nil {
			return err
		}
		kind, action := EventLinkResumed, "referral.link_resumed"
		if status == "paused" {
			kind, action = EventLinkPaused, "referral.link_paused"
		}
		contact := l.ContactID
		if err := writeLog(ctx, q, ws.ID, logEntry{program: programID, link: &linkID, contact: &contact, kind: kind, at: now}); err != nil {
			return err
		}
		return s.Audit.LogWith(ctx, q, audit.Event{WorkspaceID: &ws.ID, Action: action, TargetType: "referral_link", TargetID: linkID.String(),
			TargetName: name, Reason: strings.TrimSpace(note), Metadata: map[string]any{"related": l.ContactID.String()}})
	})
}
