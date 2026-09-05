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

## v49 — Animasi Follow/Gift: efek baru + stacking vertikal

Perbaikan atas keluhan animasi follow/gift yang kaku dan notifikasi
yang saling geser ke samping kalau di-spam.

### 1. Stacking sekarang vertikal, bukan horizontal
Sebelumnya kalau ada beberapa follow/gift masuk beruntun, kartu
notifikasi berjajar ke SAMPING (geser ke kiri makin banyak makin
sempit). Sekarang container overlay pakai `flex-direction: column`,
jadi notifikasi menumpuk ke ATAS/BAWAH sesuai posisi yang dipilih,
tidak pernah geser ke samping lagi.
- Posisi "Atas Tengah" / "Tengah": notifikasi baru menumpuk ke bawah
- Posisi "Bawah Tengah": notifikasi baru muncul di bawah, yang lama
  otomatis terdorong ke atas

### 2. Animasi masuk lebih halus (gak kaku lagi)
Sebelumnya cuma opacity+geser 8px dalam 0.18 detik (kerasa
patah-patah). Sekarang durasinya lebih pas dan pakai easing
`cubic-bezier` yang natural, ada sedikit efek "settle" di akhir biar
gak berhenti mendadak.

### 3. Bisa pilih efek animasi sendiri
Ada dropdown baru "EFEK MASUK FOLLOW" dan "EFEK MASUK GIFT" di panel
kontrol (bagian Overlay Gallery / Notifikasi Follow & Gift), pilihan:
- **Fade Lembut** — muncul halus dari bawah
- **Bounce Pop** — muncul dengan sedikit mantul (elastic)
- **Zoom Pop** — membesar dari kecil ke ukuran normal
- **Slide dari Kanan** — masuk dari sisi kanan
- **Flip 3D** — muncul dengan efek flip 3 dimensi

Efek ini terpisah dari "STYLE" (warna/tema kartu) yang sudah ada
sebelumnya (Crown Wings/Neon Burst/Music Cat untuk follow,
Treasure/Rose/Universe untuk gift) — jadi kombinasinya makin banyak.

### 4. Tombol "Test Spam (5x)"
Tombol baru di sebelah "Test Follow"/"Test Gift" buat ngirim 5 alert
beruntun cepat, biar langsung kelihatan hasil stacking vertikalnya
tanpa perlu nunggu live beneran atau spam manual.

## File yang berubah
- `public/overlay-follow-gift.html` — container jadi flex column,
  keyframe animasi baru per efek, leave animation lebih halus.
- `public/control.html` — dropdown efek follow/gift baru, tombol
  Test Spam.
- `public/control.js` — baca/simpan `followEffect`/`giftEffect`,
  fungsi `testAnimationSpam()`.
- `server.js` — `overlaySettings.animations` nerima & validasi field
  `followEffect`/`giftEffect` baru.

## Cara pakai
1. Jalankan server, buka `control.html`.
2. Ke bagian **Overlay Gallery** → "NOTIFIKASI FOLLOW & GIFT — ANIMASI".
3. Pilih efek di dropdown "EFEK MASUK FOLLOW" / "EFEK MASUK GIFT",
   klik **Simpan Animasi**.
4. Klik **Test Spam (5x)** buat lihat hasilnya langsung di overlay
   (pastikan `overlay-follow-gift.html` sudah jadi Browser Source di OBS,
   atau buka langsung di tab lain buat preview cepat).

