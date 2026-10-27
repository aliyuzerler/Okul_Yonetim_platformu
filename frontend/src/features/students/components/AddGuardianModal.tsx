import { useState } from "react";
import { Button, TextInput, Select, SelectItem, InlineNotification, ComposedModal, ModalHeader, ModalBody, ModalFooter } from "@carbon/react";
import { Search } from "@carbon/icons-react";
import { useAddGuardian, useSearchGuardians, useLinkGuardian } from "@/features/guardians/queries/useGuardians";
import { GUARDIAN_RELATIONSHIPS } from "@/features/guardians/constants";
import type { GuardianRelationship } from "@/features/guardians/api/guardian";
import { useDebounced } from "@/shared/hooks/useDebounced";
import { isValidSriLankanPhone, PHONE_INVALID_TEXT } from "@/shared/lib/phone";
import MutationErrorNotification from "@/shared/ui/MutationErrorNotification";
import PersonNameFields from "@/shared/ui/PersonNameFields";
import { displayName } from "@/shared/lib/name";

const EMPTY_GUARDIAN_FORM = {
  full_name: "",
  name_with_initials: "",
  calling_name: "",
  relationship: "father" as GuardianRelationship,
  phone: "",
  email: "",
  nic_number: "",
};

export default function AddGuardianModal({
  studentId,
  existingGuardianIds,
  onClose,
}: {
  studentId: string;
  existingGuardianIds: string[];
  onClose: () => void;
}) {
  const [step, setStep] = useState<"search" | "create">("search");
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounced(query, 300);
  const search = useSearchGuardians(debouncedQuery);
  const linkGuardian = useLinkGuardian(studentId);

  const addGuardian = useAddGuardian(studentId);
  const [form, setForm] = useState(EMPTY_GUARDIAN_FORM);
  const [touched, setTouched] = useState<{
    full_name?: boolean;
    phone?: boolean;
    nic_number?: boolean;
  }>({});
  const [created, setCreated] = useState<{ name: string; duplicates: number } | null>(null);

  const isValid =
    form.full_name.trim().length > 0 &&
    form.phone.trim().length > 0 &&
    isValidSriLankanPhone(form.phone) &&
    form.nic_number.trim().length > 0;

  const results = (search.data?.items ?? []).filter((g) => !existingGuardianIds.includes(g.id));

  const handleLink = (guardianId: string) => {
    linkGuardian.mutate({ guardianId, isPrimaryContact: false }, { onSuccess: onClose });
  };

  const handleAdd = () => {
    setTouched({ full_name: true, phone: true, nic_number: true });
    if (!isValid) return;
    addGuardian.mutate(
      {
        data: {
          full_name: form.full_name.trim(),
          name_with_initials: form.name_with_initials.trim() || undefined,
          calling_name: form.calling_name.trim() || undefined,
          relationship: form.relationship,
          phone: form.phone.trim(),
          email: form.email.trim() || undefined,
          nic_number: form.nic_number.trim(),
        },
        isPrimaryContact: false,
      },
      {
        onSuccess: (result) => {
          if (result.possible_duplicates.length > 0) {
            // Created and linked, but a matching phone or email exists; surface it instead of closing silently.
            setCreated({ name: displayName(result.guardian), duplicates: result.possible_duplicates.length });
          } else {
            onClose();
          }
        },
      },
    );
  };

  return (
    <ComposedModal open size="sm" onClose={onClose} aria-label={step === "search" ? "Veli ekle" : "Yeni veli oluştur"}>
      <ModalHeader title={step === "search" ? "Veli ekle" : "Yeni veli oluştur"} />
      <ModalBody>
        {created && (
          <InlineNotification
            kind="warning"
            title="Olası mükerrer kayıt"
            subtitle={`${created.name} eklendi, ancak aynı telefon veya e-postayı paylaşan ${created.duplicates} kayıtlı veli var. Aynı kişi olabilir mi diye Veliler dizininden kontrol edin.`}
            lowContrast
            hideCloseButton className="os-mb-4 os-max-w-full"
          />
        )}

        {step === "search" && !created && (
          <>
            <p className="os-text-sm os-c-secondary os-mt-0 os-mx-0 os-mb-4">
              Önce arayın - kardeşlerin velisi çoğu zaman sistemde kayıtlıdır.
            </p>
            <div className="os-search os-mb-4">
              <Search size={16} className="os-search__icon" />
              <input
                className="os-search__input"
                aria-label="Veliyi ad, telefon veya e-posta ile ara"
                placeholder="Ada, telefona veya e-postaya göre ara…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoFocus
              />
            </div>

            {query.trim().length > 0 && (
              <div className="os-grid os-gap-2 os-mb-4">
                {results.length === 0 && !search.isLoading && (
                  <p className="os-text-sm os-c-tertiary">Eşleşen veli bulunamadı.</p>
                )}
                {results.map((g) => (
                  <div
                    key={g.id} className="os-flex os-items-center os-justify-between os-py-2h os-px-3h os-border"
                  >
                    <div>
                      <div className="os-fw-600 os-text-sm">{displayName(g)}</div>
                      <div className="os-text-xs os-c-tertiary">{g.phone}</div>
                    </div>
                    <Button size="sm" kind="tertiary" onClick={() => handleLink(g.id)} disabled={linkGuardian.isPending}>
                      Bağla
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <MutationErrorNotification
              isError={linkGuardian.isError}
              error={linkGuardian.error}
              title="Veli bağlanamadı" fallback="Lütfen tekrar deneyin." className="os-mb-4"
            />
          </>
        )}

        {step === "create" && !created && (
          <>
            <MutationErrorNotification
              isError={addGuardian.isError}
              error={addGuardian.error}
              title="Veli eklenemedi" fallback="Lütfen tekrar deneyin." className="os-mb-4"
            />
            <div className="os-grid os-gap-4">
<PersonNameFields
          idPrefix="guardian"
          value={form}
          onChange={(next) => setForm((f) => ({ ...f, ...next }))}
          fullNameInvalid={!!touched.full_name && !form.full_name.trim()}
          onFullNameBlur={() => setTouched((t) => ({ ...t, full_name: true }))}
        />
              <Select
                id="guardian-relationship"
                labelText="Yakınlık"
                value={form.relationship}
                onChange={(e) =>
                  setForm((f) => ({ ...f, relationship: e.target.value as GuardianRelationship }))
                }
              >
                {GUARDIAN_RELATIONSHIPS.map((r) => (
                  <SelectItem key={r.value} value={r.value} text={r.label} />
                ))}
              </Select>
              <TextInput
                id="guardian-phone"
                labelText="Telefon"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                onBlur={() => setTouched((t) => ({ ...t, phone: true }))}
                invalid={!!touched.phone && (!form.phone.trim() || !isValidSriLankanPhone(form.phone))}
                invalidText={form.phone.trim() ? PHONE_INVALID_TEXT : "Telefon numarası zorunludur."}
              />
              <TextInput
                id="guardian-email"
                labelText="E-posta (isteğe bağlı; ileride portal girişi açmak için gerekir)"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
              <TextInput
                id="guardian-nic"
                labelText="T.C. Kimlik No"
                value={form.nic_number}
                onChange={(e) => setForm((f) => ({ ...f, nic_number: e.target.value }))}
                onBlur={() => setTouched((t) => ({ ...t, nic_number: true }))}
                invalid={!!touched.nic_number && !form.nic_number.trim()}
                invalidText="T.C. Kimlik No zorunludur."
                helperText="Velinin ilk tek kullanımlık portal şifresi olarak kullanılır."
              />
            </div>
          </>
        )}
      </ModalBody>
      <ModalFooter>
        {created ? (
          <Button kind="primary" onClick={onClose}>
            Tamam
          </Button>
        ) : step === "search" ? (
          <>
            <Button kind="secondary" onClick={onClose}>
              İptal
            </Button>
            <Button kind="tertiary" onClick={() => setStep("create")}>
              Bunlardan biri değil - yeni oluştur
            </Button>
          </>
        ) : (
          <>
            <Button kind="secondary" onClick={() => setStep("search")}>
              Aramaya dön
            </Button>
            <Button kind="primary" onClick={handleAdd} disabled={!isValid || addGuardian.isPending}>
              {addGuardian.isPending ? "Ekleniyor…" : "Veli ekle"}
            </Button>
          </>
        )}
      </ModalFooter>
    </ComposedModal>
  );
}
