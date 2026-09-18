# TTS v47 — IndoFinity Natural

- Jalur TTS tidak lagi membutuhkan Azure Speech/API key.
- Menggunakan Microsoft Edge online neural TTS melalui `node-edge-tts`.
- Voice dikunci ke `id-ID-GadisNeural`; tidak ada dropdown pilihan suara.
- Kontrol kecepatan, nada, dan volume tetap tersedia.
- Cache MP3 mencegah teks yang sama disintesis berulang kali.
- START PANEL.bat otomatis memastikan `node-edge-tts` terpasang.
- START PANEL.sh disediakan untuk Linux.

## Analisis contoh IndoFinity
Video contoh berdurasi 7,68 detik. Bagian suara terdeteksi sekitar 2,65–6,06 detik (±3,42 detik), dengan median fundamental frequency sekitar 219 Hz dan rentang utama sekitar 191–253 Hz. Karakter ini konsisten dengan suara perempuan neural; parameter awal v47 memakai voice perempuan Indonesia `id-ID-GadisNeural` dengan rate 0,95x, pitch netral, dan volume 100%.

Ini pendekatan karakter yang mendekati contoh, bukan cloning identitas suara secara persis.
