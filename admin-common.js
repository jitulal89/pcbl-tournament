
const SUPABASE_URL = 'https://bfalondvpfijthberomf.supabase.co';
const SUPABASE_KEY = 'sb_publishable_kiyREqgce0B0-IZ8jOUkdQ_w8pas2ae';
const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const $ = id => document.getElementById(id);
const esc = x => String(x ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
let tournament = null;
let categories = [], registrations = [], entries = [], draws = [], rounds = [], matches = [];

function tid() {
  return new URLSearchParams(location.search).get('tournament')
    || localStorage.getItem('badminton_admin_tournament') || '';
}
function go(file) {
  const id = tid();
  location.href = file + (id ? '?tournament=' + encodeURIComponent(id) : '');
}
function notice(msg, error=false) {
  const el=$('msg');
  if(!el) return;
  el.innerHTML = msg ? `<div class="notice ${error?'error':''}">${esc(msg)}</div>` : '';
  if(msg) setTimeout(()=>el.innerHTML='',4500);
}
function selectedTournament() { return tournament; }
async function requireSession() {
  const s = await db.auth.getSession();
  if(!s.data.session) {
    location.href='admin.html';
    return false;
  }
  return true;
}
async function loadTournament() {
  const id=tid();
  if(!id) {
    location.href='admin.html';
    return false;
  }
  const r=await db.from('tournaments').select('*').eq('id',id).single();
  if(r.error) { notice(r.error.message,true); return false; }
  tournament=r.data;
  localStorage.setItem('badminton_admin_tournament',id);
  return true;
}
function setupHeader(active) {
  const nav=[
    ['dashboard','📊 Dashboard','admin.html'],
    ['settings','⚙️ Settings','settings.html'],
    ['categories','📂 Categories','categories.html'],
    ['players','👤 Players','players.html'],
    ['registrations','📝 Registrations','registrations.html'],
    ['entries','🎯 Entries','entries.html'],
    ['draws','🏆 Draws','draws.html'],
    ['fixtures','📅 Fixtures','fixtures.html'],
    ['results','🏸 Results','results.html'],
    ['history','📈 Player History','player-history.html']
  ];
  const n=$('nav');
  if(n) n.innerHTML=nav.map(x=>`<a class="${x[0]===active?'active':''}" href="${x[2]}?tournament=${encodeURIComponent(tid())}">${x[1]}</a>`).join('');
  if($('topTitle')) $('topTitle').textContent=tournament?.name || 'Badminton Tournament Admin';
}
function entryMembers(e) {
  return (e?.tournament_entry_members||[])
    .slice().sort((a,b)=>(a.member_order||0)-(b.member_order||0))
    .map(m=>registrations.find(r=>r.id===m.registration_id)).filter(Boolean);
}
function entryName(id) {
  const e=entries.find(x=>x.id===id);
  return e ? entryMembers(e).map(p=>p.full_name).join(' + ') : 'TBD / BYE';
}
function catName(id) { return categories.find(c=>c.id===id)?.name || '—'; }
async function loadData() {
  const [c,r,e,d,rr,mm] = await Promise.all([
    db.from('tournament_categories').select('*').eq('tournament_id',tournament.id).order('display_order'),
    db.from('tournament_registrations').select('*').eq('tournament_id',tournament.id).order('full_name'),
    db.from('tournament_entries').select('*,tournament_entry_members(id,registration_id,member_order)').eq('tournament_id',tournament.id),
    db.from('tournament_draws').select('*').eq('tournament_id',tournament.id),
    db.from('tournament_draw_rounds').select('*').order('round_no'),
    db.from('tournament_draw_matches').select('*').order('match_no')
  ]);
  const err=[c,r,e,d,rr,mm].find(x=>x.error);
  if(err) { notice(err.error.message,true); return false; }
  categories=c.data||[]; registrations=r.data||[]; entries=e.data||[];
  draws=d.data||[]; rounds=rr.data||[];
  const drawIds=new Set(draws.map(x=>x.id));
  matches=(mm.data||[]).filter(x=>drawIds.has(x.draw_id));
  return true;
}
function publicView() { location.href='tournament.html?tournament='+encodeURIComponent(tournament.id); }
async function signOut() {
  await db.auth.signOut();
  location.href='tournament.html?tournament='+encodeURIComponent(tournament?.id||tid());
}
async function boot(active) {
  if(!(await requireSession())) return;
  if(!(await loadTournament())) return;
  setupHeader(active);
  await loadData();
  const e=$('tournamentName'); if(e) e.textContent=tournament.name;
  const emailEl=$('userEmail');
  if(emailEl) {
    const s=await db.auth.getSession();
    emailEl.textContent=s.data.session?.user?.email||'';
  }
}
