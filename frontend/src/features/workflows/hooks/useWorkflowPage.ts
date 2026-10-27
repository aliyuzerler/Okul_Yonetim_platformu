import { useState } from "react";
import type { Check, Inputs } from "@/features/workflows/api/workflows";
import {
  useApplyRun,
  useCheckWorkflow,
  useDiscardRun,
  useEditRun,
  useProposeWorkflow,
  useRevertRun,
  useWorkflowCatalog,
  useWorkflowHistory,
  useWorkflowRun,
} from "@/features/workflows/queries/useWorkflows";
import { getConflictData, getErrorMessage } from "@/shared/api/errors";
import { useToast } from "@/shared/ui/toast/useToast";

// A 409 from propose or apply carries the failed checks; show them instead of a bare error.
function checksFrom(error: unknown): Check[] | null {
  const data = getConflictData(error);
  return Array.isArray(data?.checks) ? (data.checks as Check[]) : null;
}

export function useWorkflowPage(key: string) {
  const { showToast } = useToast();
  const catalog = useWorkflowCatalog();
  const entry = catalog.data?.find((w) => w.key === key);
  const history = useWorkflowHistory(key);
  const [values, setValues] = useState<Inputs>({});
  const [checks, setChecks] = useState<Check[]>([]);
  const [selectedRun, setSelectedRun] = useState<string | undefined>();
  const openRunId = entry?.last_run?.state === "proposed" ? entry.last_run.id : undefined;
  const runId = selectedRun ?? openRunId;
  const run = useWorkflowRun(runId);

  const check = useCheckWorkflow(key);
  const propose = useProposeWorkflow(key);
  const edit = useEditRun();
  const apply = useApplyRun();
  const discard = useDiscardRun();
  const revert = useRevertRun();

  const inputs = (): Inputs => {
    const out: Inputs = {};
    for (const f of entry?.inputs ?? []) out[f.key] = values[f.key] ?? f.default ?? "";
    return out;
  };

  const fail = (title: string, error: unknown) => {
    const failed = checksFrom(error);
    if (failed) {
      setChecks(failed);
      showToast({ kind: "warning", title: "Bazı önkoşullar karşılanmadı", subtitle: "Aşağıda işaretlenen maddeleri düzeltin, sonra yeniden deneyin." });
    } else {
      showToast({ kind: "error", title, subtitle: getErrorMessage(error, "Lütfen yeniden deneyin.") });
    }
  };

  return {
    entry,
    catalog,
    history,
    run,
    values,
    checks,
    setValue: (k: string, v: string) => setValues((prev) => ({ ...prev, [k]: v })),
    openRun: setSelectedRun,
    busy: { check: check.isPending, propose: propose.isPending, apply: apply.isPending, discard: discard.isPending, revert: revert.isPending },
    editingRow: edit.isPending ? (edit.variables?.rowId ?? null) : null,
    runCheck: () => check.mutate(inputs(), { onSuccess: setChecks, onError: (e) => fail("Önkoşul denetimi yapılamadı", e) }),
    runPropose: () =>
      propose.mutate(inputs(), {
        onSuccess: ({ run: created, checks: passed }) => {
          setChecks(passed);
          setSelectedRun(created.id);
          showToast({ kind: "success", title: "Öneri hazır", subtitle: "Aşağıdan inceleyin, sonra uygulayın." });
        },
        onError: (e) => fail("Öneri oluşturulamadı", e),
      }),
    editCell: (section: string, rowId: string, cells: Record<string, string>) =>
      runId && edit.mutate({ id: runId, section, rowId, cells }, { onError: (e) => fail("Bu satır değiştirilemedi", e) }),
    runApply: (onDone: () => void) =>
      runId &&
      apply.mutate(runId, {
        onSuccess: (applied) => {
          showToast({ kind: "success", title: "Uygulandı", subtitle: applied.summary });
          onDone();
        },
        onError: (e) => {
          fail("Uygulanamadı", e);
          onDone();
        },
      }),
    runDiscard: () => runId && discard.mutate(runId, { onSuccess: () => setSelectedRun(undefined), onError: (e) => fail("Vazgeçilemedi", e) }),
    runRevert: (onDone: () => void) =>
      runId &&
      revert.mutate(runId, {
        onSuccess: () => {
          showToast({ kind: "success", title: "Geri alındı", subtitle: "Bu çalıştırmanın değişiklikleri geri alındı." });
          onDone();
        },
        onError: (e) => {
          fail("Geri alınamadı", e);
          onDone();
        },
      }),
  };
}
