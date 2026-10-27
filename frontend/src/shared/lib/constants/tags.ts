// Carbon Tag colours for domain enums, shared by every portal that shows them.
export const SEVERITY_TAG = {
  minor: "gray",
  major: "warm-gray",
  severe: "red",
} as const;

export const NOTIFICATION_PRIORITY_TAG = {
  normal: "gray",
  important: "warm-gray",
  urgent: "red",
} as const;

export const TIMETABLE_STATUS_TAG = {
  draft: { type: "gray", label: "Taslak" },
  under_review: { type: "blue", label: "İncelemede" },
  approved: { type: "teal", label: "Onaylandı" },
  published: { type: "green", label: "Yayınlandı" },
  rejected: { type: "red", label: "Reddedildi" },
  archived: { type: "magenta", label: "Arşivlendi" },
} as const;
