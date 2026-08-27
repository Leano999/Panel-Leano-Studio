# v25 — Music Queue Overlay

- Music Request overlay no longer shows a generic “X antrian” counter.
- Current playing song remains at the top.
- Up to 5 upcoming requested songs are shown as numbered rows underneath.
- Queue items 6+ are hidden from the overlay, but remain in the server queue.
- When the current song finishes, the queue naturally shifts: hidden item 6 becomes visible as item 5, etc.
- Queue display updates from the existing `music:update` event; no playback behavior was changed.
