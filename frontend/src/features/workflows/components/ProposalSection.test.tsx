import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import ProposalSection from "@/features/workflows/components/ProposalSection";
import type { Section } from "@/features/workflows/api/workflows";

const subjects = [{ value: "music", label: "Müzik" }, { value: "art", label: "Resim" }];

afterEach(cleanup);

describe("ProposalSection", () => {
  it("renders one editable select per choice slot and sends the change", () => {
    const section: Section = {
      key: "choices", title: "Ders seçimleri",
      columns: [{ key: "name", label: "Ad", type: "text", editable: false }, { key: "g:1:1", label: "Sepet 1", type: "select", editable: true, options: subjects }],
      rows: [{ id: "s1", cells: { name: "Ayşe Yılmaz", "g:1:1": "" }, reason: "Henüz ders seçimi girilmedi." }],
    };
    const onEdit = vi.fn();
    render(<ProposalSection section={section} editable onEdit={onEdit} busyRowId={null} />);
    fireEvent.change(screen.getByLabelText("Sepet 1: Ayşe Yılmaz"), { target: { value: "art" } });
    expect(onEdit).toHaveBeenCalledWith("s1", { "g:1:1": "art" });
    expect(screen.getByText("Henüz ders seçimi girilmedi.")).toBeTruthy();
  });

  it("says so when a section has no rows", () => {
    render(<ProposalSection section={{ key: "form_teachers", title: "Sınıf öğretmenleri", columns: [], rows: [] }} editable onEdit={() => {}} busyRowId={null} />);
    expect(screen.getByText("Bu çalıştırma için burada gösterilecek bir şey yok.")).toBeTruthy();
    expect(screen.queryByRole("table")).toBeNull();
  });
});
