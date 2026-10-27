import api from "@/shared/api/client";

export const ATTENDANCE_REPORT_COLUMNS = [
  { value: "date", label: "Tarih" },
  { value: "student", label: "Öğrenci" },
  { value: "index_number", label: "Okul no." },
  { value: "status", label: "Durum" },
  { value: "note", label: "Açıklama" },
];

export const MARKS_REPORT_COLUMNS = [
  { value: "student", label: "Öğrenci" },
  { value: "index_number", label: "Okul no." },
  { value: "marks", label: "Notlar" },
  { value: "max_marks", label: "En yüksek not" },
  { value: "percentage", label: "%" },
];

async function downloadPdf(url: string, params: Record<string, unknown>, filename: string) {
  const response = await api.get<Blob>(url, { params, responseType: "blob" });
  const blobUrl = window.URL.createObjectURL(response.data);
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(blobUrl);
}

export const reportExportApi = {
  exportAttendance: (params: { class_id: string; from: string; to: string; columns?: string[] }) =>
    downloadPdf("/reports/attendance", params, "attendance-report.pdf"),

  exportMarks: (params: { class_id: string; term_id: string; subject_id: string; columns?: string[] }) =>
    downloadPdf("/reports/marks", params, "marks-report.pdf"),
};
