PCBL Tournament Manager - clean replacement

1. Replace the files in your existing GitHub Pages repository with:
   index.html, app.js, styles.css, config.js, live.html, live.js.
2. In Supabase SQL Editor, run schema.sql ONCE. It rebuilds only the PCBL tables and does not touch Auth users.
3. Use your existing Supabase Auth email/password to sign in.
4. The site uses the publishable Supabase key in config.js; never put a secret/service-role key in this file.
5. Public spectators can use live.html without logging in.

If GitHub Pages still shows the old version, wait for deployment and hard refresh with Ctrl+Shift+R.
