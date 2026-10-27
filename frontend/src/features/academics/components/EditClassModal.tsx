import { TextInput, Select, SelectItem } from "@carbon/react";
import type { useUpdateClass } from "@/features/academics/queries/useClasses";
import type { Medium } from "@/features/curriculum/api/curriculum";
import type { Classroom } from "@/features/timetable/api/classroom";
import FormModal from "@/shared/ui/FormModal";
import InfoTip from "@/shared/ui/InfoTip";

interface Props {
  open: boolean;
  nameEdit: string;
  onNameEditChange: (name: string) => void;
  mediumEdit: string;
  onMediumEditChange: (mediumId: string) => void;
  mediums: Medium[] | undefined;
  homeClassroomEdit: string;
  onHomeClassroomEditChange: (classroomId: string) => void;
  classrooms: Classroom[] | undefined;
  updateClass: ReturnType<typeof useUpdateClass>;
  onClose: () => void;
  onSave: () => void;
}

export default function EditClassModal({
  open,
  nameEdit,
  onNameEditChange,
  mediumEdit,
  onMediumEditChange,
  mediums,
  homeClassroomEdit,
  onHomeClassroomEditChange,
  classrooms,
  updateClass,
  onClose,
  onSave,
}: Props) {
  const regularClassrooms = classrooms?.filter((c) => c.room_type === "regular");
  return (
    <FormModal
      open={open}
      title="Sınıfı düzenle"
      onClose={onClose}
      onSubmit={onSave}
      isPending={updateClass.isPending}
      submitDisabled={!nameEdit.trim()}
      isError={updateClass.isError}
      error={updateClass.error}
      errorFallback="Sınıf güncellenemedi"
    >
      <TextInput
        id="class-name-edit"
        labelText="Sınıf adı"
        value={nameEdit}
        maxLength={20}
        onChange={(e) => onNameEditChange(e.target.value)}
      />

      <Select
        id="class-medium-edit"
        labelText={<>Öğretim dili (isteğe bağlı) <InfoTip>Tek bir öğretim diline bağlı sınıflar, sınıf geçmede karıştırılmak yerine öğrencileriyle birlikte taşınır.</InfoTip></>}
        helperText="Yalnızca tek dilli sınıflar için."
        value={mediumEdit}
        onChange={(e) => onMediumEditChange(e.target.value)}
      >
        <SelectItem value="" text="Öğretim dili yok" />
        {mediums?.map((m) => (
          <SelectItem key={m.id} value={m.id} text={m.name} />
        ))}
      </Select>

      <Select
        id="class-home-classroom-edit"
        labelText="Ana derslik (isteğe bağlı)"
        helperText="Öğrenciler gün boyu bu derslikte kalır; öğretmenler sırayla girer."
        value={homeClassroomEdit}
        onChange={(e) => onHomeClassroomEditChange(e.target.value)}
      >
        <SelectItem value="" text="Ana derslik yok" />
        {regularClassrooms?.map((c) => (
          <SelectItem key={c.id} value={c.id} text={c.name} />
        ))}
      </Select>
    </FormModal>
  );
}
