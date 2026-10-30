package migrationsplatform

import "embed"

// FS holds the platform (control plane) migration files. The platform service
// runs against its own database, so it ships a separate, much smaller
// migration set than the school instance one in ../migrations.
//
//go:embed *.sql
var FS embed.FS
