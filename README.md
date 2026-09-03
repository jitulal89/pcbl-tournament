# PCBL v12

## Changes
- Match scoring no longer automatically marks a match DONE when 21 (doubles/singles) or 30 (triplet) is reached.
- The scorer gets a confirmation popup after a scoring point reaches the relevant threshold.
- Triplet remains 30 points, with ends change at 15.
- Normal PCBL matches remain one set to 21, with ends change at 11.
- Finish button retains a confirmation popup.
- Home-page Team Standings are clickable and open a Team Details view showing roster summary, all fixtures, opponents, players, scores, results, live/upcoming status, and past match outcomes.
- Public Live Scores also displays the correct Triplet 30-point format and 15-point ends change.
- Updated `triplet_update.sql` replaces the `add_point` RPC so it does not auto-finish matches.

## Supabase migration
Run `triplet_update.sql` once in Supabase SQL Editor. It is an incremental migration and does not drop or delete tournament data.
