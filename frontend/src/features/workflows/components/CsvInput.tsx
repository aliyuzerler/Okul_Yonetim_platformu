import { Button, FileUploaderButton, TextArea } from "@carbon/react";
import { Download } from "@carbon/icons-react";

interface Props {
  id: string;
  label: string;
  help?: string;
  template?: string;
  value: string;
  onChange: (value: string) => void;
}

function downloadTemplate(template: string, name: string) {
  const url = URL.createObjectURL(new Blob([template], { type: "text/csv" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `${name}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

// A CSV input: pick a file or paste the text. The backend sends the template, so the columns live in one place.
export default function CsvInput({ id, label, help, template, value, onChange }: Props) {
  const rows = value.trim() ? value.trim().split(/\r?\n/).length - 1 : 0;
  return (
    <div className="os-workflow-inputs__wide">
      <TextArea id={id} labelText={label} helperText={help} rows={6} value={value} onChange={(e) => onChange(e.target.value)} placeholder="CSV metnini buraya yapıştırın veya bir dosya seçin" />
      <div className="os-flex os-gap-3 os-items-center os-mt-2">
        <FileUploaderButton
          labelText="CSV dosyası seç"
          buttonKind="tertiary"
          size="sm"
          accept={[".csv", "text/csv"]}
          disableLabelChanges
          onChange={(e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) void file.text().then(onChange);
          }}
        />
        {template && (
          <Button kind="ghost" size="sm" renderIcon={Download} onClick={() => downloadTemplate(template, id.replace(/^wf-/, ""))}>
            Şablonu indir
          </Button>
        )}
        {rows > 0 && <span className="os-text-sm os-c-secondary">Başlık satırından sonra {rows} satır</span>}
      </div>
    </div>
  );
}
