(() => {
  const cfg=window.PCBL_CONFIG||{}; let sb=null; let tournament=null; let teams=[]; let players=[];
  const $=id=>document.getElementById(id); const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  function team(id){return teams.find(t=>t.id===id);}; function player(id){return players.find(p=>p.id===id);};
  async function load(){
    if(!sb)return;
    const [tx,tt,pp,mm,mp,gg]=await Promise.all([
      sb.from('tournaments').select('*').order('created_at',{ascending:true}).limit(1).maybeSingle(),
      sb.from('teams').select('*').order('name'),sb.from('players').select('*'),sb.from('matches').select('*').order('match_no'),sb.from('match_players').select('*'),sb.from('games').select('*')
    ]);
    if(tx.error||tt.error||pp.error||mm.error||mp.error||gg.error){$('livePage').innerHTML=`<div class="card"><b>Unable to load live scores.</b></div>`;return;}
    tournament=tx.data; teams=tt.data||[]; players=pp.data||[]; $('title').textContent=tournament?.name||'PCBL';
    const matches=(mm.data||[]).map(m=>{const gs=(gg.data||[]).filter(g=>g.match_id===m.id);const sideA=(mp.data||[]).filter(x=>x.match_id===m.id&&x.side==='A').sort((a,b)=>(a.lineup_order||99)-(b.lineup_order||99)).map(x=>x.player_id);const sideB=(mp.data||[]).filter(x=>x.match_id===m.id&&x.side==='B').sort((a,b)=>(a.lineup_order||99)-(b.lineup_order||99)).map(x=>x.player_id);return {...m,sideA,sideB,gs};}).filter(m=>m.status==='live'||m.status==='upcoming');
    function isTriplet(m){return m.match_type === "Men's Triplet";}
    function current(m){const sorted=[...m.gs].sort((a,b)=>a.game_no-b.game_no);return sorted.find(x=>!x.completed)||sorted[0]||{score_a:0,score_b:0};}
    function phase(m){const g=current(m);return (Number(g.score_a||0)+Number(g.score_b||0))<15?1:2;}
    function activeNames(m,side){const ids=side==='A'?m.sideA:m.sideB;if(!isTriplet(m)||ids.length<3)return ids.map(id=>player(id)?.name||'').join(' & ');const ids2=phase(m)===1?[ids[0],ids[1]]:[ids[1],ids[2]];return ids2.map(id=>player(id)?.name||'').join(' & ');}
    $('livePage').innerHTML=matches.map(m=>{
      const a=team(m.team_a),b=team(m.team_b),cur=current(m),trip=isTriplet(m),ph=trip?phase(m):null,total=Number(cur.score_a||0)+Number(cur.score_b||0);
      let banner='';
      if(trip){const an=m.sideA.map(id=>player(id)?.name||''),bn=m.sideB.map(id=>player(id)?.name||'');banner=`<div class="tripletPanel"><div><b>${esc(a?.name||'—')}</b><small>OUT: ${esc(an[0]||'—')} · COMMON: ${esc(an[1]||'—')} · IN: ${esc(an[2]||'—')}</small></div><div class="tripletFlow"><b>PHASE ${ph}</b><span>${esc(activeNames(m,'A'))} vs ${esc(activeNames(m,'B'))}</span><small>${ph===1?'First 15 rally points':'Next 15 rally points'}</small></div><div><b>${esc(b?.name||'—')}</b><small>OUT: ${esc(bn[0]||'—')} · COMMON: ${esc(bn[1]||'—')} · IN: ${esc(bn[2]||'—')}</small></div></div>`;}
      const center=trip?`<div class="tripletPhase"><b>TRIPLET · 30 POINTS</b><span>PHASE ${ph} · ${ph===1?'0–15':'15–30'}</span><small>Ends change at 15 points</small></div>`:`<div class="games"><b>1 SET · 21 POINTS</b><br>Ends change at 11 points</div>`;
      return `<div class="court"><div class="courthead"><div><b>Court ${esc(m.court||'—')}</b><div class="muted">${esc(m.match_type)} · ${esc(m.scheduled_at||'')}</div></div><span class="${m.status==='live'?'livepill':'status upcoming'}">${m.status==='live'?'● LIVE':'UPCOMING'}</span></div>${banner}<div class="scoreteams"><div class="side"><div class="names"><b>${esc(a?.name||'—')}</b><br><small>${esc(activeNames(m,'A'))}</small></div><div class="publicscore">${Number(cur.score_a||0)}</div></div><div class="center"><strong>–</strong>${center}</div><div class="side"><div class="names"><b>${esc(b?.name||'—')}</b><br><small>${esc(activeNames(m,'B'))}</small></div><div class="publicscore">${Number(cur.score_b||0)}</div></div></div></div>`;
    }).join('')||'<div class="card"><h2>No live matches</h2><p class="muted">The next fixtures will appear here.</p></div>';
  }
  if(window.supabase&&cfg.SUPABASE_URL&&cfg.SUPABASE_PUBLISHABLE_KEY){sb=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_PUBLISHABLE_KEY);load();sb.channel('public-live').on('postgres_changes',{event:'*',schema:'public',table:'matches'},load).on('postgres_changes',{event:'*',schema:'public',table:'games'},load).subscribe();}else{$('livePage').innerHTML='<div class="card"><b>Supabase configuration missing.</b></div>';}
})();
