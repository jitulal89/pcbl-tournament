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

  function matchWinner(m){
    let a=0,b=0;
    for(const s of m.sets||[]){ if(isGameComplete(s[0],s[1])) s[0]>s[1]?a++:s[1]>s[0]?b++:0; }
    return a>b?m.a:b>a?m.b:null;
  }
  function isGameComplete(a,b){ return (Math.max(a,b)>=21 && Math.abs(a-b)>=2) || Math.max(a,b)>=30; }
  function gameWins(m){
    let a=0,b=0; for(const s of m.sets||[]){ if(isGameComplete(s[0],s[1])) s[0]>s[1]?a++:s[1]>s[0]?b++:0; } return [a,b];
  }
  function currentScore(m){ return m.sets[m.game||0] || [0,0]; }

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
    const a=team(m.a), b=team(m.b), s=currentScore(m), [ga,gb]=gameWins(m);
    return `<div class="court"><div class="courthead"><div><b>Court ${esc(m.court||'—')}</b><div class="muted">${esc(m.type)} · ${esc(m.time||'')}</div></div><span class="livepill">● LIVE</span></div><div class="scoreteams"><div class="side"><div class="names"><b>${esc(a?.name||'—')}</b><br><small>${(m.ap||[]).map(id=>esc(player(id)?.name||'')).join(' & ')}</small></div><button class="scorebtn" data-point="${m.id}:A">${s[0]}</button></div><div class="center"><strong>–</strong><div class="games">Games ${ga} : ${gb}</div></div><div class="side"><div class="names"><b>${esc(b?.name||'—')}</b><br><small>${(m.bp||[]).map(id=>esc(player(id)?.name||'')).join(' & ')}</small></div><button class="scorebtn" data-point="${m.id}:B">${s[1]}</button></div></div><div class="courtActions"><button class="btn" data-undo="${m.id}">↶ Undo</button><button class="btn" data-finish="${m.id}">Finish</button></div></div>`;
  }

  function advanceDemo(m){
    const s=currentScore(m); if(!isGameComplete(s[0],s[1])) return;
    const [a,b]=gameWins(m); if(a>=2||b>=2){m.status='done'; return;}
    m.game=Math.min((m.game||0)+1,2);
  }

  async function cloudPoint(id,side){
    const {error}=await sb.rpc('add_point',{p_match:id,p_side:side});
    if(error) alert(error.message); else await loadCloud();
  }
  function point(id,side){
    if(state.mode==='cloud') return cloudPoint(id,side);
    const m=state.matches.find(x=>x.id===id); if(!m||m.status!=='live') return;
    m.history=m.history||[]; m.history.push({sets:JSON.parse(JSON.stringify(m.sets)),game:m.game,status:m.status});
    m.sets[m.game||0][side==='A'?0:1]++;
    advanceDemo(m); render();
  }
  function undo(id){
    if(state.mode==='cloud'){ alert('Cloud scoring is audited through score events. To correct a score, use the scorer/database correction workflow.'); return; }
    const m=state.matches.find(x=>x.id===id), h=m?.history?.pop(); if(h){m.sets=h.sets;m.game=h.game;m.status=h.status;render();}
  }

  async function startMatch(id){
    if(state.mode==='cloud'){
      const {error}=await sb.from('matches').update({status:'live',current_game:1}).eq('id',id); if(error) alert(error.message); else { await ensureGame(id,1); await loadCloud(); show('live'); }
    } else { const m=state.matches.find(x=>x.id===id); if(m){m.status='live';render();show('live');} }
  }
  async function finish(id){
    if(state.mode==='cloud'){const {error}=await sb.from('matches').update({status:'done'}).eq('id',id); if(error) alert(error.message); else await loadCloud();}
    else {const m=state.matches.find(x=>x.id===id);if(m){m.status='done';render();}}
  }
  async function ensureGame(matchId,gameNo){const {error}=await sb.from('games').upsert({match_id:matchId,game_no:gameNo},{onConflict:'match_id,game_no'});if(error)console.error(error);}

  function validateLineup(type, ids, teamId){
    const ps=ids.map(player).filter(Boolean); const need=type.includes('Singles')?1:2;
    if(ps.length!==need) return `Select exactly ${need} player${need>1?'s':''} for ${team(teamId)?.name||'the team'}.`;
    if(type==="Men's Singles"||type==="Men's Doubles"){if(ps.some(p=>p.gender!=='M')) return "Men's match requires male players.";}
    if(type==="Women's Singles"||type==="Women's Doubles"){if(ps.some(p=>p.gender!=='F')) return "Women's match requires female players.";}
    if(type==='Mixed Doubles' && !(ps.some(p=>p.gender==='M')&&ps.some(p=>p.gender==='F'))) return 'Mixed Doubles requires one male and one female player.';
    return '';
  }

  function populateLineups(){
    const A=team($('mtA').value), B=team($('mtB').value), type=$('mtType').value;
    $('lineA').innerHTML=(A?.players||[]).map(p=>`<label><input type="checkbox" value="${p.id}" data-line="A">${esc(p.name)} (${p.gender})</label>`).join('');
    $('lineB').innerHTML=(B?.players||[]).map(p=>`<label><input type="checkbox" value="${p.id}" data-line="B">${esc(p.name)} (${p.gender})</label>`).join('');
    $('lineMsg').textContent=`${type}: ${type.includes('Singles')?'1 player':'2 players'} per side.`;
  }

  function openMatchModal(){
    if(state.teams.length<2){alert('Add at least two teams first.');return;}
    const opts=state.teams.map(t=>`<option value="${esc(t.id)}">${esc(t.name)}</option>`).join('');
    $('modalBox').innerHTML=`<h2>Add PCBL Match</h2><div class="two"><input id="mtTime" placeholder="Time e.g. 7:30"><input id="mtCourt" placeholder="Court 1"><select id="mtType"><option>Men's Singles</option><option>Women's Singles</option><option>Men's Doubles</option><option>Women's Doubles</option><option>Mixed Doubles</option></select><select id="mtA">${opts}</select><select id="mtB">${opts}</select></div><div class="lineup"><div><h3>Team A lineup</h3><div id="lineA" class="checks"></div></div><div><h3>Team B lineup</h3><div id="lineB" class="checks"></div></div></div><div id="lineMsg" class="warn"></div><div class="modal-actions"><button class="btn" id="cancelModal">Cancel</button><button class="btn dark" id="createMatchBtn">Create Match</button></div>`;
    $('modal').classList.remove('hidden'); $('mtA').addEventListener('change',populateLineups); $('mtB').addEventListener('change',populateLineups); $('mtType').addEventListener('change',populateLineups); $('cancelModal').onclick=closeModal; $('createMatchBtn').onclick=createMatch; populateLineups();
  }
  function closeModal(){$('modal').classList.add('hidden');}

  async function createMatch(){
    const a=$('mtA').value,b=$('mtB').value,type=$('mtType').value;
    if(a===b){alert('Choose different teams.');return;}
    const ap=[...document.querySelectorAll('#lineA input:checked')].map(x=>x.value), bp=[...document.querySelectorAll('#lineB input:checked')].map(x=>x.value);
    const errA=validateLineup(type,ap,a), errB=validateLineup(type,bp,b); if(errA||errB){alert(errA||errB);return;}
    if(state.mode==='demo'){
      state.matches.push({id:'m'+Date.now(),time:$('mtTime').value,court:$('mtCourt').value,type,a,b,ap,bp,status:'upcoming',game:0,sets:[[0,0],[0,0],[0,0]],history:[]}); closeModal(); render(); return;
    }
    const scheduled=$('mtTime').value ? `${state.tournament.start_date||new Date().toISOString().slice(0,10)}T${$('mtTime').value}:00` : null;
    const {data,error}=await sb.from('matches').insert({tournament_id:state.tournament.id,match_no:state.matches.length+1,scheduled_at:scheduled,court:$('mtCourt').value,match_type:type,team_a:a,team_b:b,status:'upcoming',current_game:1}).select().single();
    if(error){alert(error.message);return;}
    const rows=[...ap.map(id=>({match_id:data.id,player_id:id,side:'A'})),...bp.map(id=>({match_id:data.id,player_id:id,side:'B'}))];
    const {error:mpErr}=await sb.from('match_players').insert(rows); if(mpErr){alert(mpErr.message);return;}
    await sb.from('games').insert({match_id:data.id,game_no:1}); closeModal(); await loadCloud();
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
      return {...m,a:m.team_a,b:m.team_b,ap:(mp.data||[]).filter(x=>x.match_id===m.id&&x.side==='A').map(x=>x.player_id),bp:(mp.data||[]).filter(x=>x.match_id===m.id&&x.side==='B').map(x=>x.player_id),game:Math.max((m.current_game||1)-1,0),sets:[1,2,3].map(n=>{const g=gs.find(x=>x.game_no===n);return g?[g.score_a,g.score_b]:[0,0]}),history:[]};
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
