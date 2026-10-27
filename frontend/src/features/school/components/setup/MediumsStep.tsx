import type { Dispatch, SetStateAction } from "react";
import { Button, Checkbox, TextInput } from "@carbon/react";
import { Language, Add } from "@carbon/icons-react";
import StepShell from "@/features/school/components/setup/StepShell";
import RepeatableRow from "@/features/school/components/setup/RepeatableRow";
import { SUGGESTED_MEDIUMS } from "@/features/school/setupConstants";

interface Props {
  mediumChecks: Record<string, boolean>;
  setMediumChecks: Dispatch<SetStateAction<Record<string, boolean>>>;
  customMediums: string[];
  setCustomMediums: Dispatch<SetStateAction<string[]>>;
}

export default function MediumsStep({
  mediumChecks,
  setMediumChecks,
  customMediums,
  setCustomMediums,
}: Props) {
  return (
    <StepShell
      icon={Language}
      title="Öğretim dilleri"
      subtitle="İsteğe bağlı; öğretim dilleri. Sonraki adımın her şubeye bir dil atayabilmesi için bunları önce belirleyin."
    >
      <div className="os-flex os-gap-6 os-mb-4">
        {SUGGESTED_MEDIUMS.map((m) => (
          <Checkbox
            key={m}
            id={`medium-${m}`}
            labelText={m}
            checked={!!mediumChecks[m]}
            onChange={(_e, { checked }) => setMediumChecks((prev) => ({ ...prev, [m]: checked }))}
          />
        ))}
      </div>
      {customMediums.map((m, i) => (
        <RepeatableRow key={i} onRemove={() => setCustomMediums((ms) => ms.filter((_, idx) => idx !== i))}>
          <TextInput
            id={`custom-medium-${i}`}
            labelText="Öğretim dili"
            size="md"
            value={m}
            onChange={(e) => setCustomMediums((ms) => ms.map((row, idx) => (idx === i ? e.target.value : row)))}
          />
        </RepeatableRow>
      ))}
      <Button kind="ghost" size="sm" renderIcon={Add} onClick={() => setCustomMediums((ms) => [...ms, ""])}>
        Başka öğretim dili ekle
      </Button>
    </StepShell>
  );
}
