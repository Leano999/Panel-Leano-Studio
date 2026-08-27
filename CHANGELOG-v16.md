# v16

- Follow + Gift Browser Source is now listed together with Chat/Goal/Alert/TTS under BROWSER SOURCE — PISAHKAN.
- Removed duplicate Follow + Gift URL block from the top of the dashboard.
- TTS activation in the control panel no longer waits for the first utterance to finish before unlocking live TTS.
- Added a small delay after resume and voice refresh to reduce Chromium speechSynthesis first-utterance failures.
- Live comment TTS reads comment text only; username is never spoken.
- Follow/Gift default to custom SFX only; optional TTS phrases also omit usernames.
- Versioned sound/overlay URLs updated to v16 to avoid stale browser cache.
