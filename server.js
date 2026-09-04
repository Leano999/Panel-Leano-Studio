let musicSettings = {
  volume: 0.75,
  requestRole: "everyone",
  skipRole: "moderator"
};

function hasPermission(role, payload){
  if(role === "everyone") return true;
  if(role === "follower") return payload.isFollower === true;
  if(role === "moderator") return payload.isModerator === true;
  return false;
}

function processEvent(payload = {}, meta = {}) {
  if (!payload || !payload.kind) return;

  if (payload.kind === "alert") {

    if (!streamStats.startedAt) streamStats.startedAt = Date.now();
    streamStats.lastEventAt = Date.now();

    // ================= COMMENT =================
    if (payload.type === "comment") {

      const rawComment = String(payload.extra || "");

      // ---- SKIP ----
      if (/^!skip$/i.test(rawComment)) {
        if(!hasPermission(musicSettings.skipRole, payload)){
          io.emit("event", {
            kind:"music-request-error",
            username: payload.username || "Penonton",
            extra: "Tidak punya akses skip!"
          });
          return;
        }

        musicNext();
        return;
      }

      // ---- SONG / DIGIDAW ----
      const match = rawComment.match(/^!(song|digidaw)\s*(?:-\s*)?(.+)$/i);

      if (match) {
        if(!hasPermission(musicSettings.requestRole, payload)){
          io.emit("event", {
            kind:"music-request-error",
            username: payload.username || "Penonton",
            extra: "Tidak punya akses request lagu!"
          });
          return;
        }

        addMusicRequest(payload.username, match[2]).then(result => {
          if (result.ok) {
            io.emit("event", {
              kind:"music-request",
              username: payload.username,
              extra: result.item.title
            });
          } else {
            io.emit("event", {
              kind:"music-request-error",
              username: payload.username,
              extra: result.message
            });
          }
        });
      }

      streamStats.comments += 1;

      recentComments.push({
        username: payload.username,
        extra: rawComment,
        at: Date.now()
      });
    }

    // ================= LIKE =================
    if (payload.type === "like") {
      const count = Math.max(1, Number(payload.count) || 1);
      streamStats.likes += count;
    }

    if (payload.type === "follow") streamStats.follows += 1;
    if (payload.type === "gift") streamStats.gifts += 1;

    io.emit("event", payload);
  }
}
