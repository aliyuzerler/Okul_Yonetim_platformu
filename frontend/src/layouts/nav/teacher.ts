import {
  Home, Building, Table, Renew, Idea, EventSchedule, Calendar, Notification, Settings, Report, ChartLine,
} from "@carbon/icons-react";
import type { NavGroup, NavItem } from "@/layouts/nav/types";

// Only a Section Head can act on the review queue, so others do not get the item.
function teachingGroups(isSectionHead: boolean): NavGroup[] {
  const reviewItems: NavItem[] = isSectionHead
    ? [{ path: "/t/timetable/review", label: "Review Timetables", labelKey: "nav.reviewTimetables", Icon: Renew, exact: true }]
    : [];
  return [
    {
      label: "Academics",
      labelKey: "nav.group.academics",
      items: [
        { path: "/t/classes", label: "My Classes", labelKey: "nav.teacherClasses", Icon: Building },
        { path: "/t/timetable", label: "My Timetable", labelKey: "nav.timetable", Icon: Table, exact: true },
        { path: "/t/marks", label: "Record Marks", labelKey: "nav.recordMarks", Icon: Report },
        ...reviewItems,
        { path: "/t/my-society", label: "My Society", labelKey: "nav.mySociety", Icon: Idea, exact: true },
      ],
    },
    {
      label: "Operations",
      labelKey: "nav.group.operations",
      items: [
        { path: "/t/attendance", label: "Class Attendance", labelKey: "nav.classAttendance", Icon: EventSchedule },
        { path: "/t/my-attendance", label: "My Attendance", labelKey: "nav.attendance", Icon: Calendar, exact: true },
      ],
    },
  ];
}

// Principal and Vice Principal monitor the whole school instead of teaching (ADR 0002).
const LEADERSHIP_GROUPS: NavGroup[] = [
  {
    label: "School",
    labelKey: "nav.group.school",
    items: [
      { path: "/t/analytics", label: "Analytics", labelKey: "nav.analytics", Icon: ChartLine, exact: true },
      { path: "/t/all-timetables", label: "All Timetables", labelKey: "nav.allTimetables", Icon: Table, exact: true },
    ],
  },
];

const SYSTEM_GROUP: NavGroup = {
  label: "System",
  labelKey: "nav.group.system",
  items: [
    { path: "/t/notifications", label: "Notifications", labelKey: "nav.notifications", Icon: Notification, exact: true },
    { path: "/t/profile", label: "My Profile", labelKey: "nav.profile", Icon: Settings },
  ],
};

export function teacherNav(opts: { isLeadership: boolean; isSectionHead: boolean }): NavGroup[] {
  return [
    { label: "Overview", labelKey: "nav.overview", items: [{ path: "/", label: "Overview", labelKey: "nav.overview", Icon: Home }] },
    ...(opts.isLeadership ? LEADERSHIP_GROUPS : teachingGroups(opts.isSectionHead)),
    SYSTEM_GROUP,
  ];
}

export const TEACHER_ALIASES: Record<string, string> = {
  "/attendance/sessions": "/t/attendance",
  "/timetables": "/t/timetable",
};

export const LEADERSHIP_ALIASES: Record<string, string> = {
  "/timetables": "/t/all-timetables",
};
