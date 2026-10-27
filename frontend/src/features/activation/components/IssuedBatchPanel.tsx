import { useMemo, useState } from "react";
import { Button, Checkbox, InlineNotification } from "@carbon/react";
import { Download, Printer } from "@carbon/icons-react";
import type { GeneratedBatch } from "@/features/activation/api/activation";
import { downloadBatchCsv, groupByClass } from "@/features/activation/lib/codeSheet";
import { usePrintSheet } from "@/features/activation/hooks/usePrintSheet";
import CodeSlips from "@/features/activation/components/CodeSlips";
import { useSchool } from "@/features/school/queries/useSchool";
import { formatDate } from "@/shared/lib/date";

// A fresh batch, split by class, ready to print or save as PDF one class at a time.
// reopened is true when shown again from Issued batches, where only unused codes appear.
export default function IssuedBatchPanel({ batch, onDone, reopened = false }: { batch: GeneratedBatch; onDone: () => void; reopened?: boolean }) {
  const { data: school } = useSchool();
  const groups = useMemo(() => groupByClass(batch), [batch]);
  const [withHandOutList, setWithHandOutList] = useState(true);
  const { selected, print } = usePrintSheet();

  if (batch.codes.length === 0) {
    return <InlineNotification kind="info" lowContrast hideCloseButton title="Düzenlenecek kimse yok" subtitle="Bu seçimdeki herkesin zaten giriş bilgisi var." className="os-max-w-full" />;
  }

  return (
    <>
      <InlineNotification
        kind="warning"
        lowContrast
        hideCloseButton
        title={`${batch.codes.length} kod · ${groups.length} sınıfta · ${formatDate(batch.expires_at)} tarihine kadar geçerli`}
        subtitle={reopened
          ? "Bu gruptaki kullanılmayan kodlar. Bir sınıfı yazdırın veya PDF olarak kaydedin (yazdırma penceresinde PDF olarak kaydet'i seçin); Ctrl+P kod sayfalarını da yazdırır. Kodların açılması denetim kaydına işlenir."
          : "Bir sınıfı yazdırın veya PDF olarak kaydedin (yazdırma penceresinde PDF olarak kaydet'i seçin); Ctrl+P kod sayfalarını da yazdırır. Kullanılmayan kodları daha sonra Düzenlenen kod gruplarından yeniden açabilirsiniz."}
        className="os-max-w-full"
      />
      <div className="os-flex os-gap-2 os-items-center os-wrap os-my-4">
        <Button kind="primary" size="sm" renderIcon={Printer} onClick={() => print(null)}>Tüm sınıfları yazdır</Button>
        <Button kind="secondary" size="sm" renderIcon={Download} onClick={() => downloadBatchCsv(batch)}>CSV indir</Button>
        <Checkbox id="codes-hand-out" labelText="Sınıf dağıtım listesini ekle" checked={withHandOutList} onChange={(_e, { checked }) => setWithHandOutList(checked)} />
        <Button kind="ghost" size="sm" onClick={onDone}>Bitti</Button>
      </div>
      <table className="os-table">
        <thead>
          <tr>
            <th>Sınıf</th>
            <th>Sınıf öğretmeni</th>
            <th>Kodlar</th>
            <th aria-label="İşlemler" />
          </tr>
        </thead>
        <tbody>
          {groups.map((g) => (
            <tr key={g.key}>
              <td>{g.title}</td>
              <td>{g.formTeacher || "-"}</td>
              <td>{g.codes.length}</td>
              <td><Button kind="ghost" size="sm" renderIcon={Printer} onClick={() => print([g.key])}>Yazdır / PDF</Button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <CodeSlips
        role={batch.role}
        groups={selected ? groups.filter((g) => selected.includes(g.key)) : groups}
        schoolName={school?.name ?? "OpenSchool"}
        expiresAt={batch.expires_at}
        withHandOutList={withHandOutList}
      />
    </>
  );
}
