# V42 — Ultra Lite Performance

V42 keeps the existing workspaces/features but reduces OBS Browser Source overhead:

- Browser Source sockets use WebSocket directly (no polling fallback).
- Overlay animations, particles, pulse/shine effects and expensive shadows are reduced/removed.
- Overlay stages use CSS containment to reduce repaint/layout propagation.
- TTS Browser Source no longer runs a 1-second keepalive loop.
- Music Request no longer loads the YouTube IFrame API until a real song needs playback.
- Like-driven stats/goal broadcasts are batched for ~180 ms to reduce high-frequency Socket.IO traffic.
- Existing event handling, TTS settings, chat, leaderboard, goal, music request and workspace structure are retained.

For maximum OBS performance, only add the Browser Sources you actually need.
