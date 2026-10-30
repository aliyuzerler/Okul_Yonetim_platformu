// Package platformdatabase connects the control plane to its own Postgres
// database and applies the platform migration set. It intentionally reuses
// the school instance's pooled-connection tuning (internal/database.Connect)
// while shipping a separate migration source.
package platformdatabase

import (
	"fmt"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/pgx/v5"
	"github.com/golang-migrate/migrate/v4/source/iofs"
	migrationsplatform "github.com/openschool-org/openschool/db/migrations_platform"
)

// RunMigrations applies all pending platform migrations to the database at dbURL.
func RunMigrations(dbURL string) error {
	migrationURL := "pgx5://" + dbURL[len("postgres://"):]

	source, err := iofs.New(migrationsplatform.FS, ".")
	if err != nil {
		return fmt.Errorf("failed to load embedded platform migrations: %w", err)
	}

	m, err := migrate.NewWithSourceInstance("iofs", source, migrationURL)
	if err != nil {
		return fmt.Errorf("failed to create platform migrator: %w", err)
	}
	defer m.Close()

	if err := m.Up(); err != nil && err != migrate.ErrNoChange {
		return fmt.Errorf("platform migration failed: %w", err)
	}

	return nil
}
