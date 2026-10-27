import type { ActivationRole } from "@/features/activation/api/activation";

// The "parent" role is shown as Guardian, matching the rest of the app.
export const ROLE_LABELS: Record<ActivationRole, { one: string; many: string; identifier: string }> = {
  student: { one: "Öğrenci", many: "Öğrenciler", identifier: "okul numarası" },
  parent: { one: "Veli", many: "Veliler", identifier: "T.C. Kimlik No" },
};
