# v19 — New LIVE session starts with a clean chat

- Connecting a TikTok account now clears the previous chat history immediately.
- `comments:reset` clears the visible chat Browser Source and its localStorage cache.
- The server no longer sends old comments from the previous account/session.
- TikTok events are ignored until the new connection is fully established, so chat/events from the connection phase are not read or processed.
- Like leaderboard and live statistics are reset when switching to a new account/session.
- Existing v18 animation, Browser Sources, TTS, SFX, simulator, and auto-start behavior are preserved.
