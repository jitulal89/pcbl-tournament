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

  function isMatchComplete(m,a,b){
    if(m?.type === "Men's Triplet") return Math.max(a,b) >= 30;
    return (Math.max(a,b)>=21 && Math.abs(a-b)>=2) || Math.max(a,b)>=30;
  }
  function matchWinner(m){
    const s=currentScore(m);
    if(s[0]===s[1]) return null;
    if(!isMatchComplete(m,s[0],s[1])) return null;
    return s[0]>s[1]?m.a:m.b;
  }
  function currentScore(m){ return m.sets?.[0] || [0,0]; }
  function isTriplet(m){ return m?.type === "Men's Triplet"; }
  function tripletPhase(m){
    const s=currentScore(m), total=Number(s[0]||0)+Number(s[1]||0);
    return total < 15 ? 1 : 2;
  }
  function lineupNames(m, side){
    const ids=side==='A'?(m.ap||[]):(m.bp||[]);
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
      return `<tr><td>${esc(m.time||'—')}</td><td>${esc(m.court||'—')}</td><td>${esc(m.type)}</td><td>${esc(a?.name||'—')}</td><td>${esc(b?.name||'—')}</td><td>${esc(ap)} vs ${esc(bp)}</td><td><span class="status ${m.status}">${esc(m.status)}</span></td><td>${m.status!=='done'&&m.status!=='cancelled'?`<button class="btn small" data-score="${m.id}">${m.status==='live'?'Score':'Start'}</button>`:'✓'}</td></tr>`;
    }).join('') || '<tr><td colspan="8" class="muted">No fixtures yet.</td></tr>';

    $('liveGrid').innerHTML = state.matches.filter(m=>m.status==='live').map(courtHtml).join('') || '<div class="card"><b>No live matches.</b><p class="muted">Start a fixture from Fixtures.</p></div>';
    $('standings').innerHTML = state.teams.map(t=>{ const wins=state.matches.filter(m=>m.status==='done'&&matchWinner(m)===t.id).length; return `<div class="player"><b>${esc(t.name)}</b><b>${wins} match win${wins===1?'':'s'}</b></div>`; }).join('') || '<p class="muted">No teams.</p>';
    $('schedule').innerHTML = state.matches.slice().sort((a,b)=>(a.time||'').localeCompare(b.time||'')).map(m=>`<div class="player"><span><b>${esc(m.time||'—')}</b> · Court ${esc(m.court||'—')}<br>${esc(m.type)} · ${esc(team(m.a)?.name||'—')} vs ${esc(team(m.b)?.name||'—')}</span><span class="status ${m.status}">${esc(m.status)}</span></div>`).join('') || '<p class="muted">No matches.</p>';
  }

  function courtHtml(m){
    const a=team(m.a), b=team(m.b), s=currentScore(m);
    const trip=isTriplet(m), phase=trip?tripletPhase(m):null;
    let tripletBanner='';
    if(trip){
      const ar=tripletRoleNames(m,'A'), br=tripletRoleNames(m,'B');
      const aPair=phase===1?`${ar.out} + ${ar.common}`:`${ar.common} + ${ar.in}`;
      const bPair=phase===1?`${br.out} + ${br.common}`:`${br.common} + ${br.in}`;
      tripletBanner=`<div class="tripletPanel"><div><b>${esc(a?.name||'—')}</b><small>OUT: ${esc(ar.out)} · COMMON: ${esc(ar.common)} · IN: ${esc(ar.in)}</small></div><div class="tripletFlow"><b>PHASE ${phase}</b><span>${phase===1?esc(aPair)+' vs '+esc(bPair):esc(aPair)+' vs '+esc(bPair)}</span><small>${phase===1?'First 15 rally points':'Next 15 rally points'}</small></div><div><b>${esc(b?.name||'—')}</b><small>OUT: ${esc(br.out)} · COMMON: ${esc(br.common)} · IN: ${esc(br.in)}</small></div></div>`;
    }
    const phaseText=trip ? `<div class="tripletPhase"><b>TRIPLET · 30 POINTS</b><span>PHASE ${phase} · ${phase===1?'0–15':'15–30'}</span><small>${phase===1?'1st OUT + 2nd COMMON':'2nd COMMON + 3rd IN'}</small></div>` : `<div class="games">1 SET · 21 POINTS</div>`;
    const total=s[0]+s[1];
    return `<div class="court"><div class="courthead"><div><b>Court ${esc(m.court||'—')}</b><div class="muted">${esc(m.type)} · ${esc(m.time||'')}</div></div><span class="livepill">● LIVE</span></div>${tripletBanner}<div class="scoreteams"><div class="side"><div class="names"><b>${esc(a?.name||'—')}</b><br><small>${esc(lineupNames(m,'A'))}</small></div><button class="scorebtn" data-point="${m.id}:A">${s[0]}</button></div><div class="center"><strong>–</strong>${phaseText}${trip&&total>=15?'<div class="courtNotice">🔄 Triplet ends change at 15 points</div>':''}${!trip&&Math.max(s[0],s[1])>=11?'<div class="courtNotice">🔄 Ends changed at 11 points</div>':''}</div><div class="side"><div class="names"><b>${esc(b?.name||'—')}</b><br><small>${esc(lineupNames(m,'B'))}</small></div><button class="scorebtn" data-point="${m.id}:B">${s[1]}</button></div></div><div class="courtActions"><button class="btn" data-undo="${m.id}">↶ Undo</button><button class="btn" data-finish="${m.id}">Finish</button></div></div>`;
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
    const s=currentScore(m), trip=isTriplet(m), reached=trip ? Math.max(s[0],s[1])>=30 : Math.max(s[0],s[1])>=21;
    if(reached){
      const winner=matchWinner(m);
      const winnerName=winner ? (team(winner)?.name||'') : 'No winner yet';
      const label=trip?'Triplet (30 points)':'1 Set (21 points)';
      const message=trip
        ? `The Triplet has reached ${s[0]} - ${s[1]}.\n\nConfirm that this Triplet is OVER?\nWinner: ${winnerName}\n\nOK = Finish match\nCancel = Keep match live.`
        : `The match has reached ${s[0]} - ${s[1]}.\n\nConfirm that this ${label} is OVER?\n${winner ? 'Winner: '+winnerName : 'The score may continue if the 2-point rule requires it.'}\n\nOK = Finish match\nCancel = Keep match live.`;
      if(window.confirm(message)){
        await finish(id);
      }
    }
  }
  function point(id,side){
    if(state.mode==='cloud') return cloudPoint(id,side);
    const m=state.matches.find(x=>x.id===id); if(!m||m.status!=='live') return;
    m.history=m.history||[]; m.history.push({sets:JSON.parse(JSON.stringify(m.sets)),game:m.game,status:m.status});
    const idx=side==='A'?0:1; const current=currentScore(m); if(Math.max(current[0],current[1])>=30) return; m.sets[0][idx]++; render();
    const s=currentScore(m), reached=isTriplet(m)?Math.max(s[0],s[1])>=30:Math.max(s[0],s[1])>=21;
    if(reached){
      const winner=matchWinner(m), winnerName=winner?(team(winner)?.name||''):'No winner yet';
      const ok=window.confirm(`The ${isTriplet(m)?'Triplet':'match'} has reached ${s[0]} - ${s[1]}.\n\nConfirm that the match is OVER?\n${winner?'Winner: '+winnerName+'\n\n':''}OK = Finish\nCancel = Keep live.`);
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
    const matchLabel=isTriplet(m) ? 'Triplet (30 points)' : `${m.type} (21 points)`;
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
    const need=type === "Men's Triplet" ? 3 : (type.includes('Singles')?1:2);
    if(ps.length!==need) return `Select exactly ${need} player${need>1?'s':''} for ${team(teamId)?.name||'the team'}.`;
    if(new Set(ids).size!==ids.length) return 'A player cannot occupy two Triplet positions.';
    if(type==="Men's Singles"||type==="Men's Doubles"||type==="Men's Triplet"){if(ps.some(p=>p.gender!=='M')) return "Men's match requires male players.";}
    if(type==="Women's Singles"||type==="Women's Doubles"){if(ps.some(p=>p.gender!=='F')) return "Women's match requires female players.";}
    if(type==='Mixed Doubles' && !(ps.some(p=>p.gender==='M')&&ps.some(p=>p.gender==='F'))) return 'Mixed Doubles requires one male and one female player.';
    return '';
  }

  function tripletSelect(teamObj,side){
    const opts=(teamObj?.players||[]).map(p=>`<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('');
    return `<div class="triplet-selects"><label>1st — OUT<select data-triplet="${side}-0"><option value="">Select player</option>${opts}</select></label><label>2nd — COMMON<select data-triplet="${side}-1"><option value="">Select player</option>${opts}</select></label><label>3rd — IN<select data-triplet="${side}-2"><option value="">Select player</option>${opts}</select></label></div>`;
  }
  function populateLineups(){
    const A=team($('mtA').value), B=team($('mtB').value), type=$('mtType').value;
    $('lineATitle').textContent = `${A?.name || 'Team A'} lineup`;
    $('lineBTitle').textContent = `${B?.name || 'Team B'} lineup`;
    if(type === "Men's Triplet") {
      $('lineA').innerHTML=tripletSelect(A,'A'); $('lineB').innerHTML=tripletSelect(B,'B');
      $('lineMsg').textContent='Triplet: select 3 men in order — 1st OUT, 2nd COMMON (plays all 30), 3rd IN.';
      return;
    }
    $('lineA').innerHTML=(A?.players||[]).map(p=>`<label><input type="checkbox" value="${p.id}" data-line="A">${esc(p.name)} (${p.gender})</label>`).join('');
    $('lineB').innerHTML=(B?.players||[]).map(p=>`<label><input type="checkbox" value="${p.id}" data-line="B">${esc(p.name)} (${p.gender})</label>`).join('');
    $('lineMsg').textContent=`${type}: ${type.includes('Singles')?'1 player':'2 players'} per side.`;
  }

  function openMatchModal(){
    if(state.teams.length<2){alert('Add at least two teams first.');return;}
    const opts=state.teams.map(t=>`<option value="${esc(t.id)}">${esc(t.name)}</option>`).join('');
    $('modalBox').innerHTML=`<h2>Add PCBL Match</h2><div class="two"><input id="mtTime" placeholder="Time e.g. 7:30"><input id="mtCourt" placeholder="Court 1"><select id="mtType"><option value="Men's Singles">Men's Singles</option><option value="Women's Singles">Women's Singles</option><option value="Men's Doubles">Men's Doubles</option><option value="Men's Triplet">Men's Triplet — 30 Points</option><option value="Women's Doubles">Women's Doubles</option><option value="Mixed Doubles">Mixed Doubles</option></select><select id="mtA">${opts}</select><select id="mtB">${opts}</select></div><div class="lineup"><div><h3 id="lineATitle">Team A lineup</h3><div id="lineA" class="checks"></div></div><div><h3 id="lineBTitle">Team B lineup</h3><div id="lineB" class="checks"></div></div></div><div id="lineMsg" class="warn"></div><div class="modal-actions"><button class="btn" id="cancelModal">Cancel</button><button class="btn dark" id="createMatchBtn">Create Match</button></div>`;
    $('modal').classList.remove('hidden'); $('mtA').addEventListener('change',populateLineups); $('mtB').addEventListener('change',populateLineups); $('mtType').addEventListener('change',populateLineups); $('cancelModal').onclick=closeModal; $('createMatchBtn').onclick=createMatch; populateLineups();
  }
  function closeModal(){$('modal').classList.add('hidden');}

  async function createMatch(){
    const a=$('mtA').value,b=$('mtB').value,type=$('mtType').value;
    if(a===b){alert('Choose different teams.');return;}
    const ap=type === "Men's Triplet" ? [...document.querySelectorAll('#lineA select[data-triplet^=\"A-\"]')].map(x=>x.value).filter(Boolean) : [...document.querySelectorAll('#lineA input:checked')].map(x=>x.value);
    const bp=type === "Men's Triplet" ? [...document.querySelectorAll('#lineB select[data-triplet^=\"B-\"]')].map(x=>x.value).filter(Boolean) : [...document.querySelectorAll('#lineB input:checked')].map(x=>x.value);
    const errA=validateLineup(type,ap,a), errB=validateLineup(type,bp,b); if(errA||errB){alert(errA||errB);return;}
    if(state.mode==='demo'){
      state.matches.push({id:'m'+Date.now(),time:$('mtTime').value,court:$('mtCourt').value,type,a,b,ap,bp,status:'upcoming',game:0,sets:[[0,0],[0,0],[0,0]],history:[]}); closeModal(); render(); return;
    }
    const scheduled=$('mtTime').value ? `${state.tournament.start_date||new Date().toISOString().slice(0,10)}T${$('mtTime').value}:00` : null;
    const {data,error}=await sb.from('matches').insert({tournament_id:state.tournament.id,match_no:state.matches.length+1,scheduled_at:scheduled,court:$('mtCourt').value,match_type:type,team_a:a,team_b:b,status:'upcoming',current_game:1}).select().single();
    if(error){alert(error.message);return;}
    const rows=[...ap.map((id,i)=>({match_id:data.id,player_id:id,side:'A',lineup_order:i+1})),...bp.map((id,i)=>({match_id:data.id,player_id:id,side:'B',lineup_order:i+1}))];
    const {error:mpErr}=await sb.from('match_players').insert(rows); if(mpErr){await sb.from('matches').delete().eq('id',data.id); alert('Could not save the lineup. If this is a Triplet, run triplet_update.sql in Supabase first.\n\n'+mpErr.message); return;}
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
      state.tournament=t; $('connection').textContent='SUPABASE'; $('connection').className='badge ok'; hideLogin(); await loadCloud(); subscribe();
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
    const score=e.target.closest('[data-score]'); if(score) startMatch(score.dataset.score);
    const pt=e.target.closest('[data-point]'); if(pt){const [id,side]=pt.dataset.point.split(':');point(id,side);}
    const un=e.target.closest('[data-undo]'); if(un) undo(un.dataset.undo);
    const fin=e.target.closest('[data-finish]'); if(fin) finish(fin.dataset.finish);
  });
  boot();
})();
