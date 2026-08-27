# v45 — Fitur Keypress dari Gift/Event

## Apa yang baru
Sekarang di tab **Custom Action Events** ada pilihan aksi baru: **Keypress**.
Ini bikin panel bisa "menekan" tombol keyboard beneran di komputer kamu
setiap kali event tertentu terjadi (gift, follow, like, atau komentar).

Contoh pemakaian:
- Event: `Gift`, Keyword: `heart me`, Aksi: `Keypress`, Tombol: `Y`, Tahan (ms): `0`
  → setiap ada yang kasih gift "Heart Me", tombol Y otomatis diketuk sekali.
- Event: `Gift`, Keyword: `rose`, Aksi: `Keypress`, Tombol: `J`, Tahan (ms): `1500`
  → setiap ada gift Rose/Mawar, tombol J ditekan dan **ditahan 1.5 detik**
  sebelum dilepas lagi.

Kamu bisa tambahkan rule sebanyak yang kamu mau (satu gift bisa beda tombol,
beda durasi tahan) lewat tombol **"+ Tambah Event"** yang sudah ada.

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
