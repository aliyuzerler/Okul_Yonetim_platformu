// Feature APIs against the OpenSchool backend (paths under /api/v1).
// Every shape here matches backend/internal/modules — see src/api/types.ts.
import api from "./client";
import type {
  AcademicYear,
  AttendanceRecordItem,
  ChildSummary,
  GuardianChild,
  InboxBox,
  InboxPage,
  MeResponse,
  MessageResponse,
  MyNotification,
  PushTokenInfo,
  StudentMarkRow,
  StudentProfile,
  Term,
  TimetableResponse,
  UnreadCount,
} from "./types";

// Shared/reference ---------------------------------------------------------

export const commonApi = {
  me: () => api.get<MeResponse>("/me").then((r) => r.data),

  setLanguage: (language: string) =>
    api.put("/me/language", { language }).then((r) => r.data),

  changePassword: (newPassword: string) =>
    api
      .post<MessageResponse>("/auth/change-password", { new_password: newPassword })
      .then((r) => r.data),

  keepDefaultPassword: () =>
    api.post<MessageResponse>("/auth/keep-default-password").then((r) => r.data),

  currentAcademicYear: () =>
    api.get<AcademicYear>("/academic-years/current").then((r) => r.data),

  // GET /terms requires the year's id (modules/school/term.go).
  terms: (academicYearId: string) =>
    api
      .get<Term[]>("/terms", { params: { academic_year_id: academicYearId } })
      .then((r) => r.data),
};

// Parent -------------------------------------------------------------------

export const guardianApi = {
  children: () => api.get<GuardianChild[]>("/me/children").then((r) => r.data),

  childrenSummary: () =>
    api.get<ChildSummary[]>("/me/children/summary").then((r) => r.data),

  childAttendance: (studentId: string) =>
    api
      .get<AttendanceRecordItem[]>(`/me/children/${studentId}/attendance`)
      .then((r) => r.data),

  childMarks: (studentId: string, termId: string) =>
    api
      .get<StudentMarkRow[]>(`/me/children/${studentId}/marks`, {
        params: { term_id: termId },
      })
      .then((r) => r.data),

  childTimetable: (studentId: string) =>
    api
      .get<TimetableResponse>(`/me/children/${studentId}/timetable`)
      .then((r) => r.data),
};

// Student ------------------------------------------------------------------

export const studentApi = {
  profile: () => api.get<StudentProfile>("/me/student").then((r) => r.data),

  attendance: () =>
    api.get<AttendanceRecordItem[]>("/me/student/attendance").then((r) => r.data),

  marks: (termId: string) =>
    api
      .get<StudentMarkRow[]>("/me/student/marks", { params: { term_id: termId } })
      .then((r) => r.data),

  timetable: () =>
    api.get<TimetableResponse>("/timetable/my-class").then((r) => r.data),
};

// Notifications ------------------------------------------------------------

export type { InboxBox };

export const notificationsApi = {
  // One box + one page per call; InboxPage.counts always carries all three counts.
  inbox: (box: InboxBox, limit = 20, offset = 0) =>
    api
      .get<InboxPage>("/me/notifications/inbox", {
        params: { box, limit, offset },
      })
      .then((r) => r.data),

  unreadCount: () =>
    api.get<UnreadCount>("/me/notifications/unread-count").then((r) => r.data),

  markRead: (notificationId: string) =>
    api
      .post<MessageResponse>(`/me/notifications/${notificationId}/read`)
      .then((r) => r.data),

  markAllRead: () =>
    api.post<MessageResponse>("/me/notifications/read-all").then((r) => r.data),

  archive: (notificationId: string) =>
    api
      .post<MessageResponse>(`/me/notifications/${notificationId}/archive`)
      .then((r) => r.data),

  unarchive: (notificationId: string) =>
    api
      .post<MessageResponse>(`/me/notifications/${notificationId}/unarchive`)
      .then((r) => r.data),
};

// Push tokens --------------------------------------------------------------

export const pushApi = {
  register: (token: string, platform: PushTokenInfo["platform"], deviceName?: string) =>
    api
      .post<PushTokenInfo>("/me/push-tokens", {
        token,
        platform,
        device_name: deviceName,
      })
      .then((r) => r.data),

  list: () => api.get<PushTokenInfo[]>("/me/push-tokens").then((r) => r.data),

  unregister: (token: string) =>
    api
      .delete<void>("/me/push-tokens", { data: { token } })
      .then((r) => r.data),
};
