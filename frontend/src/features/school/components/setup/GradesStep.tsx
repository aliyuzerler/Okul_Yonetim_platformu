import type { Dispatch, SetStateAction } from "react";
import { Checkbox } from "@carbon/react";
import { Education } from "@carbon/icons-react";
import StepShell from "@/features/school/components/setup/StepShell";

interface Props {
  gradeRangeStart: number;
  gradeRangeEnd: number;
  selectedGrades: Set<number>;
  setSelectedGrades: Dispatch<SetStateAction<Set<number>>>;
}

export default function GradesStep({
  gradeRangeStart,
  gradeRangeEnd,
  selectedGrades,
  setSelectedGrades,
}: Props) {
  return (
    <StepShell icon={Education} title="Sınıf seviyeleri" subtitle="Belirlediğiniz araliğe göre önceden seçildi. 12 ve 13. sınıf seviyeleri aynı A/L alanlarını paylaştığı için birlikte seçilir.">
      <div className="os-grid os-grid-cols-4 os-gap-3">
        {Array.from({ length: gradeRangeEnd - gradeRangeStart + 1 }, (_, i) => i + gradeRangeStart).map((n) => (
          <Checkbox
            key={n}
            id={`grade-${n}`}
            labelText={`${n}. sınıf seviyesi`}
            checked={selectedGrades.has(n)}
            onChange={(_e, { checked }) =>
              setSelectedGrades((prev) => {
                const next = new Set(prev);
                const linkedGrades = n === 12 || n === 13 ? [12, 13] : [n];
                for (const linkedGrade of linkedGrades) {
                  if (linkedGrade < gradeRangeStart || linkedGrade > gradeRangeEnd) continue;
                  if (checked) next.add(linkedGrade);
                  else next.delete(linkedGrade);
                }
                return next;
              })
            }
          />
        ))}
      </div>
    </StepShell>
  );
}
