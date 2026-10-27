import { useSchool } from "@/features/school/queries/useSchool";
import { useStudents } from "@/features/students/queries/useStudents";
import { useTeachers } from "@/features/teachers/queries/useTeachers";
import { useDashboardAnalytics } from "@/features/reports/queries/useDashboardAnalytics";
import { useCurrentClasses } from "@/features/academics/queries/useClasses";
import { useGrades } from "@/features/academics/queries/useGrades";
import { useSubjects } from "@/features/curriculum/queries/useSubjects";
import { useAcademicYears } from "@/features/school/queries/useAcademicYears";
import { useTerms } from "@/features/school/queries/useTerms";
import { useDailySessions } from "@/features/attendance/queries/useAttendance";
import { useStaffAttendanceByDate } from "@/features/attendance/queries/useStaffAttendance";
import type { DailySession } from "@/features/attendance/api/attendance";
import { todayISODate } from "@/shared/lib/date";
import { Add, ArrowRight, Calendar, UserMultiple, Education, Building, Book } from "@carbon/icons-react";
import { Button } from "@carbon/react";
import { Link } from "react-router";
import StatCard from "@/features/reports/components/dashboard/StatCard";
import AttendanceByClassSection from "@/features/reports/components/dashboard/AttendanceByClassSection";
import DashboardSnapshotSection from "@/features/reports/components/dashboard/DashboardSnapshotSection";
import RecentActivitySection from "@/features/reports/components/dashboard/RecentActivitySection";
import SetupChecklistCard from "@/features/reports/components/dashboard/SetupChecklistCard";
import { useMemo } from "react";

export default function Dashboard() {
  const { data: school } = useSchool();
  // Only `total` is used from these two - a small limit keeps the request
  // light since the page doesn't render any of the individual rows.
  const { data: studentPage, isLoading: studentsLoading } = useStudents({ limit: 1 });
  const studentCount = studentPage?.total ?? 0;
  const { data: teacherPage, isLoading: teachersLoading } = useTeachers({ limit: 1 });
  const teacherCount = teacherPage?.total ?? 0;
  // The activity feed comes from a dedicated, server-sorted (created_at
  // DESC) query on the backend (dashboard.Service.recentActivity), not a
  // client-side slice of a capped, alphabetically-sorted list page - the
  // latter could miss a recently enrolled student/teacher once more than
  // one page of records exists.
  const { data: analytics, isLoading: analyticsLoading } = useDashboardAnalytics();
  const recentActivity = analytics?.school.recent_activity ?? [];
  const { data: classes, isLoading: classesLoading } = useCurrentClasses();
  const { data: grades, isLoading: gradesLoading } = useGrades();
  const { data: subjects, isLoading: subjectsLoading } = useSubjects();
  const { data: years, isLoading: yearsLoading } = useAcademicYears();
  const currentYear = years?.find((y) => y.is_current) ?? null;
  const { data: terms, isPending: termsPending, isError: termsError } = useTerms(currentYear?.id);
  const { data: todaySessions, isLoading: sessionsLoading } = useDailySessions(todayISODate());
  const { data: staffAttendance, isLoading: staffAttendanceLoading } = useStaffAttendanceByDate(todayISODate());

  const title = school?.name ?? "Yönetici paneli";
  const sessionByClassId = useMemo(() => {
    const map = new Map<string, DailySession>();
    for (const s of todaySessions ?? []) map.set(s.class_id, s);
    return map;
  }, [todaySessions]);

  const classAttendanceLoading = classesLoading || sessionsLoading;

  // Terms only start loading once the current year is known, so wait for both before judging "Set up terms".
  const termsLoading = yearsLoading || (!!currentYear && termsPending);
  const setupLoading = classesLoading || gradesLoading || subjectsLoading || teachersLoading || studentsLoading || termsLoading;
  const setupItems = [
    { label: "Güncel eğitim-öğretim yılı belirleyin", done: !!currentYear, path: "/academic-years" },
    { label: "Dönemleri oluşturun", done: !!currentYear && !termsError && (terms?.length ?? 0) > 0, path: "/academic-years" },
    { label: "Bir sınıf seviyesi ekleyin", done: (grades?.length ?? 0) > 0, path: "/classes" },
    { label: "Bir ders ekleyin", done: (subjects?.length ?? 0) > 0, path: "/subjects" },
    { label: "Bir öğretmen ekleyin", done: teacherCount > 0, path: "/teachers" },
    { label: "Bir sınıf ekleyin", done: (classes?.length ?? 0) > 0, path: "/classes" },
    { label: "Bir öğrenci ekleyin", done: studentCount > 0, path: "/students" },
  ];

  return (
    <div className="os-page">
      <div className="os-dashboard-hero">
        <div className="os-dashboard-hero__copy">
          <p className="os-eyebrow">Okul genel görünümü</p>
          <h1 className="os-page__title">{title}</h1>
          <p className="os-page__subtitle">Bugün okulunuzda olup bitenlere dair hızlı bir bakış.</p>
        </div>

        <div className="os-dashboard-hero__aside">
          {currentYear && (
            <div className="os-year-pill">
              <Calendar size={16} className="os-shrink-0" />
              <span><strong>{currentYear.label}</strong><small>Güncel eğitim-öğretim yılı</small></span>
            </div>
          )}
          {school?.logo_url && (
            <img
              src={school.logo_url}
              alt={school.name ?? "Okul logosu"} className="os-dashboard-hero__logo os-object-contain os-shrink-0"
            />
          )}
        </div>
      </div>

      <div className="os-dashboard-actions" aria-label="Hızlı işlemler">
        <Button as={Link} to="/students/new" kind="primary" size="md" renderIcon={Add}>Öğrenci ekle</Button>
        <Button as={Link} to="/classes/new" kind="tertiary" size="md" renderIcon={Building}>Sınıf oluştur</Button>
        <Button as={Link} to="/attendance" kind="tertiary" size="md" renderIcon={Calendar}>Yoklama al</Button>
        <Button as={Link} to="/analytics" kind="ghost" size="md" renderIcon={ArrowRight}>Analitiği gör</Button>
      </div>

      {!setupLoading && <SetupChecklistCard items={setupItems} />}

      <div className="os-stat-grid">
        <StatCard label="Toplam öğrenci" value={studentCount} loading={studentsLoading} Icon={UserMultiple} path="/students" />
        <StatCard label="Öğretmenler" value={teacherCount} loading={teachersLoading} Icon={Education} path="/teachers" />
        <StatCard label="Sınıflar" value={classes?.length ?? 0} loading={classesLoading} Icon={Building} path="/classes" />
        <StatCard label="Dersler" value={subjects?.length ?? 0} loading={subjectsLoading} Icon={Book} path="/subjects" />
      </div>

      <div className="os-dashboard-lower-grid">
        <AttendanceByClassSection
          classes={classes}
          loading={classAttendanceLoading}
          sessionByClassId={sessionByClassId}
        />

        <DashboardSnapshotSection
          teachers={staffAttendance?.teachers}
          nonAcademicStaff={staffAttendance?.non_academic_staff}
          staffLoading={staffAttendanceLoading}
        />
      </div>

      <div className="os-dashboard-recent">
        <RecentActivitySection items={recentActivity} loading={analyticsLoading} />
      </div>
    </div>
  );
}
