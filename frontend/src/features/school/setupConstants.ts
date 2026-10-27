export type ALStreamKey = "science_physical" | "science_bio" | "commerce" | "arts" | "technology";

export interface ALStreamDef {
  key: ALStreamKey;
  label: string;
  streamName: string;
  groupName: string | null;
  defaultCode: string;
}

export type AlStreamsState = Record<ALStreamKey, { enabled: boolean; code: string; sections: number }>;
export type AlStreamsByGradeState = Record<number, AlStreamsState>;

export interface SchoolFormState {
  name: string;
  address: string;
  phone: string;
  email: string;
  logo_url: string;
  school_type: "boys" | "girls" | "mixed";
  grade_from: number | "";
  grade_to: number | "";
}

export const AL_STREAM_DEFS: ALStreamDef[] = [
  { key: "science_physical", label: "Fen Bilimleri (Fizik)", streamName: "Science", groupName: "Physical Science", defaultCode: "M" },
  { key: "science_bio", label: "Fen Bilimleri (Biyoloji)", streamName: "Science", groupName: "Bio Science", defaultCode: "B" },
  { key: "commerce", label: "Ticaret", streamName: "Commerce", groupName: null, defaultCode: "C" },
  { key: "arts", label: "Sanatlar", streamName: "Arts", groupName: null, defaultCode: "A" },
  { key: "technology", label: "Teknoloji", streamName: "Technology", groupName: null, defaultCode: "T" },
];

export const AL_GRADE_NUMBERS = new Set([12, 13]);

export const createDefaultAlStreams = (): AlStreamsState =>
  Object.fromEntries(AL_STREAM_DEFS.map((d) => [d.key, { enabled: true, code: d.defaultCode, sections: 1 }])) as AlStreamsState;

export const GRADE_MIN = 1;
export const GRADE_MAX = 13;
// Mediums come before Classes so generated sections can be tagged with a medium; Rooms is independent and goes last.
export const STEPS = ["School", "Houses", "Grades", "Mediums", "Classes", "Rooms", "Done"] as const;
// STEPS values are code identifiers (used with indexOf); display labels live here.
export const STEP_LABELS: Record<(typeof STEPS)[number], string> = {
  School: "Okul",
  Houses: "Kollar",
  Grades: "Sınıf seviyeleri",
  Mediums: "Öğretim dilleri",
  Classes: "Sınıflar",
  Rooms: "Derslikler",
  Done: "Tamamlandı",
};
export const HOUSE_COLOR_PALETTE = ["#0f62fe", "#da1e28", "#24a148", "#f1c21b", "#8a3ffc", "#ff832b"];
export const SUGGESTED_MEDIUMS = ["Sinhala", "Tamil", "English"];
export const DEFAULT_CLASS_CAPACITY = 45;

// Special rooms created as "eca" during setup; an admin can retag them as subject Labs later.
export type FacilityGroupKey =
  | "library"
  | "scienceLab"
  | "itLab"
  | "technicalLab"
  | "homeEconomicsLab"
  | "languageLab"
  | "artRoom"
  | "musicRoom"
  | "danceRoom"
  | "dramaRoom"
  | "auditorium"
  | "medicalRoom"
  | "counselingRoom"
  | "staffRoom";

export interface FacilityRoom {
  id: string;
  group: FacilityGroupKey;
  name: string;
  capacity: number | "";
}

// Each group can contain any number of separately named facilities.
export const FACILITY_GROUPS: ReadonlyArray<{ key: FacilityGroupKey; label: string; addLabel: string; placeholder: string; help: string }> = [
  { key: "library", label: "Kütüphaneler", addLabel: "Kütüphane ekle", placeholder: "örn. Ana Kütüphane", help: "Kendi adlarıyla birden fazla kütüphane ekleyin." },
  { key: "scienceLab", label: "Fen laboratuvarları", addLabel: "Fen laboratuvarı ekle", placeholder: "örn. Kimya Laboratuvarı", help: "Fizik, Kimya veya Biyoloji laboratuvarları ekleyin." },
  { key: "itLab", label: "BT laboratuvarları", addLabel: "BT laboratuvarı ekle", placeholder: "örn. Bilgisayar Laboratuvarı 1", help: "Birden fazla bilgisayar veya teknoloji laboratuvarı ekleyin." },
  { key: "technicalLab", label: "Teknik laboratuvarlar", addLabel: "Teknik laboratuvar ekle", placeholder: "örn. Teknik Uygulamalar Laboratuvarı", help: "Pratik teknoloji, mühendislik veya meslek çalışmaları içindir." },
  { key: "homeEconomicsLab", label: "Ev ekonomisi laboratuvarları", addLabel: "Ev ekonomisi laboratuvarı ekle", placeholder: "örn. Ev Ekonomisi Odası", help: "Yemek, dikiş ve ev yönetimi uygulamaları içindir." },
  { key: "languageLab", label: "Dil laboratuvarları", addLabel: "Dil laboratuvarı ekle", placeholder: "örn. İngilizce Dil Laboratuvarı", help: "Sinhala, Tamil, İngilizce ve diğer dillerin pratiği içindir." },
  { key: "artRoom", label: "Resim odaları", addLabel: "Resim odası ekle", placeholder: "örn. Görsel Sanatlar Odası", help: "Sanat, el işi ve estetik çalışmalar içindir." },
  { key: "musicRoom", label: "Müzik odaları", addLabel: "Müzik odası ekle", placeholder: "örn. İlkokul Müzik Odası", help: "Farklı müzik programları için ayrı odalar ekleyin." },
  { key: "danceRoom", label: "Dans odaları", addLabel: "Dans odası ekle", placeholder: "örn. Kandyan Dansı Odası", help: "Dans, hareket ve geleneksel dans pratiği içindir." },
  { key: "dramaRoom", label: "Tiyatro odaları", addLabel: "Tiyatro odası ekle", placeholder: "örn. Tiyatro Prova Odası", help: "Drama, tiyatro ve sahne provaları içindir." },
  { key: "auditorium", label: "Konferans salonları", addLabel: "Konferans salonu ekle", placeholder: "örn. Ana Salon", help: "Toplantılar, törenler, etkinlikler ve sınavlar içindir." },
  { key: "medicalRoom", label: "Revir ve sağlık odaları", addLabel: "Sağlık odası ekle", placeholder: "örn. Okul Reviri", help: "İlk yardım ve öğrenci sağlığı desteği içindir." },
  { key: "counselingRoom", label: "Rehberlik odaları", addLabel: "Rehberlik odası ekle", placeholder: "örn. Öğrenci Rehberlik Odası", help: "Öğrenci rehberlik ve sosyal hizmet çalışmaları içindir." },
  { key: "staffRoom", label: "Öğretmenler odaları", addLabel: "Öğretmenler odası ekle", placeholder: "örn. Öğretmenler Odası", help: "Bölümler farklı alanlar kullanıyorsa ayrı öğretmenler odaları ekleyin." },
];
