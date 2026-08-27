# v5

- Chat, Goal, Alert, and TTS are separate Browser Source pages.
- `/overlay-comments.html` contains chat only.
- `/overlay-goal.html` contains goal only.
- `/overlay-tts.html` contains TTS audio/visual bubble only.
- `/overlay.html` remains alert visual only.
- Added Simulator “Tes Chat + TTS”.
- TTS uses queue/retry/voice refresh to reduce Chromium speech failures.
