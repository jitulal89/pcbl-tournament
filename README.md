# PCBL Tournament Website — v8 Triplet Fixture Fix

## Public site
Open `index.html` (the GitHub Pages root). No login is required. Visitors can see the dashboard, standings, fixtures, teams/players, PCBL rules and live scores.

## Admin/scorer
Open `admin.html` and sign in with the Supabase Auth account. Admin/scorer controls remain protected by login.

## Public live screen
`live.html` is the clean court-by-court spectator screen and updates through Supabase Realtime.

## Deployment
Replace the files in the existing GitHub Pages repository with all files in this package. No changes are required to the Supabase URL/key in `config.js`.

The public site uses the Supabase publishable key and only reads data. Database writes remain behind authenticated Supabase policies.

Updated PCBL pairing enforcement rule:
- Repeated pairing penalty: if the same two players are paired again, intentionally or by mistake, the opposite team is awarded 1 point.


### Live scoring undo
The Admin Live Scoring screen now supports **Undo** in cloud/Supabase mode. Run the updated `schema.sql` once in Supabase SQL Editor so the `undo_last_point(uuid)` RPC is created. Undo removes the latest score event, subtracts that point, and reopens the match/game if the undone point had completed it.

## Triplet update

Run `triplet_update.sql` once in Supabase SQL Editor before creating Triplet fixtures. This is a SAFE migration: it does not drop tables or delete tournament data.

Triplet scoring:
- 30-point single-set match.
- Player order is 1st OUT, 2nd COMMON, 3rd IN.
- Phase 1 (first 15 total rally points): 1st + 2nd.
- Phase 2 (next 15 total rally points): 2nd + 3rd.
- The middle/common player plays all 30 points.
- Court ends change when a side first reaches 11 points.
- First side to 30 wins.

### v8 fixture fix
- Added an explicit **Men's Triplet — 30 Points** option to the Add Match dialog.
- Added cache-busting query strings to config.js/app.js so GitHub Pages does not keep serving the older fixture form.
- Triplet lineup is 1st OUT, 2nd COMMON, 3rd IN.
