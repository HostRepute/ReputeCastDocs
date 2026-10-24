package authz

const (
	// AgencyView: the agency overview and search across your clients.
	AgencyView Permission = "agency:view"
	// AgencyUsage: usage and costs per client, rebill rates and the export.
	AgencyUsage Permission = "agency:usage"
	// AgencyLibrary: the shared library and workspace templates.
	AgencyLibrary Permission = "agency:library"
	// AgencyManage: client workspaces, staff and assignments.
	AgencyManage Permission = "agency:manage"
)

// AgencyDefs describes the agency permissions in display order (Instance
// admin and the agency's Staff screen). Group is "Agency".
var AgencyDefs = described([]Def{
	{Key: AgencyView, Group: g("agency"), PeopleOnly: true},
	{Key: AgencyUsage, Group: g("agency"), PeopleOnly: true},
	{Key: AgencyLibrary, Group: g("agency"), PeopleOnly: true},
	{Key: AgencyManage, Group: g("agency"), Sensitive: true, PeopleOnly: true},
})

// Agency staff levels.
const (
	AgencyManagerLevel  = "agency_manager"
	AccountManagerLevel = "account_manager"
)

// AgencyRoles in display order. Instance admins are agency managers.
var AgencyRoles = []AgencyRole{
	{Key: AgencyManagerLevel, Name: "Agency manager", Description: roleAbout(AgencyManagerLevel),
		Permissions: AgencySet(AgencyView, AgencyUsage, AgencyLibrary, AgencyManage)},
	{Key: AccountManagerLevel, Name: "Account manager", Description: roleAbout(AccountManagerLevel),
		Permissions: AgencySet(AgencyView, AgencyUsage, AgencyLibrary)},
}

const (
	RoleClientApprover = "client_approver"
	RoleClientViewer   = "client_viewer"
)

// ClientRoles in display order. Their permissions come from here, never
// from the database, like the other built-in roles.
var ClientRoles = []BuiltinRole{
	{Key: RoleClientApprover, Name: "Client approver", Description: roleAbout(RoleClientApprover),
		Permissions: NewSet(CampaignsView, CampaignsApprove, TemplatesView, AutomationsView, ReportsView, DeliverabilityView, SubscribersView)},
	{Key: RoleClientViewer, Name: "Client viewer", Description: roleAbout(RoleClientViewer),
		Permissions: NewSet(CampaignsView, TemplatesView, AutomationsView, ReportsView, DeliverabilityView)},
}
