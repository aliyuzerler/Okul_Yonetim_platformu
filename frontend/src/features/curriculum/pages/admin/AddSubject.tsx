import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Button, TextInput, NumberInput, InlineNotification } from "@carbon/react";
import { ArrowLeft, Save } from "@carbon/icons-react";
import { useCreateSubject } from "@/features/curriculum/queries/useSubjects";
import { getErrorMessage } from "@/shared/api/errors";
import { usePageTitle } from "@/shared/hooks/usePageTitle";
import InfoTip from "@/shared/ui/InfoTip";

type Touched = Partial<Record<"name" | "code", boolean>>;

export default function AddSubject() {
  usePageTitle("Ders ekle");
  const navigate = useNavigate();
  const createSubject = useCreateSubject();

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [type, setType] = useState("");
  const [maxMarks, setMaxMarks] = useState<number>(100);
  const [touched, setTouched] = useState<Touched>({});

  const markTouched = (field: keyof Touched) => setTouched((t) => ({ ...t, [field]: true }));

  const nameInvalid = !!touched.name && !name.trim();
  const codeInvalid = !!touched.code && !code.trim();

  const isValid = name.trim() && code.trim();

  const handleSave = () => {
    setTouched({ name: true, code: true });
    if (!isValid) return;
    createSubject.mutate(
      { name: name.trim(), code: code.trim(), type: type.trim(), max_marks: maxMarks },
      { onSuccess: () => navigate("/subjects") },
    );
  };

  const error = createSubject.isError
    ? getErrorMessage(createSubject.error, "Ders oluşturulamadı")
    : null;

  return (
    <div className="os-page">
      <div className="os-page__header">
        <div className="os-page__header-left">
          <h1 className="os-page__title">Yeni ders ekle</h1>
          <div className="os-page__subtitle os-page__subtitle--tip">
            Kataloğa bir ders ekleyin.
            <InfoTip>Öğrencilere sunmak için dersi Müfredat sekmesindeki bir seçim grubuna ekleyin.</InfoTip>
          </div>
        </div>
        <Button
          renderIcon={ArrowLeft}
          kind="ghost"
          size="md"
          as={Link}
          to="/subjects"
        >
          Geri
        </Button>
      </div>

      <div className="os-form">
        <div className="os-form__section">
          <div className="os-form__section-header">Ders bilgileri</div>
          <div className="os-form__section-body">
            <TextInput
              id="subject-name"
              labelText="Ders adı"
              placeholder="örn. Matematik"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => markTouched("name")}
              invalid={nameInvalid}
              invalidText="Ders adı zorunludur."
            />
            <TextInput
              id="subject-code"
              labelText="Ders kodu"
              placeholder="örn. MATH-01"
              helperText="Okulunuzun kullandığı herhangi bir kod. Benzersiz olmalıdır."
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onBlur={() => markTouched("code")}
              invalid={codeInvalid}
              invalidText="Ders kodu zorunludur."
            />
            <TextInput
              id="subject-type"
              labelText="Tür (isteğe bağlı)"
              placeholder="örn. core"
              helperText="Yalnızca açıklayıcı bir etiket; örn. core, language, aesthetic."
              value={type}
              onChange={(e) => setType(e.target.value)}
            />
            <NumberInput
              id="subject-max-marks"
              label="En yüksek puan"
              min={1}
              max={1000}
              value={maxMarks}
              onChange={(_e, { value }) => setMaxMarks(Number(value ?? 100))}
              helperText="Öğrencinin bu dersten alabileceği en yüksek puan."
            />
          </div>
        </div>

        {error && (
          <InlineNotification
            kind="error"
            title="Ders oluşturulamadı"
            subtitle={error}
            lowContrast
            onClose={() => createSubject.reset()} className="os-max-w-full"
          />
        )}

        <div className="os-form__actions">
          <Button
            renderIcon={Save}
            kind="primary"
            disabled={!isValid || createSubject.isPending}
            onClick={handleSave}
          >
            {createSubject.isPending ? "Kaydediliyor…" : "Dersi kaydet"}
          </Button>
          <Button kind="secondary" as={Link} to="/subjects">
            İptal
          </Button>
        </div>
      </div>
    </div>
  );
}
