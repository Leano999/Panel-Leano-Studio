# v17

- Fixed FOLLOW + GIFT Browser Source URL stuck on “memuat...”: the URL element is a `<code>` element, so the panel now uses `textContent` instead of the invalid `.value` property.
- Added v17 cache-buster to all Browser Source URLs.
- Kept v16 features intact.
