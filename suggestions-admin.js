(()=>{
  const cfg=window.PCBL_CONFIG||{};
  let sb=null, loading=false;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const stars=n=>n?Array.from({length:5},(_,i)=>i<n?'★':'☆').join(''):'—';
  const msg=(text,cls='muted')=>{const el=document.getElementById('suggestionsList');if(el)el.innerHTML=`<div class="${cls}">${esc(text)}</div>`;};
  async function getRows(){
    if(!sb) sb=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_PUBLISHABLE_KEY);
    // Use a SECURITY DEFINER RPC first so Admin can read even when the table's
    // SELECT policy was not created correctly in an earlier SQL migration.
    const rpc=await sb.rpc('get_player_suggestions_admin');
    if(!rpc.error) return rpc.data||[];
    console.warn('Suggestions RPC failed, trying direct authenticated SELECT:',rpc.error);
    const direct=await sb.from('player_suggestions').select('id,tournament_id,liked,next_tournament,rating,created_at').order('created_at',{ascending:false});
    if(direct.error) throw new Error(`${direct.error.message}${direct.error.hint?' — '+direct.error.hint:''}`);
    return direct.data||[];
  }
  async function render(){
    if(loading)return;
    const list=document.getElementById('suggestionsList'); if(!list)return;
    loading=true; list.innerHTML='<div class="muted">Loading submitted suggestions…</div>';
    try{
      if(!window.supabase) throw new Error('Supabase library is not loaded.');
      if(!cfg.SUPABASE_URL||!cfg.SUPABASE_PUBLISHABLE_KEY) throw new Error('Supabase configuration is missing.');
      if(!sb) sb=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_PUBLISHABLE_KEY);
      const sessionResult=await sb.auth.getSession();
      if(sessionResult.error) throw sessionResult.error;
      if(!sessionResult.data?.session) throw new Error('Admin session not found. Please sign in again.');
      const rows=await getRows();
      const ratings=rows.filter(x=>x.rating!==null&&x.rating!==undefined);
      const avg=ratings.length?(ratings.reduce((a,x)=>a+Number(x.rating),0)/ratings.length).toFixed(1):'—';
      const sum=document.getElementById('suggestionsSummary');
      if(sum)sum.innerHTML=`<div><span>Suggestions</span><b>${rows.length}</b></div><div><span>Ratings</span><b>${ratings.length}</b></div><div><span>Average rating</span><b>${avg}${avg==='—'?'':' / 5'}</b></div>`;
      if(!rows.length){list.innerHTML='<div class="muted">No suggestions submitted yet.</div>';return;}
      list.innerHTML=rows.map(x=>`<article class="suggestion-admin-card"><div class="suggestion-admin-head"><span class="suggestion-rating">${stars(x.rating)}</span><span class="suggestion-date">${esc(new Date(x.created_at).toLocaleString())}</span></div>${x.liked?`<div class="suggestion-block"><b>❤️ WHAT THEY LIKED</b><p>${esc(x.liked)}</p></div>`:''}${x.next_tournament?`<div class="suggestion-block"><b>💡 NEXT TOURNAMENT</b><p>${esc(x.next_tournament)}</p></div>`:''}${!x.liked&&!x.next_tournament?'<div class="muted">No written feedback.</div>':''}</article>`).join('');
    }catch(e){
      console.error('PCBL suggestions load error:',e);
      msg(`Could not load suggestions. ${e?.message||String(e)}`,'suggestions-error');
      const sum=document.getElementById('suggestionsSummary'); if(sum)sum.innerHTML='';
    }finally{loading=false;}
  }
  window.renderAdminSuggestions=render;
  window.refreshAdminSuggestions=()=>render();
  window.addEventListener('pcbl-admin-ready',render);
  window.addEventListener('pageshow',()=>{if(new URLSearchParams(location.search).get('page')==='suggestions')render();});
  document.addEventListener('click',e=>{if(e.target.closest('#refreshSuggestionsBtn'))render();});
})();
