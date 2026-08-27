# V41 — Performance Lite

Tujuan: mengurangi beban OBS Browser Source tanpa menghapus fitur/workspace.

Perubahan:
- Overlay tidak lagi memuat stylesheet panel utama secara penuh.
- Glow/shadow/filter berat dikurangi pada alert, chat, leaderboard, dan music overlay.
- Animasi dibuat lebih singkat dan sederhana.
- Particle/shine/pulse dekoratif dimatikan.
- TTS tidak lagi melakukan keepalive interval setiap 1 detik dan tidak auto-prime saat load.
- Fitur event, chat, TTS, leaderboard, goal, music request, dan workspace panel tetap dipertahankan.

Catatan:
- Jika memakai beberapa Browser Source sekaligus, masing-masing tetap merupakan halaman Chromium terpisah. Untuk beban paling rendah, gunakan hanya source yang memang diperlukan.
