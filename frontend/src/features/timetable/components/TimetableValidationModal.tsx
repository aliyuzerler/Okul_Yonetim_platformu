import { Button, ComposedModal, ModalHeader, ModalBody, ModalFooter, SkeletonText } from "@carbon/react";
import { Checkmark, WarningAlt } from "@carbon/icons-react";
import type { ValidationResult } from "@/features/timetable/api/timetable";
import { WEEKDAYS } from "@/shared/lib/timetable";

interface Props {
  open: boolean;
  validating: boolean;
  validation: ValidationResult | undefined;
  onClose: () => void;
}

export default function TimetableValidationModal({ open, validating, validation, onClose }: Props) {
  return (
    <ComposedModal open={open} size="md" onClose={onClose} aria-label="Denetim sonuçları">
      <ModalHeader title="Denetim sonuçları" />
      <ModalBody>
        {validating ? (
          <SkeletonText width="60%" />
        ) : !validation || validation.issues.length === 0 ? (
          <div className="os-flex os-items-center os-gap-2 os-c-success">
            <Checkmark size={20} />
            <span>Sorun bulunamadı. Bu ders programı gönderime hazır.</span>
          </div>
        ) : (
          <div className="os-grid os-gap-2">
            {validation.issues.map((issue, i) => (
              <div key={i} className={`os-flex os-gap-2 os-p-2 os-rounded-md ${issue.severity === "error" ? "os-bg-status-absent" : "os-bg-status-late"}`}>
                <WarningAlt size={16} className={`${issue.severity === "error" ? "os-fill-danger" : "os-fill-warning"} os-shrink-0`} />
                <span className="os-text-md">
                  {issue.day_of_week != null && <strong>{WEEKDAYS.find((d) => d.value === issue.day_of_week)?.label} {issue.period_number}. ders: </strong>}
                  {issue.message}
                </span>
              </div>
            ))}
          </div>
        )}
      </ModalBody>
      <ModalFooter>
        <Button kind="secondary" onClick={onClose}>Kapat</Button>
      </ModalFooter>
    </ComposedModal>
  );
}
