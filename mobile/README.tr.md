# OpenSchool Mobil (Expo)

OpenSchool'un veli + öğrenci panellerini içeren React Native (Expo SDK 54)
mobil uygulaması. Bildirimler uygulama içi merkezi (inbox) doğruluk kaynağı,
push bildirimleri ikinci kanal olarak tasarlandı (docs/adr/0010).

## Kurulum

```bash
cd mobile
cp .env.example .env        # EXPO_PUBLIC_* değerlerini doldurun
npm install
npx expo start              # Expo Go ile deneyin (development)
```

Node 24 + npm 11 ile doğrulandı. Kontrol komutları:

```bash
npx tsc --noEmit            # 0 hata beklenir
npx expo-doctor             # 18/18 beklenir
npx expo export --platform web   # bundle smoke testi
```

## .env

| Değişken | Açıklama | Örnek |
| --- | --- | --- |
| `EXPO_PUBLIC_API_URL` | OpenSchool API kökü (`/api/v1` dahil) | `http://localhost:8080/api/v1` |
| `EXPO_PUBLIC_THUNDERID_ISSUER` | ThunderID issuer (JWKS/token uçlarının kökü) | `https://localhost:8090` |
| `EXPO_PUBLIC_THUNDERID_CLIENT_ID` | ThunderID **public client** ID'si (PKCE) | `gMCFica-...` |
| `EXPO_PUBLIC_THUNDERID_SCOPES` | Boşlukla ayrılmış scope listesi | `openid profile email roles phone` |
| `EXPO_PUBLIC_OAUTH_REDIRECT_SCHEME` | Native redirect şeması | `openschool` |
| `EXPO_PUBLIC_OAUTH_REDIRECT_PATH` | Native redirect yolu | `oauth2redirect` |

## ThunderID kaydı (mobil redirect URI)

ThunderID'de **public client + PKCE zorunlu** bir uygulama oluşturun ve
redirect URI listesine mobil adresleri ekleyin:

```yaml
# thunderid/config.yml — mobil uygulama örneği (özet)
inboundAuthConfig:
  - type: oauth2
    config:
      clientId: {{.OPENSCHOOL_MOBILE_CLIENT_ID}}
      redirectUris:
        # Standalone build (app.json scheme + path):
        - openschool://oauth2redirect
        # Expo Go / development (LoginScreen __DEV__ adresi yazdırır):
        - exp://192.168.1.10:8081
```

- Standalone adres sabittir: `openschool://oauth2redirect`.
- Expo Go adresi makineye göre değişir; LoginScreen geliştirme modunda
  etkili adresi ekranda gösterir — bunu ThunderID'ye kaydedin.
- Scope'lar web ön yüzle aynıdır: `openid profile email roles phone`
  (backend `roles` claim'ini JWT'den okur).
- Post-logout redirect URI'i da eklemeyi unutmayın (ThunderID `signOut`
  bunu doğrular).

## Mimari

```
src/
├── config/env.ts          # EXPO_PUBLIC_* + ThunderID endpoint türetimi
├── theme/tokens.ts        # Carbon paleti (frontend _tokens.scss ile aynı)
├── i18n/                  # TR öncüllü katalog (114 anahtar) + en, tr-TR Intl
├── auth/
│   ├── jwt.ts             # Hermes uyumlu base64url JWT çözümü
│   ├── session.ts         # SecureStore anahtarları (token/dil/push)
│   ├── thunderid.ts       # authorization_code+PKCE / refresh_token çağrıları
│   └── AuthContext.tsx    # oturum, sessiz yenileme, must_change_password,
│                          # dil tercihi (SecureStore + PUT /me/language)
├── api/
│   ├── client.ts          # tek uçuşlu refresh + retry + dead-session temizliği
│   ├── types.ts           # backend modellerinin birebir TS karşılıkları
│   └── index.ts           # common/guardian/student/notifications/push API'leri
├── components/portal.tsx  # AttendanceView/MarksView/TimetableView (paylaşılan)
├── push/notifications.ts  # izin akışı, Android kanalı 'notifications' (HIGH),
│                          # token kayıt/silme, dokunma→Bildirimler sekmesi
├── navigation/            # rol bazlı sekmeler + unread rozeti (2dk polling)
└── screens/               # 11 ekran (aşağıda)
```

Ekranlar: Login, Home (veli), ChildDetail, StudentHome, StudentAttendance,
StudentMarks, StudentTimetable, Notifications, PasswordInterstitial,
Profile, AccessDenied.

Roller: yalnızca **veli** ve **öğrenci** (diğer roller AccessDenied).
Ders kaydı ekranı ve öğretmen mobil paneli bilinçli kapsam dışıdır.

## Push bildirimleri

- Backend Expo push servisine aktarır (`PUSH_ENABLED`,
  `EXPO_PUSH_ACCESS_TOKEN` — backend/.env).
- Cihaz anahtarı: Profile → Push bildirimleri Switch'i. Tercih
  SecureStore'da (`os.push.enabled`) tutulur; açılışta ve giriş sonrası
  `POST /me/push-tokens` ile kaydedilir, çıkışta silinir.
- Simülatörlerde token alınamayabilir; gerçek cihaz kullanın.
- EAS `projectId` placeholder'dır: `eas init` sonrası app.json içine
  gerçek değer girilir (canlıya alma: FCM/APNs anahtarları, store
  submission, OTA — docs/MOBILE.tr.md).

## Bilinen sınırlar

- Push token uçları backend tarafında yeniden yazılıyor (rec-4a); mobil
  sözleşme (`POST/GET/DELETE /me/push-tokens`) worklog spec'ine göre
  tasarlandı, backend PR'ı gelince alan adları doğrulanmalı.
- Çevrimdışı önbellek ve si/ta dilleri yol haritasında.
- iOS testi yalnızca simülatörde yapıldı (cihaz testi yok).
