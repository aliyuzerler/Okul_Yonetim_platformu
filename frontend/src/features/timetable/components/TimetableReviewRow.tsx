// Shared by the full Timetable Review page and the Section Head's dashboard
// panel, one row of the review queue with inline Approve/Reject actions.

import { useState } from "react";
import { Link } from "react-router";
import { Button, Tag, TextArea, ComposedModal, ModalHeader, ModalBody, ModalFooter } from "@carbon/react";
import { formatDateTime } from "@/shared/lib/date";
import { useApproveTimetable, useRejectTimetable } from "@/features/timetable/queries/useTimetables";
import type { TimetableWithClass } from "@/features/timetable/api/timetable";
import MutationErrorNotification from "@/shared/ui/MutationErrorNotification";
import { classLabel } from "@/shared/lib/classLabel";

export default function TimetableReviewRow({ timetable }: { timetable: TimetableWithClass }) {
  const approve = useApproveTimetable(timetable.id);
  const reject = useRejectTimetable(timetable.id);
  const [rejecting, setRejecting] = useState(false);
  const [comment, setComment] = useState("");

  const handleReject = () => {
    if (!comment.trim()) return;
    reject.mutate(comment.trim(), { onSuccess: () => setRejecting(false) });
  };

  return (
    <div className="os-list-row os-gap-4 os-py-3h os-px-6">
      <div className="os-flex-1">
        <p className="os-m-0 os-fw-500 os-text-md">
          {classLabel(timetable.grade_name, timetable.class_name)}{" "}
          <Tag type="gray" size="sm">
            v{timetable.version}
          </Tag>
        </p>
        <p className="os-m-0 os-text-xs os-c-tertiary">
          {formatDateTime(timetable.submitted_at)} tarihinde gönderildi
        </p>
        <MutationErrorNotification
          isError={approve.isError || reject.isError}
          error={approve.error ?? reject.error}
          title="İşlem başarısız" className="os-max-w-28 os-mt-2"
        />
      </div>
      <Button kind="ghost" size="sm" as={Link} to={`/timetables/${timetable.id}`}>
        Görüntüle
      </Button>
      <Button kind="danger--tertiary" size="sm" onClick={() => setRejecting(true)} disabled={reject.isPending}>
        Reddet
      </Button>
      <Button kind="primary" size="sm" onClick={() => approve.mutate(undefined)} disabled={approve.isPending}>
        {approve.isPending ? "Onaylanıyor…" : "Onayla"}
      </Button>

      <ComposedModal open={rejecting} size="sm" onClose={() => setRejecting(false)} aria-label={`Reddet: ${classLabel(timetable.grade_name, timetable.class_name)}`}>
        <ModalHeader title={`Reddet: ${classLabel(timetable.grade_name, timetable.class_name)}`} />
        <ModalBody>
          <TextArea
            id={`reject-comment-${timetable.id}`}
            labelText="Gerekçe (zorunlu)"
            placeholder="örn. Fen öğretmeni Pazartesi 3. derste iki sınıfa aynı anda atanmış"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
          />
        </ModalBody>
        <ModalFooter>
          <Button kind="secondary" onClick={() => setRejecting(false)}>
            İptal
          </Button>
          <Button kind="danger" onClick={handleReject} disabled={!comment.trim() || reject.isPending}>
            {reject.isPending ? "Reddediliyor…" : "Reddet"}
          </Button>
        </ModalFooter>
      </ComposedModal>
    </div>
  );
}
