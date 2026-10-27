import {
  Home, ChartLine, UserMultiple, Education, Building, Book, Language, EventSchedule, Settings, Calendar,
  Notification, UserFollow, UserAdmin, UserRole, Trophy, Renew, Table, Group, DocumentPdf, Idea,
} from "@carbon/icons-react";
import type { NavGroup } from "@/layouts/nav/types";

export const ADMIN_NAV: NavGroup[] = [
  { label: "Overview", labelKey: "nav.overview", items: [{ path: "/", label: "Overview", labelKey: "nav.overview", Icon: Home }] },
  {
    label: "People",
    labelKey: "nav.group.people",
    items: [
      { path: "/positions", label: "Principal and VPs", labelKey: "nav.positions", Icon: UserRole },
      { path: "/teachers", label: "Teachers", labelKey: "nav.teachers", Icon: Education },
      { path: "/non-academic-staff", label: "Staff", labelKey: "nav.staff", Icon: Group },
      { path: "/students", label: "Students", labelKey: "nav.students", Icon: UserMultiple },
      { path: "/guardians", label: "Guardians", labelKey: "nav.guardians", Icon: UserAdmin },
      { path: "/prefects", label: "School Prefects", labelKey: "nav.prefects", Icon: Trophy },
      { path: "/societies", label: "Societies", labelKey: "nav.societies", Icon: Idea },
    ],
  },
  {
    label: "Academics",
    labelKey: "nav.group.academics",
    items: [
      { path: "/academic-years", label: "Academic Years", labelKey: "nav.academicYears", Icon: Calendar },
      { path: "/classes", label: "Grades & Classes", labelKey: "nav.classes", Icon: Building },
      { path: "/streams", label: "Streams", labelKey: "nav.streams", Icon: UserFollow },
      { path: "/subjects", label: "Subjects & Curriculum", labelKey: "nav.subjects", Icon: Book },
      { path: "/mediums", label: "Languages of instruction", labelKey: "nav.mediums", Icon: Language },
      { path: "/teacher-subjects", label: "Teacher Subjects", labelKey: "nav.teacherSubjects", Icon: Education },
    ],
  },
  {
    label: "School resources",
    labelKey: "nav.group.resources",
    items: [
      { path: "/resources", label: "Resources & facilities", labelKey: "nav.resources", Icon: Building },
    ],
  },
  {
    label: "Timetable",
    labelKey: "nav.group.timetable",
    items: [{ path: "/timetables", label: "Timetable", labelKey: "nav.timetables", Icon: Table }],
  },
  {
    label: "Operations",
    labelKey: "nav.group.operations",
    items: [
      { path: "/attendance", label: "Student Attendance", labelKey: "nav.studentAttendance", Icon: EventSchedule },
      { path: "/staff-attendance", label: "Staff Attendance", labelKey: "nav.staffAttendance", Icon: Group },
      { path: "/year-end", label: "Year-end", labelKey: "nav.yearEnd", Icon: Renew },
      { path: "/notifications", label: "Notifications", labelKey: "nav.notifications", Icon: Notification },
      { path: "/reports", label: "Reports", labelKey: "nav.reports", Icon: DocumentPdf },
      { path: "/analytics", label: "Analytics", labelKey: "nav.analytics", Icon: ChartLine },
      { path: "/settings", label: "Settings", labelKey: "nav.settings", Icon: Settings },
    ],
  },
];

// Hub tabs and legacy routes that belong to a nav page.
export const ADMIN_ALIASES: Record<string, string> = {
  "/promotion": "/year-end",
  "/timetables/generate": "/timetables",
  "/classrooms": "/resources",
  "/subject-requirements": "/timetables",
  "/timetable-settings": "/timetables",
  "/grade-sections": "/timetables",
  "/curriculum": "/subjects",
};
