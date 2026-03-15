# Akıllı Sensör Takip Sistemi (Smart Sensor Tracking System)

Bu proje, bir fabrikadaki IoT sensörlerinden MQTT protokolü ile veri toplayan, gerçek zamanlı olarak bu verileri işleyen ve analiz eden kapsamlı bir backend & frontend sistemidir. Sistem; yetkilendirme, hata yönetimi, detaylı aktivite loglama ve kullanıcı davranış analizi gibi kurumsal özellikleri barındırır.

---

## 🏗 Teknoloji Stack

- **Backend:** Node.js (Express.js) - *Asenkron API yapısı.*
- **Veritabanı:** PostgreSQL (Prisma ORM) - *İlişkisel veri yönetimi.*
- **Gerçek Zamanlı Veri:** MQTT (Eclipse Mosquitto) & Socket.io - *Sensör verilerinin anlık iletimi.*
- **Kimlik Doğrulama:** JWT (JSON Web Token) & Passport.js - *Rol bazlı erişim kontrolü.*
- **Logging:** Structured JSON Logging (Winston & Seq) - *Gelişmiş log izleme ve analiz.*
- **Frontend:** React (Vite & Tailwind CSS) - *Modern, responsive ve dinamik dashboard.*
- **Containerization:** Docker & Docker Compose - *Kolay kurulum ve dağıtım.*
- **CI/CD:** GitHub Actions - *Otomatik test ve deployment.*

---

## 🏗 Mimari Tasarım

Sistem üç temel katmandan oluşmaktadır:

1.  **Ingestion Layer (MQTT Broker):** IoT cihazları (Sensörler) `sensors/[sensor_id]/data` topic'ine JSON formatında veri gönderir.
2.  **Processing Layer (Node.js API):** Backend, MQTT broker'a abone olur, gelen veriyi doğrular, PostgreSQL'e kaydeder ve WebSocket (Socket.io) üzerinden frontend'e yayınlar.
3.  **Presentation Layer (React Dashboard):** Kullanıcılar yetkilerine göre sensör verilerini canlı izleyebilir, geçmişe yönelik raporlar alabilir ve admin yetkisiyle sistemi yönetebilir.

### Kullanıcı Rolleri
- **System Admin:** "God Mode". Şirket/Müşteri oluşturma, kullanıcı yönetimi, tüm IoT entegrasyonları ve tüm loglara erişim. Diğer kullanıcılar tarafından görünmez.
- **Company Admin:** Kendi şirketindeki kullanıcıları yönetebilir, sensör verilerini görebilir ve kullanıcı davranış raporlarını inceleyebilir.
- **User:** Sadece kendisine yetki verilen sensörlerin verilerini görüntüleyebilir.

---

## 📡 API Endpointleri

Tüm API istekleri `/api` prefix'i ile başlar. Korumalı rotalar için `Authorization: Bearer <token>` header'ı gereklidir.

### Kimlik Doğrulama (Auth)
- `POST /api/auth/register` - Yeni kullanıcı kaydı.
- `POST /api/auth/login` - Giriş yapar ve JWT token döner.
- `GET /api/auth/profile` - Mevcut kullanıcı bilgilerini döner.

### Yönetim (Admin - Admin Yetkisi Gerekir)
- `GET /api/admin/companies` - Tüm şirketleri listeler.
- `POST /api/admin/companies` - Yeni şirket oluşturur.
- `GET /api/admin/users` - Şirket bazlı kullanıcıları listeler.
- `POST /api/admin/sensors` - Yeni IoT düğümü (node) kaydeder.
- `PATCH /api/admin/sensors/groups` - Sensör gruplarını toplu günceller.

### Analiz ve Loglar
- `GET /api/admin/logs` - Kullanıcı aktivite loglarını döner (Filtrelenebilir).
- `GET /api/admin/stats/activity` - 24 saatlik işlem yoğunluk şeması.
- `GET /api/admin/stats/behavior-analytics` - **Öngörücü Raporlar:** Gelecek 24 saat tahmini, kullanıcı heatmap ve popüler aksiyonlar.

### Genel
- `GET /api/health` - Sistemin çalışma durumunu kontrol eder.

---

## 📊 Kullanıcı Log Takibi & Analitik

Sistem, kullanıcıların "Log Sayfası" ziyaretlerini otomatik olarak takip eder. 
- **Veri Toplama:** `viewed_logs` aksiyonu kullanıcı ID ve timestamp ile JSON formatında saklanır.
- **Davranış Analizi:** `analyticsService.js` üzerinden son 7 günlük veriler işlenerek:
    - En çok hangi saatlerde sistemin kullanıldığı (Heatmap),
    - Hangi işlemlerin daha sık yapıldığı,
    - Gelecek 24 saat içinde beklenen tahmini trafik yoğunluğu hesaplanır.

---

## 🚀 Kurulum ve Dağıtım (Deployment)

### Gereksinimler
- Docker & Docker Compose
- Node.js v20+ (Yerel testler için)

### Hızlı Kurulum (Docker)
Proje kök dizininde aşağıdaki komutu çalıştırarak tüm sistemleri (DB, MQTT, Seq, Backend, Frontend) ayağa kaldırabilirsiniz:

```bash
docker compose up -d
```

Sistem şu portlarda çalışacaktır:
- Frontend: `http://localhost:5176`
- Backend: `http://localhost:5000`
- Seq (Log İzleme): `http://localhost:8081`
- MQTT Broker: `1883`

### Testlerin Çalıştırılması
Backend endpoint testlerini (Jest) çalıştırmak için:

```bash
cd backend
npm install
npm test
```

---

## 🔐 Güvenlik Gereksinimleri
- **Rate Limiting:** `/api` isteklerine DDoS koruması uygulanmıştır.
- **Helmet & XSS Protection:** Express katmanında güvenlik başlıkları ve input temizliği yapılmaktadır.
- **TLS/SSL:** Prodüksiyon ortamında MQTT ve HTTP trafiği TLS/SSL ile korunmaktadır.
- **Prisma & SQLi:** SQL injection risklerine karşı Prisma ORM'in query builder yapısı kullanılmaktadır.

---

Bu döküman proje mimarisi ve kullanım detaylarını özetlemektedir. Daha fazla teknik detay için kod içerisindeki yorum satırlarını inceleyebilirsiniz.
