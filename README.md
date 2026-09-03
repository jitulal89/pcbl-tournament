# PCBL Tournament Website

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
