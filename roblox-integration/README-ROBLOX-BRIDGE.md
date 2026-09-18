# Menyambungkan TikTok Live -> Roblox lewat panel-leano + Railway

Panduan ini asumsinya: website `panel-leano` lo **sudah pernah** di-deploy
ke Railway sebelumnya (jadi akun Railway & mungkin repo GitHub sudah ada).
Kalau belum pernah deploy sama sekali, kasih tau saja, nanti disesuaikan.

---

## Bagian 1 — Update kode di komputer lo

1. Salin 2 file ini ke folder project `panel-leano` lo (folder yang isinya
   `server.js`, `tiktok.js`, `package.json`, dst):
   - `roblox-bridge.js` (file baru)
   - `server.js` (menimpa yang lama — sudah termasuk 2 baris tambahan
     yang manggil `roblox-bridge.js`)

2. Buka `roblox-bridge.js`, cari bagian `GIFT_KEY_MAP`. Sesuaikan nama
   gift TikTok (harus persis, termasuk huruf besar/kecil) dengan tombol
   keybind yang mau "ditekan" pas gift itu masuk. Contoh:

   ```js
   const GIFT_KEY_MAP = {
     "Rose": "P",
     "Perfume": "J",
     "GG": "F",
   };
   ```

   Nama tombolnya ("P", "J", "F", "ONE", "SPACE", dst) harus sama
   persis dengan yang kamu ketik di kolom **ShortCut** pas nyimpen
   keybind di StreamerPanel **di dalam game**. Efek apa yang jalan dan
   berapa lama durasinya itu 100% ikut keybind yang kamu atur sendiri
   di situ — bukan dikonfigurasi di sini lagi. Kalau kamu ganti isi
   tombol P di in-game dari Jail ke Freeze, gift Rose otomatis ikut
   berubah tanpa perlu ubah kode ini.

---

## Bagian 2 — Push ke GitHub

Kalau project ini **belum** ada di GitHub:

```bash
cd panel-leano-v43-lite
git init
git add .
git commit -m "Tambah roblox bridge"
```

Terus bikin repo baru (private) di https://github.com/new, jangan centang
"Initialize with README". Setelah repo dibuat, GitHub kasih 2-3 baris
command — jalankan itu, kira-kira:

```bash
git remote add origin https://github.com/USERNAME-LO/panel-leano.git
git branch -M main
git push -u origin main
```

Kalau project **sudah** ada di GitHub sebelumnya, tinggal:

```bash
git add roblox-bridge.js server.js
git commit -m "Tambah integrasi Roblox"
git push
```

---

## Bagian 3 — Set Environment Variable di Railway

1. Buka project panel-leano lo di https://railway.app
2. Klik service-nya (bukan bikin service baru — kita gabung ke yang sudah ada)
3. Masuk tab **Variables**
4. Klik **New Variable**, isi:
   - Name: `ROBLOX_BRIDGE_KEY`
   - Value: teks acak yang panjang & susah ditebak, contoh:
     `x7Kp92mVq4LwYt8Zr1Nb5Fc3Ha6De0Ju`
     (bisa generate sendiri di https://1password.com/password-generator/
     atau command `openssl rand -hex 24` di terminal)
5. Simpan — Railway otomatis restart service dengan variable baru itu.

Kalau lo push kode dari Bagian 2 dan Railway lo sudah tersambung ke repo
GitHub itu, Railway akan **otomatis re-deploy** begitu ada push baru.
Kalau belum tersambung otomatis, di dashboard Railway pilih **Deploy from
GitHub repo** dan pilih repo `panel-leano` lo.

---

## Bagian 4 — Cek bridge sudah hidup

Buka di browser:
```
https://NAMA-PROJECT-LO.up.railway.app/roblox/health
```
(URL persisnya bisa dilihat di tab **Settings > Domains** project Railway lo)

Kalau berhasil, muncul sesuatu kayak:
```json
{"ok":true,"queued":0,"mappedGifts":["Rose"]}
```

Kalau muncul error 500 soal `ROBLOX_BRIDGE_KEY belum di-set`, berarti
Bagian 3 belum tersimpan / belum ke-deploy ulang.

---

## Bagian 5 — Sambungkan ke Roblox

1. Buka Roblox Studio, buka game lo.
2. Buka **Game Settings > Security**, nyalakan **"Allow HTTP Requests"**.
3. Buka script server `StreamerPro Server Handler` (yang isinya fungsi
   `runEffect`, `onPlayerAdded`, dll).
4. Tempel isi file `roblox-tiktok-polling.lua` di bagian paling bawah
   script itu. (Kalau sebelumnya sudah pernah pasang versi lama, ganti
   seluruh bagian "TIKTOK LIVE BRIDGE" yang lama dengan isi file baru
   ini — versi baru pakai `simulateKeyPress()`, bukan `runEffect()`
   langsung.)
5. Ganti 3 baris ini di paling atas snippet:
   ```lua
   local TIKTOK_BRIDGE_URL = "https://NAMA-PROJECT-LO.up.railway.app/roblox/events"
   local TIKTOK_BRIDGE_KEY = "x7Kp92mVq4LwYt8Zr1Nb5Fc3Ha6De0Ju" -- SAMA PERSIS dengan Bagian 3
   local STREAM_TARGET_USERNAME = "UsernameRobloxLo"
   ```
6. Publish game.

---

## Bagian 6 — Testing

1. Buka `control.html` panel lo, connect ke akun TikTok yang mau di-tes
   (harus lagi LIVE).
2. Di dalam game, pastikan `STREAM_TARGET_USERNAME` sudah simpan
   keybind buat tombol yang ada di `GIFT_KEY_MAP` (misal tombol "P")
   lewat StreamerPanel — coba dulu manual pencet tombolnya, pastikan
   efeknya beneran jalan.
3. Minta orang lain (atau kirim sendiri kalau bisa) gift yang ada di
   `GIFT_KEY_MAP`, misalnya "Rose".
4. Dalam 1-3 detik, di Output/Console Roblox Studio (kalau lagi test di
   Studio) akan muncul log:
   ```
   [TikTokBridge] Gift 'Rose' x1 dari username123 -> pencet tombol 'P'
   ```
5. Efek yang tersimpan di keybind tombol "P" akan langsung jalan ke
   `STREAM_TARGET_USERNAME`.

Kalau muncul warning `belum punya keybind buat tombol 'P'`, berarti
kamu belum nyimpen keybind tombol itu di StreamerPanel in-game — buka
panelnya, atur efek + durasi buat tombol "P", baru gift bisa trigger.

Kalau gak muncul apa-apa, cek urutan ini:
- `/roblox/health` di browser bisa diakses? (Bagian 4)
- "Allow HTTP Requests" sudah ON di Studio?
- `TIKTOK_BRIDGE_KEY` di script Lua PERSIS SAMA dengan `ROBLOX_BRIDGE_KEY`
  di Railway (huruf besar/kecil harus sama)?
- Nama gift di `GIFT_EFFECT_MAP` persis sama dengan nama gift TikTok asli?
- `STREAM_TARGET_USERNAME` sudah join ke server game itu?

---

## Catatan

- **Jangan pernah** commit/push nilai `ROBLOX_BRIDGE_KEY` ke dalam kode
  (jangan hardcode di `roblox-bridge.js`) — itu kenapa dia diambil dari
  `process.env`, biar cuma ada di Railway, bukan di GitHub.
- `tiktok-live-connector` itu library tidak resmi (reverse-engineered),
  jadi sewaktu-waktu bisa berhenti kerja kalau TikTok ubah sistem internal
  mereka — ini risiko yang sudah melekat sejak awal lo pakai panel ini,
  bukan sesuatu yang baru dari integrasi Roblox ini.
