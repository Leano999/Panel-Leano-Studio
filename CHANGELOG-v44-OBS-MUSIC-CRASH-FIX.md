# v44 — Fix: overlay musik hilang & musik restart pas tes leaderboard

## Root cause
`server.js` memanggil fungsi `scheduleLiveStateBroadcast()` di dua tempat
(saat ada event "like" dan saat simulator leaderboard dites), tapi fungsi
itu **tidak pernah didefinisikan** di file tersebut.

Setiap kali fungsi itu dipanggil, Node.js melempar
`ReferenceError: scheduleLiveStateBroadcast is not defined`. Karena
handler socket `"trigger"` tidak dibungkus try/catch, error ini nge-crash
seluruh proses server.

Efek yang kelihatan di sisi user:
- Semua browser source OBS (termasuk overlay musik) kehilangan koneksi
  socket → card musik hilang dari overlay.
- Chrome/browser source yang lagi mutar audio ikut berhenti karena
  koneksinya putus.
- Kalau server di-restart manual/otomatis, semua state di memori
  (antrian lagu, lagu yang lagi jalan) ke-reset ke kosong, jadi pas lagu
  diputar ulang, dia mulai dari 0 lagi (bukan resume).

## Fix
Menambahkan definisi `scheduleLiveStateBroadcast()` yang hilang — sebuah
debounce sederhana (250ms) yang mem-broadcast `stats:update` dan
`goal:update` ke semua client. Ini sesuai desain aslinya: event "like"
bisa datang sangat cepat berturut-turut, jadi broadcast-nya memang
didesain untuk di-debounce, bukan langsung per-event seperti event lain.

Sudah diuji: server sekarang tetap hidup dan tetap mem-broadcast
stats/goal dengan benar saat simulator leaderboard maupun event "like"
ditembak berkali-kali.
