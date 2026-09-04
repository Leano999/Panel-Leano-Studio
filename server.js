const express = require("express");
const http = require("http");
const path = require("path");
const os = require("os");
const { Server } = require("socket.io");
const { setupTiktok } = require("./tiktok");
const { maybeQueueEffectForGift, registerRobloxRoutes } = require("./roblox-bridge");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "public")));
registerRobloxRoutes(app);

const tiktok = setupTiktok(io, processEvent);

// TTS auto-read settings, in-memory (resets on server restart).
// readComments/readLikes control whether the overlay speaks incoming
// comment/like events automatically. Likes default OFF since they can
// fire very rapidly and would spam the TTS.
let ttsSettings = {
  readComments: true,
  readLikes: false,
  // Follow/Gift use custom SFX by default, not TTS.
  readFollows: false,
  readGifts: false,
  voiceName: "",
  rate: 1,
  pitch: 1,
  volume: 1,
};

let overlaySettings = {
  theme: "glass",
  chat: { style: "glass-card", gap: 16 },
  animations: {
    enabled: true,
    followStyle: "wings",
    giftStyle: "treasure",
    followDuration: 4,
    giftDuration: 5,
    position: "top-center",
  },
};

let streamStats = {
  comments: 0,
  likes: 0,
  follows: 0,
  gifts: 0,
  giftCoins: 0,
  startedAt: null,
  lastEventAt: null,
};

let goalSettings = {
  enabled: true,
  type: "likes",
  target: 1000,
  current: 0,
  title: "Like Goal",
};

let recentComments = [];
const MAX_RECENT_COMMENTS = 40;
let liveSessionId = 0;
let manualLikeLeaderboard = {};
const MAX_LEADERBOARD = 5;
let likeLeaderboard = {};

// Music request queue (YouTube). Requests are created from LIVE comments using !song.
const MUSIC_MAX_QUEUE = 10;
// Music is request-only: nothing is ever auto-started without a !song request.
const MUSIC_COOLDOWN_MS = 30000;
let musicQueue = [];
let musicCurrent = null;
let musicRequestCooldown = new Map();
let musicSearchBusy = false;
let musicSettings = { volume: 0.75 };

// ------------------------------------------------------------
// FALLBACK PLAYLIST ("Auto DJ") — daftar lagu yang streamer siapkan
// sekali, lalu otomatis diputar bergiliran SETIAP KALI antrian
// request dari penonton kosong. Streamer gak perlu buka panel
// berulang-ulang buat isi request sendiri.
// ------------------------------------------------------------
let fallbackPlaylist = []; // array of query strings, in-memory (reset kalau server restart)
let fallbackCursor = 0;
let fallbackEnabled = true;
let fallbackBusy = false;
const FALLBACK_MAX = 30;

function fallbackState() {
  return { items: fallbackPlaylist, enabled: fallbackEnabled };
}
function broadcastFallback() { io.emit("music:fallback:update", fallbackState()); }

// Coba mainkan lagu berikutnya dari fallbackPlaylist (round-robin).
// Kalau satu lagu gagal dicari (mis. video ditarik/error), otomatis
// coba lagu berikutnya di daftar, sampai maksimal sepanjang daftar itu
// sendiri (biar gak infinite loop kalau semuanya gagal).
async function playNextFallbackSong() {
  if (fallbackBusy || !fallbackPlaylist.length || musicCurrent) return;
  fallbackBusy = true;
  try {
    let attempts = 0;
    while (attempts < fallbackPlaylist.length) {
      const query = fallbackPlaylist[fallbackCursor % fallbackPlaylist.length];
      fallbackCursor = (fallbackCursor + 1) % fallbackPlaylist.length;
      attempts += 1;
      try {
        const found = await searchYouTube(query);
        musicCurrent = { ...found, requestedBy: "Auto DJ", query, id: `${found.videoId}-${Date.now()}` };
        broadcastMusic();
        return;
      } catch (err) {
        console.warn("[fallback] gagal cari lagu:", query, err?.message || err);
        // lanjut coba lagu berikutnya di playlist
      }
    }
  } finally {
    fallbackBusy = false;
  }
}

function musicState() {
  return {
    current: musicCurrent,
    queue: musicQueue.slice(),
    queueCount: musicQueue.length,
    maxQueue: MUSIC_MAX_QUEUE,
    volume: musicSettings.volume,
  };
}

function broadcastMusic() { io.emit("music:update", musicState()); }

async function searchYouTube(query) {
  const https = require("https");
  const url = "https://www.youtube.com/results?search_query=" + encodeURIComponent(query);
  const html = await new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9"
      }
    }, res => {
      let data = "";
      res.setEncoding("utf8");
      res.on("data", c => data += c);
      res.on("end", () => resolve(data));
    });
    req.on("error", reject);
    req.setTimeout(12000, () => { req.destroy(new Error("YouTube search timeout")); });
  });
  const marker = "var ytInitialData = ";
  const start = html.indexOf(marker);
  if (start < 0) throw new Error("YouTube search tidak tersedia.");
  const jsonStart = start + marker.length;
  const end = html.indexOf(";</script>", jsonStart);
  if (end < 0) throw new Error("Hasil YouTube tidak bisa dibaca.");
  const data = JSON.parse(html.slice(jsonStart, end));
  const contents = data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];
  for (const section of contents) {
    const items = section?.itemSectionRenderer?.contents || [];
    for (const item of items) {
      const v = item?.videoRenderer;
      if (!v?.videoId || !v?.title?.runs?.[0]?.text) continue;
      const title = v.title.runs.map(x => x.text).join("");
      const channel = v.ownerText?.runs?.[0]?.text || "YouTube";
      const duration = v.lengthText?.simpleText || v.lengthText?.runs?.map(x => x.text).join("") || "";
      const thumbnail = `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`;
      return { videoId: v.videoId, title, channel, duration, thumbnail };
    }
  }
  throw new Error("Video YouTube tidak ditemukan.");
}

// Sama seperti searchYouTube(), tapi mengumpulkan beberapa hasil sekaligus
// (bukan cuma hasil pertama). Dipakai oleh "YouTube Player (Auto)" supaya
// kata kunci pencarian bisa diputar sebagai daftar video asli — soalnya
// fitur bawaan IFrame API `listType:'search'` sudah lama dimatikan YouTube
// dan selalu balikin error "An error occurred. Please try again later."
// Judul-judul di hasil pencarian YouTube sering ada beberapa versi dari lagu
// yang sama persis (Official Video / Lyrics / Audio / Cover) dengan title
// yang nyaris identik. Kalau gak difilter, itu bikin playlist kerasa
// "ngulang-ngulang lagu yang sama" walau sebenarnya videoId-nya beda-beda.
// Fungsi ini menyamakan title jadi bentuk polos (tanpa tag [...]/(...) dan
// tanda baca) buat dipakai sebagai kunci dedupe.
// Judul di hasil pencarian YouTube sering ada BANYAK versi dari lagu yang
// sama persis (official audio, lyric video, cover, slowed+reverb, nightcore,
// radio edit, dll) yang TIDAK identik teksnya, tapi kalau kata "pengisi"-nya
// dibuang, sisa kata intinya (nama lagu + artis) sama. Makanya perbandingan
// di sini pakai kemiripan kata inti (token overlap), bukan kesamaan teks
// persis -- biar gak kejadian lagi kasus playlist isinya "Losing Us" doang
// diulang-ulang walau videoId-nya beda-beda tiap kali.
const TITLE_FILLER_WORDS = new Set([
  "official","video","audio","lyrics","lyric","mv","hd","hq","4k","visualizer",
  "cover","remix","slowed","reverb","sped","nightcore","karaoke","instrumental",
  "acoustic","live","extended","clean","explicit","radio","edit","version","ver",
  "ft","feat","featuring","with","the","a","an","of","and","x","prod","by",
  "lofi","dance","choreography","full","song","tiktok","viral","music","videos",
  "8d","bass","boosted","hour","loop","trap","type","beat","reaction","performance",
  "original","new","hits","1080p","720p"
]);
function titleTokens(title) {
  let t = String(title || "").toLowerCase();
  t = t.replace(/[\[(].*?[\])]/g, " ");
  t = t.replace(/[^a-z0-9\s]/g, " ");
  return new Set(t.split(/\s+/).filter(w => w && w.length > 1 && !TITLE_FILLER_WORDS.has(w)));
}
function isSimilarTitle(tokensA, existingTokenSets) {
  for (const tokensB of existingTokenSets) {
    const inter = [...tokensA].filter(w => tokensB.has(w)).length;
    const union = new Set([...tokensA, ...tokensB]).size;
    if (union > 0 && inter / union >= 0.5) return true;
  }
  return false;
}

async function searchYouTubeMulti(query, limit = 10) {
  const https = require("https");
  const url = "https://www.youtube.com/results?search_query=" + encodeURIComponent(query);
  const html = await new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9"
      }
    }, res => {
      let data = "";
      res.setEncoding("utf8");
      res.on("data", c => data += c);
      res.on("end", () => resolve(data));
    });
    req.on("error", reject);
    req.setTimeout(12000, () => { req.destroy(new Error("YouTube search timeout")); });
  });
  const marker = "var ytInitialData = ";
  const start = html.indexOf(marker);
  if (start < 0) throw new Error("YouTube search tidak tersedia.");
  const jsonStart = start + marker.length;
  const end = html.indexOf(";</script>", jsonStart);
  if (end < 0) throw new Error("Hasil YouTube tidak bisa dibaca.");
  const data = JSON.parse(html.slice(jsonStart, end));
  const contents = data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];
  const results = [];
  const seenVideoIds = new Set();
  const keptTokenSets = [];
  const rawLimit = limit * 6; // pool lebih besar, karena banyak yang bakal kesaring dedupe kemiripan
  let scanned = 0;
  outer:
  for (const section of contents) {
    const items = section?.itemSectionRenderer?.contents || [];
    for (const item of items) {
      const v = item?.videoRenderer;
      if (!v?.videoId || !v?.title?.runs?.[0]?.text) continue;
      scanned += 1;
      if (seenVideoIds.has(v.videoId)) { if (scanned >= rawLimit) break outer; continue; }
      const title = v.title.runs.map(x => x.text).join("");
      const tokens = titleTokens(title);
      if (tokens.size && isSimilarTitle(tokens, keptTokenSets)) { if (scanned >= rawLimit) break outer; continue; }
      const channel = v.ownerText?.runs?.[0]?.text || "YouTube";
      const duration = v.lengthText?.simpleText || v.lengthText?.runs?.map(x => x.text).join("") || "";
      const thumbnail = `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`;
      seenVideoIds.add(v.videoId);
      if (tokens.size) keptTokenSets.push(tokens);
      results.push({ videoId: v.videoId, title, channel, duration, thumbnail });
      if (results.length >= limit || scanned >= rawLimit) break outer;
    }
  }
  if (!results.length) throw new Error("Video YouTube tidak ditemukan.");
  return results;
}

// Khusus buat fallback kalau video pertama gagal diputar (kena restriksi
// embed / region-lock / dll) -- BEDA dari searchYouTubeMulti yang sengaja
// menyaring versi mirip untuk shuffle genre. Di sini kita justru MAU
// beberapa upload lain dari lagu yang sama (official/lyric/cover dari
// channel berbeda) sebagai cadangan, biar kalau upload pertama dikunci
// embed-nya, player bisa otomatis coba upload lain tanpa nge-skip lagu.
async function searchYouTubeCandidates(query, limit = 5) {
  const https = require("https");
  const url = "https://www.youtube.com/results?search_query=" + encodeURIComponent(query);
  const html = await new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9"
      }
    }, res => {
      let data = "";
      res.setEncoding("utf8");
      res.on("data", c => data += c);
      res.on("end", () => resolve(data));
    });
    req.on("error", reject);
    req.setTimeout(12000, () => { req.destroy(new Error("YouTube search timeout")); });
  });
  const marker = "var ytInitialData = ";
  const start = html.indexOf(marker);
  if (start < 0) throw new Error("YouTube search tidak tersedia.");
  const jsonStart = start + marker.length;
  const end = html.indexOf(";</script>", jsonStart);
  if (end < 0) throw new Error("Hasil YouTube tidak bisa dibaca.");
  const data = JSON.parse(html.slice(jsonStart, end));
  const contents = data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];
  const results = [];
  const seen = new Set();
  for (const section of contents) {
    const items = section?.itemSectionRenderer?.contents || [];
    for (const item of items) {
      const v = item?.videoRenderer;
      if (!v?.videoId || !v?.title?.runs?.[0]?.text) continue;
      if (seen.has(v.videoId)) continue;
      seen.add(v.videoId);
      const title = v.title.runs.map(x => x.text).join("");
      const channel = v.ownerText?.runs?.[0]?.text || "YouTube";
      const duration = v.lengthText?.simpleText || v.lengthText?.runs?.map(x => x.text).join("") || "";
      const thumbnail = `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`;
      results.push({ videoId: v.videoId, title, channel, duration, thumbnail });
      if (results.length >= limit) return results;
    }
  }
  if (!results.length) throw new Error("Video YouTube tidak ditemukan.");
  return results;
}

async function addMusicRequest(username, query) {
  const clean = String(query || "").trim().slice(0, 160);
  if (!clean) return { ok:false, message:"Judul lagu kosong." };
  if (musicQueue.length >= MUSIC_MAX_QUEUE && musicCurrent) return { ok:false, message:`Antrian penuh (maks ${MUSIC_MAX_QUEUE}).` };
  const key = String(username || "Penonton").toLowerCase();
  const now = Date.now();
  if ((musicRequestCooldown.get(key) || 0) > now) {
    const sec = Math.ceil((musicRequestCooldown.get(key) - now) / 1000);
    return { ok:false, message:`@${username}, tunggu ${sec} detik sebelum request lagi.` };
  }
  if (musicSearchBusy) return { ok:false, message:"Bot sedang mencari request lain, coba lagi sebentar." };
  musicSearchBusy = true;
  try {
    const candidates = await searchYouTubeCandidates(clean, 5);
    const [found, ...altCandidates] = candidates;
    // altCandidates disertakan ke client: kalau video utama gagal diputar
    // (mis. embed dikunci pemiliknya), player otomatis coba upload lain
    // dari lagu yang sama, bukan langsung nge-skip request ini.
    const item = { ...found, altCandidates, requestedBy: String(username || "Penonton"), query: clean, id: `${found.videoId}-${Date.now()}` };
    musicRequestCooldown.set(key, now + MUSIC_COOLDOWN_MS);
    // Request beneran dari penonton diprioritaskan di atas Auto DJ —
    // kalau yang lagi main sekarang cuma lagu isian dari fallback
    // playlist, langsung ganti ke lagu yang direquest ini.
    if (!musicCurrent || musicCurrent.requestedBy === "Auto DJ") {
      musicCurrent = item;
    } else {
      musicQueue.push(item);
    }
    broadcastMusic();
    return { ok:true, item, state:musicState() };
  } catch (err) {
    return { ok:false, message: err?.message || "Gagal mencari lagu di YouTube." };
  } finally {
    musicSearchBusy = false;
  }
}

function musicNext() {
  musicCurrent = musicQueue.shift() || null;
  broadcastMusic();
  if (!musicCurrent && fallbackEnabled && fallbackPlaylist.length) {
    playNextFallbackSong();
  }
}

// Likes can arrive very rapidly (real TikTok likes or the leaderboard
// simulator). Debounce the stats/goal broadcast instead of firing on every
// single like so we don't flood all connected sockets (OBS overlays,
// control panel, music player) with updates.
// NOTE: this function was previously missing entirely, which caused an
// uncaught ReferenceError inside processEvent() any time a "like" event or
// the leaderboard simulator ran — crashing the whole Node server and
// dropping every connected socket (OBS overlays going blank, music
// playback stopping and losing its in-memory queue/progress on restart).
let liveStateBroadcastTimer = null;
function scheduleLiveStateBroadcast() {
  if (liveStateBroadcastTimer) return;
  liveStateBroadcastTimer = setTimeout(() => {
    liveStateBroadcastTimer = null;
    io.emit("stats:update", streamStats);
    io.emit("goal:update", goalSettings);
  }, 250);
}

let customActions = [
  {
    id: "follow-sfx",
    enabled: true,
    event: "follow",
    keyword: "",
    action: "sound",
    value: "follow",
  },
  {
    id: "gift-sfx",
    enabled: true,
    event: "gift",
    keyword: "",
    action: "sound",
    value: "gift",
  },
];

io.on("connection", (socket) => {
  // Socket.IO connection is not the same as TikTok Live connection.
  socket.emit("tiktok:status", tiktok.getStatus());
  // Send nothing on connect - overlay starts clean every time it's (re)loaded in OBS
  socket.on("trigger", (payload) => {
    processEvent(payload, { source: "manual" });
  });

  socket.on("actions:get", () => socket.emit("actions:list", customActions));
  socket.on("actions:save", (actions = []) => {
    customActions = Array.isArray(actions) ? actions.slice(0, 50).map(normalizeAction) : [];
    io.emit("actions:list", customActions);
  });

  socket.on("goal:get", () => socket.emit("goal:update", goalSettings));
  socket.on("goal:save", (payload = {}) => {
    goalSettings = {
      enabled: !!payload.enabled,
      type: ["likes", "comments", "gifts"].includes(payload.type) ? payload.type : "likes",
      target: Math.max(1, Number(payload.target) || 1000),
      current: Math.max(0, Number(payload.current) || 0),
      title: String(payload.title || "Live Goal").slice(0, 60),
    };
    io.emit("goal:update", goalSettings);
  });

  socket.on("stats:get", () => socket.emit("stats:update", streamStats));
  socket.on("stats:reset", () => {
    streamStats = { comments: 0, likes: 0, follows: 0, gifts: 0, giftCoins: 0, startedAt: Date.now(), lastEventAt: null };
    io.emit("stats:update", streamStats);
  });

  // Send current settings and recent comments to newly connected clients.
  // This lets the comment browser source rebuild its feed after an OBS/browser refresh.
  socket.emit("tts:settings", ttsSettings);
  socket.emit("overlay:settings", overlaySettings);
  socket.emit("comments:history", recentComments.slice(-MAX_RECENT_COMMENTS));
  socket.emit("music:update", musicState());
  socket.emit("music:settings", musicSettings);

  socket.on("tts:settings", (payload = {}) => {
    ttsSettings = {
      readComments: !!payload.readComments,
      readLikes: !!payload.readLikes,
      readFollows: payload.readFollows === true,
      readGifts: payload.readGifts === true,
      voiceName: typeof payload.voiceName === "string" ? payload.voiceName : "",
      rate: Math.min(2, Math.max(0.5, Number(payload.rate) || 1)),
      pitch: Math.min(2, Math.max(0, Number(payload.pitch) || 1)),
      volume: Math.min(1, Math.max(0, Number(payload.volume) || 1)),
    };
    io.emit("tts:settings", ttsSettings);
  });

  socket.on("overlay:settings", (payload = {}) => {
    const allowedThemes = ["glass", "neon", "bubble", "minimal", "pink"];
    const a = payload.animations || {};
    const allowedFollow = ["wings", "neon", "cat"];
    const allowedGift = ["treasure", "rose", "universe"];
    const allowedPos = ["top-center", "center", "bottom-center"];
    const allowedChatStyles = ["glass-card", "pill", "speech", "stacked", "neon-line", "compact"];
    const chatPayload = payload.chat || {};
    overlaySettings = {
      theme: allowedThemes.includes(payload.theme) ? payload.theme : overlaySettings.theme,
      chat: {
        style: allowedChatStyles.includes(chatPayload.style) ? chatPayload.style : (overlaySettings.chat?.style || "glass-card"),
        gap: Math.min(28, Math.max(8, Number(chatPayload.gap) || overlaySettings.chat?.gap || 16)),
      },
      animations: {
        enabled: a.enabled !== false,
        followStyle: allowedFollow.includes(a.followStyle) ? a.followStyle : (overlaySettings.animations?.followStyle || "wings"),
        giftStyle: allowedGift.includes(a.giftStyle) ? a.giftStyle : (overlaySettings.animations?.giftStyle || "treasure"),
        followDuration: Math.min(10, Math.max(2, Number(a.followDuration) || overlaySettings.animations?.followDuration || 4)),
        giftDuration: Math.min(10, Math.max(2, Number(a.giftDuration) || overlaySettings.animations?.giftDuration || 5)),
        position: allowedPos.includes(a.position) ? a.position : (overlaySettings.animations?.position || "top-center"),
      },
    };
    io.emit("overlay:settings", overlaySettings);
  });

  socket.on("music:settings", (payload = {}) => {
    musicSettings = { volume: Math.min(1, Math.max(0, Number(payload.volume) || 0)) };
    io.emit("music:settings", musicSettings);
    io.emit("music:update", musicState());
  });

  socket.on("music:settings:get", () => socket.emit("music:settings", musicSettings));

  socket.on("music:request", async ({ username, query } = {}) => {
    const result = await addMusicRequest(username, query);
    socket.emit("music:request-result", result);
  });
  socket.on("music:skip", () => musicNext());
  socket.on("music:stop", () => { musicCurrent = null; musicQueue = []; broadcastMusic(); });
  socket.on("music:clear", () => { musicQueue = []; broadcastMusic(); });
  socket.on("music:ended", ({ videoId } = {}) => {
    if (!musicCurrent) return;
    if (videoId && musicCurrent.videoId !== videoId) return;
    musicNext();
  });
  socket.on("music:state", () => socket.emit("music:update", musicState()));
  socket.on("ytauto:search", async (payload, ack) => {
    const isObj = payload && typeof payload === "object";
    const clean = String(isObj ? payload.query : payload || "").trim().slice(0, 160);
    const limit = Math.max(3, Math.min(30, Number(isObj ? payload.limit : 15) || 15));
    if (typeof ack !== "function") return;
    if (!clean) { ack({ ok: false, message: "Kata kunci kosong." }); return; }
    try {
      const results = await searchYouTubeMulti(clean, limit);
      ack({ ok: true, results });
    } catch (err) {
      ack({ ok: false, message: err?.message || "Gagal mencari di YouTube." });
    }
  });

  // ---- Fallback playlist ("Auto DJ") ----
  socket.on("music:fallback:get", () => {
    socket.emit("music:fallback:update", fallbackState());
    // Kalau panel baru connect dan gak ada apa-apa yang lagi main,
    // langsung nyalain auto DJ (biar gak sunyi dari awal buka panel).
    if (fallbackEnabled && !musicCurrent && !musicQueue.length && fallbackPlaylist.length) {
      playNextFallbackSong();
    }
  });
  socket.on("music:fallback:add", ({ query } = {}) => {
    const clean = String(query || "").trim().slice(0, 160);
    if (!clean || fallbackPlaylist.length >= FALLBACK_MAX) return;
    fallbackPlaylist.push(clean);
    broadcastFallback();
    if (fallbackEnabled && !musicCurrent && !musicQueue.length) playNextFallbackSong();
  });
  socket.on("music:fallback:remove", ({ index } = {}) => {
    if (typeof index === "number" && fallbackPlaylist[index] !== undefined) {
      fallbackPlaylist.splice(index, 1);
      broadcastFallback();
    }
  });
  socket.on("music:fallback:clear", () => {
    fallbackPlaylist = [];
    broadcastFallback();
  });
  socket.on("music:fallback:toggle", ({ enabled } = {}) => {
    fallbackEnabled = !!enabled;
    broadcastFallback();
    if (fallbackEnabled && !musicCurrent && !musicQueue.length) playNextFallbackSong();
  });

  socket.on("tiktok:connect", async ({ username, signApiKey } = {}) => {
    // Starting a new LIVE session must start the chat feed from zero.
    // Do not carry comments from the previous account/session, and tell
    // existing Browser Sources to clear their local cached chat immediately.
    liveSessionId += 1;
    recentComments = [];
    io.emit("comments:reset", { sessionId: liveSessionId });

    // Reset live counters/leaderboard when switching to a new account.
    streamStats = { comments: 0, likes: 0, follows: 0, gifts: 0, giftCoins: 0, startedAt: null, lastEventAt: null };
    manualLikeLeaderboard = {};
    likeLeaderboard = {};
    musicQueue = [];
    musicCurrent = null;
    musicRequestCooldown.clear();
    broadcastMusic();
    io.emit("event", { kind: "leaderboard", top: [] });
    io.emit("stats:update", streamStats);
    io.emit("goal:update", goalSettings);

    try {
      await tiktok.connect(username, signApiKey);
    } catch (err) {
      // status already emitted inside tiktok.connect on failure
    }
  });

  socket.on("tiktok:disconnect", () => {
    tiktok.disconnect();
  });
});


function normalizeAction(a = {}) {
  return {
    id: String(a.id || Math.random().toString(36).slice(2, 9)),
    enabled: a.enabled !== false,
    event: ["comment", "like", "follow", "gift"].includes(a.event) ? a.event : "comment",
    keyword: String(a.keyword || "").slice(0, 80),
    action: ["tts", "alert", "sound"].includes(a.action) ? a.action : "tts",
    value: String(a.value || "").slice(0, 200),
  };
}

function actionMatches(action, payload) {
  if (!action.enabled || action.event !== payload.type) return false;
  const keyword = String(action.keyword || "").trim().toLowerCase();
  if (!keyword) return true;
  const haystack = `${payload.username || ""} ${payload.extra || ""}`.toLowerCase();
  return haystack.includes(keyword);
}

function runCustomActions(payload) {
  for (const raw of customActions) {
    const action = normalizeAction(raw);
    if (!actionMatches(action, payload)) continue;

    const replaceVars = (text) =>
      String(text || "")
        .replaceAll("{username}", payload.username || "Penonton")
        .replaceAll("{comment}", payload.extra || "")
        .replaceAll("{gift}", payload.extra || "");

    if (action.action === "tts") {
      io.emit("event", { kind: "tts", text: replaceVars(action.value) || `${payload.username || "Penonton"} melakukan ${payload.type}.` });
    } else if (action.action === "alert") {
      io.emit("event", {
        kind: "alert",
        type: action.value || payload.type,
        username: payload.username || "Penonton",
        extra: payload.extra || "",
      });
    } else if (action.action === "sound") {
      io.emit("event", { kind: "sound", id: action.value || "ding" });
    }
  }
}

function processEvent(payload = {}, meta = {}) {
  if (!payload || !payload.kind) return;

  if (payload.kind === "like-sim") {
    const username = String(payload.username || "PenontonDemo");
    const count = Math.max(1, Number(payload.count) || 1);
    likeLeaderboard[username] = (likeLeaderboard[username] || 0) + count;
    manualLikeLeaderboard[username] = likeLeaderboard[username];
    const top = Object.entries(likeLeaderboard)
      .sort((a,b) => b[1] - a[1])
      .slice(0, MAX_LEADERBOARD)
      .map(([name, likes]) => ({ username: name, likes }));
    io.emit("event", { kind: "leaderboard", top });
    // Also count the simulated likes for stats/goal.
    if (!streamStats.startedAt) streamStats.startedAt = Date.now();
    streamStats.lastEventAt = Date.now();
    streamStats.likes += count;
    if (goalSettings.enabled && goalSettings.type === "likes") goalSettings.current += count;
    scheduleLiveStateBroadcast();
    return;
  }

  if (payload.kind === "leaderboard-reset") {
    manualLikeLeaderboard = {};
    likeLeaderboard = {};
    io.emit("event", { kind: "leaderboard", top: [] });
    return;
  }

  if (payload.kind === "alert") {
    if (!streamStats.startedAt) streamStats.startedAt = Date.now();
    streamStats.lastEventAt = Date.now();

    if (payload.type === "comment") {
      const rawComment = String(payload.extra || "");
      const match = rawComment.match(/^!song\s*(?:-\s*)?(.+)$/i);
      if (match) {
        // Keep the chat visible, but also enqueue a YouTube music request.
        addMusicRequest(String(payload.username || "Penonton"), match[1]).then(result => {
          if (result.ok) {
            io.emit("event", { kind:"music-request", username: payload.username || "Penonton", extra: result.item.title });
          } else {
            io.emit("event", { kind:"music-request-error", username: payload.username || "Penonton", extra: result.message });
          }
        });
      }
      streamStats.comments += 1;
      recentComments.push({
        username: String(payload.username || "Penonton"),
        extra: String(payload.extra || ""),
        at: Date.now()
      });
      if (recentComments.length > MAX_RECENT_COMMENTS) {
        recentComments.splice(0, recentComments.length - MAX_RECENT_COMMENTS);
      }
    }
    if (payload.type === "like") {
      const count = Math.max(1, Number(payload.count) || 1);
      likeLeaderboard[payload.username || "Penonton"] = (likeLeaderboard[payload.username || "Penonton"] || 0) + count;
      streamStats.likes += count;
      const top = Object.entries(likeLeaderboard).sort((a,b) => b[1] - a[1]).slice(0, MAX_LEADERBOARD).map(([username, likes]) => ({ username, likes }));
      io.emit("event", { kind: "leaderboard", top });
    }
    if (payload.type === "follow") streamStats.follows += 1;
    if (payload.type === "gift") {
      streamStats.gifts += 1;
      maybeQueueEffectForGift(payload);
    }

    // Keep the current goal synchronized with the selected event.
    if (goalSettings.enabled) {
      const key = goalSettings.type;
      if (key === "comments" && payload.type === "comment") goalSettings.current += 1;
      if (key === "likes" && payload.type === "like") goalSettings.current += Number(payload.count || 1);
      if (key === "gifts" && payload.type === "gift") goalSettings.current += 1;
      if (payload.type !== "like") io.emit("goal:update", goalSettings);
    }

    io.emit("event", payload);
    runCustomActions(payload);
  } else {
    io.emit("event", payload);
  }

  if (payload.type === "like") scheduleLiveStateBroadcast();
  else io.emit("stats:update", streamStats);
}

function getLocalIp() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === "IPv4" && !net.internal) return net.address;
    }
  }
  return "localhost";
}

const PORT = process.env.PORT || 4200;
server.listen(PORT, () => {
  const ip = getLocalIp();
  console.log("");
  console.log("  Panel siaran jalan!");
  console.log("  ---------------------------------------------");
  console.log(`  Panel kontrol (buka di browser kamu):`);
  console.log(`     http://localhost:${PORT}/control.html`);
  console.log("");
  console.log(`  Overlay (masukkan ini sebagai Browser Source di OBS):`);
  console.log(`     http://localhost:${PORT}/overlay.html`);
  console.log("");
  console.log(`  (kalau OBS di PC lain di jaringan yang sama, pakai: http://${ip}:${PORT}/overlay.html)`);
  console.log("  ---------------------------------------------");
});
