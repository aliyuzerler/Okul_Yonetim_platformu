import { useState } from "react";
import { Link } from "react-router";
import { Button } from "@carbon/react";
import { Search, EventSchedule } from "@carbon/icons-react";
import { useMyClasses, useTeacherSubjects } from "@/features/teachers/queries/useTeachers";
import { useStudentsByClass } from "@/features/students/queries/useStudents";
import LoadingSpinner from "@/shared/ui/LoadingSpinner";
import ErrorMessage from "@/shared/ui/ErrorMessage";
import EmptyState from "@/shared/ui/EmptyState";
import InfoRow from "@/shared/ui/InfoRow";
import DataGrid from "@/shared/ui/DataGrid";
import { displayName } from "@/shared/lib/name";
import { classLabel } from "@/shared/lib/classLabel";

const GENDER_LABELS: Record<string, string> = {
  male: "Erkek",
  female: "Kız",
};

export default function TeacherClasses() {
  const { teacher, classes: myClasses, isLoading, isError, refetch } = useMyClasses();
  const { data: qualified } = useTeacherSubjects(teacher?.id ?? "");
  const [activeClassId, setActiveClassId] = useState("");
  const [query, setQuery] = useState("");

  const activeClass = myClasses.find((c) => c.class_id === activeClassId) ?? myClasses[0];
  const { data: roster, isLoading: rosterLoading } = useStudentsByClass(activeClass?.class_id ?? "");

  if (isLoading) return <LoadingSpinner />;
  if (isError) {
    return (
      <div className="os-p-8">
        <ErrorMessage message="Sınıflarınız yüklenemedi." onRetry={refetch} />
      </div>
    );
  }
  if (myClasses.length === 0 || !activeClass) {
    return (
      <div className="os-page">
        <EmptyState
          title="Henüz atanmış sınıf yok"
          description="Bir yönetici sizi bir sınıfta bir derse atadığında öğrettiğiniz sınıflar burada görünecek."
        />
      </div>
    );
  }

  const filtered = (roster ?? []).filter(
    (s) =>
      s.full_name.toLowerCase().includes(query.toLowerCase()) ||
      s.name_with_initials.toLowerCase().includes(query.toLowerCase()) ||
      s.index_number.toLowerCase().includes(query.toLowerCase())
  );

  const houseCounts = new Map<string, number>();
  for (const s of roster ?? []) {
    const house = s.house_name ?? "Kol yok";
    houseCounts.set(house, (houseCounts.get(house) ?? 0) + 1);
  }

  return (
    <div className="os-page">
      <div className="os-page__header">
        <div className="os-page__header-left">
          <h1 className="os-page__title">Sınıflarım</h1>
          <p className="os-page__subtitle">Bu yıl {myClasses.length} sınıfınız var</p>
        </div>
      </div>

      <div className="os-flex os-gap-3 os-mb-6 os-wrap">
        {myClasses.map((c) => (
          <button
            key={c.class_id}
            onClick={() => { setActiveClassId(c.class_id); setQuery(""); }} className={`os-pill os-pill--solid os-py-2h os-px-5 os-text-md os-fw-500 os-c-primary${activeClass.class_id === c.class_id ? " is-active" : ""}`}
          >
            {classLabel(c.grade_name, c.class_name)}
          </button>
        ))}
      </div>

      <div className="os-grid os-grid-cols-2-1 os-gap-6 os-items-grid-start">
        <div>
          <div className="os-section">
            <div className="os-section__header">
              <h2 className="os-section__title">Öğrenci listesi - {activeClass.class_name}</h2>
              <span className="os-text-xs os-c-tertiary">{roster?.length ?? 0} öğrenci</span>
            </div>
            <div className="os-toolbar">
              <div className="os-search os-max-w-22">
                <Search size={16} className="os-search__icon" />
                <input
                  className="os-search__input"
                  placeholder="Öğrenci ara…"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                />
              </div>
              <Button as={Link} to="/t/attendance" renderIcon={EventSchedule} kind="primary" size="md" className="os-ml-auto">
                Yoklama al
              </Button>
            </div>
            {rosterLoading ? (
              <LoadingSpinner />
            ) : (
              filtered.length === 0 ? (
                <EmptyState title="Öğrenci bulunamadı" description="Farklı bir ad veya okul numarasıyla deneyin." />
              ) : (
                <DataGrid
                  rows={filtered}
                  getRowId={(s) => s.id}
                  pageSize={20}
                  noHover
                  columns={[
                    { key: "n", header: "#", render: (s) => <span className="os-table__muted">{filtered.indexOf(s) + 1}</span> },
                    { key: "name", header: "Ad", render: (s) => <span title={s.full_name}>{displayName(s)}</span> },
                    { key: "index", header: "Okul numarası", render: (s) => <span className="os-table__mono">{s.index_number}</span> },
                    { key: "gender", header: "Cinsiyet", render: (s) => <span className="os-table__muted">{s.gender ? GENDER_LABELS[s.gender] ?? s.gender : "-"}</span> },
                  ]}
                />
              )
            )}
          </div>
        </div>

        <div>
          <div className="os-section">
            <div className="os-section__header"><h2 className="os-section__title">Sınıf bilgileri</h2></div>
            <div className="os-section__body os-py-3 os-px-6">
              <InfoRow label="Sınıf seviyesi" value={activeClass.grade_name} />
              <InfoRow label="Sınıf" value={activeClass.class_name} />
              <InfoRow label="Rolünüz" value={activeClass.isFormTeacher ? "Sınıf öğretmeni" : "Branş öğretmeni"} />
              {/* Class subjects come from Class > Subjects in admin; qualifications from Teacher subjects. */}
              <InfoRow label="Bu sınıftaki dersler" value={activeClass.subjects.length > 0 ? activeClass.subjects.join(", ") : "Henüz atanmadı"} />
              <InfoRow label="Dersleriniz" value={qualified && qualified.length > 0 ? qualified.map((q) => `${q.name} (${q.code})`).join(", ") : "-"} />
              <InfoRow label="Öğrenciler" value={roster?.length ?? 0} divider={false} />
            </div>
          </div>

          <div className="os-section">
            <div className="os-section__header"><h2 className="os-section__title">Kollar</h2></div>
            <div className="os-section__body os-py-3 os-px-6">
              {houseCounts.size === 0 ? (
                <p className="os-c-tertiary os-text-sm">Henüz öğrenci yok.</p>
              ) : (
                [...houseCounts.entries()].map(([house, count], i, arr) => (
                  <InfoRow key={house} label={house} value={count} bold accent divider={i < arr.length - 1} />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
