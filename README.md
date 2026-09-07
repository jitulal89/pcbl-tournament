PCBL V21
- Replaced unreliable mobile More popup with a dedicated more.html page.
- Bottom navigation is five simple links: Home, Live, Stats, Fixtures, More.
- More page links to Teams, Rules, Final Format, Suggestions.
- Mobile-first styling and cache-busting styles.css?v=21.
- No database changes.

V22: More navigation is a dedicated page on every public page. Removed stale More popup code from suggestions.html.


## V26 Admin Mobile Navigation
- Admin desktop navigation remains unchanged with all 8 sections.
- Admin mobile navigation is now: Dashboard / Live / Stats / Fixtures / More.
- More contains Admin-only links for Teams, Rules, Final Format and Suggestions.
- All Admin mobile links stay on `admin.html?page=...`; they do not open public pages.
- RLS remains enabled for anonymous suggestions.
- Suggestions admin SQL includes both `get_player_suggestions()` and the legacy `get_player_suggestions_admin()` RPC names.
