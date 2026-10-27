import { useRef, useState } from "react";
import { Button, TextInput, TextArea, Dropdown, Tag, InlineNotification, ComposedModal, ModalBody, ModalHeader } from "@carbon/react";
import { Send, Save } from "@carbon/icons-react";
import {
  useDraftNotifications,
  useCreateNotification,
} from "@/features/notifications/queries/useNotifications";
import { CATEGORIES, PRIORITIES } from "@/features/notifications/api/notification";
import type {
  RecipientRule,
  NotificationCategory,
  NotificationPriority,
} from "@/features/notifications/api/notification";
import { getErrorMessage } from "@/shared/api/errors";
import { useRole } from "@/shared/auth/useRole";
import { useMyPosition } from "@/features/positions/queries/usePositions";
import { ruleKey } from "@/features/notifications/constants";
import RecipientPicker from "@/features/notifications/components/RecipientPicker";
import NotificationHistory from "@/features/notifications/components/NotificationHistory";
import DraftRow from "@/features/notifications/components/DraftRow";

export default function NotificationComposer() {
  const [composeOpen, setComposeOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState<NotificationCategory>("general");
  const [priority, setPriority] = useState<NotificationPriority>("normal");
  const [rules, setRules] = useState<RecipientRule[]>([]);
  const composeSession = useRef(0);

  const { role } = useRole();
  const { data: myPosition } = useMyPosition(role === "teacher");
  // Everyone-broadcast mirrors the backend's authorizeSender: admin always,
  // a teacher only when Principal or a whole-school-granted Vice Principal.
  const canBroadcastEveryone = role === "admin" || !!myPosition?.notify_whole_school;

  const create = useCreateNotification();
  const { data: drafts } = useDraftNotifications();

  const isReady = title.trim().length > 0 && message.trim().length > 0 && rules.length > 0;

  const resetForm = () => {
    setTitle("");
    setMessage("");
    setCategory("general");
    setPriority("normal");
    setRules([]);
  };

  const handleSubmit = (saveAsDraft: boolean) => {
    const submittedSession = composeSession.current;
    create.mutate(
      {
        title: title.trim(),
        message: message.trim(),
        category,
        priority,
        save_as_draft: saveAsDraft,
        recipient_rules: rules,
      },
      { onSuccess: () => {
        if (composeSession.current !== submittedSession) return;
        resetForm();
        setComposeOpen(false);
      } },
    );
  };

  const openComposer = () => {
    composeSession.current += 1;
    create.reset();
    setComposeOpen(true);
  };
  const closeComposer = () => {
    if (create.isPending) return;
    composeSession.current += 1;
    setComposeOpen(false);
  };

  const removeRule = (index: number) => setRules((r) => r.filter((_, i) => i !== index));

  return (
    <div className="os-page">
      <div className="os-page__header">
        <div className="os-page__header-left">
          <h1 className="os-page__title">Bildirimler</h1>
          <p className="os-page__subtitle">
            Duyuruları sınıf seviyelerine, sınıflara, derslere veya kişilere gönderin.
            {role === "teacher" && myPosition && myPosition.rank_label !== "Teacher" && (
              <> <strong>{myPosition.rank_label}</strong> olarak gönderiyorsunuz{canBroadcastEveryone ? ", tüm okul." : "."}</>
            )}
          </p>
        </div>
        <Button renderIcon={Send} kind="primary" onClick={openComposer}>
          Bildirim gönder
        </Button>
      </div>

      {create.isSuccess && (
        <InlineNotification
          kind="success"
          title="Tamamlandı"
          subtitle="Bildirim kaydedildi."
          lowContrast
          onClose={() => create.reset()} className="os-mb-6 os-max-w-full"
        />
      )}

      <ComposedModal open={composeOpen} size="lg" onClose={closeComposer} aria-label="Bildirim oluştur">
        <ModalHeader title="Bildirim oluştur" />
        <ModalBody>
        {create.isError && <InlineNotification kind="error" title="Bildirim gönderilemedi" subtitle={getErrorMessage(create.error)} lowContrast onClose={() => create.reset()} className="os-mb-6 os-max-w-full" />}
        <div className="os-section">
          <div className="os-section__header">
            <h2 className="os-section__title">Oluştur</h2>
          </div>
          <div className="os-section__body os-flex os-col os-gap-6">
            <TextInput id="notification-title" labelText="Başlık" placeholder="örn. Dönem sınavı ders programı yayınlandı" value={title} onChange={(e) => setTitle(e.target.value)} disabled={create.isPending} />
            <TextArea id="notification-message" labelText="Mesaj" placeholder="Mesajınızı buraya yazın…" rows={5} value={message} onChange={(e) => setMessage(e.target.value)} disabled={create.isPending} />

            <div className="os-grid os-grid-cols-2 os-gap-4">
              <Dropdown
                id="notification-category"
                titleText="Kategori"
                label=""
                items={CATEGORIES}
                itemToString={(item) => (item as (typeof CATEGORIES)[number])?.label ?? ""}
                selectedItem={CATEGORIES.find((c) => c.value === category)}
                onChange={({ selectedItem }) => setCategory((selectedItem as (typeof CATEGORIES)[number]).value)}
                disabled={create.isPending}
              />
              <div>
                <p className="os-text-xs os-fw-600 os-mb-2 os-c-secondary">Öncelik</p>
                <div className="os-flex os-gap-2">
                  {PRIORITIES.map((p) => (
                    <button
                      key={p.value}
                      onClick={() => setPriority(p.value)} disabled={create.isPending} aria-pressed={priority === p.value} className={`os-pill${priority === p.value ? " is-active" : ""}`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <p className="os-text-xs os-fw-600 os-tracking-wide os-uppercase os-c-secondary os-mb-3">
                Alıcılar
              </p>
              {rules.length > 0 && (
                <div className="os-flex os-wrap os-gap-1h os-mb-3">
                  {rules.map((rule, i) => (
                      <Tag key={ruleKey(rule)} type="teal" size="sm" filter disabled={create.isPending} onClose={() => removeRule(i)}>
                      {rule.label ?? rule.type}
                    </Tag>
                  ))}
                </div>
              )}
              <RecipientPicker
                onAdd={(rule) => setRules((r) => (r.some((x) => ruleKey(x) === ruleKey(rule)) ? r : [...r, rule]))}
                canBroadcastEveryone={canBroadcastEveryone}
                disabled={create.isPending}
              />
            </div>

            <div className="os-flex os-gap-3">
              <Button renderIcon={Send} kind="primary" onClick={() => handleSubmit(false)} disabled={!isReady || create.isPending}>
                {create.isPending ? "Gönderiliyor…" : "Şimdi gönder"}
              </Button>
              <Button renderIcon={Save} kind="secondary" onClick={() => handleSubmit(true)} disabled={!isReady || create.isPending}>
                Taslak olarak kaydet
              </Button>
            </div>
          </div>
        </div>
        </ModalBody>
      </ComposedModal>

      {drafts && drafts.length > 0 && (
        <div className="os-section os-mb-6">
          <div className="os-section__header">
            <h2 className="os-section__title">Taslaklar</h2>
          </div>
          {drafts.map((d) => <DraftRow key={d.id} draft={d} />)}
        </div>
      )}

      <div className="os-mt-6">
        <NotificationHistory />
      </div>
    </div>
  );
}
