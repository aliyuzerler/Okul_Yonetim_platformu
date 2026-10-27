import { useState } from "react";
import { Add } from "@carbon/icons-react";
import { Button, SkeletonText, Tag, TextInput } from "@carbon/react";
import { useStreamGroups, useCreateStreamGroup } from "@/features/academics/queries/useClasses";
import type { Stream } from "@/features/academics/api/stream";
import FormModal from "@/shared/ui/FormModal";

// Sub-groups under one A/L stream. Creation stays in a focused modal so cards remain scannable.
export default function StreamGroups({ stream }: { stream: Stream }) {
  const { data: groups, isLoading } = useStreamGroups(stream.id);
  const createGroup = useCreateStreamGroup();
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");

  const add = () => {
    if (!name.trim()) return;
    createGroup.mutate(
      { streamId: stream.id, data: { name: name.trim() } },
      { onSuccess: () => { setName(""); setCreateOpen(false); } },
    );
  };

  return (
    <div className="os-pl-6">
      <div className="os-flex os-wrap os-gap-2 os-mb-2">
        {isLoading ? (
          <SkeletonText width="30%" />
        ) : groups?.length ? (
          groups.map((g) => <Tag key={g.id} type="teal" size="sm">{g.name}</Tag>)
        ) : (
          <span className="os-text-xs os-c-tertiary">Alt grup yok</span>
        )}
      </div>
      <Button kind="ghost" size="sm" renderIcon={Add} onClick={() => setCreateOpen(true)}>
        Alt grup ekle
      </Button>

      <FormModal
        open={createOpen}
        title={`${stream.name} alanı için alt grup ekle`}
        onClose={() => { setCreateOpen(false); setName(""); createGroup.reset(); }}
        onSubmit={add}
        isPending={createGroup.isPending}
        submitDisabled={!name.trim()}
        submitLabel="Alt grup ekle"
        pendingLabel="Ekleniyor…"
        isError={createGroup.isError}
        error={createGroup.error}
        errorFallback="Alt grup eklenemedi. Lütfen yeniden deneyin."
      >
        <TextInput
          id={`new-group-${stream.id}`}
          labelText="Alt grup adı"
          placeholder="örn. Physical Science"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </FormModal>
    </div>
  );
}
