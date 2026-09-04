// ============================================================
// roblox-bridge.js
// ------------------------------------------------------------
// Menyambungkan event gift TikTok Live (yang sudah dideteksi oleh
// tiktok.js) ke game Roblox lo. Roblox akan "polling" (nanya
// berkala) ke endpoint /roblox/events, dan file ini yang jawab.
//
// CARA PAKAI:
//   1. Taruh file ini di folder yang sama dengan server.js
//   2. Di server.js, require dan panggil registerRobloxRoutes(app)
//   3. Di processEvent (server.js), panggil maybeQueueEffectForGift(payload)
//      setiap kali ada event gift masuk.
//   4. Set environment variable ROBLOX_BRIDGE_KEY di Railway (lihat
//      README-ROBLOX-BRIDGE.md untuk caranya).
// ============================================================

const crypto = require("crypto");

// ------------------------------------------------------------
// MAPPING GIFT -> TOMBOL KEYBIND
// ------------------------------------------------------------
// "giftName" HARUS PERSIS SAMA dengan nama gift TikTok aslinya
// (case-sensitive). Kalau nama gift TikTok "Rose", tulis "Rose",
// bukan "rose" atau "ROSE".
//
// "key" adalah nama tombol KeyCode Roblox (P, J, F, ONE, SPACE, dst —
// sama seperti yang kamu ketik di kolom "ShortCut" pas nyimpen
// keybind di StreamerPanel in-game). Gift ini nanti akan "menekan"
// tombol itu untuk STREAM_TARGET_USERNAME — efek apa yang jalan
// SEPENUHNYA ikut keybind yang sudah kamu atur sendiri di game untuk
// tombol tersebut (termasuk durasi/time-nya). Kalau tombol itu belum
// ada keybind-nya di in-game, gift ini gak akan ngapa-ngapain (cuma
// muncul warning di Output Roblox Studio).
//
// Silakan ubah/tambah baris di bawah ini sesuka hati — kamu atur
// efek + durasi masing-masing tombol langsung dari StreamerPanel
// di dalam game, bukan dari sini lagi.
const GIFT_KEY_MAP = {
  "Rose": "P",
};

// ------------------------------------------------------------
// STATE (antrian event yang belum diambil Roblox)
// ------------------------------------------------------------
const MAX_QUEUE = 200; // batas aman kalau Roblox lama gak polling
let queue = [];
let seq = 0;

function timingSafeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  try {
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

// Dipanggil dari server.js setiap ada event masuk ke processEvent().
// Kalau event itu gift dan namanya ada di GIFT_KEY_MAP, dimasukkan
// ke antrian buat diambil Roblox nanti (isinya tombol yang mau
// "ditekan", bukan efek langsung).
function maybeQueueEffectForGift(payload) {
  if (!payload || payload.type !== "gift") return;

  const giftName = payload.giftName || "";
  const key = GIFT_KEY_MAP[giftName];
  if (!key) return; // gift ini gak di-mapping, dilewati

  seq += 1;
  queue.push({
    id: seq,
    key,
    username: payload.username || "",
    giftName,
    count: payload.count || 1,
    ts: Date.now(),
  });

  if (queue.length > MAX_QUEUE) {
    queue.shift(); // buang yang paling lama kalau kepenuhan
  }

  console.log(
    `[roblox-bridge] Antri tombol "${key}" dari gift "${giftName}" (${payload.username || "?"})`
  );
}

// Daftarkan route Express /roblox/events. Panggil ini dari server.js
// setelah `const app = express();` dibuat.
function registerRobloxRoutes(app) {
  app.get("/roblox/events", (req, res) => {
    const apiKey = process.env.ROBLOX_BRIDGE_KEY || "";

    if (!apiKey) {
      // Sengaja gak dibiarkan lolos tanpa key, walau di-set kosong,
      // supaya gak ada yang lupa set env var terus endpoint ini
      // kebuka bebas ke publik.
      return res.status(500).json({
        error: "ROBLOX_BRIDGE_KEY belum di-set. Set environment variable ini dulu di Railway.",
      });
    }

    const providedKey = req.header("x-api-key") || "";
    if (!timingSafeEqual(providedKey, apiKey)) {
      return res.status(401).json({ error: "unauthorized" });
    }

    // Ambil semua event yang nunggu, terus kosongkan antriannya.
    const batch = queue;
    queue = [];
    res.json({ events: batch });
  });

  // Endpoint kecil buat ngecek bridge ini hidup atau enggak
  // (buka aja di browser: https://domain-lo.up.railway.app/roblox/health)
  app.get("/roblox/health", (req, res) => {
    res.json({ ok: true, queued: queue.length, mappedGifts: Object.keys(GIFT_KEY_MAP) });
  });
}

module.exports = { maybeQueueEffectForGift, registerRobloxRoutes, GIFT_KEY_MAP };
