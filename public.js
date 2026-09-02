(() => {
  const cfg = window.PCBL_CONFIG || {};
  let sb = null;
  let tournament = null, teams = [], players = [], matches = [], matchPlayers = [], games = [];
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const team = id => teams.find(t => t.id === id);
  const player = id => players.find(p => p.id === id);
  const matchGames = id => games.filter(g => g.match_id === id).sort((a,b) => a.game_no-b.game_no);
  const completeGame = (a,b) => (Math.max(a,b) >= 21 && Math.abs(a-b) >= 2) || Math.max(a,b) >= 30;
  function winner(m) {
    const gs = matchGames(m.id);
    let a = gs.filter(g => g.completed && Number(g.score_a) > Number(g.score_b)).length;
    let b = gs.filter(g => g.completed && Number(g.score_b) > Number(g.score_a)).length;
    if (a !== b) return a > b ? m.team_a : m.team_b;
    let ta=0,tb=0; gs.forEach(g => { ta += Number(g.score_a||0); tb += Number(g.score_b||0); });
    if (ta !== tb) return ta > tb ? m.team_a : m.team_b;
    return null;
  }
  function scoreText(m) {
    const gs = matchGames(m.id); if (!gs.length) return '—';
    return gs.map(g => `${g.score_a}-${g.score_b}`).join(' · ');
  }
  function lineup(m, side) {
    return matchPlayers.filter(x => x.match_id===m.id && x.side===side).map(x => player(x.player_id)?.name).filter(Boolean).join(' & ') || '—';
  }
  function formatTime(v) {
    if (!v) return '—';
    const d = new Date(v); if (Number.isNaN(d.getTime())) return v;
    return d.toLocaleString([], {day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});
  }
  function show(page) {
    document.querySelectorAll('.page').forEach(x => x.classList.add('hidden'));
    $(page)?.classList.remove('hidden');
    document.querySelectorAll('#publicNav button').forEach(x => x.classList.toggle('active', x.dataset.page===page));
  }
  function render() {
    $('tournamentTitle').textContent = tournament?.name || 'PCBL Finals';
    $('tournamentMeta').textContent = [tournament?.venue, tournament?.status === 'live' ? 'LIVE NOW' : tournament?.status].filter(Boolean).join(' · ') || 'Live badminton team-event results, standings and schedule.';
    $('stats').innerHTML = [
      ['Teams',teams.length],
      ['Players',players.length],
      ['Matches',matches.length],
      ['Live Courts',matches.filter(m=>m.status==='live').length]
    ].map(x=>`<div class="stat"><span>${x[0]}</span><strong>${x[1]}</strong></div>`).join('');

    const standing = teams.map(t => ({t,wins:matches.filter(m=>m.status==='done'&&winner(m)===t.id).length}))
      .sort((a,b)=>b.wins-a.wins || a.t.name.localeCompare(b.t.name));
    $('standings').innerHTML = standing.map((x,i)=>`<div class="player"><span><b>${i+1}. ${esc(x.t.name)}</b></span><b>${x.wins} win${x.wins===1?'':'s'}</b></div>`).join('') || '<p class="muted">No teams registered.</p>';

    $('schedule').innerHTML = matches.slice().sort((a,b)=>new Date(a.scheduled_at||0)-new Date(b.scheduled_at||0)).slice(0,12).map(m=>`<div class="player"><span><b>${esc(formatTime(m.scheduled_at))}</b> · Court ${esc(m.court||'—')}<br>${esc(m.match_type)} · ${esc(team(m.team_a)?.name||'—')} vs ${esc(team(m.team_b)?.name||'—')}</span><span class="status ${esc(m.status)}">${esc(m.status)}</span></div>`).join('') || '<p class="muted">No fixtures yet.</p>';

    const live = matches.filter(m=>m.status==='live');
    $('liveGrid').innerHTML = live.map(courtHtml).join('') || '<div class="card"><h2>No live matches</h2><p class="muted">Live matches will appear here as soon as a scorer starts them.</p></div>';

    $('fixturesBody').innerHTML = matches.slice().sort((a,b)=>(a.match_no||0)-(b.match_no||0)).map(m=>`<tr><td>${esc(formatTime(m.scheduled_at))}</td><td>${esc(m.court||'—')}</td><td>${esc(m.match_type)}</td><td>${esc(team(m.team_a)?.name||'—')}<br><small>${esc(lineup(m,'A'))}</small></td><td>${esc(team(m.team_b)?.name||'—')}<br><small>${esc(lineup(m,'B'))}</small></td><td>${esc(lineup(m,'A'))} vs ${esc(lineup(m,'B'))}</td><td><span class="status ${esc(m.status)}">${esc(m.status)}</span></td><td><b>${esc(scoreText(m))}</b>${m.status==='done'&&winner(m)?`<br><small>Winner: ${esc(team(winner(m))?.name||'')}</small>`:''}</td></tr>`).join('') || '<tr><td colspan="8" class="muted">No fixtures yet.</td></tr>';

    $('teamCards').innerHTML = teams.map(t=>`<div class="teamcard"><div class="teamtitle"><h2>${esc(t.name)}</h2><span>${t.players.length} players</span></div><p class="muted">Captain: ${esc(t.captain||'—')}</p>${t.players.map(p=>`<div class="player"><span>${esc(p.name)}</span><span class="gender">${p.gender==='F'?'♀ Female':'♂ Male'}</span></div>`).join('') || '<p class="muted">No players registered.</p>'}</div>`).join('') || '<div class="card"><b>No teams yet.</b></div>';
  }
  function courtHtml(m) {
    const a=team(m.team_a), b=team(m.team_b), gs=matchGames(m.id);
    const cur=gs.find(g=>!g.completed) || gs[gs.length-1] || {score_a:0,score_b:0};
    const ga=gs.filter(g=>g.completed&&Number(g.score_a)>Number(g.score_b)).length;
    const gb=gs.filter(g=>g.completed&&Number(g.score_b)>Number(g.score_a)).length;
    return `<div class="court"><div class="courthead"><div><b>Court ${esc(m.court||'—')}</b><div class="muted">${esc(m.match_type)} · ${esc(formatTime(m.scheduled_at))}</div></div><span class="livepill">● LIVE</span></div><div class="scoreteams"><div class="side"><div class="names"><b>${esc(a?.name||'—')}</b><br><small>${esc(lineup(m,'A'))}</small></div><div class="publicscore">${Number(cur.score_a||0)}</div></div><div class="center"><strong>–</strong><div class="games">Games ${ga} : ${gb}</div></div><div class="side"><div class="names"><b>${esc(b?.name||'—')}</b><br><small>${esc(lineup(m,'B'))}</small></div><div class="publicscore">${Number(cur.score_b||0)}</div></div></div></div>`;
  }
  async function load() {
    if (!sb) return;
    const [tx,tt,pp,mm,mp,gg] = await Promise.all([
      sb.from('tournaments').select('*').order('created_at',{ascending:true}).limit(1).maybeSingle(),
      sb.from('teams').select('*').order('name'),
      sb.from('players').select('*'),
      sb.from('matches').select('*').order('match_no'),
      sb.from('match_players').select('*'),
      sb.from('games').select('*')
    ]);
    const bad=[tx,tt,pp,mm,mp,gg].find(r=>r.error);
    if (bad) { $('connection').textContent='ERROR'; $('connection').className='badge'; document.querySelector('main').insertAdjacentHTML('beforeend',`<div class="card" style="margin-top:20px"><b>Unable to load tournament data.</b><p class="muted">${esc(bad.error.message)}</p></div>`); return; }
    tournament=tx.data; teams=tt.data||[]; players=pp.data||[]; matches=mm.data||[]; matchPlayers=mp.data||[]; games=gg.data||[];
    $('connection').textContent='LIVE'; $('connection').className='badge ok'; render();
  }
  if (!window.supabase || !cfg.SUPABASE_URL || !cfg.SUPABASE_PUBLISHABLE_KEY) { $('connection').textContent='CONFIG ERROR'; }
  else { sb=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_PUBLISHABLE_KEY); load(); sb.channel('public-site').on('postgres_changes',{event:'*',schema:'public',table:'matches'},load).on('postgres_changes',{event:'*',schema:'public',table:'games'},load).on('postgres_changes',{event:'*',schema:'public',table:'teams'},load).on('postgres_changes',{event:'*',schema:'public',table:'players'},load).subscribe(); }
  document.querySelectorAll('#publicNav button').forEach(b=>b.addEventListener('click',()=>show(b.dataset.page)));
})();
