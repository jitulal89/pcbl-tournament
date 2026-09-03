(() => {
  const cfg=window.PCBL_CONFIG||{}; let sb=null; let teams=[],players=[],matches=[],matchPlayers=[],games=[];
  const $=id=>document.getElementById(id); const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const team=id=>teams.find(t=>t.id===id), player=id=>players.find(p=>p.id===id);
  const fpts=n=>[1,3,5].includes(Number(n))?15:[2,4,6].includes(Number(n))?60:0;
  const title=n=>{const x=Number(n);return x===1?'Women’s Doubles':x===2?'Men’s Quadruple':x===3?'Men’s Singles':x===4?'Men’s Quadruple':x===5?'Women’s Doubles':x===6?'Men’s Quadruple':'Finals';};
  const rows=()=>[1,2,3,4,5,6].map(n=>matches.find(m=>Number(m.final_no)===n));
  function score(m){if(!m)return [0,0];const g=games.find(x=>x.match_id===m.id&&x.game_no===1);return g?[Number(g.score_a||0),Number(g.score_b||0)]:[0,0];}
  function winner(m){if(!m||m.status!=='done')return null;const [a,b]=score(m);return a===b?null:a>b?m.team_a:m.team_b;}
  function finalTotal(id){return rows().reduce((n,m)=>{if(!m)return n;const s=score(m);return n+(m.team_a===id?s[0]:m.team_b===id?s[1]:0);},0);}
  function lineup(m,side){return matchPlayers.filter(x=>x.match_id===m?.id&&x.side===side).sort((a,b)=>(a.lineup_order??99)-(b.lineup_order??99)).map(x=>player(x.player_id)?.name).filter(Boolean).join(' · ')||'—';}
  function render(){
    if(!$('finalRows')) return;
    const r=rows(), existing=r.filter(Boolean), ta=[...new Set(existing.map(m=>m.team_a))], tb=[...new Set(existing.map(m=>m.team_b))];
    const teamsIn=[...new Set(existing.flatMap(m=>[m.team_a,m.team_b]))].map(team).filter(Boolean);
    const totals=teamsIn.map(t=>({t,total:finalTotal(t.id)})).sort((a,b)=>b.total-a.total);
    $('finalRows').innerHTML=r.map((m,i)=>{const n=i+1,p=fpts(n),s=score(m),wa=winner(m);return `<tr><td><b>${n}</b></td><td>${esc(title(n))}</td><td><b>${p}</b></td><td>${esc(m?team(m.team_a)?.name||'—':'—')}</td><td>${esc(m?lineup(m,'A'):'—')}</td><td>${esc(m?team(m.team_b)?.name||'—':'—')}</td><td>${esc(m?lineup(m,'B'):'—')}</td><td><b>${m?`${s[0]} - ${s[1]}`:'—'}</b>${wa?`<br><small>${esc(team(wa)?.name||'')}</small>`:''}</td><td><span class="status ${m?.status||'upcoming'}">${m?.status||'NOT CREATED'}</span></td></tr>`;}).join('');
    $('finalTotals').innerHTML=totals.length?totals.map((x,i)=>`<div class="final-team-total"><div><span>${i+1}</span><b>${esc(x.t.name)}</b></div><strong>${x.total}</strong><small>/ 225</small></div>`).join(''):'<p class="muted">Finals fixtures are not created yet.</p>';
    const completed=existing.filter(m=>m.status==='done').length; $('finalProgress').textContent=`${completed} / 6 matches completed · ${existing.length} / 6 fixtures created`;
    const champ=completed===6&&totals.length?totals[0]:null; $('champion').innerHTML=champ?`<div class="champion"><span>🏆 PCBL FINALS CHAMPION</span><b>${esc(champ.t.name)}</b><strong>${champ.total} / 225</strong></div>`:'';
  }
  async function load(){if(!sb || !$('finalRows'))return;const [tt,pp,mm,mp,gg]=await Promise.all([sb.from('teams').select('*').order('name'),sb.from('players').select('*'),sb.from('matches').select('*').eq('stage','finals').order('final_no'),sb.from('match_players').select('*'),sb.from('games').select('*')]);if(tt.error||pp.error||mm.error||mp.error||gg.error){$('finalProgress').textContent='Unable to load Finals data.';return;}teams=tt.data||[];players=pp.data||[];matches=mm.data||[];matchPlayers=mp.data||[];games=gg.data||[];render();}
  if(window.supabase&&cfg.SUPABASE_URL&&cfg.SUPABASE_PUBLISHABLE_KEY){sb=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_PUBLISHABLE_KEY);load();sb.channel('pcbl-finals').on('postgres_changes',{event:'*',schema:'public',table:'matches'},load).on('postgres_changes',{event:'*',schema:'public',table:'games'},load).subscribe();}
})();
