# TTS Neural — IndoFinity Natural Style

Panel ini sekarang memakai **Microsoft Azure Speech Neural** di server, bukan `speechSynthesis` browser. Suara dikunci ke:

- Voice: `id-ID-GadisNeural`
- Bahasa: Indonesia
- Output: MP3 24 kHz / 96 kbps mono
- Rate, pitch, dan volume tetap bisa diatur dari panel

Microsoft mendokumentasikan `id-ID-GadisNeural` sebagai voice Indonesian Neural. Untuk kualitas HD, Azure juga menyediakan varian `id-ID-Gadis:DragonHDLatestNeural` pada layanan yang mendukungnya.

## Konfigurasi

Jangan taruh API key di file HTML/JavaScript. Set environment variable di mesin yang menjalankan `server.js`.

### Linux / macOS

```bash
export AZURE_SPEECH_KEY="ISI_KEY_AZURE_KAMU"
export AZURE_SPEECH_REGION="eastus"
npm start
```

### Windows CMD

```bat
set AZURE_SPEECH_KEY=ISI_KEY_AZURE_KAMU
set AZURE_SPEECH_REGION=eastus
npm start
```

### Windows PowerShell

```powershell
$env:AZURE_SPEECH_KEY="ISI_KEY_AZURE_KAMU"
$env:AZURE_SPEECH_REGION="eastus"
npm start
```

Region harus sama dengan region resource Speech Azure kamu.

## Jika TTS tidak berbunyi

1. Pastikan kedua environment variable sudah tersedia pada terminal yang menjalankan panel.
2. Klik **Aktifkan TTS Live** sekali pada panel.
3. Klik **Tes Suara Natural**.
4. Pastikan panel tidak dibisukan dan output audio OBS aktif.
5. Jika server mengembalikan `Azure Speech HTTP ...`, cek key, region, quota, dan resource Speech Azure.

## Catatan

Tampilan panel sengaja tidak lagi menyediakan daftar pilihan voice. Tujuannya agar suara TTS konsisten dan tidak berubah-ubah mengikuti voice yang tersedia di browser/OS.
