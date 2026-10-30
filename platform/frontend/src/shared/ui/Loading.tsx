export default function Loading({ label = "Yükleniyor…" }: { label?: string }) {
  return (
    <div className="pl-loading">
      <span className="pl-spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
