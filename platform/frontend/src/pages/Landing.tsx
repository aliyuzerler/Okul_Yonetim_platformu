import { Link } from "react-router";
import { Button } from "@carbon/react";
import { ArrowRight, Enterprise, Laptop, Mobile, Flow, ChartBar } from "@carbon/icons-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/shared/api/client";
import type { PlanView } from "@/shared/api/types";
import { formatKurus } from "@/shared/lib/format";
import { useState } from "react";

const FEATURES = [
  { icon: Enterprise, title: "4 rol, 5 panel", text: "Müdür, öğretmen, öğrenci ve veli için ayrı paneller; tam Türkçe, MEB uyumlu terminoloji." },
  { icon: Laptop, title: "Ders programı", text: "Otomatik program üretimi, çakışma onarımı, seçmeli bloklar — tek tıkla." },
  { icon: Mobile, title: "Mobil uygulama", text: "Veli ve öğrenci panelleri cebinde: notlar, devamsızlık, push bildirim." },
  { icon: Flow, title: "Yıl sonu iş akışları", text: "Sınıf geçme, öğretmen atama, ders seçimi — önerilebilir ve geri alınabilir adımlar." },
  { icon: ChartBar, title: "Rapor ve analitik", text: "Karne, PDF raporlar, okul geneli analitik ve denetim kayıtları." },
  { icon: ArrowRight, title: "Kendi sunucunuz", text: "Verileriniz sizde kalır: tek kiracılı kurulum, KVKK dostu mimari." },
];

export default function Landing() {
  const [cycle, setCycle] = useState<"monthly" | "annual">("monthly");
  const plans = useQuery({
    queryKey: ["plans"],
    queryFn: async () => (await api.get<{ plans: PlanView[] }>("/plans")).data.plans,
  });

  return (
    <div className="pl-shell">
      <header className="pl-header">
        <Link to="/" className="pl-brand">
          <Enterprise size={22} />
          OpenSchool Platform
        </Link>
        <nav style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <Link className="pl-link" to="/giris">
            Giriş yap
          </Link>
          <Button as="a" href="/kayit" size="sm">
            14 gün ücretsiz başlat
          </Button>
        </nav>
      </header>

      <main className="pl-main">
        <section className="pl-hero">
          <h1>Okulunuzu 14 gün boyunca ücretsiz yönetin</h1>
          <p>
            OpenSchool; müdürlük, öğretmen, öğrenci ve veli panellerini tek platformda toplar.
            Kredi kartı olmadan deneyin, beğenirseniz ayda tek tıkla devam edin.
          </p>
          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
            <Button as="a" href="/kayit" size="lg">
              Ücretsiz denemeyi başlat <ArrowRight size={18} />
            </Button>
            <Button as="a" href="/giris" kind="secondary" size="lg">
              Zaten hesabım var
            </Button>
          </div>
        </section>

        <section className="pl-feature-grid">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <article key={title} className="pl-feature">
              <Icon size={26} style={{ color: "var(--pl-primary)" }} />
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </section>

        <section>
          <div className="pl-cycle-toggle">
            <Button
              kind={cycle === "monthly" ? "primary" : "tertiary"}
              size="sm"
              onClick={() => setCycle("monthly")}
            >
              Aylık
            </Button>
            <Button
              kind={cycle === "annual" ? "primary" : "tertiary"}
              size="sm"
              onClick={() => setCycle("annual")}
            >
              Yıllık <span style={{ opacity: 0.85 }}>(2 ay bedava)</span>
            </Button>
          </div>

          <div className="pl-plans">
            {plans.isLoading && <p style={{ textAlign: "center", width: "100%" }}>Paketler yükleniyor…</p>}
            {plans.data?.map((plan, index) => (
              <PlanCard key={plan.code} plan={plan} cycle={cycle} featured={index === 1} />
            ))}
          </div>
        </section>
      </main>

      <footer className="pl-footer">
        <span>© {new Date().getFullYear()} OpenSchool Platform</span>
        <span>Ödemeler iyzico güvencesiyle · KVKK uyumlu</span>
      </footer>
    </div>
  );
}

function PlanCard({ plan, cycle, featured }: { plan: PlanView; cycle: "monthly" | "annual"; featured: boolean }) {
  const amount = cycle === "annual" ? plan.price_annual_kurus : plan.price_monthly_kurus;
  return (
    <article className={`pl-plan${featured ? " pl-plan--featured" : ""}`}>
      {featured && <span className="pl-plan__badge">EN ÇOK TERCİH EDİLEN</span>}
      <h3 className="pl-plan__name">{plan.name}</h3>
      <div className="pl-plan__price">
        {formatKurus(amount)}
        <small> / {cycle === "annual" ? "yıl" : "ay"}</small>
      </div>
      <p className="pl-plan__desc">{plan.description}</p>
      <ul>
        <li>{plan.max_students === 0 ? "Öğrenci limiti yok" : `${plan.max_students} öğrenciye kadar`}</li>
        <li>Tüm modüller dahil</li>
        <li>Veli + öğrenci mobil uygulaması</li>
        <li>{plan.trial_days} gün ücretsiz deneme</li>
      </ul>
      <Button as="a" href={`/kayit?plan=${plan.code}&cycle=${cycle}`} style={{ marginTop: "auto" }}>
        Bu paketle başla
      </Button>
    </article>
  );
}
