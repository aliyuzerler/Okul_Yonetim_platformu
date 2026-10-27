import type { RunState } from "@/features/workflows/api/workflows";

export const RUN_STATE_TAG: Record<RunState, { type: "blue" | "green" | "red" | "gray" | "warm-gray"; label: string }> = {
  proposed: { type: "blue", label: "İnceleme bekliyor" },
  applied: { type: "green", label: "Uygulandı" },
  failed: { type: "red", label: "Başarısız" },
  reverted: { type: "warm-gray", label: "Geri alındı" },
  discarded: { type: "gray", label: "Vazgeçildi" },
};
