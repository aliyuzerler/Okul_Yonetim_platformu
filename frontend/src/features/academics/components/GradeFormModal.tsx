import { TextInput } from "@carbon/react";
import FormModal from "@/shared/ui/FormModal";

export default function GradeFormModal({
  mode,
  name,
  onNameChange,
  nameTouched,
  onNameBlur,
  onClose,
  onSubmit,
  isPending,
  isError,
  error,
}: {
  mode: "create" | "edit";
  name: string;
  onNameChange: (value: string) => void;
  nameTouched: boolean;
  onNameBlur: () => void;
  onClose: () => void;
  onSubmit: () => void;
  isPending: boolean;
  isError: boolean;
  error: unknown;
}) {
  return (
    <FormModal
      open
      title={mode === "create" ? "Sınıf seviyesi ekle" : "Sınıf seviyesini düzenle"}
      onClose={onClose}
      onSubmit={onSubmit}
      isPending={isPending}
      submitDisabled={!name.trim()}
      isError={isError}
      error={error}
      errorFallback="Sınıf seviyesi kaydedilemedi"
    >
      <TextInput
        id="grade-name"
        labelText="Ad"
        placeholder="örn. Grade 6"
        helperText={
          mode === "create"
            ? "Listenin sonuna eklenir; sıralamak için okları kullanın."
            : "Konum oklarla değiştirilir, buradan değil."
        }
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
        onBlur={onNameBlur}
        invalid={nameTouched && !name.trim()}
        invalidText="Sınıf seviyesi adı gereklidir."
      />
    </FormModal>
  );
}
