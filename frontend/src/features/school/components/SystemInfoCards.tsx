import { Settings as SettingsIcon } from "@carbon/icons-react";

const ATTENDANCE_RULES = [
  "Öğretmenler öğrencileri Mevcut, Geç veya Devamsız olarak işaretleyebilir.",
  "Bir öğrenci devamsız işaretlendiğinde veliler otomatik olarak bilgilendirilir.",
  "Oturumlar alındıktan 24 saat sonra salt okunur hâle gelir. Sistem Yöneticisi bu süreden sonra da düzenleme yapabilir ve bu tür her düzenleme denetim kaydına işlenir.",
];

const ABOUT: [string, string][] = [
  ["Sürüm", "0.1.0 - geliştirme sürümü"],
  ["Lisans", "Apache 2.0"],
  ["Depo", "github.com/openschool-org"],
  ["Destek", "github.com/openschool-org/issues"],
];

// Static attendance rules and product information shown on the General settings tab.
export default function SystemInfoCards() {
  return (
    <>
      <div className="os-section">
        <div className="os-section__header">
          <h2 className="os-section__title">Yoklama</h2>
        </div>
        <div className="os-section__body os-flex os-col os-gap-3">
          {ATTENDANCE_RULES.map((text) => <p key={text} className="os-m-0 os-text-sm os-c-secondary">{text}</p>)}
        </div>
      </div>

      <div className="os-section">
        <div className="os-section__header">
          <h2 className="os-section__title">OpenSchool Hakkında</h2>
        </div>
        <div className="os-section__body">
          <div className="os-flex os-items-center os-gap-3h os-mb-4">
            <SettingsIcon size={32} className="os-fill-accent-dark" />
            <div>
              <p className="os-mt-0 os-mx-0 os-mb-h os-fw-700 os-text-base os-c-primary">OpenSchool</p>
              <p className="os-m-0 os-text-xs os-c-secondary">Sri Lanka için açık kaynak okul yönetim platformu</p>
            </div>
          </div>
          <div className="os-grid os-grid-cols-2">
            {ABOUT.map(([label, value]) => (
              <div key={label} className="os-py-2 os-border-layer-hover-b os-text-sm">
                <span className="os-c-tertiary os-mr-2">{label}:</span>
                <span className="os-c-primary">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
