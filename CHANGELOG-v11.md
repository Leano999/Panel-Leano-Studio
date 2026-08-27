# Changelog v11

- Added simulator for like counts + leaderboard and leaderboard reset.
- Like simulation updates stats/goal and leaderboard overlay.
- Comment TTS now speaks only the comment text; username is not spoken.
- Follow and gift TTS are OFF by default. Follow/gift use custom sound actions instead.
- Live TikTok follow/gift/comment now pass through the server event pipeline so custom sound actions, stats, recent comments, and goal updates stay consistent.
- Added `public/sounds/` support for custom MP3 SFX IDs, with built-in synth fallback for built-in IDs.
