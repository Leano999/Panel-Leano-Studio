connection.on("chat", (data) => {
  const payload = {
    kind: "alert",
    type: "comment",
    username: data.nickname || data.uniqueId,
    extra: data.comment,

    isFollower: data.followRole === 1,
    isModerator: data.isModerator === true
  };

  processEvent(payload);
});

connection.on("like", (data) => {
  const payload = {
    kind: "alert",
    type: "like",
    username: data.nickname || data.uniqueId,
    count: data.likeCount || 1,

    isFollower: data.followRole === 1,
    isModerator: data.isModerator === true
  };

  processEvent(payload);
});

connection.on("follow", (data) => {
  const payload = {
    kind: "alert",
    type: "follow",
    username: data.nickname || data.uniqueId,

    isFollower: true,
    isModerator: data.isModerator === true
  };

  processEvent(payload);
});

connection.on("gift", (data) => {
  const payload = {
    kind: "alert",
    type: "gift",
    username: data.nickname || data.uniqueId,
    extra: data.giftName || "Gift",

    isFollower: data.followRole === 1,
    isModerator: data.isModerator === true
  };

  processEvent(payload);
});
