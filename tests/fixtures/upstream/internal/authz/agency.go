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
var AgencyDefs = []Def{
	{Key: AgencyView, Group: "Agency", Label: "View the agency overview and search across your clients", Description: "See every assigned client's health, next send, approvals waiting and incidents, and search across them.", PeopleOnly: true},
	{Key: AgencyUsage, Group: "Agency", Label: "See usage and costs per client, set rebill rates and export usage", Description: "Emails, texts, notifications and provider costs per client and month, with what to rebill.", PeopleOnly: true},
	{Key: AgencyLibrary, Group: "Agency", Label: "Manage the shared library and workspace templates", Description: "Add, change and remove library items and workspace templates, and copy them into clients.", PeopleOnly: true},
	{Key: AgencyManage, Group: "Agency", Label: "Create and delete client workspaces, and manage staff and assignments", Description: "Create and delete clients, add and remove staff, and assign them to clients.", Sensitive: true, PeopleOnly: true},
}

// Agency staff levels.
const (
	AgencyManagerLevel  = "agency_manager"
	AccountManagerLevel = "account_manager"
)

// AgencyRoles in display order. Instance admins are agency managers.
var AgencyRoles = []AgencyRole{
	{Key: AgencyManagerLevel, Name: "Agency manager", Description: "Every client, staff, templates, usage and rates",
		Permissions: AgencySet(AgencyView, AgencyUsage, AgencyLibrary, AgencyManage)},
	{Key: AccountManagerLevel, Name: "Account manager", Description: "The clients they're assigned to: overview, search, usage and the library",
		Permissions: AgencySet(AgencyView, AgencyUsage, AgencyLibrary)},
}

const (
	RoleClientApprover = "client_approver"
	RoleClientViewer   = "client_viewer"
)

// ClientRoles in display order. Their permissions come from here, never
// from the database, like the other built-in roles.
var ClientRoles = []BuiltinRole{
	{Key: RoleClientApprover, Name: "Client approver", Description: "Sees campaigns, templates, automations, reports, deliverability and contacts (no export); approves sends",
		Permissions: NewSet(CampaignsView, CampaignsApprove, TemplatesView, AutomationsView, ReportsView, DeliverabilityView, SubscribersView)},
	{Key: RoleClientViewer, Name: "Client viewer", Description: "Sees campaigns, templates, automations, reports and deliverability; no contacts",
		Permissions: NewSet(CampaignsView, TemplatesView, AutomationsView, ReportsView, DeliverabilityView)},
}
