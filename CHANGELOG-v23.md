# v23 — Music Request YouTube

- Added `!song` / `!Song` LIVE comment command.
- Searches YouTube and queues the first matching video.
- Added `overlay-music.html` Browser Source showing current song, requester, and queue count.
- Automatic next-track playback when a YouTube video ends.
- Queue controls in the Control Panel: Skip, Clear Queue, Stop.
- Test music request in the Control Panel.
- Per-user request cooldown: 30 seconds.
- Maximum queue: 10 pending songs.
- Music queue resets when connecting to a new LIVE session.
- Requests are not read aloud by the comment TTS.
- Player requests YouTube `tiny` quality (144p when available), while YouTube may still adapt quality.
- Existing v22 features are preserved.
