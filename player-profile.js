(() => {
  const cfg = window.PCBL_CONFIG || {};
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const qs = new URLSearchParams(location.search);
  const playerId = qs.get('player') || '';
  let sb;
  let tournament = null, teams = [], players = [], matches = [], matchPlayers = [], games = [];
  const player = id => players.find(p => p.id === id);
  const team = id => teams.find(t => t.id === id);
  const matchGames = id => games.filter(g => g.match_id === id).sort((a,b) => a.game_no-b.game_no);
  const matchType = m => { const raw=String(m?.match_type||'').trim(); if(/triplet/i.test(raw))return "Men's Triplet"; if(/quadruple/i.test(raw))return "Men's Quadruple"; return raw||'—'; };
  const isTriplet = m => matchType(m)==="Men's Triplet";
  const isQuad = m => matchType(m)==="Men's Quadruple";
  const isFinal = m => m?.stage==='finals' || Number(m?.final_no)>=1;
  function finalLabel(n){const x=Number(n);return x===1?'Finals Match 1 · Women’s Doubles':x===2?'Finals Match 2 · Men’s Quadruple':x===3?'Finals Match 3 · Men’s Singles':x===4?'Finals Match 4 · Men’s Quadruple':x===5?'Finals Match 5 · Women’s Doubles':x===6?'Finals Match 6 · Men’s Quadruple':'Finals';}
  function formatTime(v){if(!v)return 'Time not set';const d=new Date(v);if(Number.isNaN(d.getTime()))return String(v);return d.toLocaleString([], {weekday:'short',day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});}
  function orderedLineup(m,side){return matchPlayers.filter(r=>r.match_id===m.id&&r.side===side).sort((a,b)=>(a.lineup_order??999)-(b.lineup_order??999)).map(r=>r.player_id).filter(Boolean);}
  function lineupNames(m,side){return orderedLineup(m,side).map(id=>player(id)?.name).filter(Boolean);}
  function lineupText(m,side){const ids=orderedLineup(m,side), names=ids.map(id=>player(id)?.name).filter(Boolean); if(isTriplet(m)&&names.length>=3)return `OUT: ${names[0]} · COMMON: ${names[1]} · IN: ${names[2]}`; if(isQuad(m)&&names.length>=4){const g=matchGames(m.id)[0]||{};const high=Math.max(Number(g.score_a||0),Number(g.score_b||0));const phase=high<15?1:high<30?2:high<45?3:4;const pair=[[0,1],[1,2],[2,3],[3,0]][phase-1];return `Rotation ${phase}: ${pair.map(i=>names[i]||'—').join(' + ')} (full squad: ${names.join(' · ')})`; } return names.join(' + ')||'Lineup not recorded';}
  function scoreText(m){const gs=matchGames(m.id);return gs.length?gs.map(g=>`${g.score_a}-${g.score_b}`).join(' · '):'Score not recorded';}
  function winner(m){const g=matchGames(m.id)[0];if(!g)return null;const a=Number(g.score_a||0),b=Number(g.score_b||0);if(a===b)return null;if(m.status==='done'&&isTriplet(m))return a>b?m.team_a:m.team_b;if(isFinal(m)||isQuad(m)){const lim=isFinal(m)?([1,3,5].includes(Number(m.final_no))?15:60):60;return Math.max(a,b)>=lim?(a>b?m.team_a:m.team_b):null;}return ((Math.max(a,b)>=21&&Math.abs(a-b)>=2)||Math.max(a,b)>=30)?(a>b?m.team_a:m.team_b):null;}
  function result(m,tId){if(m.status==='live')return ['LIVE','live'];if(m.status!=='done')return ['UPCOMING','upcoming'];const w=winner(m);if(w===tId)return ['WON','win'];if(w)return ['LOST','loss'];return ['DRAW','draw'];}
  function typeIcon(type){if(/Singles/i.test(type))return '🏸';if(/Doubles/i.test(type))return '👥';if(/Triplet/i.test(type))return '👨‍👨‍👦';if(/Quadruple/i.test(type))return '4️⃣';return '🏸';}
  function render(p,t){
    const appearances=matches.filter(m=>matchPlayers.some(r=>r.match_id===m.id&&r.player_id===p.id)).sort((a,b)=>{const da=new Date(a.scheduled_at||0)-new Date(b.scheduled_at||0);return da||((a.match_no||0)-(b.match_no||0));});
    const completed=appearances.filter(m=>m.status==='done');
    const wins=completed.filter(m=>winner(m)===t.id).length;
    const losses=completed.filter(m=>winner(m)&&winner(m)!==t.id).length;
    const winPct=completed.length?Math.round(wins*1000/completed.length)/10:0;
    const cards=appearances.map((m,i)=>{
      const own=matchPlayers.find(r=>r.match_id===m.id&&r.player_id===p.id);const ownSide=own?.side||'A',oppSide=ownSide==='A'?'B':'A';
      const ownTeam=team(ownSide==='A'?m.team_a:m.team_b),oppTeam=team(oppSide==='A'?m.team_a:m.team_b);const [res,cls]=result(m,t.id);
      const w=winner(m);const type=matchType(m);const label=isFinal(m)?finalLabel(m.final_no):type;
      return `<article class="profile-match-card ${cls}">
        <div class="profile-match-top"><div class="match-title"><span class="history-icon">${typeIcon(type)}</span><div><b>${esc(label)}</b><small>${esc(isFinal(m)?'Finals':'League')} · Match ${esc(m.match_no??(i+1))}</small></div></div><span class="profile-result ${cls}">${esc(res)}</span></div>
        <div class="profile-match-meta"><span>📅 ${esc(formatTime(m.scheduled_at))}</span><span>📍 Court ${esc(m.court||'—')}</span></div>
        <div class="profile-scoreline"><div class="profile-team ${w===ownTeam?.id?'winner':''}"><b>${esc(ownTeam?.name||'Your Team')}</b><span>${esc(lineupText(m,ownSide))}</span></div><strong>${esc(scoreText(m))}</strong><div class="profile-team ${w===oppTeam?.id?'winner':''}"><b>${esc(oppTeam?.name||'Opponent')}</b><span>${esc(lineupText(m,oppSide))}</span></div></div>
      </article>`;
    }).join('');
    $('playerProfile').innerHTML=`<div class="profile-hero"><div class="profile-avatar">${esc(String(p.name||'?').trim().charAt(0).toUpperCase())}</div><div class="profile-name"><span class="eyebrow">PLAYER PROFILE</span><h1>${esc(p.name)}</h1><p>${esc(t.name)} · ${p.gender==='F'?'Female':'Male'}</p></div></div>
      <div class="profile-kpis"><div><span>Matches Played</span><b>${appearances.length}</b></div><div><span>Completed</span><b>${completed.length}</b></div><div><span>Wins</span><b class="result-win">${wins}</b></div><div><span>Win Rate</span><b>${winPct}%</b></div></div>
      <div class="history-title"><div><h2>All Matches Played</h2><p>Every saved match appearance for ${esc(p.name)}.</p></div><span>${appearances.length} appearance${appearances.length===1?'':'s'}</span></div>
      <div class="player-history-profile">${cards||'<div class="empty-stats">No match appearances have been recorded for this player yet.</div>'}</div>`;
    $('playerProfileLoading').classList.add('hidden');$('playerProfileError').classList.add('hidden');$('playerProfile').classList.remove('hidden');
    document.title=`${p.name} · PCBL Player Profile`;
  }
  async function load(){
    try{
      if(!window.supabase||!cfg.SUPABASE_URL||!cfg.SUPABASE_PUBLISHABLE_KEY)throw new Error('Supabase configuration is missing.');
      sb=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_PUBLISHABLE_KEY);
      const [tx,tt,pp,mm,mp,gg]=await Promise.all([
        sb.from('tournaments').select('*').order('created_at',{ascending:true}).limit(1).maybeSingle(),
        sb.from('teams').select('*').order('name'),sb.from('players').select('*'),sb.from('matches').select('*').order('match_no'),sb.from('match_players').select('*'),sb.from('games').select('*')
      ]);
      if(tt.error)throw tt.error;
      tournament=tx.data;teams=tt.data||[];players=pp.data||[];matches=mm.data||[];matchPlayers=mp.data||[];games=gg.data||[];
      const p=players.find(x=>x.id===playerId);
      const t=p?teams.find(x=>x.id===p.team_id):null;
      $('connection').textContent='LIVE';$('connection').className='badge ok';
      if(!playerId||!p||!t||/dummy/i.test(String(p.name||'')))throw new Error('Player profile could not be found. Please return to Player Stats and select a valid player.');
      render(p,t);
    }catch(err){console.error(err);$('connection').textContent='ERROR';$('connection').className='badge';$('playerProfileLoading').classList.add('hidden');$('playerProfileError').classList.remove('hidden');$('playerProfileError').innerHTML=`<b>Unable to load player details.</b><p>${esc(err?.message||'Please try again.')}</p><a class="btn" href="player-stats.html">← Back to Player Stats</a>`;}
  }
  load();
})();
