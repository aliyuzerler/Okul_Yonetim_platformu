# 🏫 OpenSchool — Okul Yönetim Platformu

[![Go](https://img.shields.io/badge/Go-1.26-00ADD8?logo=go&logoColor=white)](https://go.dev)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![Expo](https://img.shields.io/badge/Expo-SDK%2054-000020?logo=expo&logoColor=white)](https://expo.dev)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-4169E1?logo=postgresql&logoColor=white)](https://postgresql.org)

Kendi sunucunuzda barındırabileceğiniz, **web + mobil** destekli açık kaynak
okul yönetim platformu. Okul müdürlüğü, öğretmenler, öğrenciler ve veliler
için ayrı paneller; Türkçe yerelleştirilmiş arayüz ve MEB uyumlu terminoloji
ile gelir.

> Bu dağıtım, [openschool-org/openschool](https://github.com/openschool-org/openschool)
> projesinin Türkçeleştirilmiş ve mobil uygulama ile genişletilmiş
> sürümüdür. Yapılan tüm değişiklikler aşağıda ayrıntılı listelenmiştir.

## ✨ Öne çıkanlar

- **4 rol, 5 panel:** Müdür/idari panel, öğretmen paneli, öğrenci paneli
  (web + mobil) ve veli paneli (web + mobil)
- **Tam Türkçe arayüz:** 20 özellik alanında frontend çevirisi, backend
  mesajları, e-posta şablonları ve yıl sonu iş akışları (~540 metin);
  [docs/TERMINOLOGY.tr.md](docs/TERMINOLOGY.tr.md) sözlüğüyle tutarlı MEB
  terminolojisi (Sınıf Seviyesi, Şube, Alan, Sınıf Geçme, Kol…)
- **Mobil uygulama:** Expo tabanlı tek binary'de veli + öğrenci panelleri,
  push bildirimleri, bildirim merkezi — bkz. [docs/MOBILE.tr.md](docs/MOBILE.tr.md)
- **Yıl sonu iş akışları:** sınıf geçme, öğrenci aktarma, ders seçimleri
  (W3), öğretmen atama (W6), ders programı üretimi (W7) — önerilebilir +
  geri alınabilir adımlarla
- **Kimlik yönetimi:** ThunderID (WSO2 tabanlı) IdP ile OIDC;
  self-servis hesap aktivasyonu, şifre sıfırlama, denetim kayıtları
- **Ders programı:** seçmeli bloklar, çakışma onarımı, otomatik üretim
- **Yoklama ve notlar:** günlük yoklama, gecikme takibi, dönem notları,
  karneler ve PDF raporlar

## 📸 Ekran görüntüleri

### Yönetim paneli (web)

| | |
| --- | --- |
| ![Okul genel görünümü](docs/screenshots/web-admin-dashboard.png) | ![Öğrenciler](docs/screenshots/web-admin-students.png) |
| ![Öğretmenler](docs/screenshots/web-admin-teachers.png) | ![Ders programı](docs/screenshots/web-admin-timetable.png) |
| ![Raporlar](docs/screenshots/web-admin-reports.png) | ![Analitik](docs/screenshots/web-admin-analytics.png) |

### Öğretmen paneli (web)

| | |
| --- | --- |
| ![Öğretmen genel görünümü](docs/screenshots/web-teacher-dashboard.png) | ![Sınıflarım](docs/screenshots/web-teacher-classes.png) |
| ![Not girişi](docs/screenshots/web-teacher-marks.png) | ![Sınıf yoklaması](docs/screenshots/web-teacher-attendance.png) |

### Öğrenci paneli (web)

| | |
| --- | --- |
| ![Öğrenci paneli](docs/screenshots/web-student-dashboard.png) | ![Notlarım](docs/screenshots/web-student-marks.png) |

### Veli paneli (web)

| | |
| --- | --- |
| ![Çocuklarım](docs/screenshots/web-parent-children.png) | ![Çocuk detayı](docs/screenshots/web-parent-child-detail.png) |

### Mobil uygulama (veli + öğrenci)

| | |
| --- | --- |
| ![Mobil giriş](docs/screenshots/mobile-login.png) | ![Veli ana sayfa](docs/screenshots/mobile-parent-home.png) |
| ![Veli çocuk detayı](docs/screenshots/mobile-parent-child.png) | ![Notlar](docs/screenshots/mobile-parent-child-marks.png) |
| ![Ders programı](docs/screenshots/mobile-parent-child-timetable.png) | ![Bildirimler](docs/screenshots/mobile-parent-notifications.png) |
| ![Öğrenci paneli](docs/screenshots/mobile-student-home.png) | ![Ders programı](docs/screenshots/mobile-student-timetable.png) |

Tüm ekran görüntüleri: [docs/screenshots/](docs/screenshots/)

## 🏗 Mimari

```
┌────────────────────┐   ┌────────────────────┐
│   Web (React 19)   │   │  Mobil (Expo/RN)   │
│  Vite + IBM Carbon │   │  veli + öğrenci    │
└─────────┬──────────┘   └─────────┬──────────┘
          │ REST (OIDC)            │ REST + Push
          ▼                        ▼
┌────────────────────┐   ┌────────────────────┐
│   ThunderID :8090  │◀──│  Backend :8080     │
│   IdP (OIDC/PKCE)  │   │  Go 1.26 + Gin     │
└────────────────────┘   └─────────┬──────────┘
                                   ▼
                         ┌────────────────────┐
                         │  PostgreSQL :5432  │
                         │  56 migration      │
                         └────────────────────┘
                                   │ push (opsiyonel)
                                   ▼
                         ┌────────────────────┐
                         │ Expo Push → FCM/APNs │
                         └────────────────────┘
```

- **Backend:** Go 1.26, Gin, modüler monolit (21 modül), PostgreSQL 17,
  sqlc ile tip güvenli sorgular, golang-migrate şema yönetimi, iş akışı
  motoru (W1–W7), 31 paket test
- **Frontend:** React 19, Vite, IBM Carbon Design System, 20 özellik
  alanı, i18n (tr/en/si/ta; varsayılan **tr**)
- **Mobil:** Expo SDK 54, React Native 0.81, React Navigation 7,
  TanStack Query 5, TR öncelikli i18n — mimari detayı:
  [docs/MOBILE.tr.md](docs/MOBILE.tr.md)
- **Kimlik:** ThunderID — OIDC authorization code + PKCE (mobil public
  client), client_credentials (backend); bkz. [docs/THUNDERID.md](docs/THUNDERID.md)
- **Bildirimler:** uygulama içi gelen kutusu (doğruluk kaynağı,
  [ADR 0004](docs/adr/0004-in-app-only-notifications.md)) + Expo push
  ikinci kanal ([ADR 0010](docs/adr/0010-push-notifications.md))

## 🚀 Kurulum

Ön koşullar: Go 1.25+, Node 18+ (pnpm), Docker + Compose,
(geliştiriciyseniz golang-migrate ve sqlc CLI).

```bash
git clone https://github.com/aliyuzerler/Okul_Yonetim_platformu.git
cd Okul_Yonetim_platformu

make setup     # Postgres + ThunderID + bağımlılıklar + .env dosyaları
make seed      # (opsiyonel) demo sınıf: öğretmen/öğrenci/veli + yoklama + notlar
make dev       # backend :8080 + frontend :5173
```

`http://localhost:5173` → ilk kurulum sihirbazı (First-run setup) ile okulu
tanımlayın. ThunderID konsolu: `https://localhost:8090/console`.

### Mobil uygulama

```bash
cd mobile && npm install
cp .env.example .env    # EXPO_PUBLIC_* değerlerini doldurun
npx expo start          # Expo Go ile cihazda açın
```

Detaylı rehber (EAS, FCM/APNs kimlikleri, canlıya alma):
[docs/MOBILE.tr.md](docs/MOBILE.tr.md) §5.

### Demo verisi

`make seed` 10-A sınıfını örnek verilerle kurar (7 öğrenci + velileri,
yoklamalar, dönem notları). `make unseed` ile güvenle kaldırılır.

## 🔧 Yapılandırma

Backend ortam değişkenleri: [backend/.env.example](backend/.env.example) —
veritabanı, ThunderID OIDC, e-posta (Resend/SMTP/console) ve push bölümü:

| Değişken | Amaç |
| --- | --- |
| `DATABASE_URL` | PostgreSQL bağlantısı |
| `THUNDERID_ISSUER`, `THUNDERID_BACKEND_*` | OIDC istemci yapılandırması |
| `MAIL_PROVIDER` | `resend` / `smtp` / `console` |
| `PUSH_ENABLED` | Push gönderimini açar/kapatır (`false` = no-op) |
| `EXPO_PUSH_BASE_URL` | `https://exp.host/--/api/v2/push/send` |
| `EXPO_PUSH_ACCESS_TOKEN` | Expo hesabı access token (gizli) |

## 🛠 Bu dağıtımda yapılan değişiklikler

### 1. Tam Türkçe yerelleştirme

- Frontend'in 20 özellik alanının tamamı Türkçeye çevrildi (insanlar,
  akademikler, müfredat, ders programı, yoklama, notlar, raporlar,
  bildirimler, sistem…); `tr` kataloğu (279 anahtar) dağıtım varsayılanı
  yapıldı
- Backend kullanıcıya dönük tüm mesajlar, e-posta şablonları ve iş akışı
  metinleri (~540 dize) Türkçeleştirildi
- [docs/TERMINOLOGY.tr.md](docs/TERMINOLOGY.tr.md) ile MEB uyumlu tutarlı
  terimler: *Sınıf Seviyesi, Sınıf, Şube, Alan, Öğretim Dili, Sınıf Geçme,
  Kol, Kayıt…*

### 2. Mobil uygulama (yeni)

- Expo SDK 54; veli ve öğrenci panelleri tek binary'de
- ThunderID OIDC (code + PKCE), güvenli oturum (SecureStore), sessiz
  yenileme, `must_change_password` akışı
- Devamsızlık (ay filtresi + durum rozetleri), notlar (dönem seçici + yüzde
  çubukları), ders programı (gün çipleri) — iki rol aynı paylaşılan
  bileşenleri kullanır
- Bildirim merkezi: okunmamış/okundu/arşiv kutuları, sonsuz kaydırma,
  kategori + öncelik rozetleri, unread sekme rozeti (2 dk polling)
- Push bildirimleri: Android HIGH kanalı, foreground banner, token kaydı,
  dokunma → Bildirimler — bkz. [ADR 0010](docs/adr/0010-push-notifications.md)
- İkonlar/splash `scripts/make_mobile_assets.py` ile üretildi

### 3. Backend push altyapısı (yeni)

- `push_tokens` tablosu (migration 000055) + sqlc sorguları
  (upsert/disable/list/batch/prune)
- Bağımlılıksız `net/http` Expo client: 100'lük gruplama, 429
  Retry-After, `DeviceNotRegistered` budama, token maskeleme
- `POST/GET/DELETE /me/push-tokens`; `NotificationService`'e opsiyonel
  `PushSender` (detached goroutine, 30 sn timeout, hata yalnızca log)
- Yapılandırma: `PUSH_ENABLED`, `EXPO_PUSH_BASE_URL`,
  `EXPO_PUSH_ACCESS_TOKEN` — kapalıyken tamamen no-op

### 4. Düzeltmeler

- **W3 ders seçimleri iş akışı** implementasyonu üretim hattına kayıtlı
  değildi (ölü kod); sınıf geçme akışından önce kaydedildi
- **`PUT /me/language` 500 hatası:** `users_preferred_language_check`
  constraint'i `tr` değerini kabul etmiyordu; migration 000056 ile genişletildi
- Mobil oturum depolaması web'de `localStorage` fallback'i aldı
  (`expo-secure-store` web stub'ı boş)

### Bilinen sınırlar / yol haritası

- PDF rapor üretimi (gofpdf) Unicode font gömülü değil — Türkçe karakterler
  bazı raporlarda bozuk görünebilir (plan: UTF-8 TTF gömme)
- Yönetim/öğretmen sayfalarının bir bölümü i18n kataloğuna bağlı değil
  (doğrudan Türkçe metin; sonraki evrede `labelKey` modeline taşınacak)
- Mobil: `si`/`ta` katalogları, çevrimdışı önbellek

## 📚 Dokümantasyon

| Belge | İçerik |
| --- | --- |
| [docs/SETUP.md](docs/SETUP.md) | Uçtan uca kurulum rehberi |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Bileşenler, katmanlar, veri modeli |
| [docs/FEATURES.md](docs/FEATURES.md) | Modül modül özellik listesi |
| [docs/THUNDERID.md](docs/THUNDERID.md) | IdP yapılandırması |
| [docs/MOBILE.tr.md](docs/MOBILE.tr.md) | Mobil uygulama + push + canlıya alma |
| [docs/TERMINOLOGY.tr.md](docs/TERMINOLOGY.tr.md) | Türkçe terim sözlüğü |
| [docs/adr/](docs/adr/) | Mimari karar kayıtları (ADR 0001–0010) |
| [CHANGELOG.md](CHANGELOG.md) | Sürüm geçmişi |

## 🤝 Katkı ve lisans

Bu proje [Apache License 2.0](LICENSE) ile lisanslanmıştır ve
[openschool-org/openschool](https://github.com/openschool-org/openschool)
üzerine inşa edilmiştir. Türkçe yerelleştirme ve mobil uygulama
katkılarına [CHANGELOG.md](CHANGELOG.md)'den ulaşabilirsiniz.
