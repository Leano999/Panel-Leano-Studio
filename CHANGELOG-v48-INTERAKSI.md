# v48 — Custom Actions makin mirip "Pusat Interaksi" IndoFinity

Nambah 3 jenis aksi baru di panel kontrol, bagian **Custom Actions**
(sebelumnya cuma ada TTS / Alert / Sound):

## 1. Keystroke Roblox
Sekarang bisa atur "event apa → tekan tombol apa di Roblox" langsung
dari panel, tanpa edit `GIFT_KEY_MAP` di `roblox-bridge.js` lagi.
- Event: bebas (comment/like/follow/gift), + keyword kalau perlu
- Value: nama tombol Roblox, contoh `P`, `SPACE`, `ONE`
- Jalan lewat fungsi `queueKey()` baru di `roblox-bridge.js`, dipakai
  bareng dengan mapping gift default yang lama (dua-duanya tetap jalan).

## 2. Pesan Overlay (foto + teks)
Aksi baru "Pesan Overlay" menampilkan teks custom + foto opsional di
layar, mirip fitur "Tampilkan foto + teks" di Pusat Interaksi IndoFinity.
- Value: teks pesan, boleh pakai `{username}` / `{comment}` / `{gift}`
- Field baru "URL foto": link gambar opsional
- Overlay baru: `public/overlay-message.html` — tambahkan sebagai
  Browser Source terpisah di OBS (URL-nya juga muncul di panel kontrol,
  bagian "Sumber Overlay untuk OBS").

## 3. Webhook
Aksi baru "Webhook" mengirim GET request ke URL manapun saat event
match, mirip fitur trigger webhook di IndoFinity.
- Value: URL tujuan, boleh pakai `{username}` / `{comment}` / `{gift}`
  di dalam URL-nya
- Fire-and-forget: kalau gagal/timeout, cuma nge-log warning di
  terminal server, gak bikin server crash atau macet.

## File yang berubah
- `roblox-bridge.js` — tambah `queueKey()`, diekspor & dipakai bareng
  `maybeQueueEffectForGift()` yang lama.
- `server.js` — `normalizeAction()` sekarang terima jenis aksi baru +
  field `image`; `runCustomActions()` handle keystroke/message/webhook;
  tambah `fireWebhook()`.
- `public/control.js` — dropdown aksi nambah 3 opsi baru, field "URL
  foto" muncul otomatis kalau pilih "Pesan Overlay", placeholder value
  berubah sesuai jenis aksi.
- `public/control.html` — baris URL overlay baru di daftar Browser Source.
- `public/overlay-message.html` — **file baru**, overlay buat aksi
  "Pesan Overlay".

## Cara pakai
1. Jalankan server seperti biasa (`START PANEL.bat` / `node server.js`).
2. Buka `control.html`, scroll ke bagian **Custom Actions**.
3. Klik "+ Tambah Event", pilih event + jenis aksi baru, isi value
   (dan URL foto kalau pesan overlay), klik Simpan.
4. Kalau pakai "Pesan Overlay", tambahkan
   `http://localhost:4200/overlay-message.html` sebagai Browser Source
   baru di OBS (URL persisnya ada di panel kontrol, bagian atas).
