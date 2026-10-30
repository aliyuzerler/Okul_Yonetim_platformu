package admin

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/openschool-org/openschool/internal/platform/models"
)

// Domain errors for operator actions.
var (
	ErrTenantNotFound  = errors.New("admin: tenant not found")
	ErrInvalidAction   = errors.New("admin: invalid action")
	ErrTrialNotExtendable = errors.New("admin: trial not extendable")
)

// Service implements the super-admin operations.
type Service struct {
	repo *Repository
}

// NewService wires the admin service.
func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

// ListTenants returns a page of the directory.
func (s *Service) ListTenants(ctx context.Context, query, status string, page, pageSize int) (*TenantListResponse, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}
	items, total, err := s.repo.ListTenants(ctx, query, status, pageSize, (page-1)*pageSize)
	if err != nil {
		return nil, err
	}
	return &TenantListResponse{Items: items, Total: total, Page: page, PageSize: pageSize}, nil
}

// TenantDetail assembles the dossier.
func (s *Service) TenantDetail(ctx context.Context, id uuid.UUID) (*TenantDetail, error) {
	base, contact, phone, err := s.repo.TenantBase(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrTenantNotFound
		}
		return nil, err
	}

	detail := &TenantDetail{Tenant: base, ContactName: contact, Phone: phone}

	sub, err := s.repo.TenantSubscription(ctx, id)
	if err != nil {
		return nil, err
	}
	detail.Subscription = sub

	payments, err := s.repo.TenantPayments(ctx, id, 30)
	if err != nil {
		return nil, err
	}
	detail.Payments = payments

	events, err := s.repo.TenantEvents(ctx, id, 50)
	if err != nil {
		return nil, err
	}
	detail.Events = events

	return detail, nil
}

// ApplyAction executes a manual operator override.
func (s *Service) ApplyAction(ctx context.Context, tenantID uuid.UUID, actor string, action TenantAction) error {
	switch action.Action {
	case "extend_trial":
		if action.TrialDays < 1 || action.TrialDays > 90 {
			return ErrInvalidAction
		}
		newEnd, err := s.repo.ExtendTrial(ctx, tenantID, action.TrialDays)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return ErrTrialNotExtendable
			}
			return err
		}
		return s.repo.RecordEvent(ctx, tenantID, "admin.trial_extended",
			fmt.Sprintf(`{"days":%d,"new_trial_ends_at":"%s"}`, action.TrialDays, newEnd.Format("2006-01-02")), actor)

	case "set_status":
		if action.NewStatus == "" {
			return ErrInvalidAction
		}
		access := accessStateForTenantStatus(action.NewStatus)
		if err := s.repo.SetTenantStatus(ctx, tenantID, action.NewStatus, access); err != nil {
			return err
		}
		return s.repo.RecordEvent(ctx, tenantID, "admin.status_override",
			fmt.Sprintf(`{"new_status":"%s","access_state":"%s"}`, action.NewStatus, access), actor)

	default:
		return ErrInvalidAction
	}
}

// Payments pages the ledger.
func (s *Service) Payments(ctx context.Context, status string, page, pageSize int) (*PaymentListResponse, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}
	items, total, err := s.repo.ListPayments(ctx, status, pageSize, (page-1)*pageSize)
	if err != nil {
		return nil, err
	}
	return &PaymentListResponse{Items: items, Total: total, Page: page, PageSize: pageSize}, nil
}

// Summary returns the revenue dashboard payload.
func (s *Service) Summary(ctx context.Context) (*SummaryResponse, error) {
	out, err := s.repo.Summary(ctx)
	if err != nil {
		return nil, err
	}
	return &out, nil
}

// accessStateForTenantStatus mirrors billing.AccessStateFor for operator
// overrides, so manual changes land with a consistent access state.
func accessStateForTenantStatus(status string) string {
	switch status {
	case models.TenantActive, models.TenantTrial:
		return models.AccessOK
	case models.TenantPastDue:
		return models.AccessReadOnly
	default:
		return models.AccessLocked
	}
}
