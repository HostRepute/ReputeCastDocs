// Config is the full runtime configuration.
type Config struct {
	Env        string           `koanf:"env"`
	Roles      []string         `koanf:"roles"`
	HTTP       HTTPConfig       `koanf:"http"`
	Database   DatabaseConfig   `koanf:"database"`
	Secrets    SecretsConfig    `koanf:"secrets"`
	Log        LogConfig        `koanf:"log"`
	Auth       AuthConfig       `koanf:"auth"`
	Worker     WorkerConfig     `koanf:"worker"`
	Updates    UpdatesConfig    `koanf:"updates"`
	Metrics    MetricsConfig    `koanf:"metrics"`
	Webhooks   WebhooksConfig   `koanf:"webhooks"`
	Providers  ProvidersConfig  `koanf:"providers"`
	HostRepute HostReputeConfig `koanf:"hostrepute"`
	DNS        DNSConfig        `koanf:"dns"`
	Mail       MailConfig       `koanf:"mail"`
	Connect    ConnectConfig    `koanf:"connect"`
	I18n       I18nConfig       `koanf:"i18n"`
	Files      FilesConfig      `koanf:"files"`
}

// FilesConfig is where uploaded files live: digital products' files and
// lead magnets (design expansion phase 7). They can be large, so they stay
// out of the database. When the process is split with --role, every web
// and worker process needs the same folder.
type FilesConfig struct {
	// Dir defaults to a "files" folder next to the secret key file (the
	// data volume, /var/lib/reputecast, in the container image).
	Dir string `koanf:"dir"`
}

// FilesDir is the folder uploaded files are kept in.
func (c *Config) FilesDir() string {
	if c.Files.Dir != "" {
		return c.Files.Dir
	}
	base := "data"
	if c.Secrets.KeyFile != "" {
		base = filepath.Dir(c.Secrets.KeyFile)
	}
	return filepath.Join(base, "files")
}

// I18nConfig configures the app languages.
type I18nConfig struct {
	// PseudoLocale offers "Pseudo (+40%)" in Language & region outside
	// development, to check layouts on a staging instance: every string
	// accented, about 40% longer and wrapped in ⟦ ⟧.
	PseudoLocale bool `koanf:"pseudo_locale"`
}

// PseudoLocale reports whether members can pick the pseudo-locale: always
// in development, elsewhere when i18n.pseudo_locale is on.
func (c *Config) PseudoLocale() bool { return c.IsDevelopment() || c.I18n.PseudoLocale }

// MailConfig configures system mail (password resets, invitations,
// notifications), which goes out through the System stream's provider.
type MailConfig struct {
	// DevSMTP is where, in development only, mail for the demo's sample
	// providers is delivered instead of a real provider (Mailpit).
	DevSMTP string `koanf:"dev_smtp"`
}

// ConnectConfig configures "Connect a sending provider".
type ConnectConfig struct {
	// SESTemplateURL is the published CloudFormation template the "Launch
	// stack in AWS" link opens. AWS reads quick-create templates from S3, so
	// instances that publish their own copy point this at it.
	SESTemplateURL string `koanf:"ses_template_url"`
}

// HostReputeConfig configures the optional HostRepute integration. ReputeCast
// is a public OAuth client of HostRepute (PKCE, no secret); instances that
// registered their own client can set its id and secret.
type HostReputeConfig struct {
	APIURL       string `koanf:"api_url"`
	AuthURL      string `koanf:"auth_url"`
	TokenURL     string `koanf:"token_url"`
	RevokeURL    string `koanf:"revoke_url"`
	ClientID     string `koanf:"client_id"`
	ClientSecret string `koanf:"client_secret"`
	// Demo serves a built-in, offline HostRepute (sample data, instant OAuth
	// approval) for development and screenshots.
	Demo bool `koanf:"demo"`
}

// DNSConfig configures the resolvers used for authentication checks and
// blocklist lookups. Empty uses the system resolvers; DNSBLs such as
// Spamhaus refuse queries that come through public resolvers.
type DNSConfig struct {
	Servers []string      `koanf:"servers"`
	Timeout time.Duration `koanf:"timeout"`
}

// HTTPConfig configures the HTTP listener.
type HTTPConfig struct {
	Addr string `koanf:"addr"`
	// PublicURL is the externally reachable base URL. It is used for provider
	// webhooks, SSO redirects, passkeys (relying party) and public pages.
	PublicURL string `koanf:"public_url"`
	// TrustedProxies lists CIDRs whose X-Forwarded-For header is trusted.
	TrustedProxies []string `koanf:"trusted_proxies"`
	// RateLimitAuth and RateLimitAPI are requests per minute: sign-in
	// endpoints per client IP, and the API per key (or IP for sessions).
	RateLimitAuth   int           `koanf:"rate_limit_auth"`
	RateLimitAPI    int           `koanf:"rate_limit_api"`
	ReadTimeout     time.Duration `koanf:"read_timeout"`
	WriteTimeout    time.Duration `koanf:"write_timeout"`
	ShutdownTimeout time.Duration `koanf:"shutdown_timeout"`
}

// DatabaseConfig configures Postgres.
type DatabaseConfig struct {
	URL      string `koanf:"url"`
	MaxConns int32  `koanf:"max_conns"`
	// SegmentRole is the SELECT-only role user-written SQL segments run as.
	SegmentRole string `koanf:"segment_role"`
}

// SecretsConfig holds the master key used to encrypt provider credentials,
// OIDC client secrets and other secrets at rest.
type SecretsConfig struct {
	// Key is a base64-encoded 32-byte key. Rotate by moving the current key
	// to PreviousKeys and setting a new Key.
	Key          string   `koanf:"key"`
	PreviousKeys []string `koanf:"previous_keys"`
	// KeyFile is used when Key is empty. The file is created with a fresh
	// key on first start, so a one-command install works without extra setup.
	KeyFile string `koanf:"key_file"`
}

// LogConfig configures log/slog.
type LogConfig struct {
	Level  string `koanf:"level"`
	Format string `koanf:"format"` // "text" or "json"
}

// AuthConfig holds sign-in defaults. Instance admins can change most of these
// at runtime in Instance admin › Authentication; these are the bootstrap values.
type AuthConfig struct {
	SessionLifetime   time.Duration `koanf:"session_lifetime"`
	SessionIdle       time.Duration `koanf:"session_idle"`
	CookieName        string        `koanf:"cookie_name"`
	CookieSecure      bool          `koanf:"cookie_secure"`
	BreachedCheck     bool          `koanf:"breached_check"`
	PasswordMinLength int           `koanf:"password_min_length"`
}

// WorkerConfig configures background jobs.
type WorkerConfig struct {
	Concurrency int `koanf:"concurrency"`
}

// UpdatesConfig configures the release check against GitHub.
type UpdatesConfig struct {
	Check bool   `koanf:"check"`
	Repo  string `koanf:"repo"`
}

// MetricsConfig configures the Prometheus endpoint.
type MetricsConfig struct {
	Enabled bool   `koanf:"enabled"`
	Addr    string `koanf:"addr"` // empty serves /metrics on the main listener
}

// ProvidersConfig configures calls to sending-provider APIs.
type ProvidersConfig struct {
	// AllowPrivateNetworks lets provider URLs a workspace enters resolve to
	// loopback and private (RFC 1918) addresses. Off by default so workspace
	// admins can't reach internal services (SSRF); link-local and cloud
	// metadata addresses are always blocked. It also decides whether a
	// community adapter's process may listen on such an address (a sidecar);
	// plain http:// only reaches those.
	AllowPrivateNetworks bool `koanf:"allow_private_networks"`
}

// WebhooksConfig configures outgoing webhooks and the audit stream.
type WebhooksConfig struct {
	// AllowPrivateNetworks lets endpoints resolve to loopback and private
	// (RFC 1918) addresses, for receivers on the same network. Off by
	// default: user-supplied URLs must not reach internal services (SSRF).
	// Link-local and cloud metadata addresses are always blocked.
	AllowPrivateNetworks bool `koanf:"allow_private_networks"`
}
