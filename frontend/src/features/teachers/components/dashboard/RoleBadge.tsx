import { Tag } from "@carbon/react";
import type { PositionRankLabel } from "@/features/positions/api/position";

// One colour per rank so the badge reads as a hierarchy; gray for no position.
const RANK_TAG_TYPE: Record<PositionRankLabel, "purple" | "blue" | "teal" | "cyan" | "green" | "gray"> = {
  Principal: "purple",
  "Vice Principal": "blue",
  "Section Head": "teal",
  "Class Teacher": "cyan",
  "Subject Teacher": "green",
  Teacher: "gray",
};

// rank_label values come from the API as English codes; display labels are translated here.
const RANK_LABELS: Record<PositionRankLabel, string> = {
  Principal: "Müdür",
  "Vice Principal": "Müdür Yardımcısı",
  "Section Head": "Şube rehber öğretmeni",
  "Class Teacher": "Sınıf öğretmeni",
  "Subject Teacher": "Branş öğretmeni",
  Teacher: "Öğretmen",
};

export default function RoleBadge({ rankLabel }: { rankLabel: PositionRankLabel }) {
  return (
    <Tag type={RANK_TAG_TYPE[rankLabel]} size="sm">
      {RANK_LABELS[rankLabel] ?? rankLabel}
    </Tag>
  );
}
