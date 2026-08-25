# PCBL Tournament Hub — Supabase Live Backend

This version is wired for a real shared Supabase backend with:

- Supabase Auth using email magic links
- Role-based access: `admin`, `scorekeeper`, `captain`, `public`
- Central teams, players, matches and scores
- Atomic score publishing through `publish_score()`
- Immutable score-event history
- Row Level Security policies
- Supabase Realtime subscriptions for live score and standings updates
- Finalized PCBL fixture, backup slots, Sunday final and prize distribution

## Setup

### 1. Create a Supabase project
Create a new project in Supabase.

### 2. Run the schema
In **SQL Editor**, run:

`supabase/schema.sql`

### 3. Seed PCBL data
Run:

`supabase/seed.sql`

This creates Teams A–F and the finalized schedule.

### 4. Add your first Admin
1. Open the deployed site and sign in with your email magic link.
2. In Supabase SQL Editor, run:

```sql
update public.profiles
set role='admin', display_name='Tournament Admin'
where id='YOUR_AUTH_USER_UUID';
```

If no profile row exists yet, insert it:

```sql
insert into public.profiles(id, display_name, role)
values ('YOUR_AUTH_USER_UUID','Tournament Admin','admin');
```

### 5. Configure the website
Edit `web/config.js`:

```js
export const SUPABASE_URL = 'https://YOUR-PROJECT.supabase.co';
export const SUPABASE_ANON_KEY = 'YOUR-ANON-KEY';
```

`config.js` is intentionally a separate file so you can replace it without touching application code. The anon key is safe for a browser client when RLS is correctly enabled. Never put the Supabase service-role key in the website.

### 6. Configure Auth redirect URLs
In Supabase Auth URL configuration, add your local and production website URLs as redirect URLs.

### 7. Deploy
Deploy the `web` folder to Vercel, Netlify, Cloudflare Pages or GitHub Pages.

## Staff roles
- **admin**: manage all tournament data
- **scorekeeper**: publish live scores only through the protected RPC
- **captain**: reserved for future team-management permissions
- **public**: read-only live dashboard

## Important production notes
- The database is the source of truth; there is no localStorage scoring fallback.
- Every published score creates a `score_events` history record.
- Standings are recalculated client-side from completed league matches and update after Realtime events.
- Backup slots cannot receive scores through the RPC.
