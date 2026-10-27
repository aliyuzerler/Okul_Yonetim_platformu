import { useState } from "react";
import { Button, Dropdown } from "@carbon/react";
import { Add } from "@carbon/icons-react";
import { useCurrentAcademicYear } from "@/features/school/queries/useAcademicYears";
import { useGrades } from "@/features/academics/queries/useGrades";
import { useCurrentClasses } from "@/features/academics/queries/useClasses";
import { useGradeSections } from "@/features/timetable/queries/useGradeSections";
import { useSubjects } from "@/features/curriculum/queries/useSubjects";
import { useStudents } from "@/features/students/queries/useStudents";
import { useGuardians } from "@/features/guardians/queries/useGuardians";
import { useTeachers } from "@/features/teachers/queries/useTeachers";
import EntityCombobox from "@/shared/ui/EntityCombobox";
import type { RecipientRule, RecipientRuleType } from "@/features/notifications/api/notification";
import { displayName } from "@/shared/lib/name";

const RULE_TYPES: { value: RecipientRuleType; label: string }[] = [
  { value: "everyone", label: "Herkes" },
  { value: "grade", label: "Sınıf seviyesine göre" },
  { value: "class", label: "Sınıfa göre" },
  { value: "grade_section", label: "Seviye şubesine göre" },
  { value: "subject", label: "Derslere göre" },
  { value: "student", label: "Belirli öğrenci" },
  { value: "guardian", label: "Belirli veli" },
  { value: "teacher", label: "Belirli öğretmen" },
];

export default function RecipientPicker({
  onAdd,
  canBroadcastEveryone,
  disabled = false,
}: {
  onAdd: (rule: RecipientRule) => void;
  canBroadcastEveryone: boolean;
  disabled?: boolean;
}) {
  const { data: currentYear } = useCurrentAcademicYear();
  const { data: grades } = useGrades();
  const { data: classes } = useCurrentClasses();
  const { data: gradeSections } = useGradeSections(currentYear?.id ?? "");
  const { data: subjects } = useSubjects();
  const [studentSearch, setStudentSearch] = useState("");
  const { data: studentPage } = useStudents({ limit: 25, search: studentSearch });
  const students = studentPage?.items;
  const [guardianSearch, setGuardianSearch] = useState("");
  const { data: guardianPage } = useGuardians({ limit: 25, search: guardianSearch });
  const guardians = guardianPage?.items;
  const [teacherSearch, setTeacherSearch] = useState("");
  const { data: teacherPage } = useTeachers({ limit: 25, search: teacherSearch });
  const teachers = teacherPage?.items;

  const [ruleType, setRuleType] = useState<RecipientRuleType>("grade");
  const [selectedId, setSelectedId] = useState("");
  const [subjectAudience, setSubjectAudience] = useState<"students" | "teachers">("students");

  const reset = () => setSelectedId("");

  const availableRuleTypes = canBroadcastEveryone ? RULE_TYPES : RULE_TYPES.filter((r) => r.value !== "everyone");

  const handleAdd = () => {
    if (ruleType === "everyone") {
      onAdd({ type: "everyone", label: "Herkes" });
      return;
    }
    if (!selectedId) return;

    if (ruleType === "grade") {
      const grade = grades?.find((g) => g.id === selectedId);
      onAdd({ type: "grade", grade_id: selectedId, label: grade?.name ?? "Sınıf seviyesi" });
    } else if (ruleType === "class") {
      const cls = classes?.find((c) => c.id === selectedId);
      onAdd({ type: "class", class_id: selectedId, label: cls ? `${cls.grade_name} - ${cls.name}` : "Sınıf" });
    } else if (ruleType === "grade_section") {
      const section = gradeSections?.find((s) => s.id === selectedId);
      onAdd({ type: "grade_section", grade_section_id: selectedId, label: section?.name ?? "Seviye şubesi" });
    } else if (ruleType === "subject") {
      const subject = subjects?.find((s) => s.id === selectedId);
      onAdd({
        type: "subject",
        subject_id: selectedId,
        subject_audience: subjectAudience,
        label: `${subject?.name ?? "Ders"} (${subjectAudience === "teachers" ? "Öğretmenler" : "Öğrenciler"})`,
      });
    } else if (ruleType === "student") {
      const student = students?.find((s) => s.id === selectedId);
      onAdd({ type: "student", student_id: selectedId, label: student ? displayName(student) : "Öğrenci" });
    } else if (ruleType === "guardian") {
      const guardian = guardians?.find((g) => g.id === selectedId);
      onAdd({ type: "guardian", guardian_id: selectedId, label: guardian ? displayName(guardian) : "Veli" });
    } else if (ruleType === "teacher") {
      const teacher = teachers?.find((t) => t.id === selectedId);
      onAdd({ type: "teacher", teacher_id: selectedId, label: teacher ? displayName(teacher) : "Öğretmen" });
    }
    reset();
  };

  return (
    <div className="os-grid os-gap-3">
      <Dropdown
        id="recipient-rule-type"
        titleText="Alıcı türü"
        label="Seçin…"
        items={availableRuleTypes}
        itemToString={(item) => (item as (typeof RULE_TYPES)[number])?.label ?? ""}
        selectedItem={availableRuleTypes.find((r) => r.value === ruleType)}
        disabled={disabled}
        onChange={({ selectedItem }) => {
          setRuleType((selectedItem as (typeof RULE_TYPES)[number] | null)?.value ?? ruleType);
          reset();
        }}
      />

      {ruleType === "grade" && (
        <EntityCombobox
          id="rule-grade"
          labelText="Sınıf seviyesi"
          items={grades ?? []}
          selectedId={selectedId}
          onSelect={setSelectedId}
          getId={(g) => g.id}
          itemToString={(g) => g.name}
          placeholder="Sınıf seviyelerinde arayın…"
          disabled={disabled}
        />
      )}
      {ruleType === "class" && (
        <EntityCombobox
          id="rule-class"
          labelText="Sınıf"
          items={classes ?? []}
          selectedId={selectedId}
          onSelect={setSelectedId}
          getId={(c) => c.id}
          itemToString={(c) => `${c.grade_name} - ${c.name}`}
          placeholder="Sınıflarda arayın…"
          disabled={disabled}
        />
      )}
      {ruleType === "grade_section" && (
        <EntityCombobox
          id="rule-grade-section"
          labelText="Seviye şubesi"
          items={gradeSections ?? []}
          selectedId={selectedId}
          onSelect={setSelectedId}
          getId={(s) => s.id}
          itemToString={(s) => s.name}
          placeholder="Seviye şubelerinde arayın…"
          disabled={disabled}
        />
      )}
      {ruleType === "subject" && (
        <>
          <EntityCombobox
            id="rule-subject"
            labelText="Ders"
            items={subjects ?? []}
            selectedId={selectedId}
            onSelect={setSelectedId}
            getId={(s) => s.id}
            itemToString={(s) => s.name}
            placeholder="Derslerde arayın…"
            disabled={disabled}
          />
          <Dropdown
            id="rule-subject-audience"
            titleText="Hedef kitle"
            label=""
            items={["students", "teachers"]}
            itemToString={(item) => (item === "teachers" ? "Bu dersi veren öğretmenler" : "Bu dersi alan öğrenciler")}
            selectedItem={subjectAudience}
            onChange={({ selectedItem }) => setSubjectAudience((selectedItem as "students" | "teachers") ?? "students")}
            disabled={disabled}
          />
        </>
      )}
      {ruleType === "student" && (
        <EntityCombobox
          id="rule-student"
          labelText="Öğrenci"
          items={students ?? []}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onSearch={setStudentSearch}
          getId={(s) => s.id}
          itemToString={(s) => `${displayName(s)} - ${s.index_number}`}
          placeholder="Öğrencilerde arayın…"
          disabled={disabled}
        />
      )}
      {ruleType === "guardian" && (
        <EntityCombobox
          id="rule-guardian"
          labelText="Veli"
          items={guardians ?? []}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onSearch={setGuardianSearch}
          getId={(g) => g.id}
          itemToString={(g) => `${displayName(g)} - ${g.phone}`}
          placeholder="Velilerde arayın…"
          disabled={disabled}
        />
      )}
      {ruleType === "teacher" && (
        <EntityCombobox
          id="rule-teacher"
          labelText="Öğretmen"
          items={teachers ?? []}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onSearch={setTeacherSearch}
          getId={(t) => t.id}
          itemToString={(t) => `${displayName(t)} - ${t.employee_number}`}
          placeholder="Öğretmenlerde arayın…"
          disabled={disabled}
        />
      )}

      <Button kind="ghost" size="sm" renderIcon={Add} onClick={handleAdd} disabled={disabled || (ruleType !== "everyone" && !selectedId)}>
        Alıcı ekle
      </Button>
    </div>
  );
}
