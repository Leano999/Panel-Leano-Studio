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
// MAPPING GIFT -> EFEK ROBLOX
// ------------------------------------------------------------
// "giftName" HARUS PERSIS SAMA dengan nama gift TikTok aslinya
// (case-sensitive). Kalau nama gift TikTok "Rose", tulis "Rose",
// bukan "rose" atau "ROSE".
//
// "effect" harus salah satu nama efek yang sudah dikenali oleh
// runEffect() di server script Roblox (Jail, Unjail, Freeze,
// Unfreeze, Flatten, Explode, PushLeft, PushRight, Respawn, Smite,
// Rocket, Pipe, Brazilian, UnBrazil, NailongPunch, UFO, Flip).
//
// "time" cuma dipakai untuk efek yang butuh durasi (Jail, Freeze,
// Flatten, Explode). Efek lain boleh tidak usah diisi "time".
//
// Silakan ubah/tambah baris di bawah ini sesuka hati.
const GIFT_EFFECT_MAP = {
  "Rose": { effect: "Jail", time: 15 },
  "Perfume": { effect: "Freeze", time: 10 },
  "GG": { effect: "Explode", time: 5 },
  "Universe": { effect: "UFO" },
  "Lion": { effect: "Smite" },
  "Galaxy": { effect: "Rocket" },
  "TikTok": { effect: "Flip" },
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
// Kalau event itu gift dan namanya ada di GIFT_EFFECT_MAP, dimasukkan
// ke antrian buat diambil Roblox nanti.
function maybeQueueEffectForGift(payload) {
  if (!payload || payload.type !== "gift") return;

  const giftName = payload.giftName || "";
  const mapping = GIFT_EFFECT_MAP[giftName];
  if (!mapping) return; // gift ini gak di-mapping, dilewati

  seq += 1;
  queue.push({
    id: seq,
    effect: mapping.effect,
    time: mapping.time || 0,
    username: payload.username || "",
    giftName,
    count: payload.count || 1,
    ts: Date.now(),
  });

  if (queue.length > MAX_QUEUE) {
    queue.shift(); // buang yang paling lama kalau kepenuhan
  }

  console.log(
    `[roblox-bridge] Antri efek "${mapping.effect}" dari gift "${giftName}" (${payload.username || "?"})`
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
    res.json({ ok: true, queued: queue.length, mappedGifts: Object.keys(GIFT_EFFECT_MAP) });
  });
}

module.exports = { maybeQueueEffectForGift, registerRobloxRoutes, GIFT_EFFECT_MAP };
