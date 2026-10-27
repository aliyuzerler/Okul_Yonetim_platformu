import type { ReactNode } from "react";
import { TableToolbarSearch } from "@carbon/react";

export interface FilterControl {
  label: string;
  node: ReactNode;
}

interface Props {
  search: { value: string; onChange: (value: string) => void; placeholder?: string };
  controls?: FilterControl[];
}

// Search box plus any filter controls; each control declares its own accessible
// label so a filter bar can't ship a control screen readers can't name.
export default function FilterBar({ search, controls }: Props) {
  return (
    <div className="os-filter-bar">
      <div className="os-filter-bar__search">
        <TableToolbarSearch
          persistent
          placeholder={search.placeholder ?? "Ara…"}
          value={search.value}
          onChange={(e) => search.onChange(typeof e === "string" ? e : e.target.value)}
        />
      </div>
      {controls?.map((c) => (
        <div key={c.label} className="os-filter-bar__control" role="group" aria-label={c.label}>
          {c.node}
        </div>
      ))}
    </div>
  );
}
