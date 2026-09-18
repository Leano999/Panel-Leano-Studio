# TTS Natural Upgrade

- Menambahkan preset `Otomatis — paling natural`, `Natural Perempuan`, dan `Natural Laki-laki`.
- Pemilihan voice Indonesia sekarang memprioritaskan voice Google/Microsoft/neural/natural jika tersedia.
- `overlay-tts.html` sekarang benar-benar memakai setting volume dari panel.
- Rate default dibuat 0.95x agar suara lebih natural.
- TTS-only membersihkan URL panjang dari teks yang dibacakan.
- Daftar voice tidak lagi di-render ulang setiap 1,5 detik jika tidak berubah.

Catatan: browser `speechSynthesis` tetap hanya bisa memakai voice yang tersedia di komputer/browser. Preset ini memilih voice terbaik yang tersedia; ia tidak menciptakan voice neural baru.
