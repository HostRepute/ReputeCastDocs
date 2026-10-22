package authz

// Every permission ReputeCast knows, grouped as in the role editor.
const (
	CampaignsView    Permission = "campaigns:view"
	CampaignsEdit    Permission = "campaigns:edit"
	CampaignsApprove Permission = "campaigns:approve"
	TemplatesView Permission = "templates:view"
	TransactionalView    Permission = "transactional:view"
	AutomationsView    Permission = "automations:view"
	SubscribersView   Permission = "subscribers:view"
	SegmentsEdit Permission = "segments:edit"
	SegmentsSQL  Permission = "segments:sql"
	ReportsView  Permission = "reports:view"
	DeliverabilityView     Permission = "deliverability:view"
	ProvidersView   Permission = "providers:view"
	TeamView   Permission = "team:view"
	IntegrationsView   Permission = "integrations:view"
	GrowView    Permission = "grow:view"
	EarnView          Permission = "earn:view"
	WebsiteView    Permission = "website:view"
	ProductsView    Permission = "products:view"
	AuditView Permission = "audit:view"

	// Owner-only actions. They are never grantable to custom roles, API keys
	// or agents; only the built-in Owner role holds them.
	WorkspaceTransfer Permission = "workspace:transfer"
	WorkspaceDelete   Permission = "workspace:delete"
)

// Defs is the catalogue of permissions in display order.
var Defs = []Def{
	{Key: CampaignsView, Group: "Campaigns", Label: "View campaigns", Description: "See campaigns, their content, audience and status."},
	{Key: CampaignsEdit, Group: "Campaigns", Label: "Edit campaigns", Description: "Create and edit drafts, request approval.", Implies: []Permission{CampaignsView}},
	{Key: CampaignsApprove, Group: "Campaigns", Label: "Approve campaigns", Description: "Approve, reject or request changes on sends that need approval.", Sensitive: true, Implies: []Permission{CampaignsView}},
	{Key: TemplatesView, Group: "Templates", Label: "View templates", Description: "See saved templates and sections."},
	{Key: TransactionalView, Group: "Transactional", Label: "View templates, messages and reports", Description: "See transactional templates, the message log and its numbers. Never message content."},
	{Key: AutomationsView, Group: "Automations", Label: "View automations", Description: "See flows and their live stats."},
	{Key: SubscribersView, Group: "Contacts", Label: "View contacts", Description: "See contacts, profiles and activity."},
	{Key: SegmentsEdit, Group: "Lists and segments", Label: "Edit segments", Description: "Build segments with the condition builder.", Implies: []Permission{SubscribersView}},
	{Key: SegmentsSQL, Group: "Lists and segments", Label: "Write SQL segments", Description: "Write read-only SQL against a contacts view.", Sensitive: true, Implies: []Permission{SegmentsEdit, SubscribersView}},
	{Key: ReportsView, Group: "Reports", Label: "View reports", Description: "See campaign and automation reports."},
	{Key: DeliverabilityView, Group: "Deliverability", Label: "View deliverability", Description: "See domain, IP and provider health."},
	{Key: ProvidersView, Group: "Sending", Label: "View sending providers", Description: "See provider status and routing. Never credentials."},
	{Key: TeamView, Group: "Team", Label: "View the team", Description: "See members, roles and invitations."},
	{Key: IntegrationsView, Group: "Integrations", Label: "See integrations, their activity and webhooks", Description: "See the integrations hub, each integration's health, activity and managed webhooks."},
	{Key: GrowView, Group: "Grow", Label: "View referral and recommendation results", Description: "See referrals, referrers, rewards and recommendations."},
	{Key: EarnView, Group: "Earn", Label: "View revenue, paid members, gifts and sponsors", Description: "See Earn's numbers, paid members, gifts and sponsor bookings."},
	{Key: WebsiteView, Group: "Website and pages", Label: "View posts, pages and website numbers", Description: "See the website's posts, pages, members and numbers."},
	{Key: ProductsView, Group: "Products and orders", Label: "View products and orders", Description: "See digital products, their sales and orders."},
	{Key: AuditView, Group: "Audit", Label: "View the audit log", Description: "See who did what, when and from where."},
	{Key: WorkspaceTransfer, Group: "Workspace", Label: "Transfer ownership", Description: "Make another member the Owner.", Sensitive: true, OwnerOnly: true},
	{Key: WorkspaceDelete, Group: "Workspace", Label: "Delete the workspace", Description: "Delete the workspace and everything in it.", Sensitive: true, OwnerOnly: true},
}

// Built-in role keys.
const (
	RoleOwner  = "owner"
	RoleAdmin  = "admin"
	RoleEditor = "editor"
	RoleViewer = "viewer"
)

// viewAll is what Viewers (and Editors) can read.
var viewAll = []Permission{
	CampaignsView, TemplatesView, TransactionalView, AutomationsView, SubscribersView, ReportsView,
	DeliverabilityView, ProvidersView, TeamView, AuditView, IntegrationsView, GrowView, EarnView,
	WebsiteView, ProductsView,
}

// BuiltinRoles in display order. Their permissions always come from here,
// never from the database, so upgrades can add permissions to them.
var BuiltinRoles = []BuiltinRole{
	{Key: RoleOwner, Name: "Owner", Description: "Everything, including transferring ownership and deleting the workspace", Permissions: All()},
	{Key: RoleAdmin, Name: "Admin", Description: "Everything except transferring ownership and deleting the workspace", Permissions: AllGrantable()},
	{Key: RoleViewer, Name: "Viewer", Description: "Read-only. Never sees secrets", Permissions: NewSet(viewAll...)},
}
