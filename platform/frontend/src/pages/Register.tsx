import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { Button, Checkbox, InlineNotification, PasswordInput, Select, SelectItem, TextInput } from "@carbon/react";
import { useQuery } from "@tanstack/react-query";
import { api, getErrorMessage } from "@/shared/api/client";
import type { PlanView } from "@/shared/api/types";

export default function Register() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const plans = useQuery({
    queryKey: ["plans"],
    queryFn: async () => (await api.get<{ plans: PlanView[] }>("/plans")).data.plans,
  });

  const [form, setForm] = useState({
    school_name: "",
    city: "",
    phone: "",
    full_name: "",
    email: "",
    password: "",
    plan_code: params.get("plan") ?? "",
    accept_terms: false,
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (key: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.accept_terms) {
      setError("Devam etmek için kullanım koşullarını onaylamanız gerekiyor.");
      return;
    }
    setBusy(true);
    try {
      await api.post("/auth/register", form);
      navigate("/e-posta-dogrula?bekleniyor=1&email=" + encodeURIComponent(form.email));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pl-shell">
      <header className="pl-header">
        <Link to="/" className="pl-brand">
          OpenSchool Platform
        </Link>
        <Link className="pl-link" to="/giris">
          Zaten hesabım var
        </Link>
      </header>

      <main className="pl-main">
        <div className="pl-auth-wrapper">
          <div className="pl-card">
            <h1>Okulunuzu kaydedin</h1>
            <p className="pl-sub">
              14 günlük deneme e-posta doğrulamasının ardından otomatik başlar. Kredi kartı istemiyoruz.
            </p>

            {error && (
              <InlineNotification kind="error" title="Kayıt tamamlanamadı" subtitle={error} lowContrast hideCloseButton style={{ marginBottom: "1rem" }} />
            )}

            <form className="pl-form" onSubmit={submit}>
              <TextInput id="school_name" labelText="Okul adı" placeholder="Örn. Atatürk Anadolu Lisesi" required value={form.school_name} onChange={set("school_name")} />
              <div className="pl-form-row">
                <TextInput id="city" labelText="İl" placeholder="İstanbul" value={form.city} onChange={set("city")} />
                <TextInput id="phone" labelText="Telefon" placeholder="0501 234 56 78" value={form.phone} onChange={set("phone")} />
              </div>
              <TextInput id="full_name" labelText="Yetkili ad soyad" placeholder="Ayşe Yılmaz" required value={form.full_name} onChange={set("full_name")} />
              <TextInput id="email" labelText="Kurumsal e-posta" type="email" placeholder="mudur@okul.k12.tr" required value={form.email} onChange={set("email")} />
              <PasswordInput
                id="password"
                labelText="Şifre"
                helperText="En az 10 karakter."
                required
                value={form.password}
                onChange={set("password")}
              />
              <Select id="plan_code" labelText="Paket" required value={form.plan_code} onChange={set("plan_code")}>
                <SelectItem value="" text="Paket seçin…" />
                {plans.data?.map((p) => (
                  <SelectItem key={p.code} value={p.code} text={`${p.name} — ${p.description}`} />
                ))}
              </Select>
              <Checkbox
                id="accept_terms"
                labelText={
                  <>
                    <a className="pl-link" href="#" onClick={(e) => e.preventDefault()}>
                      KVKK aydınlatma metnini
                    </a>{" "}
                    ve kullanım koşullarını okudum, onaylıyorum.
                  </>
                }
                checked={form.accept_terms}
                onChange={(_, { checked }) => setForm((f) => ({ ...f, accept_terms: checked }))}
              />
              <Button type="submit" disabled={busy}>
                {busy ? "Kaydediliyor…" : "Kaydı tamamla ve doğrulama e-postası gönder"}
              </Button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
