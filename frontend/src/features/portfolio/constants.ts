import type { PrefectRank } from "@/features/portfolio/api/prefect";

export const PREFECT_RANKS: { value: PrefectRank; label: string; singular: string }[] = [
  { value: "head", label: "Baş öğrenci temsilcileri", singular: "Baş öğrenci temsilcisi" },
  { value: "deputy_head", label: "Baş öğrenci temsilcisi yardımcıları", singular: "Baş öğrenci temsilcisi yardımcısı" },
  { value: "senior", label: "Kıdemli öğrenci temsilcileri", singular: "Kıdemli öğrenci temsilcisi" },
  { value: "junior", label: "Genç öğrenci temsilcileri", singular: "Genç öğrenci temsilcisi" },
  { value: "house_captain", label: "Kol kaptanları", singular: "Kol kaptanı" },
  { value: "vice_house_captain", label: "Kol kaptan yardımcıları", singular: "Kol kaptan yardımcısı" },
];
