import type { GuardianRelationship } from "@/features/guardians/api/guardian";

export const GUARDIAN_RELATIONSHIPS: { value: GuardianRelationship; label: string }[] = [
  { value: "father", label: "Baba" },
  { value: "mother", label: "Anne" },
  { value: "guardian", label: "Vasi" },
  { value: "other", label: "Diğer" },
];

export function relationshipLabel(value: string) {
  return GUARDIAN_RELATIONSHIPS.find((r) => r.value === value)?.label ?? value;
}
