# OpenSchool Türkçe Terminoloji Sözlüğü

> Bu sözlük, OpenSchool projesinin tüm Türkçeleştirme çalışmaları için **tek yetkili terminoloji kaynağıdır**. Tüm çeviriler bu sözlüğe sadık kalmalıdır. Yeni bir terim gerekiyorsa önce buraya eklenmeli, sonra kullanılmalıdır.

## Üslup Kuralları (tüm dalgalarda zorunlu)

- Hitap: **resmî "siz"** (asla "sen" değil)
- Boş durumlar: **"Henüz … yok"** kalıbı (örn. "Henüz çalıştırma yok", "Henüz kayıt yok")
- Hata durumları: **"… yüklenemedi."** kalıbı (örn. "Öğrenci listesi yüklenemedi.")
- Başarı bildirimleri (toast): **"… silindi", "… kaydedildi", "… oluşturuldu", "… güncellendi"** kalıbı
- Onay istemleri: kısa cümle + "Bu işlem geri alınamaz." uyarısı gerektiğinde
- Butonlar kısa ve eylem odaklı: "Kaydet", "İptal", "Sil", "Düzenle", "Aç", "Yazdır"
- Kod yorumları, değişken adları, route'lar, JSON alan adları, enum değerleri **ASLA çevrilmez**
- Teknik terimler (PKCE, JWKS, migration, claim, idempotent, reverse proxy vb.) İngilizce kalır

## Çekirdek Terimler

| İngilizce | Türkçe | Not |
|---|---|---|
| Academic year | Eğitim-öğretim yılı | |
| Grade | Sınıf seviyesi | Veri/kod olarak `grade` kalır |
| Class | Sınıf | |
| Section | Şube | "Grade section" → **Seviye şubesi** |
| Stream | Alan | A/L, O/L bağlamı korunur |
| Medium | Öğretim dili | |
| Enrolment | Kayıt | |
| Promotion | Sınıf geçme | "Sınıf geçme ve sınıf oluşturma" başlığı da kullanılır |
| House | Kol | Okul kolları (Sports House vb.) |
| Prefect | Öğrenci temsilcisi | PREFECT_RANKS: Baş öğrenci temsilcisi, Kol kaptanı… |
| Index number | Okul numarası | Saha adı `index_number` kalır |
| Guardian | Veli | |
| NIC | T.C. Kimlik No | Saha `nic`/`nic_number` kalır |
| Form teacher | Sınıf öğretmeni | |
| Subject teacher | Branş öğretmeni | |
| Non-academic staff | İdari personel | |
| Employee number | Sicil numarası | |
| Section head | Şube rehber öğretmeni | |
| TIC | sorumlu öğretmen (TIC) | |

## Yoklama ve Not

| İngilizce | Türkçe | Not |
|---|---|---|
| Attendance | Yoklama / Devamsızlık | Bağlama göre |
| Mark attendance | Yoklama al | Nav etiketi de aynı |
| Attendance session | Yoklama oturumu | |
| Present | Mevcut | |
| Absent | Devamsız | |
| Late | Geç | |
| Excused | İzinli | |
| Leave | İzin | |
| Marks | Not | |
| Marks entry | Not girişi | |

## Ders Programı

| İngilizce | Türkçe | Not |
|---|---|---|
| Timetable | Ders programı | |
| Period | Ders saati | |
| Classroom | Derslik | |
| Option block | Seçmeli ders bloğu | |
| Homeroom | Sınıf öğretmenliği | |
| Draft / Published / Approved | Taslak / Yayınlandı / Onaylandı | `draft`/`published`/`approved` kod değerleri kalır |
| Review | İnceleme / Denetle | Bağlama göre: "İncelemeye gönder", "Denetle" |

## Yıl Sonu Akışları (Workflows)

| İngilizce | Türkçe | Not |
|---|---|---|
| Workflow | Akış | |
| Year rollover | Yıl devri | |
| Leavers | Ayrılan öğrenciler | |
| Subject choices | Ders seçimleri | |
| New student intake | Yeni öğrenci kaydı | |
| Promotion | Sınıf geçme ve sınıf oluşturma | Başlık olarak |
| Teacher allocation | Öğretmen görevlendirmesi | |
| Go live | Yılı açılışa alma | |
| Student import | Toplu öğrenci aktarımı | |
| Proposal | Öneri | |
| Apply | Uygula | |
| Revert | Geri al | |
| Discard | Vazgeç | |
| Check (prerequisite) | Önkoşul denetimi | |
| Fix | Düzelt | |
| Trace | İşlem kaydı | |
| Run | Çalıştırma | |

## Kimlik ve Hesap

| İngilizce | Türkçe | Not |
|---|---|---|
| Sign in / Sign out | Oturum aç / Oturumu kapat | |
| Forgot password | Şifremi unuttum | |
| Reset password | Şifre sıfırlama | |
| Activation code | Etkinleştirme kodu | |
| Role | Rol | Student=Öğrenci, Guardian=Veli |
| Okul numarası / T.C. Kimlik No | (öğrenci kimlik alanları) | ROLE_LABELS içinde |

## Cinsiyet ve İlişkiler (kod değerleri korunur)

| Kod değer | Türkçe etiket |
|---|---|
| `male` / `female` | Erkek / Kız |
| `father` | Baba |
| `mother` | Anne |
| `guardian` | Vasi |
| `other` | Diğer |

## Bildirimler

| İngilizce | Türkçe |
|---|---|
| General announcement | Genel duyuru |
| Holidays | Tatiller |
| Priority: Normal / Important / Urgent | Normal / Önemli / Acil |

## İdari Personel Unvanları

Laboratuvar görevlisi, İdari işler, Muhasebe, Kütüphane görevlisi, Hizmetli (NON_ACADEMIC_DESIGNATIONS etiketleri; kod değerleri korunur)

## Devamsızlık Bildirimi (backend)

- "Devamsızlık kaydedildi" (başlık)
- "… tarihinde … sınıfında devamsız olarak işaretlendi." (gövde)
