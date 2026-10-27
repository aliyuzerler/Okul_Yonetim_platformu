import { useState } from "react";
import { Navigate } from "react-router";
import { SignInButton } from "@thunderid/react";
import { Button, TextInput, PasswordInput, InlineLoading } from "@carbon/react";
import { CheckmarkFilled, Information, UserMultiple } from "@carbon/icons-react";
import { useSetupStatus, useRegisterAdmin } from "@/features/school/queries/useSetup";
import { EMAIL_RE } from "@/shared/lib/validation";
import { isValidSriLankanPhone, PHONE_INVALID_TEXT } from "@/shared/lib/phone";
import { validateNewPassword } from "@/shared/auth/password";
import CustomStepper from "@/features/school/components/setup/CustomStepper";
import MutationErrorNotification from "@/shared/ui/MutationErrorNotification";
import ErrorSummary from "@/shared/ui/ErrorSummary";
import PasswordRequirements from "@/shared/ui/PasswordRequirements";
import { useErrorSummary } from "@/shared/hooks/useErrorSummary";

const STEPS = [
  { label: "Yönetici hesabı", description: "İlk yöneticiyi oluşturun" },
  { label: "Okul kurulumu", description: "Okulunuzu kaydedin" },
];

const EMPTY = { givenName: "", familyName: "", email: "", username: "", phone: "", password: "", confirmPassword: "" };
type Field = keyof typeof EMPTY;

// First-run screen: creates the one admin account before the school wizard.
export default function FirstRunSetup() {
  const { data: status, isLoading: statusLoading } = useSetupStatus();
  const registerAdmin = useRegisterAdmin();
  const [form, setForm] = useState(EMPTY);
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});
  const [done, setDone] = useState(false);
  const { ref: summaryRef, errors: summaryErrors, reveal, recheck } = useErrorSummary<HTMLFormElement>();

  if (statusLoading) return <div className="os-full-height" />;
  if (!done && status && !status.needs_setup) return <Navigate to="/signin" replace />;

  const pw = validateNewPassword(form.password, form.confirmPassword);
  const errors: Partial<Record<Field, string>> = {
    givenName: form.givenName.trim() ? undefined : "Ad gerekli.",
    familyName: form.familyName.trim() ? undefined : "Soyad gerekli.",
    email: EMAIL_RE.test(form.email.trim()) ? undefined : "Geçerli bir e-posta adresi girin.",
    username: form.username.trim() ? undefined : "Kullanıcı adı gerekli.",
    phone: isValidSriLankanPhone(form.phone) ? undefined : PHONE_INVALID_TEXT,
    password: form.password ? pw.passwordError : "Şifre gerekli.",
    confirmPassword: form.confirmPassword ? pw.confirmError : "Şifrenizi doğrulayın.",
  };
  // pw.passwordError/confirmError are both undefined while the fields are
  // still empty (validateNewPassword only flags a *wrong* value, not a
  // missing one), so canSubmit must also require pw.valid - otherwise the
  // very first admin account could be created with a blank password.
  const canSubmit = pw.valid && Object.values(errors).every((e) => !e);

  const input = (field: Field, labelText: string, extra: Record<string, unknown> = {}) => ({
    id: `setup-${field}`,
    labelText,
    value: form[field],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [field]: e.target.value })),
    onBlur: () => setTouched((t) => ({ ...t, [field]: true })),
    invalid: !!touched[field] && !!errors[field],
    invalidText: errors[field],
    ...extra,
  });

  const submit = () => {
    const clean = reveal(() => setTouched(Object.fromEntries(Object.keys(EMPTY).map((k) => [k, true]))));
    if (!clean || !canSubmit) return;
    registerAdmin.mutate(
      {
        given_name: form.givenName.trim(),
        family_name: form.familyName.trim(),
        email: form.email.trim(),
        username: form.username.trim(),
        phone_number: form.phone.trim() || undefined,
        password: form.password,
      },
      { onSuccess: () => setDone(true) },
    );
  };

  if (done) {
    return (
      <div className="os-setup-wrapper">
        <div className="os-setup-card os-setup-card--success">
          <div className="os-setup-success-icon"><CheckmarkFilled size={28} /></div>
          <h1 className="os-setup-card__title">Yönetici hesabı oluşturuldu</h1>
          <p className="os-setup-card__subtitle">
            Az önce belirlediğiniz bilgilerle oturum açın, ardından okul bilgilerinizi kaydetmek için <strong>Ayarlar</strong> bölümüne gidin.
          </p>
          <Button href="/signin" className="os-full-width-btn">Oturum açmaya git</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="os-setup-wrapper">
      <div className="os-setup-shell">
        <section className="os-setup-card" aria-labelledby="setup-title">
          <div className="os-setup-header">
            <img src="/favicon.webp" alt="" width={44} height={44} className="os-setup-header__logo" />
            <p className="os-setup-header__title">Open<span className="os-signin-card__title-accent">School</span></p>
          </div>

          <CustomStepper currentIndex={0} steps={STEPS} />

          <div className="os-setup-card__heading">
            <p className="os-setup-eyebrow">OpenSchool&apos;a hoş geldiniz</p>
            <h1 id="setup-title">Yönetici hesabınızı oluşturun</h1>
            <p>Okulunuzu yapılandırmak ve yönetmek için kullanacağınız hesabı kurun. <strong>Bu işlem yalnızca bir kez yapılabilir.</strong></p>
          </div>

          <MutationErrorNotification isError={registerAdmin.isError} error={registerAdmin.error} title="Yönetici kaydedilemedi" fallback="Bir şeyler ters gitti. Lütfen tekrar deneyin." className="os-setup-card__error" />

          <ErrorSummary errors={summaryErrors} />

          <form className="os-setup-form" ref={summaryRef} onChange={recheck} onSubmit={(event) => { event.preventDefault(); submit(); }} noValidate>
            <div className="os-setup-form__section">
              <div className="os-setup-form__section-heading">
                <span className="os-setup-form__section-icon"><UserMultiple size={20} /></span>
                <div><h2>Kişisel bilgiler</h2><p>Bu OpenSchool kurulumunu kimin yöneteceğini belirtin.</p></div>
              </div>
              <div className="os-setup-name-grid">
                <TextInput {...input("givenName", "Ad", { autoComplete: "given-name" })} />
                <TextInput {...input("familyName", "Soyad", { autoComplete: "family-name" })} />
                <TextInput {...input("email", "E-posta", { type: "email", autoComplete: "email", helperText: "Hesap kurtarma için kullanılır." })} />
                <TextInput {...input("username", "Kullanıcı adı", { autoComplete: "username", helperText: "Oturum açma adınız." })} />
                <TextInput {...input("phone", "Telefon numarası (isteğe bağlı)", { type: "tel", autoComplete: "tel", helperText: "Sri Lanka numarası, örn. 0771234567." })} />
              </div>
            </div>

            <div className="os-setup-form__section">
              <div className="os-setup-form__section-heading">
                <span className="os-setup-form__section-icon"><Information size={20} /></span>
                <div><h2>Hesabınızı güvenceye alın</h2><p>Yalnızca sizin bildiğiniz güçlü bir şifre seçin.</p></div>
              </div>
              <div className="os-setup-security-grid">
                <PasswordInput {...input("password", "Şifre", { autoComplete: "new-password" })} />
                <PasswordInput {...input("confirmPassword", "Şifreyi doğrula", { autoComplete: "new-password" })} />
              </div>
              <PasswordRequirements password={form.password} confirm={form.confirmPassword} />
            </div>

            <div className="os-setup-form__footer">
              <Button type="submit" disabled={registerAdmin.isPending} className="os-full-width-btn">
                {registerAdmin.isPending ? <InlineLoading description="Yönetici hesabı oluşturuluyor…" /> : "Yönetici hesabı oluştur"}
              </Button>
              <div className="os-setup-signin-link">
                Zaten bir yönetici hesabı oluşturdunuz mu?{" "}
                <SignInButton>
                  {({ signIn, isLoading }) => (
                    <button type="button" onClick={() => signIn()} disabled={isLoading} className="os-setup-signin-link__btn">
                      {isLoading ? "Oturum açılıyor…" : "Bunun yerine oturum açın"}
                    </button>
                  )}
                </SignInButton>
              </div>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
