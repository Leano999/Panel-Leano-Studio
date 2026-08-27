# v22

- Leaderboard Like row spacing increased to 16px, matching the comment overlay spacing.
- Leaderboard updates are throttled to once every 15 seconds instead of updating on every like event.
- This is a data refresh, not a full Browser Source/page reload, so the overlay stays visually stable.
- Simulator leaderboard follows the same 15-second refresh behavior. Reset remains immediate.
- Browser Source URLs use v22 cache-busters in the control panel.
