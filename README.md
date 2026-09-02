# PCBL Tournament Manager — production-ready starter

## What is included
- Unlimited players per team
- Team-vs-team fixtures
- Men's/Women's Singles, Men's/Women's Doubles, Mixed Doubles
- Live point-by-point scoring
- Best-of-3, 21-point badminton scoring with deuce and 30 cap
- Atomic Supabase scoring function
- Realtime database publication for live courts
- Public read / authenticated management policies
- Team standings and schedule
- PCBL-specific rules area
- Mobile responsive UI
- Demo mode without any backend

## Connect Supabase
1. Create a Supabase project.
2. Open SQL Editor and run `schema.sql`.
3. In Supabase Authentication, create an admin/scorer user.
4. Open Project Settings → API and copy the Project URL and browser-safe publishable/anon key.
5. Put them in `config.js`.
6. Open `index.html`, or deploy the folder to any static host.

Supabase's browser client is supported through the official CDN and uses the project URL plus publishable/anon key. See the official Supabase JavaScript docs.

## Important security
Never put a Supabase `service_role` or secret key in `config.js`. The browser should only receive the publishable/anon key. RLS remains enabled.

## Production extensions
- Admin/scorer role table and tighter RLS
- Tournament creation UI
- QR spectator URL
- Player uniqueness rule enforcement at lineup save
- Automatic PCBL schedule generation
- Finals/bracket page
- Match reports/export
- PCBL logo upload
- PWA/offline scorer mode
