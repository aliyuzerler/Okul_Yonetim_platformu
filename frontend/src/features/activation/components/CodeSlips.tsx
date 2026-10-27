import { createPortal } from "react-dom";
import type { ActivationRole } from "@/features/activation/api/activation";
import type { ClassGroup } from "@/features/activation/lib/codeSheet";
import { formatDate } from "@/shared/lib/date";
import { ROLE_LABELS } from "@/features/activation/lib/roles";

interface Props {
  role: ActivationRole;
  groups: ClassGroup[];
  schoolName: string;
  expiresAt: string;
  withHandOutList: boolean;
}

// The logo and school name that head every hand-out list and slip.
function Brand({ schoolName, small = false }: { schoolName: string; small?: boolean }) {
  return (
    <div className={small ? "os-code-brand os-code-brand--small" : "os-code-brand"}>
      <img src="/favicon.webp" alt="OpenSchool" />
      <div>
        <strong>{schoolName}</strong>
        <span>OpenSchool hesap etkinleştirme</span>
      </div>
    </div>
  );
}

// Print-only sheet, rendered beside #root: per class, a hand-out list (no codes) and then cut-out slips.
export default function CodeSlips({ role, groups, schoolName, expiresAt, withHandOutList }: Props) {
  const isStudent = role === "student";
  const url = `${window.location.origin}/activate`;
  const expires = formatDate(expiresAt);

  return createPortal(
    <div className="os-slip-sheet">
      {groups.map((group) => {
        const classLine = group.formTeacher ? `${group.title} · Sınıf öğretmeni: ${group.formTeacher}` : group.title;
        return (
          <section key={group.key} className="os-code-class">
            {withHandOutList && (
              <div className="os-code-roster">
                <Brand schoolName={schoolName} />
                <h1>{ROLE_LABELS[role].one} etkinleştirme kodları</h1>
                <p><strong>Sınıf:</strong> {group.title}</p>
                {group.formTeacher && <p><strong>Sınıf öğretmeni:</strong> {group.formTeacher}</p>}
                <p>{group.codes.length} kupon · {expires} tarihine kadar geçerli</p>
                <p>Her kuponu yalnızca adı yazılı kişiye verin ve aşağıyı imzalamalarını isteyin. Bu listede kod bulunmaz, dosyada saklamak için uygundur.</p>
                <table>
                  <thead>
                    <tr>
                      <th>Sıra</th>
                      <th>Ad</th>
                      <th>{isStudent ? "Okul numarası" : "Çocuklar"}</th>
                      <th>Teslim aldı (imza)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.codes.map((c, i) => (
                      <tr key={c.code}>
                        <td>{i + 1}</td>
                        <td>{c.name}</td>
                        <td>{isStudent ? c.index_number : c.detail}</td>
                        <td />
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="os-slip-grid">
              {group.codes.map((c) => (
                <div key={c.code} className="os-slip">
                  <Brand schoolName={schoolName} small />
                  <strong>{c.name}</strong>
                  {!isStudent && <span className="os-slip__detail">Çocuk: {c.detail}</span>}
                  <span className="os-slip__detail">Sınıf: {classLine}</span>
                  <span className="os-slip__code">{c.code}</span>
                  <span>{url} adresine gidin, bu kodu ve {ROLE_LABELS[role].identifier} bilgisini girin, ardından bir şifre seçin.</span>
                  <span className="os-slip__detail">{expires} tarihine kadar geçerlidir. Bu kodu gizli tutun.</span>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>,
    document.body,
  );
}
