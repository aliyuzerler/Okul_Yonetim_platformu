import { useState } from "react";
import { Tab, TabList, Tabs, Tag, Toggle } from "@carbon/react";
import type { StaffKind } from "@/features/attendance/api/staffAttendance";
import StaffRosterTable from "@/features/attendance/components/staff/StaffRosterTable";
import StaffMonthlyTable from "@/features/attendance/components/staff/StaffMonthlyTable";
import { todayISODate, formatDate } from "@/shared/lib/date";
import { useDebounced } from "@/shared/hooks/useDebounced";
import FilterBar from "@/shared/ui/FilterBar";
import DateField from "@/shared/ui/DateField";

const KINDS: { value: StaffKind; label: string }[] = [
  { value: "teacher", label: "Öğretmenler" },
  { value: "staff", label: "İdari personel" },
];

// Server-paginated so a school with 100+ teachers pages through them instead of one long scroll.
export default function StaffAttendance() {
  const [date, setDate] = useState(todayISODate());
  const [showMonthly, setShowMonthly] = useState(false);
  const [kindIndex, setKindIndex] = useState(0);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounced(search, 250);
  const kind = KINDS[kindIndex].value;

  const [year, month] = date.split("-").map(Number);
  const activeView = showMonthly ? "Aylık özet" : "Günlük yoklama";

  const changeView = (monthly: boolean) => {
    setShowMonthly(monthly);
    if (monthly) setDate(`${date.slice(0, 7)}-01`);
  };

  return (
    <div className="os-page">
      <div className="os-page__header">
        <div className="os-page__header-left">
          <h1 className="os-page__title">Personel yoklaması</h1>
          <p className="os-page__subtitle">Günlük personel yoklaması alın veya aylık özetleri görüntüleyin.</p>
        </div>
      </div>

      <div className="os-flex os-items-center os-gap-6 os-mb-6 os-wrap">
        <DateField value={date} onChange={(ymd) => ymd && setDate(ymd)} id="staff-attendance-date" labelText={showMonthly ? "Ay" : "Tarih"} />
        <Toggle
          id="staff-attendance-view-toggle"
          labelText="Yoklama görünümü"
          labelA="Günlük yoklama"
          labelB="Aylık özet"
          toggled={showMonthly}
          onToggle={changeView}
        />
        <Tag type="blue">{activeView}{!showMonthly && ` · ${formatDate(date)}`}</Tag>
      </div>

      <Tabs selectedIndex={kindIndex} onChange={({ selectedIndex }) => setKindIndex(selectedIndex)}>
        <TabList aria-label="Personel türü">
          {KINDS.map((k) => (
            <Tab key={k.value}>{k.label}</Tab>
          ))}
        </TabList>
      </Tabs>

      <div className="os-mt-4">
        <FilterBar search={{ value: search, onChange: setSearch, placeholder: "İsim veya sicil numarasıyla arayın" }} />
      </div>

      {showMonthly ? (
        <StaffMonthlyTable key={`${kind}-${debouncedSearch}`} year={year} month={month} kind={kind} search={debouncedSearch} />
      ) : (
        <StaffRosterTable key={`${kind}-${debouncedSearch}`} date={date} kind={kind} search={debouncedSearch} />
      )}
    </div>
  );
}
