package mcpserver

// tool wraps a handler with authentication, the permission check and the audit entry.
func tool[In any](s *Service, srv *mcp.Server, name string, perm authz.Permission, run func(ctx context.Context, c *agentCall, in In) (any, entry, error), target func(ctx context.Context, c *agentCall, in In) entry) {
	var desc string
	for _, t := range Tools {
		if t.Name == name {
			desc = t.Description + " Needs " + t.Permission + "."
		}
	}
	mcp.AddTool(srv, &mcp.Tool{Name: name, Description: desc}, func(ctx context.Context, req *mcp.CallToolRequest, in In) (*mcp.CallToolResult, any, error) {

	tool(s, srv, "list_campaigns", authz.CampaignsView, func(ctx context.Context, c *agentCall, in listCampaignsIn) (any, entry, error) {
	tool(s, srv, "get_campaign_report", authz.ReportsView, func(ctx context.Context, c *agentCall, in CampaignRef) (any, entry, error) {
	tool(s, srv, "create_segment", authz.SegmentsEdit, func(ctx context.Context, c *agentCall, in segmentIn) (any, entry, error) {
