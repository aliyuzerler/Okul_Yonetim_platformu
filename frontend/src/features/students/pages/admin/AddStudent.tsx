import { EMAIL_RE } from "@/shared/lib/validation";
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import {
  Button,
  TextInput,
  TextArea,
  RadioButtonGroup,
  RadioButton,
  InlineNotification,
} from "@carbon/react";
import { ArrowLeft, Save } from "@carbon/icons-react";
import { useCreateStudent } from "@/features/students/queries/useStudents";
import { getErrorMessage } from "@/shared/api/errors";
import { isValidSriLankanPhone, PHONE_INVALID_TEXT } from "@/shared/lib/phone";
import { usePageTitle } from "@/shared/hooks/usePageTitle";
import PersonNameFields from "@/shared/ui/PersonNameFields";
import { EMPTY_PERSON_NAMES } from "@/shared/lib/name";

type Touched = Partial<
  Record<"fullName" | "email" | "phone" | "indexNumber" | "whatsapp", boolean>
>;

export default function AddStudent() {
  usePageTitle("Öğrenci kaydı");
  const navigate = useNavigate();
  const createStudent = useCreateStudent();

  const [names, setNames] = useState(EMPTY_PERSON_NAMES);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [indexNumber, setIndexNumber] = useState("");
  const [address, setAddress] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [specialRemarks, setSpecialRemarks] = useState("");
  const [gender, setGender] = useState<"" | "male" | "female">("");
  const [touched, setTouched] = useState<Touched>({});

  const markTouched = (field: keyof Touched) =>
    setTouched((t) => ({ ...t, [field]: true }));

  const handleSubmit = () => {
    setTouched({
      fullName: true,
      email: true,
      phone: true,
      indexNumber: true,
      whatsapp: true,
    });
    if (!isValid) return;
    createStudent.mutate(
      {
        full_name: names.full_name.trim(),
        name_with_initials: names.name_with_initials.trim() || undefined,
        calling_name: names.calling_name.trim() || undefined,
        email: email.trim(),
        phone_number: phone.trim() || undefined,
        index_number: indexNumber.trim(),
        address: address.trim() || undefined,
        whatsapp: whatsapp.trim() || undefined,
        special_remarks: specialRemarks.trim() || undefined,
        gender: gender || undefined,
      },
      { onSuccess: () => navigate("/students") },
    );
  };

  const errorMessage = createStudent.isError
    ? getErrorMessage(createStudent.error, "Öğrenci kaydedilemedi")
    : null;

  const fullNameInvalid = !!touched.fullName && !names.full_name.trim();
  const emailInvalid = !!touched.email && !EMAIL_RE.test(email.trim());
  const phoneInvalid = !!touched.phone && !isValidSriLankanPhone(phone);
  const indexNumberInvalid = !!touched.indexNumber && !indexNumber.trim();
  const whatsappInvalid = !!touched.whatsapp && !isValidSriLankanPhone(whatsapp);

  const isValid =
    names.full_name.trim().length > 0 &&
    EMAIL_RE.test(email.trim()) &&
    isValidSriLankanPhone(phone) &&
    indexNumber.trim().length > 0 &&
    isValidSriLankanPhone(whatsapp);

  return (
    <div className="os-page">
      <div className="os-page__header">
        <div className="os-page__header-left">
          <h1 className="os-page__title">Yeni öğrenci kaydı</h1>
          <p className="os-page__subtitle">
            Öğrenci hesabı ve profili oluşturun
          </p>
        </div>
        <Button
          renderIcon={ArrowLeft}
          kind="ghost"
          size="md"
          as={Link}
          to="/students"
        >
          Geri
        </Button>
      </div>

      <div className="os-form">
        <InlineNotification
          kind="info"
          title="İlk şifre"
          subtitle="Öğrencinin ilk tek kullanımlık şifresi okul numarasıdır. İlk oturum açışında değiştirmesi istenir."
          lowContrast
          hideCloseButton className="os-max-w-full os-mb-6"
        />

        {errorMessage && (
          <InlineNotification
            kind="error"
            title="Hata"
            subtitle={errorMessage}
            lowContrast
            hideCloseButton
          />
        )}

        <div className="os-form__section">
          <div className="os-form__section-header">Hesap</div>
          <div className="os-form__section-body">
            <PersonNameFields
              idPrefix="student"
              value={names}
              onChange={setNames}
              fullNameInvalid={fullNameInvalid}
              onFullNameBlur={() => markTouched("fullName")}
            />
            <TextInput
              id="email"
              labelText="E-posta adresi"
              placeholder="örn. ogrenci@okul.example"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => markTouched("email")}
              invalid={emailInvalid}
              invalidText="Geçerli bir e-posta adresi girin."
            />
            <TextInput
              id="phone"
              labelText="Telefon (isteğe bağlı)"
              placeholder="örn. 077 123 4567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onBlur={() => markTouched("phone")}
              invalid={phoneInvalid}
              invalidText={PHONE_INVALID_TEXT}
            />
          </div>
        </div>

        <div className="os-form__section">
          <div className="os-form__section-header">Öğrenci bilgileri</div>
          <div className="os-form__section-body">
            <TextInput
              id="index-number"
              labelText="Okul numarası"
              placeholder="örn. 2026/0145"
              value={indexNumber}
              onChange={(e) => setIndexNumber(e.target.value)}
              onBlur={() => markTouched("indexNumber")}
              invalid={indexNumberInvalid}
              invalidText="Okul numarası zorunludur."
            />
            <TextInput
              id="whatsapp"
              labelText="WhatsApp (isteğe bağlı)"
              placeholder="örn. 077 123 4567"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              onBlur={() => markTouched("whatsapp")}
              invalid={whatsappInvalid}
              invalidText={PHONE_INVALID_TEXT}
            />
            <RadioButtonGroup
              legendText="Cinsiyet (isteğe bağlı)"
              name="gender"
              valueSelected={gender}
              onChange={(value) => setGender(value as "male" | "female")}
            >
              <RadioButton id="gender-male" labelText="Erkek" value="male" />
              <RadioButton
                id="gender-female"
                labelText="Kız"
                value="female"
              />
            </RadioButtonGroup>
            <div className="os-form__full-col">
              <TextInput
                id="address"
                labelText="Adres (isteğe bağlı)"
                placeholder="örn. Cumhuriyet Cad. No: 23"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
            <div className="os-form__full-col">
              <TextArea
                id="special-remarks"
                labelText="Özel notlar (isteğe bağlı)"
                placeholder="Öğrenciyle ilgili notlar"
                rows={3}
                value={specialRemarks}
                onChange={(e) => setSpecialRemarks(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="os-form__actions">
          <Button
            renderIcon={Save}
            kind="primary"
            onClick={handleSubmit}
            disabled={!isValid || createStudent.isPending}
          >
            {createStudent.isPending ? "Kaydediliyor…" : "Kaydet"}
          </Button>
          <Button kind="secondary" as={Link} to="/students">
            İptal
          </Button>
        </div>
      </div>
    </div>
  );
}
