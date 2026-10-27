package identity

import (
	"context"
	"errors"

	"github.com/google/uuid"
	idp "github.com/openschool-org/openschool/internal/idp"
	"github.com/openschool-org/openschool/internal/ports"
)

// ErrOrphanNoLongerOrphaned prevents deletion when a provider account has
// gained a matching local user since the reconciliation list was loaded.
var ErrOrphanNoLongerOrphaned = errors.New("bu kimlik sağlayıcı hesabının artık eşleşen bir yerel kullanıcısı var — silme işlemi reddedildi")

// OrphanedIdentity is an identity-provider account without a local user row.
type OrphanedIdentity struct {
	ID       string `json:"id"`
	Username string `json:"username"`
	Email    string `json:"email"`
}

type reconciliationProvider interface {
	ListUsers(context.Context) ([]idp.User, error)
	DeleteUser(context.Context, string) error
}

type reconciliationUsers interface {
	listIDs(context.Context) ([]uuid.UUID, error)
	exists(context.Context, uuid.UUID) (bool, error)
}

// reconciliationService finds and removes provider accounts left behind when
// a provisioning rollback could not delete the external account.
type reconciliationService struct {
	provider reconciliationProvider
	users    reconciliationUsers
	audit    ports.AuditRecorder
}

func newReconciliationService(provider reconciliationProvider, users reconciliationUsers, audit ports.AuditRecorder) *reconciliationService {
	return &reconciliationService{provider: provider, users: users, audit: audit}
}

func (s *reconciliationService) findOrphaned(ctx context.Context) ([]OrphanedIdentity, error) {
	providerUsers, err := s.provider.ListUsers(ctx)
	if err != nil {
		return nil, err
	}
	localUserIDs, err := s.users.listIDs(ctx)
	if err != nil {
		return nil, err
	}

	local := make(map[string]struct{}, len(localUserIDs))
	for _, id := range localUserIDs {
		local[id.String()] = struct{}{}
	}

	orphaned := make([]OrphanedIdentity, 0)
	for _, user := range providerUsers {
		if _, exists := local[user.ID]; !exists {
			orphaned = append(orphaned, OrphanedIdentity{ID: user.ID, Username: user.Username, Email: user.Email})
		}
	}
	return orphaned, nil
}

func (s *reconciliationService) deleteOrphaned(ctx context.Context, providerUserID string, actorID uuid.UUID) error {
	if localID, err := uuid.Parse(providerUserID); err == nil {
		exists, lookupErr := s.users.exists(ctx, localID)
		if lookupErr != nil {
			// Fail closed: a database outage must never be interpreted as proof
			// that deleting the external identity is safe.
			return lookupErr
		}
		if exists {
			return ErrOrphanNoLongerOrphaned
		}
	}

	if err := s.provider.DeleteUser(ctx, providerUserID); err != nil {
		return err
	}
	if s.audit != nil {
		_ = s.audit.Record(ctx, "orphaned_identity", uuid.Nil, "deleted", actorID, OrphanedIdentity{ID: providerUserID}, nil, "")
	}
	return nil
}
