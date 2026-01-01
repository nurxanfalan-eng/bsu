# BSU Chat Platform

Bakı Dövlət Universiteti tələbələri üçün interaktiv chat platforması.

## 🎯 Xüsusiyyətlər

### İstifadəçi Sistemı
- ✅ @bsu.edu.az email ilə qeydiyyat
- ✅ +994 ilə başlayan telefon nömrəsi
- ✅ Fakültə yeri doğrulama sualları (3 sual, minimum 2 düzgün)
- ✅ Profil məlumatları: Ad, Fakültə, Dərəcə, Kurs
- ✅ Profil şəkli yükləmə

### Chat Sistemi
- ✅ 16 fakültə otağı
- ✅ Şəxsi mesajlaşma
- ✅ Real-vaxt mesajlaşma (Socket.IO)
- ✅ Auto-scroll funksiyası
- ✅ Əngəllə və şikayət et funksiyaları
- ✅ Mesaj filtrasiyası

### Admin Paneli
- ✅ İstifadəçi statistikası
- ✅ İstifadəçi idarəetməsi (aktiv/deaktiv)
- ✅ Qaydalar redaktəsi
- ✅ Günün mövzusu
- ✅ Filtr sözləri
- ✅ Mesaj silinmə vaxtı ayarları
- ✅ Super admin və alt adminlər

### Texniki Xüsusiyyətlər
- ✅ Bakı vaxt zonası (UTC+4)
- ✅ Modern gradient dizayn
- ✅ Responsive dizayn
- ✅ Production-ready
- ✅ Render.com uyğun

## 🚀 Quraşdırma

```bash
# Dependencies quraşdırma
npm install

# Serveri başlatma
npm start
```

Server default olaraq port 3000-də işləyəcək.

## 🔐 Admin Girişi

**Super Admin:**
- İstifadəçi adı: `ursamajor`
- Şifrə: `ursa618`

## 🏫 Fakültələr

1. Mexanika-riyaziyyat fakültəsi
2. Tətbiqi riyaziyyat və kibernetika fakültəsi
3. Fizika fakültəsi
4. Kimya fakültəsi
5. Biologiya fakültəsi
6. Ekologiya və torpaqşünaslıq fakültəsi
7. Coğrafiya fakültəsi
8. Geologiya fakültəsi
9. Filologiya fakültəsi
10. Tarix fakültəsi
11. Beynəlxalq münasibətlər və iqtisadiyyat fakültəsi
12. Hüquq fakültəsi
13. Jurnalistika fakültəsi
14. İnformasiya və sənəd menecmenti fakültəsi
15. Şərqşünaslıq fakültəsi
16. Sosial elmlər və psixologiya fakültəsi

## 📦 Texnologiyalar

- **Backend:** Node.js, Express.js
- **Real-time:** Socket.IO
- **Authentication:** bcrypt, express-session
- **File Upload:** Multer
- **Frontend:** Vanilla JavaScript, CSS3

## 🌐 Deploy

Layihə Render.com üçün hazırdır:
- `process.env.PORT` konfiqurasiyası
- `package.json` start script
- Bütün dependency-lər daxildir

## 📝 Lisenziya

MIT

## 👨‍💻 Müəllif

GenSpark AI Developer
