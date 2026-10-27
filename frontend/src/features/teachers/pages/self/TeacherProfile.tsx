import { useQueries } from "@tanstack/react-query";
import { Tag } from "@carbon/react";
import { Book } from "@carbon/icons-react";
import { useMyTeacherProfile, useTeacherSubjects, useMyClasses } from "@/features/teachers/queries/useTeachers";
import { classSessionsOptions } from "@/features/attendance/queries/useAttendance";
import LoadingSpinner from "@/shared/ui/LoadingSpinner";
import ErrorMessage from "@/shared/ui/ErrorMessage";
import InfoRow from "@/shared/ui/InfoRow";
import { getInitials, displayName } from "@/shared/lib/name";

const GENDER_LABELS: Record<string, string> = {
  male: "Erkek",
  female: "Kız",
};

export default function TeacherProfile() {
  const { data: profile, isLoading, isError, refetch } = useMyTeacherProfile();
  const { data: subjects } = useTeacherSubjects(profile?.id ?? "");
  const { classes: myClasses } = useMyClasses();

  const classIds = myClasses.map((c) => c.class_id);
  const sessionQueries = useQueries({ queries: classIds.map(classSessionsOptions) });
  // A student is in one class per year, so the class counts add up to distinct students.
  const studentsTaught = myClasses.reduce((n, c) => n + c.studentCount, 0);
  const sessionsTaken = sessionQueries.reduce((sum, q) => sum + (q.data?.length ?? 0), 0);

  if (isLoading) return <LoadingSpinner />;
  if (isError || !profile) {
    return (
      <div className="os-p-8">
        <ErrorMessage message="Profiliniz yüklenemedi." onRetry={refetch} />
      </div>
    );
  }

  return (
    <div className="os-bg-layer-hover os-min-h-content">
      <div className="os-profile__banner">
        <div className="os-profile__avatar">{getInitials(displayName(profile))}</div>
        <div className="os-flex-1">
          <p className="os-profile__name">{profile.title ? `${profile.title} ` : ""}{displayName(profile)}</p>
          <p className="os-profile__meta">{profile.employee_number}</p>
        </div>
        <div className="os-profile__actions">
          <Tag type={profile.is_active ? "green" : "gray"} size="sm">{profile.is_active ? "Aktif" : "Etkin değil"}</Tag>
        </div>
      </div>

      <div className="os-py-6 os-px-8">
        <div className="os-grid os-grid-cols-2-1 os-gap-6 os-items-grid-start">
          {/* Main */}
          <div>
            <div className="os-section">
              <div className="os-section__header"><h2 className="os-section__title">Kişisel bilgiler</h2></div>
              <div className="os-kv-grid">
                {[
                  ["Ad soyad", profile.full_name],
                  ["Unvan", profile.title ?? "-"],
                  ["Cinsiyet", profile.gender ? GENDER_LABELS[profile.gender] ?? profile.gender : "-"],
                  ["Telefon", profile.phone ?? "-"],
                  ["Sicil numarası", profile.employee_number],
                  ["İşe başlama tarihi", profile.joined_date ?? "-"],
                ].map(([label, value]) => (
                  <div key={label} className="os-kv-item">
                    <p className="os-kv-item__label">{label}</p>
                    <p className="os-kv-item__value">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="os-section">
              <div className="os-section__header"><h2 className="os-section__title">Dersler</h2></div>
              <div className="os-section__body os-flex os-gap-2 os-wrap">
                {!subjects || subjects.length === 0 ? (
                  <p className="os-c-tertiary os-text-sm">Henüz atanmış ders yok.</p>
                ) : (
                  subjects.map((s) => (
                    <div key={s.id} className="os-flex os-items-center os-gap-2 os-py-2 os-px-3h os-border os-bg-layer-hover">
                      <Book size={14} className="os-fill-accent" />
                      <span className="os-text-md os-fw-500">{s.name}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div>
            <div className="os-section">
              <div className="os-section__header"><h2 className="os-section__title">Özet bilgi</h2></div>
              <div className="os-section__body os-py-3 os-px-6">
                <InfoRow label="Sicil no." value={profile.employee_number} />
                <InfoRow label="Durum" value={profile.is_active ? "Aktif" : "Etkin değil"} />
                <InfoRow label="Dersler" value={subjects?.length ?? 0} />
                <InfoRow label="Sınıflar" value={myClasses.length} />
                <InfoRow label="İşe başlama" value={profile.joined_date ?? "-"} divider={false} />
              </div>
            </div>

            <div className="os-section">
              <div className="os-section__header"><h2 className="os-section__title">Bu yıl</h2></div>
              <div className="os-section__body os-py-3 os-px-6">
                <InfoRow label="Alınan yoklama oturumları" value={sessionsTaken} bold accent />
                <InfoRow label="Öğrenciler" value={studentsTaught} bold accent divider={false} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
