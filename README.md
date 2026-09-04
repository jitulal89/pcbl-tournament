PCBL 2026 – Finals / Quadruple Update

Files included:
- app.js – Admin logic, existing League + Triplet preserved, Finals and Quadruple added.
- public.js – Public tournament view with Finals-aware scoring.
- live.js – Public live scoring screen with Quadruple rotation.
- finals.js / final_format.html – Separate PCBL Finals Format page and live 225-point Finals summary.
- finals_update.sql – SAFE Supabase migration. Run once in SQL Editor before using Finals/Quadruple.
- styles.css – Finals/Quadruple styling.

Finals format:
1 Women’s Doubles – 15
2 Men’s Quadruple – 60
3 Men’s Singles – 15
4 Men’s Quadruple – 60
5 Women’s Doubles – 15
6 Men’s Quadruple – 60

Quadruple rotation:
1+2 -> 2+3 -> 3+4 -> 4+1. Rotation changes when either team first reaches 15, 30, or 45. Match ends when either team reaches 60. Scores such as 60-59 are valid.

Do not run any old destructive schema script.


Navigation: Final Format is rendered as an in-page tab on both the public site and Admin; the standalone final_format.html is only a compatibility redirect.
