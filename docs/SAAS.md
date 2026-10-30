# OpenSchool SaaS — Abonelik Platformu Yol Haritası

OpenSchool'ü abonelik geliri üreten bir SaaS'e dönüştüren çalışmanın
tek noktadan haritası. Mimari kararlar: [ADR 0011](adr/0011-saas-platform-control-plane.md),
ödeme tasarımı: [ADR 0012](adr/0012-iyzico-hybrid-billing.md).

## Model özeti

| Konu | Karar |
| --- | --- |
| Teslim şekli | **Kurulum bazlı** — her okul ayrı instance, platform kontrol düzlemi (`cmd/platform`) sahipliği ve faturalamayı yönetir |
| Paketler | Başlangıç (≤250 öğrenci) · Standart (≤750) · Kurumsal (sınırsız) |
| Deneme | 14 gün, kart istemeden; e-posta doğrulanınca başlar |
| Ödeme | **Hibrit iyzico:** aylık = otomatik yenileme (Subscription API), yıllık = tek çekim %17 indirimli (10× aylık) |
| Erişim durumu | `ok` → `read_only` (deneme bitti / ödeme gecikti) → `locked` (süresi geçmiş/iptal) |

## Faz durumu

### ✅ Faz 1 — Kontrol düzlemi ve hesap yaşam döngüsü (bu depoda)
- `cmd/platform` binary + `PLATFORM_DB_*` ayrı veritabanı ve migration seti
- Kayıt olma akışı: okul + yönetici hesabı + seçilen paket → doğrulama e-postası
- E-posta doğrulama → **14 günlük deneme başlar** (hash-only tek kullanımlık token, ADR 0005 disiplini)
- Giriş (HS256 JWT, 12 saat), şifremi unuttum / sıfırlama, doğrulama yenileme
- `GET /platform/v1/billing/subscription` — deneme kalan günü, `access_state`, ödeme geçmişi
- Platform frontend'i (`platform/frontend`): açılış, kayıt, doğrulama, giriş, şifremi unuttum, abonelik paneli

### ✅ Faz 2 — iyzico ödeme ve süper admin (bu depoda)
- iyzico istemcisi (bağımlılıksız `net/http`, v2 imza + webhook doğrulama)
- Hibrit checkout: aylık abonelik formu / yıllık tek çekim (`payWithRegistration`)
- Checkout sonucu callback'i + webhook → abonelik aktifleştirme, `past_due` işaretleme
- `IYZICO_MODE=mock` ile uçtan uca çevrimdışı test (CI uyumlu)
- Süper admin API + paneli: okul dizini (arama/sayfalama), detay dosyası, manuel müdahale
  (deneme uzatma, durum ataması), ödeme defteri, gelir özeti (MRR/ARR, son 6 ay, deneme dönüşümü)

### 🔜 Faz 3 — Okul tarafında kilit + uyarı bandı
- Okul API'sine opsiyonel lisans denetimi: `LICENSE_API_URL` + imzalı lisans token'ı
- `access_state`'e göre davranış: `read_only` → yazma uçları 403 + üstte uyarı bandı;
  `locked` → veri dışa aktarımı hariç kilit
- Yönetici panelinde "Abonelik" kartı (kalan gün, plan, ödeme linki)

### 🔜 Faz 4 — Provisioning ve otomasyon
- Okul instance'ı otomatik kurulumu (DB + API + ThunderID + DNS)
- Yıllık plan için kayıtlı kartla otomatik yenileme + hatırlatma e-postaları
- Fatura PDF'leri, iyzico iade/chargeback mutabakatı
- Öğrenci sayısı limit zorlaması (paket aşımında uyarı + yükseltme akışı)

### 🔜 Faz 5 — Büyüme
- Gelir raporlarında cohort/churn analizi, e-posta damla kampanyaları (deneme bitişi)
- Bayi/temsilci komisyonu modeli, çoklu okul grupları (kurumsal holding hesabı)
- En-az-aylık kullanım tabanlı ölçülü (metered) alternatif

## Kurulum (kontrol düzlemi)

```bash
cd backend
cp .env.example .env   # PLATFORM_* ve IYZICO_* bölümünü doldurun
go run ./cmd/platform  # :8090 — platform API

cd ../platform/frontend
pnpm install && pnpm dev   # :5174 — platform arayüzü
```

İlk açılışta `PLATFORM_ADMIN_EMAIL` / `PLATFORM_ADMIN_PASSWORD` ile süper
admin otomatik oluşur. Geliştirmede `IYZICO_MODE` boşsa (anahtar yoksa)
**mock** moda düşer: ödeme sayfası simüle edilir, gerçek iyzico'ya hiç çıkılmaz.

## Erişim durumu sözleşmesi

`platform_tenants.access_state` okul instance'ının Faz 3'te izleyeceği tek
kolondur:

| Durum | Anlamı |
| --- | --- |
| `ok` | Canlı deneme veya ödenmiş dönem |
| `read_only` | Deneme bitti ya da yenileme ödemesi gecikti — veriler okunur, yazım kilitlidir |
| `locked` | Sözleşme sonlanmış — yalnızca dışa aktarım açık kalır |

Hesaplama kuralı: `internal/platform/billing.AccessStateFor` — tek doğruluk
kaynağı burasıdır; tenant satırına yansıtılan değer onun önbelleğidir.
