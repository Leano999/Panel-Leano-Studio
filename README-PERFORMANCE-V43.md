# V43 — Dashboard Optimization + Bug Fix

Perubahan di v43 (di atas v42):

- **Fix bug tampilan**: input "Saat ini" & "Target" di form Live Goal tidak
  punya warna teks (default hitam di atas background gelap = tidak
  terbaca). Sudah diberi `color` eksplisit + warna placeholder yang kontras.
- **control.html dipisah**: CSS (37KB) dan JS (32KB) yang tadinya inline
  sekarang jadi `control.css` dan `control.js` terpisah. Ukuran HTML utama
  turun dari ~103KB jadi ~33KB, dan browser bisa nge-cache CSS/JS-nya —
  jadi kalau kamu sering refresh dashboard pas live, loadnya jauh lebih
  cepat setelah load pertama.
- **Google Fonts tidak lagi pakai `@import`** di dalam CSS (itu blocking,
  browser harus selesai fetch CSS dulu baru mulai fetch font). Sekarang
  pakai `<link rel="preconnect">` + `<link rel="stylesheet">` di `<head>`,
  supaya font di-fetch paralel dan first paint dashboard lebih cepat.

Catatan penting: perubahan di atas semua di **dashboard (`control.html`)**,
bukan di overlay yang dipakai sebagai OBS Browser Source. File overlay
(`overlay*.html`) sudah ringan sejak v42 (tidak ada `backdrop-filter`,
tidak ada `blur()`, tidak ada animasi `infinite` yang jalan terus).
Kalau OBS kamu masih frame drop, kemungkinan besar penyebabnya bukan lagi
di kode overlay, tapi di sisi OBS/hosting — lihat catatan di chat.
