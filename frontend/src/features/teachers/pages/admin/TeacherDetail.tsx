import { useEffect, useRef, useState } from "react";
import { Link, useParams, useNavigate, useLocation } from "react-router";
import { Button } from "@carbon/react";
import { ArrowLeft, TrashCan, Edit, Save } from "@carbon/icons-react";
import {
  useTeacher,
  useTeacherSubjects,
  useDeleteTeacher,
  useUpdateTeacher,
  useUpdateTeacherHouse,
  useUpdateTeacherEmploymentStatus,
  useAssignTeacherSubject,
  useRemoveTeacherSubject,
} from "@/features/teachers/queries/useTeachers";
import { useHouses } from "@/features/school/queries/useHouses";
import { getErrorMessage } from "@/shared/api/errors";
import LoadingSpinner from "@/shared/ui/LoadingSpinner";
import ErrorMessage from "@/shared/ui/ErrorMessage";
import ProfileBanner from "@/shared/ui/ProfileBanner";
import ConfirmDeleteModal from "@/shared/ui/ConfirmDeleteModal";
import ConfirmEditModal from "@/shared/ui/ConfirmEditModal";
import type { Teacher, TeacherTitle } from "@/features/teachers/api/teacher";
import TeacherProfileSections from "@/features/teachers/components/TeacherProfileSections";
import MutationErrorNotification from "@/shared/ui/MutationErrorNotification";
import { usePageTitle } from "@/shared/hooks/usePageTitle";
import { displayName } from "@/shared/lib/name";

// shared/lib EMPLOYMENT_STATUSES is English; display labels are translated here.
const employmentStatusLabel: Record<string, string> = {
  active: "Aktif",
  resigned: "İstifa etti",
  transferred: "Başka okula atandı",
};

function teacherToForm(t: Teacher) {
  return {
    full_name: t.full_name,
    name_with_initials: t.name_with_initials ?? "",
    calling_name: t.calling_name ?? "",
    phone_number: t.phone ?? "",
    nic_number: t.nic_number ?? "",
    title: t.title ?? ("" as TeacherTitle | ""),
    gender: t.gender ?? ("" as "" | "male" | "female"),
  };
}

export default function TeacherDetail() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: teacher, isLoading, isError, refetch } = useTeacher(id);
  usePageTitle(teacher ? displayName(teacher) : undefined);
  const { data: subjects } = useTeacherSubjects(id);
  const deleteTeacher = useDeleteTeacher();
  const updateTeacher = useUpdateTeacher();
  const updateHouse = useUpdateTeacherHouse();
  const updateStatus = useUpdateTeacherEmploymentStatus();
  const assignSubject = useAssignTeacherSubject(id);
  const removeSubject = useRemoveTeacherSubject(id);
  const { data: houses } = useHouses();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmEditOpen, setConfirmEditOpen] = useState(false);
  const [editing, setEditing] = useState(
    (location.state as { edit?: boolean } | null)?.edit ?? false,
  );
  const [form, setForm] = useState({
    full_name: "",
    name_with_initials: "",
    calling_name: "",
    phone_number: "",
    nic_number: "",
    title: "" as TeacherTitle | "",
    gender: "" as "" | "male" | "female",
  });
  const loadedFor = useRef<string | null>(null);

  useEffect(() => {
    if (teacher && loadedFor.current !== teacher.id) {
      setForm(teacherToForm(teacher));
      loadedFor.current = teacher.id;
    }
  }, [teacher]);

  const handleDelete = () => {
    deleteTeacher.mutate(id);
  };

  const handleCancel = () => {
    if (teacher) setForm(teacherToForm(teacher));
    updateTeacher.reset();
    setEditing(false);
  };

  const handleSave = () => {
    updateTeacher.mutate(
      {
        id,
        data: {
          full_name: form.full_name.trim(),
          name_with_initials: form.name_with_initials.trim(),
          calling_name: form.calling_name.trim(),
          phone_number: form.phone_number.trim() || undefined,
          nic_number: form.nic_number.trim(),
          title: form.title || undefined,
          gender: form.gender || undefined,
        },
      },
      { onSuccess: () => { setEditing(false); setConfirmEditOpen(false); } },
    );
  };

  const change = (field: keyof typeof form, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const updateError = updateTeacher.isError
    ? getErrorMessage(updateTeacher.error, "Öğretmen güncellenemedi")
    : null;

  const isValid =
    form.full_name.trim() && form.nic_number.trim();

  if (isLoading) return <LoadingSpinner />;
  if (isError || !teacher)
    return (
      <div className="os-p-8">
        <ErrorMessage message="Öğretmen yüklenemedi." onRetry={refetch} />
      </div>
    );

  return (
    <div className="os-bg-layer-hover os-min-h-content">
      <ProfileBanner
        name={displayName(teacher)}
        meta={
          teacher.employment_status === "active"
            ? teacher.employee_number
            : `${teacher.employee_number} · ${employmentStatusLabel[teacher.employment_status] ?? teacher.employment_status}`
        }
        actions={
          editing ? (
            <>
              <Button
                kind="secondary"
                size="sm"
                onClick={handleCancel}
                disabled={updateTeacher.isPending}
              >
                İptal
              </Button>
              <Button
                renderIcon={Save}
                kind="primary"
                size="sm"
                onClick={() => setConfirmEditOpen(true)}
                disabled={!isValid || updateTeacher.isPending}
              >
                {updateTeacher.isPending ? "Kaydediliyor…" : "Değişiklikleri kaydet"}
              </Button>
            </>
          ) : (
            <>
              <Button
                renderIcon={Edit}
                kind="ghost"
                size="sm"
                onClick={() => setEditing(true)}
              >
                Düzenle
              </Button>
              <Button
                renderIcon={TrashCan}
                kind="danger--ghost"
                size="sm"
                onClick={() => {
                  deleteTeacher.reset();
                  setConfirmOpen(true);
                }}
              >
                Sil
              </Button>
              <Button
                renderIcon={ArrowLeft}
                kind="secondary"
                size="sm"
                as={Link}
                to="/teachers"
              >
                Geri
              </Button>
            </>
          )
        }
      />

      <div className="os-py-6 os-px-8">
        <MutationErrorNotification
          isError={deleteTeacher.isError}
          error={deleteTeacher.error}
          title="Öğretmen silinemedi"
          fallback="Öğretmen bir sınıfa atanmış veya yoklama kayıtları olabilir."
          onClose={() => deleteTeacher.reset()} className="os-mb-4"
        />

        <TeacherProfileSections
          teacher={teacher}
          subjects={subjects}
          houses={houses}
          form={form}
          editing={editing}
          onChange={change}
          onTitleChange={(value) => setForm((f) => ({ ...f, title: value }))}
          onGenderChange={(value) => setForm((f) => ({ ...f, gender: value }))}
          updateError={updateError}
          updateHouse={updateHouse}
          updateStatus={updateStatus}
          assignSubject={assignSubject}
          removeSubject={removeSubject}
        />
      </div>

      <ConfirmDeleteModal
        open={confirmOpen}
        title="Öğretmeni sil"
        description={
          <>
             <strong>{displayName(teacher)}</strong> silinsin mi? Bu işlem hesabını da
            kaldırır ve geri alınamaz.
          </>
        }
        subject="Öğretmen"
        successVerb="silindi"
        confirmLabel="Sil"
        pendingLabel="Siliniyor…"
        mutation={deleteTeacher}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleDelete}
        onSuccess={() => navigate("/teachers")}
      />

      <ConfirmEditModal
        open={confirmEditOpen}
        title="Değişiklikleri kaydet"
        description={<>Bu değişiklikler <strong>{displayName(teacher)}</strong> adlı öğretmenin profiline kaydedilsin mi?</>}
        isPending={updateTeacher.isPending}
        onClose={() => setConfirmEditOpen(false)}
        onConfirm={handleSave}
      />
    </div>
  );
}
