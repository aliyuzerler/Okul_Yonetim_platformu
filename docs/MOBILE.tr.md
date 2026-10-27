# OpenSchool Mobil Uygulaması

OpenSchool'un veli ve öğrenci panellerini içeren React Native (Expo)
uygulaması. Tek binary'de iki rol: **veli** ve **öğrenci**. Bildirimler için
uygulama içi gelen kutusu + **push bildirimleri** ([ADR 0010]) ikinci kanal
olarak çalışır.

## 1. Mimari

```
mobile/
├── app.json                 Expo yapılandırması (slug: openschool)
├── eas.json                 development / preview / production profilleri
├── index.ts, App.tsx        Giriş noktası + sağlayıcı zinciri
└── src/
    ├── config/env.ts        EXPO_PUBLIC_* yapılandırması
    ├── theme/tokens.ts      Web'deki _tokens.scss ile aynı Carbon paleti (+dark)
    ├── i18n/                TR öncelikli mesaj kataloğu (~114 anahtar) + en
    ├── auth/
    │   ├── jwt.ts           Hermes uyumlu base64url JWT çözümleme
    │   ├── session.ts       SecureStore oturum kalıcılığı (web'de localStorage)
    │   └── AuthContext.tsx  ThunderID OIDC (code + PKCE), sessiz yenileme,
    │                        must_change_password akışı, dil senkronu
    ├── api/                 client.ts (tek uçuşlu refresh + retry) +
    │                        guardian/student/notifications/push API'leri
    ├── push/notifications.ts  Foreground handler, Android kanalı, izin akışı,
    │                          token kaydı, dokunma → Bildirimler sekmesi
    ├── navigation/          Rol bazlı sekmeler + unread rozeti (2 dk polling)
    ├── components/portal.tsx  Paylaşılan Devamsızlık/Notlar/Program görünümleri
    └── screens/             11 ekran (aşağıda)
```

**Ekranlar:** Login, Home (veli), ChildDetail (veli), StudentHome,
StudentAttendance, StudentMarks, StudentTimetable, Notifications,
PasswordInterstitial, Profile, AccessDenied.

**Rol bazlı sekmeler**

| Rol | Sekmeler |
| --- | --- |
| Veli | Ana Sayfa · Bildirimler · Profil |
| Öğrenci | Ana Sayfa · Ders Programı · Bildirimler · Profil |

## 2. Kimlik doğrulama

ThunderID, OIDC **authorization code + PKCE** (public client) ile
kullanılır: `/oauth2/authorize` → sistem oturum açma ekranı →
`openschool://oauth2redirect` (Expo Go'da `exp://…`) → `/oauth2/token`
takası. Erişim belirteci kısa ömürlüdür; `refresh_token` ile tek uçuşlu
sessiz yenileme yapılır ve ölü oturumda depolama temizlenir. Yenileme
sırasında `GET /me` ile `must_change_password` ve dil tercihi okunur; dil
tercihi hem SecureStore'a hem `PUT /me/language` üzerinden sunucuya yazılır.

> **thunderid/config.yml:** mobil client'ın `redirectUris` listesinde
> `openschool://oauth2redirect` ve (Expo Go) `exp://<makale-hedefi>`
> bulunmalıdır. `__DEV__` kipinde giriş ekranı yönlendirme adresini ekrana
> yazar.

## 3. Veri kaynakları

Veli uçları: `GET /me/children`, `/me/children/summary`,
`/me/children/:id/attendance`, `/me/children/:id/marks?term_id`,
`/me/children/:id/timetable`.
Öğrenci uçları: `GET /me/student`, `/me/student/attendance`,
`/me/student/marks?term_id`, `GET /timetable/my-class`.
Ortak: `PUT /me/language`, `POST /auth/change-password`,
`POST /auth/keep-default-password`, `GET /academic-years/current`,
`GET /terms?academic_year_id=…`, bildirim gelen kutusu uçları,
`/me/push-tokens`.

## 4. Push bildirimleri

- `expo-notifications` ile izin akışı, Android'de HIGH önemli
  `notifications` kanalı; foreground'da banner + liste + ses + rozet.
- Cihaz belirteci `POST /me/push-tokens` ile backend'e kaydedilir
  (`ExponentPushToken[…]` biçimi); çıkışta silinir.
- Backend, bildirim gönderimlerinde (Create/SendDraft/SendDirect) alıcılara
  push'ı detached goroutine ile iletir; hata yalnızca loglanır. Doğruluk
  kaynağı her zaman uygulama içi gelen kutusudur ([ADR 0010]).
- Profil sekmesindeki **Push bildirimleri** anahtarı cihazda kaydı açar/
  kapatır (simülatörde push çalışmaz; gerçek cihaz gerekir).

## 5. Çalıştırma

```bash
cd mobile
npm install
cp .env.example .env        # EXPO_PUBLIC_* değerlerini doldurun
npx expo start              # Expo Go ile cihazda deneyin
```

`.env` değişkenleri:

| Değişken | Açıklama |
| --- | --- |
| `EXPO_PUBLIC_API_URL` | Backend API kökü (`http://<sunucu>:8080/api/v1`) |
| `EXPO_PUBLIC_THUNDERID_ISSUER` | ThunderID kökü (`https://<sunucu>:8090`) |
| `EXPO_PUBLIC_THUNDERID_CLIENT_ID` | Mobil client ID (ThunderID'de public client) |
| `EXPO_PUBLIC_THUNDERID_SCOPES` | `openid profile email roles phone` |
| `EXPO_PUBLIC_OAUTH_REDIRECT_SCHEME` | `openschool` |
| `EXPO_PUBLIC_OAUTH_REDIRECT_PATH` | `oauth2redirect` |

Doğrulama komutları: `npx tsc --noEmit` (0 hata), `npx expo-doctor`,
`npx expo export --platform web` (bundle smoke testi).

## 5. Canlıya alma (EAS + kimlikler)

1. `npx eas init` → `app.json` içindeki `extra.eas.projectId` alanını doldurun.
2. **Android (FCM):** Firebase Console'da proje oluşturun →
   *Project settings → Service accounts* → **FCM HTTP v1** için service
   account JSON'unu üretin → Expo'nun proje ayarlarına (Expo Classic
   credentials yerine **`eas credentials`** veya web arayüzü) yükleyin.
   Eski "server key" yöntemi kaldırıldı; yalnızca HTTP v1 kullanın.
3. **iOS (APNs):** Apple Developer üyeliği ($99/yıl) → `.p8` anahtarını
   (Key ID + Team ID ile) Expo'ya yükleyin.
4. **Backend:** Expo hesabından **Access Token** üretin ve sunucu
   `.env` dosyasına yazın:

   | Değişken | Değer |
   | --- | --- |
   | `PUSH_ENABLED` | `true` |
   | `EXPO_PUSH_BASE_URL` | `https://exp.host/--/api/v2/push/send` |
   | `EXPO_PUSH_ACCESS_TOKEN` | Expo Access Token (gizli) |

   FCM/APNs anahtarları sunucuya girmez; yalnızca Expo hesabında yaşar.
5. `eas build --profile production --platform android` (ve iOS) → mağaza
   gönderimi (`eas submit`). Play Console kaydı $25 (tek seferlik), App
   Store inceleme süreci 1–3 gün sürer.
6. **OTA güncellemeleri:** `eas update` ile JS düzeltmeleri mağaza
   güncellemesi olmadan dağıtılır (kanallar: production/preview).

## 6. Bilinen sınırlar

- `si`/`ta` dilleri mobil katalogda yok (mesaj dosyası genişletmeye hazır).
- Push bildirimleri simülatörde çalışmaz; gerçek cihaz + FCM/APNs kimlikleri
  gerekir.
- Web dışa aktarımı (`expo export --platform web`) önizleme/smoke testi
  içindir; oturum web'de localStorage ile tutulur, kimlik doğrulama akışı
  native (Expo Go/standalone) hedeflidir.

[ADR 0010]: ./adr/0010-push-notifications.md
