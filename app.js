(() => {
  const demo = {
    tournament: { id: 'demo', name: 'PCBL Finals' },
    teams: [
      { id:'D', name:'Team D', captain:'', players:[{id:'d1',name:'Jitendra',gender:'M'},{id:'d2',name:'Nishant',gender:'M'},{id:'d3',name:'Yamini',gender:'F'},{id:'d4',name:'Tejashree',gender:'F'}] },
      { id:'E', name:'Team E', captain:'', players:[{id:'e1',name:'Amit',gender:'M'},{id:'e2',name:'Rahul',gender:'M'},{id:'e3',name:'Reshma',gender:'F'},{id:'e4',name:'Yogeshwari',gender:'F'}] }
    ],
    matches: [
      {id:'m1',time:'7:30',court:'1',type:"Women's Doubles",a:'D',b:'E',ap:['d3','d4'],bp:['e3','e4'],status:'live',game:0,sets:[[18,17],[0,0],[0,0]],history:[]},
      {id:'m2',time:'7:40',court:'2',type:"Men's Doubles",a:'D',b:'E',ap:['d1','d2'],bp:['e1','e2'],status:'upcoming',game:0,sets:[[0,0],[0,0],[0,0]],history:[]}
    ]
  };

  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const cfg = window.PCBL_CONFIG || {};
  let sb = null;
  let state = { mode:'demo', tournament:null, teams:[], matches:[] };

  function cloneDemo(){ return JSON.parse(JSON.stringify(demo)); }
  function setDemo(){ const d=cloneDemo(); state={mode:'demo',tournament:d.tournament,teams:d.teams,matches:d.matches}; $('connection').textContent='LOCAL DEMO'; $('connection').className='badge'; hideLogin(); render(); }
  function hideLogin(){ $('loginView').classList.add('hidden'); $('mainView').classList.remove('hidden'); }
  function showLogin(){ $('loginView').classList.remove('hidden'); $('mainView').classList.add('hidden'); }
  function team(id){ return state.teams.find(t=>t.id===id); }
  function player(id){ for(const t of state.teams){ const p=t.players.find(x=>x.id===id); if(p) return p; } return null; }

  function show(page){
    document.querySelectorAll('.page').forEach(x=>x.classList.add('hidden'));
    const el=$(page); if(el) el.classList.remove('hidden');
    document.querySelectorAll('nav button').forEach(x=>x.classList.toggle('active',x.dataset.page===page));
    render();
  }

  function matchType(m){ return m?.match_type || m?.type || ''; }
  function isTriplet(m){ return matchType(m) === "Men's Triplet"; }
  function isQuadruple(m){ return matchType(m) === "Men's Quadruple"; }
  function isFinal(m){ return m?.stage === 'finals' || Number(m?.final_no) >= 1; }
  function finalPoints(finalNo){
    const n=Number(finalNo);
    return [1,3,5].includes(n) ? 15 : [2,4,6].includes(n) ? 60 : null;
  }
  function pointsLimit(m){
    if(isFinal(m) && Number(m.final_no)) return finalPoints(m.final_no) || Number(m.points_to_win)||21;
    if(isQuadruple(m)) return 60;
    if(isTriplet(m)) return 30;
    return 21;
  }
  function isMatchComplete(m,a,b){
    const limit=pointsLimit(m);
    if(isTriplet(m)) {
      const high=Math.max(a,b);
      const low=Math.min(a,b);
      // Triplet uses a deuce rule: from 30 onward, a 2-point lead is required,
      // but 40 points is the absolute winning ceiling.
      return (high >= 30 && high - low >= 2) || high >= 40;
    }
    if(isFinal(m) || isQuadruple(m)) return Math.max(a,b) >= limit;
    return (Math.max(a,b)>=21 && Math.abs(a-b)>=2) || Math.max(a,b)>=30;
  }
  function matchWinner(m){
    const s=currentScore(m);
    if(s[0]===s[1]) return null;
    if(!isMatchComplete(m,s[0],s[1])) return null;
    return s[0]>s[1]?m.a:m.b;
  }
  function currentScore(m){ return m.sets?.[0] || [0,0]; }
  function getLeagueTopTwo(){
    const leagueMatches = state.matches.filter(m => !isFinal(m));
    const standings = state.teams.map(t => ({
      team: t,
      points: leagueMatches.filter(m => m.status === 'done' && matchWinner(m) === t.id).length,
      played: leagueMatches.filter(m => m.status === 'done' && (m.a === t.id || m.b === t.id)).length
    })).sort((x,y) => y.points - x.points || y.played - x.played || x.team.name.localeCompare(y.team.name));
    return standings.slice(0,2);
  }

  function fixtureResultForTeam(m, teamId){
    if(m.status!=='done') return m.status==='live'?'LIVE':'UPCOMING';
    const w=matchWinner(m);
    return w===teamId?'WON':w?'LOST':'DRAW';
  }
  function fixtureScore(m){
    const s=currentScore(m);
    return `${s[0]} - ${s[1]}`;
  }
  function adminTeamDetailHtml(t){
    const ms=state.matches.filter(m=>m.a===t.id||m.b===t.id).sort((a,b)=>{
      const ta=a.time||'', tb=b.time||'';
      return ta.localeCompare(tb) || ((a.match_no||0)-(b.match_no||0));
    });
    const played=ms.filter(m=>m.status==='done');
    const wins=played.filter(m=>matchWinner(m)===t.id).length;
    const losses=played.filter(m=>matchWinner(m)&&matchWinner(m)!==t.id).length;
    const fixtures=ms.map(m=>{
      const isA=m.a===t.id, opp=team(isA?m.b:m.a), result=fixtureResultForTeam(m,t.id);
      const score=fixtureScore(m);
      const ap=(m.ap||[]).map(id=>player(id)?.name).filter(Boolean).join(' & ') || '—';
      const bp=(m.bp||[]).map(id=>player(id)?.name).filter(Boolean).join(' & ') || '—';
      const teamWon=result==='WON'; const teamLost=result==='LOST';
      return `<div class="team-fixture"><div class="fixture-main"><div><b>${esc(matchType(m))}</b><div class="muted">${esc(m.time||'—')} · Court ${esc(m.court||'—')}</div></div><span class="status ${result==='WON'?'done':result==='LOST'?'live':result.toLowerCase()}">${result}</span></div><div class="fixture-vs"><b class="${teamWon?'result-win':teamLost?'result-loss':''}">${esc(t.name)}</b><span>vs</span><b class="${teamWon?'result-loss':teamLost?'result-win':''}">${esc(opp?.name||'—')}</b><strong>${esc(score)}</strong></div><div class="fixture-players"><span class="${teamWon?'result-win':teamLost?'result-loss':''}">${esc(ap)}</span><span>·</span><span class="${teamWon?'result-loss':teamLost?'result-win':''}">${esc(bp)}</span></div></div>`;
    }).join('') || '<p class="muted">No fixtures assigned to this team yet.</p>';
    return `<div class="team-summary"><div><span>Players</span><b>${t.players.length}</b></div><div><span>Played</span><b>${played.length}</b></div><div><span>Wins</span><b>${wins}</b></div><div><span>Losses</span><b>${losses}</b></div></div><h3>Fixtures & Results</h3><div class="team-fixtures">${fixtures}</div>`;
  }
  function openAdminTeamDetails(id){
    const t=team(id); if(!t) return;
    $('modalBox').innerHTML=`<div class="modalhead"><h2>${esc(t.name)} — Fixtures & Results</h2><button class="btn" id="closeTeamDetail">Close</button></div>${adminTeamDetailHtml(t)}`;
    $('modal').classList.remove('hidden');
    $('closeTeamDetail').onclick=closeModal;
  }
  function tripletPhase(m){
    const s=currentScore(m), total=Number(s[0]||0)+Number(s[1]||0);
    return total < 15 ? 1 : 2;
  }
  function quadruplePhase(m){
    const s=currentScore(m), high=Math.max(Number(s[0]||0),Number(s[1]||0));
    if(high < 15) return 1;
    if(high < 30) return 2;
    if(high < 45) return 3;
    return 4;
  }
  function lineupNames(m, side){
    const ids=side==='A'?(m.ap||[]):(m.bp||[]);
    if(isQuadruple(m) && ids.length>=4){
      const p=quadruplePhase(m);
      const active=[[ids[0],ids[1]],[ids[1],ids[2]],[ids[2],ids[3]],[ids[3],ids[0]]][p-1];
      return active.map(id=>player(id)?.name||'').filter(Boolean).join(' & ');
    }
    if(!isTriplet(m) || ids.length<3) return ids.map(id=>player(id)?.name||'').filter(Boolean).join(' & ');
    const active=tripletPhase(m)===1 ? [ids[0],ids[1]] : [ids[1],ids[2]];
    return active.map(id=>player(id)?.name||'').filter(Boolean).join(' & ');
  }
  function tripletRoleNames(m,side){
    const ids=side==='A'?(m.ap||[]):(m.bp||[]);
    return {
      out: player(ids[0])?.name || '—',
      common: player(ids[1])?.name || '—',
      in: player(ids[2])?.name || '—'
    };
  }
  function gameWins(m){
    const s=currentScore(m);
    return isMatchComplete(m,s[0],s[1]) ? (s[0]>s[1]?[1,0]:s[1]>s[0]?[0,1]:[0,0]) : [0,0];
  }

  function render(){
    if(!$('stats')) return;
    $('tournamentTitle').textContent = state.tournament?.name || 'PCBL Finals';
    $('stats').innerHTML = [
      ['Teams',state.teams.length],['Players',state.teams.reduce((n,t)=>n+t.players.length,0)],['Matches',state.matches.length],['Live Courts',state.matches.filter(m=>m.status==='live').length]
    ].map(x=>`<div class="stat"><span>${x[0]}</span><strong>${x[1]}</strong></div>`).join('');

    $('playerTeam').innerHTML = state.teams.map(t=>`<option value="${esc(t.id)}">${esc(t.name)}</option>`).join('') || '<option value="">Add a team first</option>';
    $('teamCards').innerHTML = state.teams.map(t=>`<div class="teamcard"><div class="teamtitle"><h2>${esc(t.name)}</h2><span>${t.players.length} players</span></div><p class="muted">Captain: ${esc(t.captain||'—')}</p>${t.players.map(p=>`<div class="player">${esc(p.name)} <span class="gender">${p.gender==='F'?'♀ Female':'♂ Male'}</span></div>`).join('')}</div>`).join('') || '<div class="card"><b>No teams yet.</b></div>';

    $('fixturesBody').innerHTML = state.matches.map(m=>{
      const a=team(m.a), b=team(m.b);
      const ap=(m.ap||[]).map(id=>player(id)?.name).filter(Boolean).join(' & '), bp=(m.bp||[]).map(id=>player(id)?.name).filter(Boolean).join(' & ');
      const done=m.status==='done';
      const w=done?matchWinner(m):null;
      const aCls=done?(w===m.a?'result-win':w===m.b?'result-loss':'') : '';
      const bCls=done?(w===m.b?'result-win':w===m.a?'result-loss':'') : '';
      const score=fixtureScore(m);
      return `<tr><td>${esc(m.time||'—')}</td><td>${esc(m.court||'—')}</td><td>${esc(matchType(m))}</td><td class="${aCls}"><b>${esc(a?.name||'—')}</b></td><td class="${bCls}"><b>${esc(b?.name||'—')}</b></td><td><span class="${aCls}">${esc(ap||'—')}</span> vs <span class="${bCls}">${esc(bp||'—')}</span></td><td><span class="status ${m.status}">${esc(m.status)}</span></td><td><b class="${done&&w===m.a?'result-win':done&&w===m.b?'result-loss':''}">${esc(score)}</b></td><td>${m.status!=='done'&&m.status!=='cancelled'?`<button class="btn small" data-score="${m.id}">${m.status==='live'?'Score':'Start'}</button>`:'✓'}</td></tr>`;
    }).join('') || '<tr><td colspan="9" class="muted">No fixtures yet.</td></tr>';

    $('liveGrid').innerHTML = state.matches.filter(m=>m.status==='live').map(courtHtml).join('') || '<div class="card"><b>No live matches.</b><p class="muted">Start a fixture from Fixtures.</p></div>';
    const standing = state.teams.map(t=>({
      team:t,
      wins:state.matches.filter(m=>m.status==='done'&&matchWinner(m)===t.id).length,
      played:state.matches.filter(m=>m.status==='done'&&(m.a===t.id||m.b===t.id)).length,
      fixtures:state.matches.filter(m=>m.a===t.id||m.b===t.id).length
    })).sort((x,y)=>y.wins-x.wins || x.team.name.localeCompare(y.team.name));
    $('standings').innerHTML = standing.map((x,i)=>`<button type="button" class="player standing-team" data-admin-team-details="${esc(x.team.id)}"><span><b>${i+1}. ${esc(x.team.name)}</b><small>${x.played} played · ${x.team.players.length} players</small></span><b>${x.wins} win${x.wins===1?'':'s'}</b></button>`).join('') || '<p class="muted">No teams.</p>';
    $('schedule').innerHTML = state.matches.slice().sort((a,b)=>(a.time||'').localeCompare(b.time||'')).map(m=>`<div class="player"><span><b>${esc(m.time||'—')}</b> · Court ${esc(m.court||'—')}<br>${esc(matchType(m))} · ${esc(team(m.a)?.name||'—')} vs ${esc(team(m.b)?.name||'—')}</span><span class="status ${m.status}">${esc(m.status)}</span></div>`).join('') || '<p class="muted">No matches.</p>';
  }

  function courtHtml(m){
    const a=team(m.a), b=team(m.b), s=currentScore(m);
    const trip=isTriplet(m), quad=isQuadruple(m), final=isFinal(m);
    let banner='';
    if(trip){
      const ar=tripletRoleNames(m,'A'), br=tripletRoleNames(m,'B'), phase=tripletPhase(m);
      const aPair=phase===1?`${ar.out} + ${ar.common}`:`${ar.common} + ${ar.in}`;
      const bPair=phase===1?`${br.out} + ${br.common}`:`${br.common} + ${br.in}`;
      banner=`<div class="tripletPanel"><div><b>${esc(a?.name||'—')}</b><small>OUT: ${esc(ar.out)} · COMMON: ${esc(ar.common)} · IN: ${esc(ar.in)}</small></div><div class="tripletFlow"><b>PHASE ${phase}</b><span>${esc(aPair)} vs ${esc(bPair)}</span><small>${phase===1?'First 15 rally points':'Next 15 rally points'} · Deuce from 30, 2-point lead required, 40 wins</small></div><div><b>${esc(b?.name||'—')}</b><small>OUT: ${esc(br.out)} · COMMON: ${esc(br.common)} · IN: ${esc(br.in)}</small></div></div>`;
    } else if(quad){
      const p=quadruplePhase(m), phasePairs=[[0,1],[1,2],[2,3],[3,0]][p-1], ap=m.ap||[], bp=m.bp||[];
      const aPair=phasePairs.map(i=>player(ap[i])?.name||'—').join(' + '), bPair=phasePairs.map(i=>player(bp[i])?.name||'—').join(' + ');
      banner=`<div class="tripletPanel quadruplePanel"><div><b>${esc(a?.name||'—')}</b><small>${esc((ap||[]).map(id=>player(id)?.name||'').join(' · '))}</small></div><div class="tripletFlow"><b>ROTATION ${p} OF 4</b><span>${esc(aPair)} vs ${esc(bPair)}</span><small>${p===1?'0–14':p===2?'15–29':p===3?'30–44':'45–59'} · changes when either team reaches the threshold</small></div><div><b>${esc(b?.name||'—')}</b><small>${esc((bp||[]).map(id=>player(id)?.name||'').join(' · '))}</small></div></div>`;
    }
    const phaseText=trip ? `<div class="tripletPhase"><b>TRIPLET · 30 POINTS</b><span>PHASE ${tripletPhase(m)} · ${tripletPhase(m)===1?'0–15':'15–30'}</span><small>Rotation after 15 total rally points · Deuce from 30, 2-point lead or 40 wins</small></div>`
      : quad ? `<div class="tripletPhase"><b>QUADRUPLE · 60 POINTS</b><span>ROTATION ${quadruplePhase(m)} · ${quadruplePhase(m)===1?'0–14':quadruplePhase(m)===2?'15–29':quadruplePhase(m)===3?'30–44':'45–59'}</span><small>Rotation changes when either team reaches 15 / 30 / 45</small></div>`
      : final ? `<div class="games"><b>FINALS · ${pointsLimit(m)} POINTS</b><br>${esc(finalNoLabel(m))}</div>`
      : `<div class="games">1 SET · 21 POINTS</div>`;
    return `<div class="court"><div class="courthead"><div><b>Court ${esc(m.court||'—')}</b><div class="muted">${esc(matchType(m))}${final?' · Finals Match '+esc(m.final_no):''} · ${esc(m.time||'')}</div></div><span class="livepill">● LIVE</span></div>${banner}<div class="scoreteams"><div class="side"><div class="names"><b>${esc(a?.name||'—')}</b><br><small>${esc(lineupNames(m,'A'))}</small></div><button class="scorebtn" data-point="${m.id}:A">${s[0]}</button></div><div class="center"><strong>–</strong>${phaseText}</div><div class="side"><div class="names"><b>${esc(b?.name||'—')}</b><br><small>${esc(lineupNames(m,'B'))}</small></div><button class="scorebtn" data-point="${m.id}:B">${s[1]}</button></div></div><div class="courtActions"><button class="btn" data-undo="${m.id}">↶ Undo</button><button class="btn" data-finish="${m.id}">Finish</button></div></div>`;
  }
  function finalNoLabel(m){
    const n=Number(m.final_no);
    return n===1?'Match 1 · Women’s Doubles':n===2?'Match 2 · Men’s Quadruple':n===3?'Match 3 · Men’s Singles':n===4?'Match 4 · Men’s Quadruple':n===5?'Match 5 · Women’s Doubles':n===6?'Match 6 · Men’s Quadruple':'Finals';
  }

  function advanceDemo(m){
    const s=currentScore(m);
    if(isMatchComplete(m,s[0],s[1])) m.status='done';
  }

  async function cloudPoint(id,side){
    const {error}=await sb.rpc('add_point',{p_match:id,p_side:side});
    if(error){ alert(error.message); return; }
    await loadCloud();
    const m=state.matches.find(x=>x.id===id);
    if(!m) return;
    const s=currentScore(m), reached=isMatchComplete(m,s[0],s[1]);
    if(reached){
      const winner=matchWinner(m), winnerName=winner ? (team(winner)?.name||'') : 'No winner yet';
      const message=`${finalNoLabel(m)} has reached ${s[0]} - ${s[1]}.\n\nConfirm that this match is OVER?\nWinner: ${winnerName}\n\nOK = Finish match\nCancel = Keep match live.`;
      if(window.confirm(message)) await finish(id);
    }
  }
  function point(id,side){
    if(state.mode==='cloud') return cloudPoint(id,side);
    const m=state.matches.find(x=>x.id===id); if(!m||m.status!=='live') return;
    m.history=m.history||[]; m.history.push({sets:JSON.parse(JSON.stringify(m.sets)),game:m.game,status:m.status});
    const idx=side==='A'?0:1, cur=currentScore(m), hardLimit=(isFinal(m)||isQuadruple(m)||isTriplet(m))?pointsLimit(m):30;
    if(Math.max(cur[0],cur[1])>=hardLimit) return;
    m.sets[0][idx]++; render();
    const s=currentScore(m), reached=isMatchComplete(m,s[0],s[1]);
    if(reached){
      const winner=matchWinner(m), winnerName=winner?(team(winner)?.name||''):'No winner yet';
      const ok=window.confirm(`${finalNoLabel(m)} has reached ${s[0]} - ${s[1]}.\n\nConfirm that the match is OVER?\nWinner: ${winnerName}\n\nOK = Finish\nCancel = Keep live.`);
      if(ok){m.status='done';} render();
    }
  }
  async function cloudUndo(id){
    if(!sb) return;
    const {error}=await sb.rpc('undo_last_point',{p_match:id});
    if(error){ alert(error.message); return; }
    await loadCloud();
  }
  function undo(id){
    if(state.mode==='cloud') return cloudUndo(id);
    const m=state.matches.find(x=>x.id===id), h=m?.history?.pop(); if(h){m.sets=h.sets;m.game=h.game;m.status=h.status;render();}
  }

  async function startMatch(id){
    if(state.mode==='cloud'){
      const {error}=await sb.from('matches').update({status:'live',current_game:1}).eq('id',id); if(error) alert(error.message); else { await ensureGame(id,1); await loadCloud(); show('live'); }
    } else { const m=state.matches.find(x=>x.id===id); if(m){m.status='live';render();show('live');} }
  }
  async function finish(id){
    const m=state.matches.find(x=>x.id===id);
    if(!m) return;

    const winner=matchWinner(m);
    if(!winner){
      alert('Cannot finish a tied or incomplete match. Please add a point or correct the score first.');
      return;
    }

    const s=currentScore(m);
    const winnerName=winner===m.a ? (team(m.a)?.name||'Team A') : (team(m.b)?.name||'Team B');
    const matchLabel=isTriplet(m) ? 'Triplet (30 points)' : isQuadruple(m) ? "Men's Quadruple (60 points)" : isFinal(m) ? finalNoLabel(m) + ` (${pointsLimit(m)} points)` : `${matchType(m)} (21 points)`;
    const confirmed=window.confirm(`Confirm Finish?\n\n${matchLabel}\nScore: ${s[0]} - ${s[1]}\nWinner: ${winnerName}\n\nOnce finished, the match will be marked DONE.`);
    if(!confirmed) return;

    if(state.mode==='cloud'){
      const {error:gameError}=await sb.from('games').update({completed:true}).eq('match_id',id).eq('game_no',1);
      if(gameError){alert(gameError.message);return;}
      const {error}=await sb.from('matches').update({status:'done',current_game:1}).eq('id',id);
      if(error) alert(error.message);
      else await loadCloud();
    } else {
      m.status='done';
      render();
    }
  }
  async function ensureGame(matchId,gameNo){const {error}=await sb.from('games').upsert({match_id:matchId,game_no:gameNo},{onConflict:'match_id,game_no'});if(error)console.error(error);}

  function validateLineup(type, ids, teamId){
    const ps=ids.map(player).filter(Boolean);
    const need=type === "Men's Triplet" ? 3 : type === "Men's Quadruple" ? 4 : (type.includes('Singles')?1:2);
    if(ps.length!==need) return `Select exactly ${need} player${need>1?'s':''} for ${team(teamId)?.name||'the team'}.`;
    if(new Set(ids).size!==ids.length) return type === "Men's Triplet" ? 'A player cannot occupy two Triplet positions.' : 'A player cannot be selected twice.';
    if(type==="Men's Singles"||type==="Men's Doubles"||type==="Men's Triplet"||type==="Men's Quadruple"){if(ps.some(p=>p.gender!=='M')) return "Men's match requires male players.";}
    if(type==="Women's Singles"||type==="Women's Doubles"){if(ps.some(p=>p.gender!=='F')) return "Women's match requires female players.";}
    if(type==='Mixed Doubles' && !(ps.some(p=>p.gender==='M')&&ps.some(p=>p.gender==='F'))) return 'Mixed Doubles requires one male and one female player.';
    return '';
  }

  // PCBL Pair Uniqueness Rule:
  // - Women's Doubles pairs ARE allowed to repeat.
  // - Men's Doubles and Mixed Doubles pairs cannot repeat.
  // - Men's Triplet is also checked for pair repetition. The OUT+COMMON
  //   pair and COMMON+IN pair must not have previously appeared together
  //   in a Men's Doubles, Mixed Doubles, or Triplet match.
  // - Player order does not matter: A+B is the same pair as B+A.
  function pairKey(a,b){
    if(!a || !b || a===b) return null;
    return [a,b].sort().join('|');
  }

  // Check the database directly so the rule cannot be bypassed by stale UI state.
  async function pairAlreadyUsed(pair, teamId, excludeMatchId=null){
    const key=pairKey(pair[0],pair[1]);
    if(!key) return null;

    // Women's Doubles is intentionally excluded.
    const allowedTypes=["Men's Doubles","Mixed Doubles","Men's Triplet","Men's Quadruple"];

    // In Demo mode, use the local state.
    if(state.mode!=='cloud' || !sb){
      for(const m of (state.matches||[])){
        if(excludeMatchId && m.id===excludeMatchId) continue;
        if(m.a!==teamId && m.b!==teamId) continue;
        const matchType=m.type || m.match_type;
        if(!allowedTypes.includes(matchType)) continue;
        const existing=m.a===teamId ? (m.ap||[]) : (m.bp||[]);
        const pairs=[];
        if(matchType==="Men's Triplet" && existing.length>=3){
          pairs.push([existing[0],existing[1]],[existing[1],existing[2]]);
        }else if(existing.length===2){
          pairs.push([existing[0],existing[1]]);
        }
        if(pairs.some(x=>pairKey(x[0],x[1])===key)) return m;
      }
      return null;
    }

    try{
      const {data:matches,error:matchError}=await sb
        .from('matches')
        .select('id,match_no,match_type,team_a,team_b')
        .eq('tournament_id',state.tournament.id)
        .in('match_type',allowedTypes);
      if(matchError) throw matchError;

      const teamMatches=(matches||[]).filter(m=>m.team_a===teamId||m.team_b===teamId)
        .filter(m=>!excludeMatchId || m.id!==excludeMatchId);
      if(!teamMatches.length) return null;

      const ids=teamMatches.map(m=>m.id);
      const {data:mp,error:mpError}=await sb
        .from('match_players')
        .select('match_id,player_id,side,lineup_order')
        .in('match_id',ids);
      if(mpError) throw mpError;

      for(const m of teamMatches){
        const side=m.team_a===teamId?'A':'B';
        const existing=(mp||[])
          .filter(x=>x.match_id===m.id && x.side===side)
          .sort((x,y)=>(x.lineup_order??999)-(y.lineup_order??999))
          .map(x=>x.player_id);

        const pairs=[];
        if(m.match_type==="Men's Triplet" && existing.length>=3){
          pairs.push([existing[0],existing[1]],[existing[1],existing[2]]);
        }else if(m.match_type==="Men's Quadruple" && existing.length>=4){
          pairs.push([existing[0],existing[1]],[existing[1],existing[2]],[existing[2],existing[3]],[existing[3],existing[0]]);
        }else if(existing.length===2){
          pairs.push([existing[0],existing[1]]);
        }
        if(pairs.some(x=>pairKey(x[0],x[1])===key)) return m;
      }
      return null;
    }catch(err){
      console.error('Pair uniqueness database check failed:',err);
      throw new Error('Unable to verify the no-repeat-pair rule. Please try again.');
    }
  }

  async function validatePairUniqueness(ids, teamId, type){
    let pairs=[];

    if(type === "Men's Doubles" || type === "Mixed Doubles") {
      pairs=[[ids[0],ids[1]]];
    } else if(type === "Men's Triplet") {
      pairs=[[ids[0],ids[1]],[ids[1],ids[2]]];
    } else if(type === "Men's Quadruple") {
      pairs=[[ids[0],ids[1]],[ids[1],ids[2]],[ids[2],ids[3]],[ids[3],ids[0]]];
    } else {
      // Women's Doubles and Singles have no pair-repeat restriction.
      return '';
    }

    for(const pair of pairs){
      const repeated=await pairAlreadyUsed(pair,teamId);
      if(repeated){
        const names=pair.map(id=>player(id)?.name).filter(Boolean).join(' + ');
        const teamName=team(teamId)?.name||'this team';
        return `Repeated Pair: ${names}\n\nThis pair has already played together for ${teamName} (Match ${repeated.match_no ?? 'unknown'}).\n\nPCBL rule: the same two players cannot form a pair again in Men's Doubles, Mixed Doubles, Triplet, or Quadruple. Women's Doubles pairs are allowed to repeat.`;
      }
    }
    return '';
  }

  function tripletSelect(teamObj,side){
    const opts=(teamObj?.players||[]).map(p=>`<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('');
    return `<div class="triplet-selects"><label>1st — OUT<select data-triplet="${side}-0"><option value="">Select player</option>${opts}</select></label><label>2nd — COMMON<select data-triplet="${side}-1"><option value="">Select player</option>${opts}</select></label><label>3rd — IN<select data-triplet="${side}-2"><option value="">Select player</option>${opts}</select></label></div>`;
  }
  function quadrupleSelect(teamObj,side){
    const opts=(teamObj?.players||[]).filter(p=>p.gender==='M').map(p=>`<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('');
    return `<div class="triplet-selects quadruple-selects"><label>1st<select data-quad="${side}-0"><option value="">Select player</option>${opts}</select></label><label>2nd<select data-quad="${side}-1"><option value="">Select player</option>${opts}</select></label><label>3rd<select data-quad="${side}-2"><option value="">Select player</option>${opts}</select></label><label>4th<select data-quad="${side}-3"><option value="">Select player</option>${opts}</select></label></div>`;
  }
  function finalLineupFor(finalNo,teamObj,side){
    const n=Number(finalNo);
    if([2,4,6].includes(n)) return quadrupleSelect(teamObj,side);
    const opts=(teamObj?.players||[]).map(p=>`<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('');
    if(n===3) return `<div class="triplet-selects"><label>Men's Singles<select data-final-single="${side}"><option value="">Select player</option>${opts}</select></label></div>`;
    return `<div class="triplet-selects"><label>Women's Doubles — Player 1<select data-final-wd="${side}-0"><option value="">Select player</option>${opts}</select></label><label>Women's Doubles — Player 2<select data-final-wd="${side}-1"><option value="">Select player</option>${opts}</select></label></div>`;
  }
  function finalPlayerIds(finalNo,side){
    const n=Number(finalNo);
    if([2,4,6].includes(n)) return [...document.querySelectorAll(`#line${side} select[data-quad^="${side}-"]`)].map(x=>x.value).filter(Boolean);
    if(n===3) return [...document.querySelectorAll(`#line${side} select[data-final-single="${side}"]`)].map(x=>x.value).filter(Boolean);
    return [...document.querySelectorAll(`#line${side} select[data-final-wd^="${side}-"]`)].map(x=>x.value).filter(Boolean);
  }
  function finalMatchType(finalNo){
    const n=Number(finalNo);
    return [1,5].includes(n) ? "Women's Doubles" : n===3 ? "Men's Singles" : "Men's Quadruple";
  }
  async function validateFinalPlayerUniqueness(finalNo,teamId,ids){
    const n=Number(finalNo);
    if(![2,3,4].includes(n)) return '';
    const existing=state.matches.filter(m=>isFinal(m)&&m.a===teamId||isFinal(m)&&m.b===teamId).filter(m=>[2,3,4].includes(Number(m.final_no))&&Number(m.final_no)!==n);
    const used=[];
    existing.forEach(m=>{ const side=m.a===teamId?'A':'B'; used.push(...(side==='A'?(m.ap||[]):(m.bp||[]))); });
    const dup=ids.find(id=>used.includes(id));
    if(dup) return `Finals player uniqueness rule: ${player(dup)?.name||'This player'} is already selected for ${team(teamId)?.name||'this team'} in Finals Match 2, 3 or 4. All 9 men across Matches 2, 3 and 4 must be unique.`;
    return '';
  }
  function populateLineups(){
    const A=team($('mtA').value), B=team($('mtB').value), type=$('mtType').value, stage=$('mtStage')?.value||'league';
    $('lineATitle').textContent = `${A?.name || 'Team A'} lineup`;
    $('lineBTitle').textContent = `${B?.name || 'Team B'} lineup`;
    if(stage==='finals'){
      const fn=Number($('mtFinalNo').value);
      if(!fn){ $('lineA').innerHTML=''; $('lineB').innerHTML=''; $('lineMsg').textContent='Select Finals Match 1–6.'; return; }
      $('lineA').innerHTML=finalLineupFor(fn,A,'A'); $('lineB').innerHTML=finalLineupFor(fn,B,'B');
      $('lineMsg').textContent=`${finalNoLabel({final_no:fn})}: ${finalMatchType(fn)} · ${finalPoints(fn)} points.`;
      return;
    }
    if(type === "Men's Triplet") {
      $('lineA').innerHTML=tripletSelect(A,'A'); $('lineB').innerHTML=tripletSelect(B,'B');
      $('lineMsg').textContent='Triplet: select 3 men in order — 1st OUT, 2nd COMMON (plays all 30), 3rd IN.';
      return;
    }
    if(type === "Men's Quadruple") {
      $('lineA').innerHTML=quadrupleSelect(A,'A'); $('lineB').innerHTML=quadrupleSelect(B,'B');
      $('lineMsg').textContent='Quadruple: select 4 men in order. Rotation = 1+2 → 2+3 → 3+4 → 4+1; changes when either team reaches 15, 30 or 45.';
      return;
    }
    $('lineA').innerHTML=(A?.players||[]).map(p=>`<label><input type="checkbox" value="${p.id}" data-line="A">${esc(p.name)} (${p.gender})</label>`).join('');
    $('lineB').innerHTML=(B?.players||[]).map(p=>`<label><input type="checkbox" value="${p.id}" data-line="B">${esc(p.name)} (${p.gender})</label>`).join('');
    $('lineMsg').textContent=`${type}: ${type.includes('Singles')?'1 player':'2 players'} per side.`;
  }

  function openMatchModal(){
    if(state.teams.length<2){alert('Add at least two teams first.');return;}
    const leagueTopTwo=getLeagueTopTwo();
    const opts=state.teams.map(t=>`<option value="${esc(t.id)}">${esc(t.name)}</option>`).join('');
    const finalOpts=leagueTopTwo.map(x=>`<option value="${esc(x.team.id)}">${esc(x.team.name)} (${x.points} league points)</option>`).join('');
    $('modalBox').innerHTML=`<h2>Add PCBL Match</h2><div class="two"><input id="mtTime" placeholder="Time e.g. 7:30"><input id="mtCourt" placeholder="Court 1"><select id="mtStage"><option value="league">League Stage</option><option value="finals">Finals</option></select><select id="mtFinalNo" class="hidden"><option value="">Finals Match #</option><option value="1">1 — Women’s Doubles · 15</option><option value="2">2 — Men’s Quadruple · 60</option><option value="3">3 — Men’s Singles · 15</option><option value="4">4 — Men’s Quadruple · 60</option><option value="5">5 — Women’s Doubles · 15</option><option value="6">6 — Men’s Quadruple · 60</option></select><select id="mtType"><option value="Men's Singles">Men's Singles</option><option value="Women's Singles">Women's Singles</option><option value="Men's Doubles">Men's Doubles</option><option value="Men's Triplet">Men's Triplet — 30 Points</option><option value="Men's Quadruple">Men's Quadruple — 60 Points</option><option value="Women's Doubles">Women's Doubles</option><option value="Mixed Doubles">Mixed Doubles</option></select><select id="mtA" data-final-options="${esc(finalOpts)}">${opts}</select><select id="mtB" data-final-options="${esc(finalOpts)}">${opts}</select></div><div class="lineup"><div><h3 id="lineATitle">Team A lineup</h3><div id="lineA" class="checks"></div></div><div><h3 id="lineBTitle">Team B lineup</h3><div id="lineB" class="checks"></div></div></div><div id="lineMsg" class="warn"></div><div class="modal-actions"><button class="btn" id="cancelModal">Cancel</button><button class="btn dark" id="createMatchBtn">Create Match</button></div>`;
    $('modal').classList.remove('hidden');
    $('mtStage').addEventListener('change',()=>{
      const finals=$('mtStage').value==='finals'; $('mtFinalNo').classList.toggle('hidden',!finals);
      if(finals){
        const topTwo=getLeagueTopTwo();
        if(topTwo.length<2){alert('Finals require two teams from the League standings. Complete enough League matches to determine the top 2 teams.');$('mtStage').value='league';$('mtFinalNo').value='';$('mtFinalNo').classList.add('hidden');$('mtType').disabled=false;return;}
        const finalOptions=topTwo.map(x=>`<option value="${esc(x.team.id)}">${esc(x.team.name)} (${x.points} league points)</option>`).join('');
        $('mtA').innerHTML=finalOptions; $('mtB').innerHTML=finalOptions;
        $('mtA').value=topTwo[0].team.id; $('mtB').value=topTwo[1].team.id;
        $('mtFinalNo').value='';$('mtType').disabled=true;
      } else {
        $('mtA').innerHTML=opts; $('mtB').innerHTML=opts;
        $('mtA').value=state.teams[0]?.id||''; $('mtB').value=state.teams[1]?.id||'';
        $('mtType').disabled=false;
      }
      populateLineups();
    });
    $('mtFinalNo').addEventListener('change',()=>{ const n=Number($('mtFinalNo').value); if(n) $('mtType').value=finalMatchType(n); populateLineups(); });
    $('mtA').addEventListener('change',populateLineups); $('mtB').addEventListener('change',populateLineups); $('mtType').addEventListener('change',populateLineups); $('cancelModal').onclick=closeModal; $('createMatchBtn').onclick=createMatch; populateLineups();
  }

  function closeModal(){$('modal').classList.add('hidden');}

  async function createMatch(){
    const a=$('mtA').value,b=$('mtB').value,type=$('mtType').value,stage=$('mtStage')?.value||'league',finalNo=stage==='finals'?Number($('mtFinalNo').value):null;
    if(a===b){alert('Choose different teams.');return;}
    if(stage==='finals'){
      const topTwo=getLeagueTopTwo().map(x=>x.team.id);
      if(topTwo.length<2){alert('Finals require two teams from the League standings.');return;}
      if(!topTwo.includes(a)||!topTwo.includes(b)){alert('Finals can only be played between the top 2 teams from the League standings.');return;}
    }
    if(stage==='finals' && !finalNo){alert('Select Finals Match 1–6.');return;}
    if(stage==='finals' && state.matches.some(m=>isFinal(m) && Number(m.final_no)===finalNo)){alert(`Finals Match ${finalNo} already exists. Each Finals Match 1–6 can be created only once.`);return;}
    const effectiveType=stage==='finals'?finalMatchType(finalNo):type;
    let ap,bp;
    if(stage==='finals'){ ap=finalPlayerIds(finalNo,'A'); bp=finalPlayerIds(finalNo,'B'); }
    else if(type === "Men's Triplet") { ap=[...document.querySelectorAll('#lineA select[data-triplet^="A-"]')].map(x=>x.value).filter(Boolean); bp=[...document.querySelectorAll('#lineB select[data-triplet^="B-"]')].map(x=>x.value).filter(Boolean); }
    else if(type === "Men's Quadruple") { ap=[...document.querySelectorAll('#lineA select[data-quad^="A-"]')].map(x=>x.value).filter(Boolean); bp=[...document.querySelectorAll('#lineB select[data-quad^="B-"]')].map(x=>x.value).filter(Boolean); }
    else { ap=[...document.querySelectorAll('#lineA input:checked')].map(x=>x.value); bp=[...document.querySelectorAll('#lineB input:checked')].map(x=>x.value); }
    const errA=validateLineup(effectiveType,ap,a), errB=validateLineup(effectiveType,bp,b); if(errA||errB){alert(errA||errB);return;}
    if(stage==='finals'){
      const uA=await validateFinalPlayerUniqueness(finalNo,a,ap), uB=await validateFinalPlayerUniqueness(finalNo,b,bp); if(uA||uB){alert(uA||uB);return;}
    }
    const pairErrA=await validatePairUniqueness(ap,a,effectiveType), pairErrB=await validatePairUniqueness(bp,b,effectiveType);
    if(pairErrA||pairErrB){alert(pairErrA||pairErrB);return;}
    const points=stage==='finals'?finalPoints(finalNo):(effectiveType==="Men's Quadruple"?60:effectiveType==="Men's Triplet"?30:21);
    if(state.mode==='demo'){
      state.matches.push({id:'m'+Date.now(),time:$('mtTime').value,court:$('mtCourt').value,type:effectiveType,a,b,ap,bp,status:'upcoming',game:0,sets:[[0,0],[0,0],[0,0]],history:[],stage,final_no:finalNo,points_to_win:points}); closeModal(); render(); return;
    }
    const scheduled=$('mtTime').value ? `${state.tournament.start_date||new Date().toISOString().slice(0,10)}T${$('mtTime').value}:00` : null;
    const {data,error}=await sb.from('matches').insert({tournament_id:state.tournament.id,match_no:Math.max(0,...state.matches.map(m=>Number(m.match_no)||0))+1,scheduled_at:scheduled,court:$('mtCourt').value,match_type:effectiveType,team_a:a,team_b:b,status:'upcoming',current_game:1,stage,final_no:finalNo,points_to_win:points}).select().single();
    if(error){alert(error.message);return;}
    const rows=[...ap.map((id,i)=>({match_id:data.id,player_id:id,side:'A',lineup_order:i+1})),...bp.map((id,i)=>({match_id:data.id,player_id:id,side:'B',lineup_order:i+1}))];
    const {error:mpErr}=await sb.from('match_players').insert(rows); if(mpErr){await sb.from('matches').delete().eq('id',data.id); alert('Could not save the lineup. If this is a Triplet/Quadruple, run the safe migration SQL first.\n\n'+mpErr.message); return;}
    const {error:gameErr}=await sb.from('games').insert({match_id:data.id,game_no:1}); if(gameErr){await sb.from('match_players').delete().eq('match_id',data.id); await sb.from('matches').delete().eq('id',data.id); alert('Could not create the score record.\n\n'+gameErr.message); return;} closeModal(); await loadCloud();
  }

  async function addCloudTeam(name,captain){
    if(!name)return; const {error}=await sb.from('teams').insert({tournament_id:state.tournament.id,name,captain}); if(error)alert(error.message);else{$('teamForm').reset();await loadCloud();}
  }
  async function addCloudPlayer(teamId,name,gender){
    const {error}=await sb.from('players').insert({team_id:teamId,name,gender}); if(error)alert(error.message);else{$('playerForm').reset();await loadCloud();}
  }

  async function loadCloud(){
    const [tt,pp,mm,mp,gg,tx] = await Promise.all([
      sb.from('teams').select('*').eq('tournament_id',state.tournament.id).order('name'),
      sb.from('players').select('*'),
      sb.from('matches').select('*').eq('tournament_id',state.tournament.id).order('match_no'),
      sb.from('match_players').select('*'),
      sb.from('games').select('*'),
      sb.from('tournaments').select('*').eq('id',state.tournament.id).maybeSingle()
    ]);
    for(const r of [tt,pp,mm,mp,gg,tx]) if(r.error){console.error(r.error);alert(r.error.message);return;}
    if(tx.data) state.tournament=tx.data;
    state.teams=(tt.data||[]).map(t=>({...t,players:(pp.data||[]).filter(p=>p.team_id===t.id)}));
    state.matches=(mm.data||[]).map(m=>{
      const gs=(gg.data||[]).filter(g=>g.match_id===m.id).sort((x,y)=>x.game_no-y.game_no);
      const side=(s)=> (mp.data||[]).filter(x=>x.match_id===m.id&&x.side===s).sort((a,b)=>(a.lineup_order??999)-(b.lineup_order??999)).map(x=>x.player_id);
      return {...m,a:m.team_a,b:m.team_b,ap:side('A'),bp:side('B'),game:0,sets:[1,2,3].map(n=>{const g=gs.find(x=>x.game_no===n);return g?[g.score_a,g.score_b]:[0,0]}),history:[]};
    });
    render();
  }

  let viewerPresenceChannel=null;
  function updateAdminViewerCount(){
    if(!viewerPresenceChannel) return;
    const state=viewerPresenceChannel.presenceState()||{};
    const el=$('adminViewerCount');
    if(el) el.textContent=`👁 ${Object.keys(state).length} watching live`;
  }
  function subscribeViewerPresence(){
    if(!sb || viewerPresenceChannel) return;
    viewerPresenceChannel=sb.channel('pcbl-live-viewers')
      .on('presence',{event:'sync'},updateAdminViewerCount)
      .on('presence',{event:'join'},updateAdminViewerCount)
      .on('presence',{event:'leave'},updateAdminViewerCount)
      .subscribe();
  }

  function subscribe(){
    sb.channel('pcbl-live').on('postgres_changes',{event:'*',schema:'public',table:'matches'},loadCloud).on('postgres_changes',{event:'*',schema:'public',table:'games'},loadCloud).subscribe();
  }

  async function boot(){
    if(!window.supabase || !cfg.SUPABASE_URL || !cfg.SUPABASE_PUBLISHABLE_KEY){ $('connection').textContent='CONFIG ERROR'; $('loginMsg').textContent='Supabase configuration is missing. Use Demo Data or check config.js.'; return; }
    sb=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_PUBLISHABLE_KEY);
    const {data,error}=await sb.auth.getSession(); if(error) console.error(error);
    if(data?.session){
      state.mode='cloud';
      const {data:t,error:te}=await sb.from('tournaments').select('*').order('created_at',{ascending:true}).limit(1).maybeSingle();
      if(te){$('loginMsg').textContent=te.message;return;}
      if(!t){$('loginMsg').textContent='No tournament found. Run schema.sql in Supabase SQL Editor.';return;}
      state.tournament=t; $('connection').textContent='SUPABASE'; $('connection').className='badge ok'; hideLogin(); await loadCloud(); subscribe(); subscribeViewerPresence();
    }
  }

  $('loginForm').addEventListener('submit',async e=>{
    e.preventDefault(); $('loginMsg').textContent='Signing in…'; $('loginBtn').disabled=true;
    if(!sb){$('loginMsg').textContent='Supabase is not configured.';$('loginBtn').disabled=false;return;}
    const {error}=await sb.auth.signInWithPassword({email:$('email').value.trim(),password:$('password').value});
    $('loginBtn').disabled=false;
    if(error){$('loginMsg').textContent=error.message;return;}
    location.reload();
  });
  $('demoBtn').addEventListener('click',setDemo);
  $('logoutBtn').addEventListener('click',async()=>{if(sb) await sb.auth.signOut();location.reload();});
  $('addMatchBtn').addEventListener('click',openMatchModal); $('addMatchBtn2').addEventListener('click',openMatchModal);
  document.querySelectorAll('nav button,[data-page="live"]').forEach(b=>b.addEventListener('click',()=>show(b.dataset.page)));
  $('teamForm').addEventListener('submit',async e=>{e.preventDefault();const name=$('teamName').value.trim(),cap=$('captain').value.trim();if(state.mode==='cloud')await addCloudTeam(name,cap);else{state.teams.push({id:'t'+Date.now(),name,captain:cap,players:[]});e.target.reset();render();}});
  $('playerForm').addEventListener('submit',async e=>{e.preventDefault();const tid=$('playerTeam').value,name=$('playerName').value.trim(),gender=$('gender').value;if(!tid){alert('Add a team first.');return;}if(state.mode==='cloud')await addCloudPlayer(tid,name,gender);else{team(tid).players.push({id:'p'+Date.now(),name,gender});e.target.reset();render();}});
  document.addEventListener('click',e=>{
    const teamDetail=e.target.closest('[data-admin-team-details]'); if(teamDetail) openAdminTeamDetails(teamDetail.dataset.adminTeamDetails);
    if(e.target.id==='modal') closeModal();
    const score=e.target.closest('[data-score]'); if(score) startMatch(score.dataset.score);
    const pt=e.target.closest('[data-point]'); if(pt){const [id,side]=pt.dataset.point.split(':');point(id,side);}
    const un=e.target.closest('[data-undo]'); if(un) undo(un.dataset.undo);
    const fin=e.target.closest('[data-finish]'); if(fin) finish(fin.dataset.finish);
  });
  boot();
})();
