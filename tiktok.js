const { TikTokLiveConnection, WebcastPushConnection } = require("tiktok-live-connector");
// The library renamed WebcastPushConnection -> TikTokLiveConnection at some point.
// Support whichever one this installed version actually exports.
const Connector = TikTokLiveConnection || WebcastPushConnection;

// in-memory state, reset on server restart or when a new session connects
let likeCounts = {}; // { username: totalLikesThisSession }
let currentConnection = null;
let currentUsername = null;
let currentConnected = false;
let acceptingLiveEvents = false;

function displayName(data) {
  // tiktok-live-connector v2+ (protobuf-based) nests user info under `data.user`.
  // Older versions had it flat on `data` directly. Support both shapes.
  const user = data.user || {};
  return (
    user.nickname ||
    user.displayId ||
    user.uniqueId ||
    data.nickname ||
    data.uniqueId ||
    "Penonton"
  );
}

function commentText(data) {
  // v2+ uses `content`, older versions used `comment`.
  return data.content || data.comment || "";
}

function leaderboardTop(n = 5) {
  return Object.entries(likeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([username, likes]) => ({ username, likes }));
}

function setupTiktok(io, processEvent) {
  function broadcastLeaderboardNow() {}
  function broadcastLeaderboard() {}
  function resetLeaderboardBroadcast() {}

  function connect(username, signApiKey) {
    return new Promise((resolve, reject) => {
      try {
        if (currentConnection) {
          currentConnection.disconnect();
          currentConnection = null;
        }
        acceptingLiveEvents = false;
        currentConnected = false;
        resetLeaderboardBroadcast();
        likeCounts = {};
        broadcastLeaderboardNow();

        const options = {};
        if (signApiKey) options.signApiKey = signApiKey;

        const connection = new Connector(username, options);
        currentConnection = connection;
        currentUsername = username;

        connection.connect()
          .then((state) => {
            // Only events arriving after the connection is fully established
            // belong to this session. Anything emitted while connecting is ignored.
            acceptingLiveEvents = true;
            currentConnected = true;
            io.emit("tiktok:status", { connected: true, username, roomId: state.roomId });
            resolve(state);
          })
          .catch((err) => {
            currentConnection = null;
            currentConnected = false;
            const message = err && err.message ? err.message : String(err);
            io.emit("tiktok:status", { connected: false, username, error: message });
            reject(err);
          });

        connection.on("follow", (data) => {
          if (!acceptingLiveEvents) return;
          const payload = { kind: "alert", type: "follow", username: displayName(data) };
          if (typeof processEvent === "function") processEvent(payload, { source: "tiktok" });
          else io.emit("event", payload);
        });

        connection.on("like", (data) => {
          if (!acceptingLiveEvents) return;
          const name = displayName(data);
          // v2+ uses `count` for this batch's like count, older versions used `likeCount`.
          const count = data.likeCount || data.count || 1;
          likeCounts[name] = (likeCounts[name] || 0) + count;
          const payload = { kind: "alert", type: "like", username: name, count };
          if (typeof processEvent === "function") processEvent(payload, { source: "tiktok" });
          else io.emit("event", payload);
          broadcastLeaderboard();
        });

        connection.on("gift", (data) => {
          if (!acceptingLiveEvents) return;
          // v2+ nests gift details under `data.gift` (name, type). Older versions
          // had `giftName`/`giftType` flat on `data`. Support both.
          const gift = data.gift || {};
          const giftType = gift.type ?? data.giftType;
          const giftName = gift.name || data.giftName || "Gift";
          // only fire once a gift "streak" finishes (repeatEnd), or for non-repeatable gifts
          if (giftType !== 1 || data.repeatEnd) {
            const repeatCount = data.repeatCount || 1;
            const giftLabel = `${giftName} x${repeatCount}`;
            const payload = {
              kind: "alert",
              type: "gift",
              username: displayName(data),
              extra: giftLabel,
              giftName,
              count: repeatCount,
              coins: Number(data.coins || data.diamondCount || 0) * repeatCount
            };
            if (typeof processEvent === "function") processEvent(payload, { source: "tiktok" });
            else io.emit("event", payload);
          }
        });

        connection.on("chat", (data) => {
          if (!acceptingLiveEvents) return;
          const text = commentText(data);
          if (!text) return;
          const payload = { kind: "alert", type: "comment", username: displayName(data), extra: text };
          if (typeof processEvent === "function") processEvent(payload, { source: "tiktok" });
          else io.emit("event", payload);
        });

        connection.on("streamEnd", () => {
          acceptingLiveEvents = false;
          currentConnected = false;
          currentConnection = null;
          io.emit("tiktok:status", { connected: false, username, error: "Live sudah berakhir." });
          currentConnection = null;
        });

        connection.on("disconnected", () => {
          acceptingLiveEvents = false;
          currentConnected = false;
          currentConnection = null;
          io.emit("tiktok:status", { connected: false, username });
        });
      } catch (err) {
        acceptingLiveEvents = false;
        // synchronous construction errors (e.g. bad options, library mismatch) land here
        currentConnection = null;
        currentConnected = false;
        const message = err && err.message ? err.message : String(err);
        io.emit("tiktok:status", { connected: false, username, error: message });
        reject(err);
      }
    });
  }

  function disconnect() {
    acceptingLiveEvents = false;
    currentConnected = false;
    resetLeaderboardBroadcast();
    if (currentConnection) {
      currentConnection.disconnect();
      currentConnection = null;
    }
    io.emit("tiktok:status", { connected: false, username: currentUsername });
  }

  function getStatus() {
    return { connected: currentConnected, username: currentUsername };
  }

  return { connect, disconnect, leaderboardTop, getStatus };
}

module.exports = { setupTiktok };
