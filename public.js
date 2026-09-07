(() => {
  const cfg = window.PCBL_CONFIG || {};
  let sb = null;
  let tournament = null, teams = [], players = [], matches = [], matchPlayers = [], games = [];
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const team = id => teams.find(t => t.id === id);
  const player = id => players.find(p => p.id === id);
  const matchGames = id => games.filter(g => g.match_id === id).sort((a,b) => a.game_no-b.game_no);
  function matchType(m) {
    const raw = String(m?.match_type ?? m?.type ?? '').trim();
    if (/triplet/i.test(raw)) return "Men's Triplet";
    if (/quadruple/i.test(raw)) return "Men's Quadruple";
    return raw || '—';
  }
  const isTriplet = m => matchType(m) === "Men's Triplet";
  const isQuad = m => matchType(m) === "Men's Quadruple";
  const isFinal = m => m?.stage === 'finals' || Number(m?.final_no) >= 1;
  const finalPoints = n => [1,3,5].includes(Number(n)) ? 15 : [2,4,6].includes(Number(n)) ? 60 : 21;
  const limit = m => isFinal(m) ? finalPoints(m.final_no) : isQuad(m) ? 60 : isTriplet(m) ? 30 : 21;
  function complete(m,a,b) {
    if(isTriplet(m)) { const high=Math.max(a,b), low=Math.min(a,b); return (high>=30 && high-low>=2) || high>=40; } if(isFinal(m) || isQuad(m)) return Math.max(a,b) >= limit(m);
    return (Math.max(a,b) >= 21 && Math.abs(a-b) >= 2) || Math.max(a,b) >= 30;
  }
  function winner(m) {
    const gs = matchGames(m.id);
    if(!gs.length) return null;
    const g=gs[0], a=Number(g.score_a||0), b=Number(g.score_b||0);
    // For already completed Triplet matches, the recorded higher score is the winner.
    // This preserves historical PCBL results such as 30-29.
    if(m.status==='done' && isTriplet(m) && a!==b) return a>b?m.team_a:m.team_b;
    return complete(m,a,b) && a!==b ? (a>b?m.team_a:m.team_b) : null;
  }
  function scoreText(m) { const gs=matchGames(m.id); if(!gs.length) return '—'; return gs.map(g=>`${g.score_a}-${g.score_b}`).join(' · '); }
  function orderedLineup(m,side){ return matchPlayers.filter(x=>x.match_id===m.id&&x.side===side).sort((a,b)=>(a.lineup_order??999)-(b.lineup_order??999)).map(x=>x.player_id); }
  function lineup(m,side){
    const ids=orderedLineup(m,side);
    if(isQuad(m)&&ids.length>=4){const p=quadPhase(m), pair=[[0,1],[1,2],[2,3],[3,0]][p-1]; return pair.map(i=>player(ids[i])?.name).filter(Boolean).join(' + ') || '—';}
    if(isTriplet(m)&&ids.length>=3){const names=ids.map(id=>player(id)?.name).filter(Boolean); return `OUT: ${names[0]||'—'} · COMMON: ${names[1]||'—'} · IN: ${names[2]||'—'}`;}
    return ids.map(id=>player(id)?.name).filter(Boolean).join(' & ') || '—';
  }
  function tripPhase(m){const g=matchGames(m.id)[0]||{};return (Number(g.score_a||0)+Number(g.score_b||0))<15?1:2;}
  function quadPhase(m){const g=matchGames(m.id)[0]||{};const high=Math.max(Number(g.score_a||0),Number(g.score_b||0));return high<15?1:high<30?2:high<45?3:4;}
  function finalLabel(n){const x=Number(n);return x===1?'Match 1 · Women’s Doubles':x===2?'Match 2 · Men’s Quadruple':x===3?'Match 3 · Men’s Singles':x===4?'Match 4 · Men’s Quadruple':x===5?'Match 5 · Women’s Doubles':x===6?'Match 6 · Men’s Quadruple':'Finals';}
  function formatTime(v){if(!v)return '—';const d=new Date(v);if(Number.isNaN(d.getTime()))return v;return d.toLocaleString([], {day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});}
  function resultForTeam(m,id){if(m.status!=='done')return m.status==='live'?'LIVE':'UPCOMING';const w=winner(m);return w===id?'WON':w?'LOST':'DRAW';}
  function resultClass(result){return result==='WON'?'result-win':result==='LOST'?'result-loss':'';}
  function statusClass(result){return result==='WON'?'won':result==='LOST'?'lost':result.toLowerCase();}
  function teamDetailHtml(t){
    const ms=matches.filter(m=>m.team_a===t.id||m.team_b===t.id).sort((a,b)=>(a.match_no||0)-(b.match_no||0));
    const played=ms.filter(m=>m.status==='done'),wins=played.filter(m=>winner(m)===t.id).length,losses=played.filter(m=>winner(m)&&winner(m)!==t.id).length;
    const fixtures=ms.map(m=>{
      const isA=m.team_a===t.id,opp=team(isA?m.team_b:m.team_a),result=resultForTeam(m,t.id),teamWon=result==='WON',teamLost=result==='LOST';
      const teamPair=lineup(m,isA?'A':'B'),oppPair=lineup(m,isA?'B':'A');
      const w=winner(m), score=scoreText(m);
      if(isTriplet(m) && m.status==='done'){
        const idsA=orderedLineup(m,'A'),idsB=orderedLineup(m,'B');
        const namesA=idsA.map(id=>player(id)?.name).filter(Boolean),namesB=idsB.map(id=>player(id)?.name).filter(Boolean);
        const phase1A=namesA.slice(0,2).join(' + ')||'—', phase2A=namesA.length>=3?namesA.slice(1,3).join(' + '):'—';
        const phase1B=namesB.slice(0,2).join(' + ')||'—', phase2B=namesB.length>=3?namesB.slice(1,3).join(' + '):'—';
        const winName=w?team(w)?.name:'—';
        return `<div class="triplet-result-card"><div class="triplet-result-head"><div><b>Men's Triplet</b><div class="muted">${esc(formatTime(m.scheduled_at))} · Court ${esc(m.court||'—')}</div></div><span class="status done">✓ COMPLETED</span></div><div class="triplet-result-body"><div class="triplet-result-side ${teamWon?'winner-side':teamLost?'loser-side':''}"><div class="triplet-teamline"><b class="${teamWon?'result-win':teamLost?'result-loss':''}">${esc(team(isA?m.team_a:m.team_b)?.name||'—')}</b><span class="result-badge ${teamWon?'win-badge':'loss-badge'}">${teamWon?'🏆 WON':'✕ LOST'}</span></div><hr><div class="triplet-pair"><b>PHASE 1</b><span>${esc(isA?phase1A:phase1B)}</span></div><div class="triplet-pair"><b>PHASE 2</b><span>${esc(isA?phase2A:phase2B)}</span></div></div><div class="triplet-score"><strong>${esc(score)}</strong><small>Final Score</small></div><div class="triplet-result-side ${teamLost?'winner-side':teamWon?'loser-side':''}"><div class="triplet-teamline"><b class="${teamLost?'result-win':teamWon?'result-loss':''}">${esc(opp?.name||'—')}</b><span class="result-badge ${teamLost?'win-badge':'loss-badge'}">${teamLost?'🏆 WON':'✕ LOST'}</span></div><hr><div class="triplet-pair"><b>PHASE 1</b><span>${esc(isA?phase1B:phase1A)}</span></div><div class="triplet-pair"><b>PHASE 2</b><span>${esc(isA?phase2B:phase2A)}</span></div></div></div><div class="triplet-result-foot"><span>Men's Triplet · PCBL 2026</span><span>Winner: ${esc(winName)}</span></div></div>`;
      }
      return `<div class="team-fixture"><div class="fixture-main"><div><b>${esc(isFinal(m)?finalLabel(m.final_no):matchType(m))}</b><div class="muted">${esc(formatTime(m.scheduled_at))} · Court ${esc(m.court||'—')}</div></div><span class="status ${statusClass(result)}">${result}</span></div><div class="fixture-vs"><b class="${teamWon?'result-win':teamLost?'result-loss':''}">${esc(t.name)}</b><span>vs</span><b class="${teamWon?'result-loss':teamLost?'result-win':''}">${esc(opp?.name||'—')}</b><strong>${esc(scoreText(m))}</strong></div><div class="fixture-players"><span class="${teamWon?'result-win':teamLost?'result-loss':''}">${esc(teamPair)}</span><span>·</span><span class="${teamWon?'result-loss':teamLost?'result-win':''}">${esc(oppPair)}</span></div></div>`;
    }).join('')||'<p class="muted">No fixtures assigned to this team yet.</p>';
    return `<div class="team-summary"><div><span>Players</span><b>${(t.players||[]).length}</b></div><div><span>Played</span><b>${played.length}</b></div><div><span>Wins</span><b>${wins}</b></div><div><span>Losses</span><b>${losses}</b></div></div><h3>Fixtures & Results</h3><div class="team-fixtures">${fixtures}</div>`;
  }
  function openTeamDetails(id){const t=team(id);if(!t)return;$('teamDetailTitle').textContent=`${t.name} — Fixtures & Results`;$('teamDetailBody').innerHTML=teamDetailHtml(t);$('teamDetailModal').classList.remove('hidden');}
  function requestedPage(){const p=new URLSearchParams(location.search).get('page');return ['dashboard','live','playerstats','fixtures','teams','rules','finalformat','player'].includes(p)?p:'dashboard';}
  function requestedPlayer(){return new URLSearchParams(location.search).get('player')||'';}
  function show(page, updateUrl=true){if(!['dashboard','live','playerstats','fixtures','teams','rules','finalformat','player'].includes(page)) page='dashboard';document.querySelectorAll('.page').forEach(x=>x.classList.add('hidden'));$(page)?.classList.remove('hidden');document.querySelectorAll('#publicNav a').forEach(x=>x.classList.toggle('active',x.dataset.page===page));if(updateUrl){const u=new URL(location.href);u.searchParams.set('page',page);if(page!=='player')u.searchParams.delete('player');history.pushState({},'',u);}}
  function showRequestedPage(){const page=requestedPage();show(page,false);const pid=requestedPlayer();if(page==='player'&&pid)openPublicPlayerStats(pid,false);}
  function playerStatsData(filters={team:'all',type:'all',stage:'all'}){
    const done=matches.filter(m=>m.status==='done' && (filters.type==='all'||matchType(m)===filters.type) && (filters.stage==='all'||(isFinal(m)?'finals':'league')===filters.stage));
    const rows=teams.flatMap(t=>(t.players||[]).filter(p=>!(/dummy/i.test(String(p.name||'')))).map(p=>{
      const appearances=done.filter(m=>matchPlayers.some(x=>x.match_id===m.id&&x.player_id===p.id));
      const wins=appearances.filter(m=>winner(m)===t.id).length;
      const losses=appearances.filter(m=>winner(m)&&winner(m)!==t.id).length;
      const countType=name=>appearances.filter(m=>matchType(m)===name).length;
      return {p,t,played:appearances.length,wins,losses,winPct:appearances.length?Math.round(wins*1000/appearances.length)/10:0,singles:countType("Men's Singles")+countType("Women's Singles"),doubles:countType("Men's Doubles")+countType("Women's Doubles")+countType("Mixed Doubles"),triplet:countType("Men's Triplet"),quad:countType("Men's Quadruple"),appearances};
    })).filter(x=>filters.team==='all'||x.t.id===filters.team).sort((a,b)=>b.winPct-a.winPct||b.wins-a.wins||b.played-a.played||a.p.name.localeCompare(b.p.name));
    return rows;
  }
  function playerStatsTypeIcon(type){
    if(/Singles/i.test(type)) return '🏸';
    if(/Doubles/i.test(type)) return '👥';
    if(/Triplet/i.test(type)) return '3️⃣';
    if(/Quadruple/i.test(type)) return '4️⃣';
    return '🏸';
  }
  function playerHistoryHtml(x){
    return x.appearances.slice().sort((a,b)=>(a.match_no||0)-(b.match_no||0)).map(m=>{
      const own=matchPlayers.filter(r=>r.match_id===m.id&&r.player_id===x.p.id)[0];
      const ownSide=own?.side||'A', oppSide=ownSide==='A'?'B':'A';
      const ownNames=orderedLineup(m,ownSide).map(id=>player(id)?.name).filter(Boolean);
      const oppNames=orderedLineup(m,oppSide).map(id=>player(id)?.name).filter(Boolean);
      const w=winner(m), isWin=w===x.t.id, isLoss=w&&w!==x.t.id;
      const type=matchType(m), label=isFinal(m)?finalLabel(m.final_no):type;
      return `<button type="button" class="player-history-card ${isWin?'history-win':isLoss?'history-loss':''}" data-public-history-match="${esc(m.id)}"><span class="history-icon">${playerStatsTypeIcon(type)}</span><span class="history-main"><b>${esc(label)}</b><span>${esc(team(m.team_a)?.name||'—')} vs ${esc(team(m.team_b)?.name||'—')}</span><small>${esc(formatTime(m.scheduled_at))} · Court ${esc(m.court||'—')} · Your lineup: ${esc(ownNames.join(' · ')||'—')} · Opponent: ${esc(oppNames.join(' · ')||'—')}</small></span><span class="history-result ${isWin?'win':isLoss?'loss':''}">${isWin?'WON':isLoss?'LOST':'—'}<strong>${esc(scoreText(m))}</strong></span></button>`;
    }).join('') || '<div class="empty-stats">No completed matches played by this player.</div>';
  }
  function renderPlayerStats(){
    const body=$('publicPlayerStatsBody'); if(!body)return;
    const filters={team:$('publicStatsTeam')?.value||'all',type:$('publicStatsType')?.value||'all',stage:$('publicStatsStage')?.value||'all'};
    const rows=playerStatsData(filters);
    $('publicStatsTeam').innerHTML='<option value="all">All Teams</option>'+teams.map(t=>`<option value="${esc(t.id)}">${esc(t.name)}</option>`).join(''); $('publicStatsTeam').value=filters.team;
    body.innerHTML=rows.map((x,i)=>`<tr class="player-stat-row" data-public-player-stats="${esc(x.p.id)}"><td><span class="rank-pill">${i+1}</span></td><td><b>${esc(x.p.name)}</b><div class="winbar"><i style="width:${Math.min(100,x.winPct)}%"></i></div></td><td>${esc(x.t.name)}</td><td>${x.played}</td><td class="result-win">${x.wins}</td><td class="result-loss">${x.losses}</td><td><b>${x.winPct}%</b></td><td>${x.singles}</td><td>${x.doubles}</td><td>${x.triplet}</td><td>${x.quad}</td></tr>`).join('')||'<tr><td colspan="11" class="muted">No completed player appearances found.</td></tr>';
    $('publicPlayerStatsMobile').innerHTML=rows.map((x,i)=>`<button type="button" class="player-rank-card" data-public-player-stats="${esc(x.p.id)}"><span class="rank-pill">${i+1}</span><span class="player-rank-main"><b>${esc(x.p.name)}</b><small>${esc(x.t.name)}</small><span class="mobile-breakdown">${x.wins}W · ${x.losses}L · ${x.played} played</span><span class="winbar"><i style="width:${Math.min(100,x.winPct)}%"></i></span></span><span class="mobile-win"><b>${x.winPct}%</b><small>Win rate</small></span></button>`).join('')||'<div class="empty-stats">No completed player appearances found.</div>';
  }
  function openPublicPlayerStats(id, updateUrl=true){
    const t=teams.find(t=>(t.players||[]).some(p=>p.id===id)); const p=t?.players.find(p=>p.id===id); if(!p || /dummy/i.test(String(p.name||'')))return;
    const x=playerStatsData({team:t.id,type:'all',stage:'all'}).find(r=>r.p.id===id); if(!x)return;
    if(updateUrl){const u=new URL(location.href);u.searchParams.set('page','player');u.searchParams.set('player',id);history.pushState({},'',u);show('player',false);}
    const detail=$('publicPlayerProfilePage'); if(!detail)return;
    const all=x.allAppearances.slice().sort((a,b)=>(a.match_no||0)-(b.match_no||0));
    detail.innerHTML=`<div class="player-profile"><span class="profile-avatar">${esc(String(p.name||'?').trim().charAt(0).toUpperCase())}</span><div><span class="eyebrow">PLAYER PROFILE</span><h2>${esc(p.name)}</h2><p>${esc(t.name)} · ${x.played} completed · <span class="result-win">${x.wins} wins</span> · <span class="result-loss">${x.losses} losses</span> · <b>${x.winPct}% win rate</b></p></div></div><div class="profile-kpis"><div><span>Completed</span><b>${x.played}</b></div><div><span>Wins</span><b class="result-win">${x.wins}</b></div><div><span>Losses</span><b class="result-loss">${x.losses}</b></div><div><span>Win Rate</span><b>${x.winPct}%</b></div></div><div class="history-title"><h3>All Matches Played</h3><span>${all.length} appearance${all.length===1?'':'s'}</span></div><div class="player-history">${all.map(m=>{const ownSide=(matchPlayers.find(r=>r.match_id===m.id&&r.player_id===p.id)?.side)||'A',oppSide=ownSide==='A'?'B':'A';const ownNames=orderedLineup(m,ownSide).map(id=>player(id)?.name).filter(Boolean);const oppNames=orderedLineup(m,oppSide).map(id=>player(id)?.name).filter(Boolean);const w=winner(m),isWin=w===t.id,isLoss=w&&w!==t.id;const type=matchType(m),label=isFinal(m)?finalLabel(m.final_no):type;const status=m.status==='done'?(isWin?'WON':isLoss?'LOST':'DRAW'):String(m.status||'UPCOMING').toUpperCase();return `<div class="player-history-card ${isWin?'history-win':isLoss?'history-loss':''} match-history-static"><span class="history-icon">${playerStatsTypeIcon(type)}</span><span class="history-main"><b>${esc(label)}</b><span>${esc(team(m.team_a)?.name||'—')} vs ${esc(team(m.team_b)?.name||'—')}</span><small>${esc(formatTime(m.scheduled_at))} · Court ${esc(m.court||'—')}</small><small><b>Your lineup:</b> ${esc(ownNames.join(' · ')||'—')}</small><small><b>Opponent lineup:</b> ${esc(oppNames.join(' · ')||'—')}</small></span><span class="history-result ${isWin?'win':isLoss?'loss':''}">${esc(status)}<strong>${esc(scoreText(m))}</strong></span></div>`;}).join('')||'<div class="empty-stats">No matches found for this player.</div>'}</div>`;
  }
  function render(){
    $('tournamentTitle').textContent=tournament?.name||'PCBL 2026';
    $('tournamentMeta').textContent=[tournament?.venue,tournament?.status==='live'?'LIVE NOW':tournament?.status].filter(Boolean).join(' · ')||'Live badminton team-event results, standings and schedule.';
    $('stats').innerHTML=[['Teams',teams.length],['Players',players.length],['Matches',matches.length],['Live Courts',matches.filter(m=>m.status==='live').length]].map(x=>`<div class="stat"><span>${x[0]}</span><strong>${x[1]}</strong></div>`).join('');
    const standing=teams.map(t=>({t,wins:matches.filter(m=>m.status==='done'&&winner(m)===t.id).length})).sort((a,b)=>b.wins-a.wins||a.t.name.localeCompare(b.t.name));
    $('standings').innerHTML=standing.map((x,i)=>`<button class="player standing-team" data-team-details="${esc(x.t.id)}"><span><b>${i+1}. ${esc(x.t.name)}</b><small>${(x.t.players||[]).length} players · ${matches.filter(m=>m.status==='done'&&(m.team_a===x.t.id||m.team_b===x.t.id)).length} played</small></span><b>${x.wins} win${x.wins===1?'':'s'}</b></button>`).join('')||'<p class="muted">No teams registered.</p>';
    $('schedule').innerHTML=matches.slice().sort((a,b)=>new Date(a.scheduled_at||0)-new Date(b.scheduled_at||0)).slice(0,12).map(m=>{const w=m.status==='done'?winner(m):null;const aCls=w===m.team_a?'result-win':w===m.team_b?'result-loss':'';const bCls=w===m.team_b?'result-win':w===m.team_a?'result-loss':'';return `<div class="player"><span><b>${esc(formatTime(m.scheduled_at))}</b> · Court ${esc(m.court||'—')}<br>${esc(isFinal(m)?finalLabel(m.final_no):matchType(m))} · <b class="${aCls}">${esc(team(m.team_a)?.name||'—')}</b> vs <b class="${bCls}">${esc(team(m.team_b)?.name||'—')}</b></span><span class="status ${esc(m.status)}">${esc(m.status)}</span></div>`;}).join('')||'<p class="muted">No fixtures yet.</p>';
    $('liveGrid').innerHTML=matches.filter(m=>m.status==='live').map(courtHtml).join('')||'<div class="card"><h2>No live matches</h2><p class="muted">Live matches will appear here as soon as a scorer starts them.</p></div>';
    $('fixturesBody').innerHTML=matches.slice().sort((a,b)=>(a.match_no||0)-(b.match_no||0)).map(m=>{const w=m.status==='done'?winner(m):null;const aWin=w===m.team_a,aLost=w===m.team_b,bWin=w===m.team_b,bLost=w===m.team_a;return `<tr><td>${esc(formatTime(m.scheduled_at))}</td><td>${esc(m.court||'—')}</td><td>${esc(isFinal(m)?finalLabel(m.final_no):matchType(m))}</td><td class="${aWin?'result-win':aLost?'result-loss':''}"><b>${esc(team(m.team_a)?.name||'—')}</b><br><small>${esc(lineup(m,'A'))}</small></td><td class="${bWin?'result-win':bLost?'result-loss':''}"><b>${esc(team(m.team_b)?.name||'—')}</b><br><small>${esc(lineup(m,'B'))}</small></td><td><span class="${aWin?'result-win':aLost?'result-loss':''}">${esc(lineup(m,'A'))}</span> vs <span class="${bWin?'result-win':bLost?'result-loss':''}">${esc(lineup(m,'B'))}</span></td><td><span class="status ${esc(m.status)}">${esc(m.status)}</span></td><td><b class="${aWin?'result-win':bWin?'result-win':aLost||bLost?'result-loss':''}">${esc(scoreText(m))}</b>${m.status==='done'&&w?`<br><small class="result-win">Winner: ${esc(team(w)?.name||'')}</small>`:''}</td></tr>`;}).join('')||'<tr><td colspan="8" class="muted">No fixtures yet.</td></tr>';
    $('teamCards').innerHTML=teams.map(t=>`<div class="teamcard"><div class="teamtitle"><h2>${esc(t.name)}</h2><span>${(t.players||[]).length} players</span></div><p class="muted">Captain: ${esc(t.captain||'—')}</p>${(t.players||[]).map(p=>`<div class="player"><span>${esc(p.name)}</span><span class="gender">${p.gender==='F'?'♀ Female':'♂ Male'}</span></div>`).join('')||'<p class="muted">No players registered.</p>'}</div>`).join('')||'<div class="card"><b>No teams yet.</b></div>';
    renderPlayerStats();
  }
  function courtHtml(m){const a=team(m.team_a),b=team(m.team_b),g=matchGames(m.id)[0]||{score_a:0,score_b:0},sa=Number(g.score_a||0),sbx=Number(g.score_b||0),quad=isQuad(m),trip=isTriplet(m),final=isFinal(m);let banner='';if(quad){const p=quadPhase(m),idsA=orderedLineup(m,'A'),idsB=orderedLineup(m,'B'),ix=[[0,1],[1,2],[2,3],[3,0]][p-1];banner=`<div class="tripletPanel quadruplePanel"><div><b>${esc(a?.name||'—')}</b><small>${esc(idsA.map(id=>player(id)?.name||'').join(' · '))}</small></div><div class="tripletFlow"><b>ROTATION ${p} OF 4</b><span>${esc(ix.map(i=>player(idsA[i])?.name||'—').join(' + '))} vs ${esc(ix.map(i=>player(idsB[i])?.name||'—').join(' + '))}</span><small>Changes when either team reaches 15 / 30 / 45</small></div><div><b>${esc(b?.name||'—')}</b><small>${esc(idsB.map(id=>player(id)?.name||'').join(' · '))}</small></div></div>`;}const center=quad?`<div class="tripletPhase"><b>QUADRUPLE · 60 POINTS</b><span>ROTATION ${quadPhase(m)} · ${quadPhase(m)===1?'0–14':quadPhase(m)===2?'15–29':quadPhase(m)===3?'30–44':'45–59'}</span><small>Either team reaching the threshold changes both pairs</small></div>`:trip?`<div class="tripletPhase"><b>TRIPLET · 30 POINTS</b><span>PHASE ${tripPhase(m)} · ${tripPhase(m)===1?'0–15':'15–30+'}</span><small>Deuce from 30 · 2-point lead required · 40 wins</small></div>`:final?`<div class="games"><b>FINALS · ${limit(m)} POINTS</b><br>${esc(finalLabel(m.final_no))}</div>`:`<div class="games"><b>1 SET · 21 POINTS</b><br>Ends change at 11</div>`;return `<div class="court"><div class="courthead"><div><b>Court ${esc(m.court||'—')}</b><div class="muted">${esc(isFinal(m)?finalLabel(m.final_no):matchType(m))} · ${esc(formatTime(m.scheduled_at))}</div></div><span class="livepill">● LIVE</span></div>${banner}<div class="scoreteams"><div class="side"><div class="names"><b>${esc(a?.name||'—')}</b><br><small>${esc(lineup(m,'A'))}</small></div><div class="publicscore">${sa}</div></div><div class="center"><strong>–</strong>${center}</div><div class="side"><div class="names"><b>${esc(b?.name||'—')}</b><br><small>${esc(lineup(m,'B'))}</small></div><div class="publicscore">${sbx}</div></div></div></div>`;}
  async function load(){if(!sb)return;const [tx,tt,pp,mm,mp,gg]=await Promise.all([sb.from('tournaments').select('*').order('created_at',{ascending:true}).limit(1).maybeSingle(),sb.from('teams').select('*').order('name'),sb.from('players').select('*'),sb.from('matches').select('*').order('match_no'),sb.from('match_players').select('*'),sb.from('games').select('*')]);if(tt.error){$('connection').textContent='ERROR';$('connection').className='badge';return;}tournament=tx.data;teams=tt.data||[];players=pp.error?[]:(pp.data||[]);matches=mm.error?[]:(mm.data||[]);matchPlayers=mp.error?[]:(mp.data||[]);games=gg.error?[]:(gg.data||[]);teams=teams.map(t=>({...t,players:players.filter(p=>p.team_id===t.id)}));$('connection').textContent='LIVE';$('connection').className='badge ok';render();showRequestedPage();}
  if(!window.supabase||!cfg.SUPABASE_URL||!cfg.SUPABASE_PUBLISHABLE_KEY){$('connection').textContent='CONFIG ERROR';}else{sb=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_PUBLISHABLE_KEY);load();sb.channel('public-site').on('postgres_changes',{event:'*',schema:'public',table:'matches'},load).on('postgres_changes',{event:'*',schema:'public',table:'games'},load).on('postgres_changes',{event:'*',schema:'public',table:'teams'},load).on('postgres_changes',{event:'*',schema:'public',table:'players'},load).subscribe();}
  document.querySelectorAll('#publicNav a').forEach(b=>b.addEventListener('click',e=>{e.preventDefault();const u=new URL(b.href);history.pushState({},'',u);showRequestedPage();})); window.addEventListener('popstate',showRequestedPage);
  ['publicStatsTeam','publicStatsType','publicStatsStage'].forEach(id=>$(id)?.addEventListener('change',renderPlayerStats));
  document.addEventListener('click',e=>{const btn=e.target.closest('[data-team-details]');if(btn)openTeamDetails(btn.dataset.teamDetails);const ps=e.target.closest('[data-public-player-stats]');if(ps)openPublicPlayerStats(ps.dataset.publicPlayerStats);if(e.target.id==='closeTeamDetail'||e.target.id==='teamDetailModal')$('teamDetailModal').classList.add('hidden');});
})();
