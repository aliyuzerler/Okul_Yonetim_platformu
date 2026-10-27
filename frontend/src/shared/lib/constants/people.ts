export type EmploymentStatus = "active" | "resigned" | "transferred";

export const EMPLOYMENT_STATUSES: { value: EmploymentStatus; label: string }[] = [
  { value: "active", label: "Aktif" },
  { value: "resigned", label: "İstifa etti" },
  { value: "transferred", label: "Başka okula atandı" },
];

// Matches the backend PositionRank ordinal: Principal 1, Vice Principal 2, Section Head 3.
export const POSITION_RANK = { principal: 1, vicePrincipal: 2, sectionHead: 3 } as const;
