import { useState } from "react";
import { useStaffMonthly } from "@/features/attendance/queries/useStaffAttendance";
import type { StaffKind } from "@/features/attendance/api/staffAttendance";
import { usePersistedPageSize } from "@/shared/hooks/usePersistedPageSize";
import DataGrid from "@/shared/ui/DataGrid";
import ListState from "@/shared/ui/ListState";
import TableSkeleton from "@/shared/ui/TableSkeleton";
import Avatar from "@/shared/ui/Avatar";

interface Props {
  year: number;
  month: number;
  kind: StaffKind;
  search: string;
}

const HEADERS = ["Ad Soyad", "Mevcut", "Geç", "Devamsız", "İzin"];

export default function StaffMonthlyTable({ year, month, kind, search }: Props) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = usePersistedPageSize("staff-attendance-monthly");
  const { data, isLoading, isError, refetch } = useStaffMonthly(year, month, { kind, search, limit: pageSize, offset: (page - 1) * pageSize });

  return (
    <div className="os-section">
      <ListState
        isLoading={isLoading}
        isError={isError}
        onRetry={refetch}
        errorMessage="Aylık özet yüklenemedi."
        isEmpty={!data?.items.length}
        empty={{ title: search ? "Aramanızla eşleşen kimse yok" : "Aktif personel yok", description: search ? "Başka bir isim veya sicil numarası deneyin." : "Bu ay için özetlenecek veri yok." }}
        skeleton={<TableSkeleton headers={HEADERS} />}
      >
        <DataGrid
          rows={data?.items ?? []}
          getRowId={(r) => r.staff_id}
          noHover
          pageSizes={[25, 50, 100]}
          server={{
            page,
            pageSize,
            totalItems: data?.total ?? 0,
            onChange: ({ page: p, pageSize: ps }) => {
              setPage(ps === pageSize ? p : 1);
              setPageSize(ps);
            },
          }}
          columns={[
            { key: "name", header: "Ad Soyad", render: (r) => <span className="os-flex os-items-center os-gap-2"><Avatar name={r.full_name} size="sm" /><span className="os-fw-500">{r.full_name}</span></span> },
            { key: "present", header: "Mevcut", align: "end", render: (r) => r.present_count },
            { key: "late", header: "Geç", align: "end", render: (r) => r.late_count },
            { key: "absent", header: "Devamsız", align: "end", render: (r) => r.absent_count },
            { key: "leave", header: "İzin", align: "end", render: (r) => r.leave_count },
          ]}
        />
      </ListState>
    </div>
  );
}
