import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import WorkflowAgents from "@/features/workflows/components/WorkflowAgents";
import type { CatalogEntry } from "@/features/workflows/api/workflows";

const catalog: CatalogEntry[] = [
  {
    key: "teacher_allocation", group: "year_end", order: 6, title: "Öğretmen görevlendirmesi", description: "Her sınıf ve derse nitelikli bir öğretmen atar.",
    steps: [{ key: "allocate", title: "Öğretmenleri görevlendir", tool: "allocate_teachers", phase: "propose" }],
    tools: [{ name: "allocate_teachers", description: "Belirlenimci görevlendirme.", mutates: false }],
    inputs: [],
    last_run: { id: "r1", state: "applied", summary: "12 branş öğretmeni kaydedildi", created_at: "2026-09-26T08:00:00Z", applied_at: "2026-09-26T08:05:00Z" },
  },
  {
    key: "student_import", group: "setup", order: 0, title: "Öğrenci aktarımı", description: "Birçok öğrenciyi tek seferde ekler.",
    steps: [], tools: [], inputs: [],
  },
];

vi.mock("@/features/workflows/queries/useWorkflows", () => ({
  useWorkflowCatalog: () => ({ data: catalog, isLoading: false, isError: false, refetch: () => {} }),
}));

afterEach(cleanup);

describe("WorkflowAgents", () => {
  it("lists each workflow from the catalogue with its steps, last run and a link", () => {
    render(<MemoryRouter><WorkflowAgents /></MemoryRouter>);
    expect(screen.getByText("6. Öğretmen görevlendirmesi")).toBeTruthy();
    expect(screen.getByText("Uygulandı")).toBeTruthy();
    expect(screen.getByText("Belirlenimci görevlendirme.", { exact: false })).toBeTruthy();
    expect(screen.getByText(/12 branş öğretmeni kaydedildi/)).toBeTruthy();
    const links = screen.getAllByRole("link", { name: /Aç/ }).map((a) => a.getAttribute("href"));
    expect(links).toEqual(["/year-end/teacher_allocation", "/students/import"]);
  });

  it("keeps setup tools out of the numbered year-end list", () => {
    render(<MemoryRouter><WorkflowAgents /></MemoryRouter>);
    expect(screen.getByText("Kurulum araçları")).toBeTruthy();
    expect(screen.getByText("Öğrenci aktarımı")).toBeTruthy();
    expect(screen.queryByText(/0\. Öğrenci aktarımı/)).toBeNull();
  });
});
