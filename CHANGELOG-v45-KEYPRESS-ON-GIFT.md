# v45 — Fitur Keypress dari Gift/Event + Dropdown Nama Gift

## Apa yang baru
Sekarang di tab **Custom Action Events** ada 2 tambahan:

1. **Dropdown nama gift** — kalau kamu pilih Event: `Gift`, kolom keyword
   berubah jadi dropdown berisi nama-nama gift TikTok yang umum (Rose,
   Heart Me, GG, Ice Cream Cone, dll), persis kayak di Indofinity. Kalau
   nama gift yang kamu mau nggak ada di daftar, pilih **"Lainnya (ketik
   manual)"** dan ketik sendiri nama gift-nya.
2. **Aksi Keypress** — pilihan aksi baru selain TTS/Alert/Sound. Begitu
   dipilih, muncul kolom "tombol" dan "tahan (ms)".

## Soal daftar gift & harga koin
TikTok **tidak punya API resmi** untuk "daftar semua gift beserta harganya",
jadi dropdown ini disusun manual dari rangkuman harga gift TikTok 2026 yang
beredar publik. Beberapa catatan penting:

- Harga koin & ketersediaan gift **bisa berubah sewaktu-waktu** dari pihak
  TikTok, jadi anggap angka koin di dropdown sebagai perkiraan, bukan
  harga resmi real-time.
- Nama yang dipakai untuk **pencocokan/matching** di sistem adalah nama
  gift versi Inggris (misal `Rose`, `Perfume`, `Doughnut`), karena itu yang
  dikirim oleh TikTok lewat koneksi live — walaupun di aplikasi TikTok
  sendiri kamu lihat labelnya dalam Bahasa Indonesia (misal "Mawar").
  Dropdown menampilkan kedua nama sekaligus biar gampang dikenali.
- Kalau gift yang kamu mau nggak ada di daftar, atau ternyata nama yang
  dikirim TikTok beda dari yang ada di dropdown, pilih **"Lainnya (ketik
  manual)"** dan ketik nama gift sesuai yang muncul di log/komentar
  overlay kamu saat live.


## Cara kerja (penting dibaca)
Fitur ini pakai library `@nut-tree-fork/nut-js` untuk mensimulasikan
keyboard di level sistem operasi (OS-level), bukan cuma di dalam browser.

**Fitur ini HANYA berfungsi kalau panel dijalankan LOKAL di PC kamu**
(lewat `START PANEL.bat`), karena yang ditekan adalah keyboard fisik/virtual
di komputer itu sendiri. Kalau panel dijalankan di Railway (server cloud),
fitur ini otomatis nonaktif dengan sendirinya (server akan mencatat pesan
peringatan di log, tapi tidak akan crash) — karena server cloud tidak
punya sesi desktop/keyboard untuk menekan tombol ke mana pun.

Jadi kalau kamu memang butuh fitur ini aktif, jalankan panel di PC yang
sama dengan tempat OBS/game kamu terbuka, pakai `START PANEL.bat` seperti
biasa (bukan versi Railway).

## Instalasi
Karena ada dependency baru (`@nut-tree-fork/nut-js`), setelah update file:
1. Update semua file dari paket ini ke folder project kamu (`server.js`,
   `public/control.js`, `package.json`).
2. Hapus folder `node_modules` lama (biar dependency baru ke-install
   dengan bersih), lalu jalankan `START PANEL.bat` lagi seperti biasa —
   script itu otomatis `npm install` dulu sebelum menyalakan server.
3. Kalau instalasi `@nut-tree-fork/nut-js` gagal (jarang terjadi, biasanya
   di Windows versi lama), fitur TTS/Alert/Sound yang lain tetap jalan
   normal seperti biasa — cuma opsi Keypress yang tidak aktif.

## Nama tombol yang didukung
Ketik salah satu di kolom "tombol" (tidak case-sensitive):
- Huruf: `A`–`Z`
- Angka: `0`–`9`
- Tombol fungsi: `F1`–`F12`
- Lainnya: `SPACE`, `ENTER`, `TAB`, `ESC`, `UP`, `DOWN`, `LEFT`, `RIGHT`,
  `SHIFT`, `CTRL`, `ALT`
