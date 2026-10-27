// Response contracts, verified against backend/internal/modules source
// (selfservice, notifications, school, timetable, attendance, academics).

// GET /academic-years/current (modules/school/school.go)
export interface AcademicYear {
  id: string;
  label: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  created_at: string;
}

// GET /terms?academic_year_id= (modules/school/term.go)
export interface Term {
  id: string;
  academic_year_id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  sort_order: number;
  created_at: string;
}

// GET /me (modules/identity/me.go)
export interface MeResponse {
  user_id: string;
  email: string;
  username: string;
  given_name: string;
  family_name: string;
  phone_number: string;
  roles: string[];
  must_change_password: boolean;
  default_password_expired: boolean;
  preferred_language: string;
}

// GET /me/children (db.ListStudentsByGuardianUserIDRow)
export interface GuardianChild {
  id: string;
  user_id: string | null;
  full_name: string;
  name_with_initials: string;
  calling_name: string;
  index_number: string;
  address: string | null;
  phone: string | null;
  whatsapp: string | null;
  special_remarks: string | null;
  created_at: string | null;
  updated_at: string | null;
  gender: string | null;
  house_id: string | null;
  enrollment_status: string;
  left_at: string | null;
  erased_at: string | null;
  class_id: string | null;
  class_name: string | null;
  grade_name: string | null;
}

// GET /me/children/summary (db.GetGuardianChildrenSummaryRow)
export interface ChildSummary {
  student_id: string;
  sessions_this_month: number;
  attended_this_month: number;
  latest_term_name: string;
  latest_average_percent: number;
  has_marks: boolean;
}

// GET /me/children/:id/attendance, /me/student/attendance (attendance.StudentRecord)
export interface AttendanceRecordItem {
  id: string;
  session_id: string;
  student_id: string;
  status: "present" | "absent" | "late" | "excused" | string;
  note: string | null;
  session_date: string; // "YYYY-MM-DD"
  class_name: string;
}

// GET /me/children/:id/marks?term_id, /me/student/marks?term_id (db.ListStudentMarksByTermRow)
export interface StudentMarkRow {
  id: string;
  marks: number;
  max_marks: number;
  is_absent: boolean;
  subject_id: string;
  subject_name: string;
  subject_code: string;
  teacher_id: string | null;
  teacher_name: string;
}

// GET /me/children/:id/timetable, /timetable/my-class
export interface TimetableInfo {
  id: string;
  academic_year_id: string;
  class_id: string;
  version: number;
  status: string;
  parent_timetable_id: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TimetableEntryItem {
  id: string;
  timetable_id: string;
  day_of_week: number; // 1 = Monday … 5 = Friday
  period_number: number;
  subject_id: string | null;
  subject_name: string | null;
  teacher_id: string | null;
  teacher_name: string | null;
  classroom_id: string | null;
  classroom_name: string | null;
  option_block_id: string | null;
  option_block_name: string | null;
}

export interface TimetableResponse {
  timetable: TimetableInfo;
  entries: TimetableEntryItem[];
}

// GET /me/student (selfservice.StudentProfile)
export interface StudentProfile {
  id: string;
  user_id: string | null;
  full_name: string;
  name_with_initials: string;
  calling_name: string;
  index_number: string;
  address: string | null;
  phone: string | null;
  whatsapp: string | null;
  special_remarks: string | null;
  created_at: string;
  updated_at: string;
  gender: string | null;
  house_id: string | null;
  enrollment_status: string;
  email: string | null;
  class_name: string | null;
  grade_name: string | null;
  house_name: string | null;
  academic_year: string | null;
}

// GET /me/notifications/inbox (notifications.InboxPage)
export interface MyNotification {
  recipient_id: string;
  notification_id: string;
  title: string;
  message: string;
  category: string;
  priority: string;
  sender_name: string;
  sent_at: string | null;
  is_read: boolean;
  is_archived: boolean;
}

export interface InboxCounts {
  unread: number;
  read: number;
  archived: number;
}

export type InboxBox = "unread" | "read" | "archived";

export interface InboxPage {
  items: MyNotification[];
  total: number;
  limit: number;
  offset: number;
  counts: InboxCounts;
}

// GET /me/notifications/unread-count
export interface UnreadCount {
  unread_count: number;
}

// /me/push-tokens (backend/internal/modules/notifications/push_routes.go)
export interface PushTokenInfo {
  token: string;
  platform: "ios" | "android" | "web";
  device_name?: string | null;
  enabled?: boolean;
  created_at?: string;
  updated_at?: string;
}

// POST /auth/change-password, /auth/keep-default-password
export interface MessageResponse {
  message: string;
}

// OAuth2 token endpoint response (ThunderID)
export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  id_token?: string;
  token_type?: string;
  expires_in?: number;
  scope?: string;
}
