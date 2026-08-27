# Panel Leano V35 — Remove Live Activity Spam + Like TTS OFF

## Changes
- Removed the visible `Aktivitas Live` feed from Chat Live so event logs no longer spam the panel UI.
- Kept `logEvent()` as a silent compatibility hook so existing buttons/actions do not break.
- Removed the live activity socket listener that was continuously writing comments/likes/follows/gifts into the old feed.
- Chat Live now focuses only on the actual TikTok comment feed.
- Changed server default `readLikes` from `true` to `false`.
- Like TTS is now OFF by default and must be explicitly enabled by the user.
- Updated TTS help text to explain why like auto-read is disabled by default.
