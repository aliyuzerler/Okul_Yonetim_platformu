// Typed shapes of the control-plane API (backend/internal/platform/*).

export interface PlanView {
  code: string;
  name: string;
  description: string;
  max_students: number;
  price_monthly_kurus: number;
  price_annual_kurus: number;
  trial_days: number;
}

export interface TenantBrief {
  id: string;
  name: string;
  slug: string;
  status: string;
  trial_ends_at?: string | null;
}

export interface SubscriptionView {
  id: string;
  status: string;
  billing_cycle?: string;
  trial_ends_at?: string | null;
  days_remaining?: number | null;
  current_period_end?: string | null;
  cancel_at_period_end: boolean;
  plan: PlanView;
}

export interface PaymentView {
  id: string;
  billing_cycle: string;
  amount_kurus: number;
  currency: string;
  status: string;
  failure_reason?: string;
  paid_at?: string | null;
  created_at: string;
}

export interface SubscriptionStatus {
  tenant: TenantBrief;
  subscription: SubscriptionView | null;
  access_state: "ok" | "read_only" | "locked";
  checkout_allowed: boolean;
  plan_options: PlanView[];
  payments: PaymentView[];
}

export interface LoginResponse {
  token: string;
  expires_at: string;
  role: "super_admin" | "tenant_admin";
  email: string;
  full_name: string;
  tenant?: TenantBrief;
}

export interface MeResponse {
  id: string;
  email: string;
  full_name: string;
  role: "super_admin" | "tenant_admin";
  tenant?: TenantBrief;
}

export interface CheckoutResponse {
  payment_id: string;
  checkout_url: string;
  provider: "iyzico" | "mock";
  amount_kurus: number;
  billing_cycle: "monthly" | "annual";
}

export interface CheckoutResultResponse {
  status: "pending" | "succeeded" | "failed";
  message: string;
  amount_kurus?: number;
  billing_cycle?: string;
  payment_id?: string;
}

export interface TenantListItem {
  id: string;
  name: string;
  slug: string;
  city: string;
  status: string;
  access_state: string;
  owner_email: string;
  plan_name?: string;
  sub_status?: string;
  billing_cycle?: string;
  trial_ends_at?: string | null;
  current_period_end?: string | null;
  created_at: string;
}

export interface TenantListResponse {
  items: TenantListItem[];
  total: number;
  page: number;
  page_size: number;
}

export interface EventRow {
  id: string;
  event_type: string;
  actor: string;
  data?: string;
  created_at: string;
}

export interface AdminPaymentRow {
  id: string;
  tenant_name?: string;
  amount_kurus: number;
  currency: string;
  billing_cycle: string;
  status: string;
  failure_reason?: string;
  paid_at?: string | null;
  created_at: string;
}

export interface TenantDetail {
  tenant: TenantListItem;
  contact_name: string;
  phone: string;
  subscription?: {
    id: string;
    status: string;
    billing_cycle?: string;
    plan_name?: string;
    trial_ends_at?: string | null;
    current_period_end?: string | null;
    cancel_at_period_end: boolean;
    iyzico_subscription_ref?: string;
  } | null;
  payments: AdminPaymentRow[];
  events: EventRow[];
}

export interface SummaryResponse {
  tenant_counts: {
    active: number;
    trial: number;
    past_due: number;
    expired: number;
    cancelled: number;
    pending_verification: number;
  };
  mrr_kurus: number;
  arr_kurus: number;
  revenue_30d_kurus: number;
  trial_conversion_rate: number;
  revenue_by_month: { month: string; amount_kurus: number }[];
}
