import { useState } from "react";
import { useNavigate, Navigate } from "react-router";
import { Button, InlineNotification } from "@carbon/react";
import { useSchool } from "@/features/school/queries/useSchool";
import SchoolStep from "@/features/school/components/setup/SchoolStep";
import HousesStep from "@/features/school/components/setup/HousesStep";
import GradesStep from "@/features/school/components/setup/GradesStep";
import MediumsStep from "@/features/school/components/setup/MediumsStep";
import ClassesStep from "@/features/school/components/setup/ClassesStep";
import RoomsStep from "@/features/school/components/setup/RoomsStep";
import DoneStep from "@/features/school/components/setup/DoneStep";
import CustomStepper from "@/features/school/components/setup/CustomStepper";
import { useSchoolSetupSubmit } from "@/features/school/hooks/useSchoolSetupSubmit";
import { useSchoolSetupState } from "@/features/school/hooks/useSchoolSetupState";
import { STEPS, STEP_LABELS } from "@/features/school/setupConstants";
import ErrorSummary from "@/shared/ui/ErrorSummary";
import { useErrorSummary } from "@/shared/hooks/useErrorSummary";

const DONE_STEP = STEPS.length - 1;
const CLASSES_STEP = STEPS.indexOf("Classes");
const ROOMS_STEP = DONE_STEP - 1;
const SKIPPABLE = new Set([1, 3, CLASSES_STEP, ROOMS_STEP]);

export default function SchoolSetup() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [housesValidationAttempted, setHousesValidationAttempted] = useState(false);
  const { data: existingSchool, isLoading: schoolCheckLoading } = useSchool();
  const s = useSchoolSetupState();
  const { submitting, submitError, submitted, submitAll } = useSchoolSetupSubmit(s);
  const { ref: summaryRef, errors: summaryErrors, reveal, recheck, reset: resetSummary } = useErrorSummary();

  const goNext = () => {
    resetSummary();
    setStep((n) => Math.min(n + 1, DONE_STEP));
  };
  const goBack = () => {
    resetSummary();
    setStep((n) => Math.max(n - 1, 0));
  };

  // Each step validates itself before moving on; skip bypasses that step's input.
  const advance = (skip: boolean) => {
    setError(null);
    switch (step) {
      case 0:
        if (!reveal(() => s.setSchoolTouched(true)) || !s.schoolValid) return;
        break;
      case 1:
        if (!skip) setHousesValidationAttempted(true);
        if (!skip && s.houses.some((house) => house.name.trim() && !house.code.trim())) {
          return setError("Adı girilen her kolun bir kodu olmalı.");
        }
        s.setHousesSkipped(skip);
        break;
      case 2:
        if (s.selectedGrades.size === 0) return setError("En az bir sınıf seviyesi seçin.");
        break;
      case 3:
        s.setMediumsSkipped(skip);
        break;
      case CLASSES_STEP:
        if (!skip && !s.yearLabel.trim()) return setError("Eğitim-öğretim yılı etiketi gerekli.");
        if (!skip && (!Number.isFinite(s.classCapacity) || s.classCapacity < 1 || s.classCapacity > 200)) {
          return setError("Sınıf kapasitesi 1 ile 200 arasında bir sayı olmalı.");
        }
        s.setClassesSkipped(skip);
        break;
      default:
        s.setRoomsSkipped(skip);
        goNext();
        submitAll(skip);
        return;
    }
    goNext();
  };

  if (!schoolCheckLoading && existingSchool && !submitted && !submitting) return <Navigate to="/" replace />;

  return (
    <div className="os-school-setup-page">
      <header className="os-school-setup-brand">
        <img src="/favicon.webp" alt="" width={36} height={36} />
        <div>
          <p className="os-school-setup-brand__name">Open<span>School</span></p>
          <p className="os-school-setup-brand__context">Okul kurulumu</p>
        </div>
      </header>
      <div className="os-school-setup-card">
        <div className="os-school-setup-heading">
          <p className="os-school-setup-eyebrow">Okulunuzu hazırlayalım</p>
          <h1>Okulunuzu kurun</h1>
          <p>OpenSchool&apos;un okulunuzun günlük işleyişinde kullanacağı yapıyı oluşturmak için bu adımları tamamlayın.</p>
        </div>
        <CustomStepper currentIndex={step} steps={STEPS.map((stepKey) => STEP_LABELS[stepKey])} />

        {error && <InlineNotification kind="error" title="Devam edilemedi" subtitle={error} hideCloseButton lowContrast className="os-school-setup-error" />}

        <ErrorSummary errors={summaryErrors} />

        <div ref={summaryRef} onChange={recheck}>
        {step === 0 && <SchoolStep school={s.school} setSchool={s.setSchool} schoolTouched={s.schoolTouched} gradeRangeInvalid={s.gradeRangeInvalid} />}
        {step === 1 && <HousesStep houses={s.houses} setHouses={s.setHouses} validationAttempted={housesValidationAttempted} />}
        {step === 2 && <GradesStep gradeRangeStart={s.gradeRangeStart} gradeRangeEnd={s.gradeRangeEnd} selectedGrades={s.selectedGrades} setSelectedGrades={s.setSelectedGrades} />}
        {step === 3 && <MediumsStep mediumChecks={s.mediumChecks} setMediumChecks={s.setMediumChecks} customMediums={s.customMediums} setCustomMediums={s.setCustomMediums} />}
        {step === CLASSES_STEP && (
          <ClassesStep
            yearLabel={s.yearLabel}
            setYearLabel={s.setYearLabel}
            classCapacity={s.classCapacity}
            setClassCapacity={s.setClassCapacity}
            orderedSelectedGrades={s.orderedSelectedGrades}
            regularGradeNumbers={s.regularGradeNumbers}
            alGradeNumbers={s.alGradeNumbers}
            sectionsPerGrade={s.sectionsPerGrade}
            setSectionsPerGrade={s.setSectionsPerGrade}
            selectedMediumNames={s.selectedMediumNames}
            sectionMediums={s.sectionMediums}
            setSectionMediums={s.setSectionMediums}
            alStreams={s.alStreams}
            setAlStreams={s.setAlStreams}
          />
        )}
        {step === ROOMS_STEP && <RoomsStep facilityRooms={s.facilityRooms} setFacilityRooms={s.setFacilityRooms} />}
        </div>
        {step === DONE_STEP && <DoneStep submitting={submitting} submitError={submitError} submitted={submitted} onRetry={() => submitAll()} onGoToDashboard={() => navigate("/")} />}

        {step < DONE_STEP && (
          <div className="os-school-setup-actions">
            <Button kind="ghost" onClick={goBack} disabled={step === 0}>Geri</Button>
            <div className="os-school-setup-actions__right">
              {SKIPPABLE.has(step) && <Button kind="secondary" onClick={() => advance(true)}>Atla</Button>}
              <Button kind="primary" onClick={() => advance(false)}>{step === ROOMS_STEP ? "Kurulumu tamamla" : "Devam"}</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
