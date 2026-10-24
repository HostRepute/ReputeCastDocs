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
var Defs = described([]Def{
	{Key: CampaignsView, Group: g("campaigns")},
	{Key: CampaignsEdit, Group: g("campaigns"), Implies: []Permission{CampaignsView}},
	{Key: CampaignsApprove, Group: g("campaigns"), Sensitive: true, Implies: []Permission{CampaignsView}},
	{Key: TemplatesView, Group: g("templates")},
	{Key: TransactionalView, Group: g("transactional")},
	{Key: AutomationsView, Group: g("automations")},
	{Key: SubscribersView, Group: g("contacts")},
	{Key: SegmentsEdit, Group: g("lists"), Implies: []Permission{SubscribersView}},
	{Key: SegmentsSQL, Group: g("lists"), Sensitive: true, Implies: []Permission{SegmentsEdit, SubscribersView}},
	{Key: ReportsView, Group: g("reports")},
	{Key: DeliverabilityView, Group: g("deliverability")},
	{Key: ProvidersView, Group: g("sending")},
	{Key: TeamView, Group: g("team")},
	{Key: IntegrationsView, Group: g("integrations")},
	{Key: GrowView, Group: g("grow")},
	{Key: EarnView, Group: g("earn")},
	{Key: WebsiteView, Group: g("website")},
	{Key: ProductsView, Group: g("products")},
	{Key: AuditView, Group: g("audit")},
	{Key: WorkspaceTransfer, Group: g("workspace"), Sensitive: true, OwnerOnly: true},
	{Key: WorkspaceDelete, Group: g("workspace"), Sensitive: true, OwnerOnly: true},
})

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
	{Key: RoleOwner, Name: "Owner", Description: roleAbout(RoleOwner), Permissions: All()},
	{Key: RoleAdmin, Name: "Admin", Description: roleAbout(RoleAdmin), Permissions: AllGrantable()},
	{Key: RoleViewer, Name: "Viewer", Description: roleAbout(RoleViewer), Permissions: NewSet(viewAll...)},
}
