ECOSHIELD AI — OXIRGI VARIANT TO‘LIQ KOD

Mahalliy ishga tushirish:
1. ZIP faylni to‘liq oching.
2. ECOSHIELDNI_ISHGA_TUSHIRISH.bat faylini ikki marta bosing.
3. Terminal oynasini yopmang.
4. Brauzer: http://127.0.0.1:5000

Mahalliy login:
Email: admin@ecoshieldai.uz
Parol: EcoShield2026

GitHub / Render:
- barcha fayllarni GitHub repository asosiy papkasiga yuklang;
- Render start command: gunicorn app:app
- ADMIN_EMAIL, ADMIN_PASSWORD_HASH va SECRET_KEY ni Environment bo‘limiga kiriting.

Muhim:
- Harorat, shamol va namlik Open-Meteo ochiq API orqali olinadi.
- Chang bo‘roni xavfi shamol, harorat va namlik asosidagi MVP indeksidir.
- Bu PM10 yoki PM2.5 sensori o‘lchovi emas.
- NDVI hozircha pilot qiymatlar; keyin Sentinel yoki Google Earth Engine bilan ulanadi.


RASM ASOSIDAGI DIZAYN
- Hudud xaritasi sahifasi yuklangan rasm uslubiga moslab qayta ishlangan.
- Chap qatlamlar paneli, yuqori 4 ta ko‘rsatkich kartasi, katta xarita, ko‘p shamol strelkalari va egri qum oqimlari mavjud.
- GitHub'da asosan templates/map.html, static/js/map.js va static/css/style.css fayllari yangilanadi.


DINAMIK YASHIL TO‘SIQ DEMOSI
- YASHIL_TOSIQ_DEMO.html faylini brauzerda ochib, shamol yo‘nalishini almashtirib sinash mumkin.
- Platformada “Tavsiya etilgan yashil to‘siq” qatlamini yoqish/o‘chirish mumkin.
- Shamol yo‘nalishi yangilanganda tavsiya yashil yo‘lagi ham avtomatik qayta chiziladi.
- Yashil uzun chiziq — tavsiya yo‘lagi.
- Yashil shaffof poligon — taxminiy himoya ta’siri zonasi.


YASHIL TAVSIYA QATLAMI — YOZUVSIZ VARIANT
- Xarita ustidagi “Tavsiya etilgan yashil to‘siq” yozuvlari olib tashlandi.
- Endi faqat qalin yashil chiziq, yashil nuqtalar va shaffof himoya ta’siri zonasi ko‘rinadi.
- Shamol yo‘nalishi o‘zgarsa, yashil tavsiya qatlamining yo‘nalishi ham avtomatik yangilanadi.
