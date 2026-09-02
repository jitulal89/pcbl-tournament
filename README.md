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
