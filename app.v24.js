// v2.1 – fixes: DOM ready init, UUID fallback, seeding defaults even on file://
// ---- Helpers ----
const uuid = () => (crypto && crypto.randomUUID) ? crypto.randomUUID() :
  'xxxxxxx-xxxx-4xxx-yxxx-xxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });

const onReady = (fn) => {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
  else fn();
};

onReady(() => {
// ---- Local storage keys ----
const LS = {
  games: 'camp_v2_games',
  playersText: 'camp_v2_players',
  teamsCount: 'camp_v2_teams_count',
  plan: 'camp_v2_plan',
  theme: 'camp_v2_theme'
};

// ---- Default data (ids generated at runtime) ----
const defaultGames = [
  {name:'Vlk a ovečky', category:'Venku', duration:10, equipment:['—'], rules:'Vymezte hřiště. Jeden „vlk“ honí ostatní. Kdo je dotčen, střídá.'},
  {name:'Škatule, hejbejte se!', category:'U ohně', duration:8, equipment:['—'], rules:'Vedoucí volá vlastnosti, hráči si vymění místa.'},
  {name:'Městečko Palermo', category:'Večer', duration:25, equipment:['karty s rolemi','papír','tužka'], rules:'Klasická sociální dedukce: mafiáni vs. občané, šerif vyšetřuje.'},
  {name:'Štafetový běh', category:'Sport', duration:12, equipment:['kužely','míček'], rules:'Rozdělte do týmů. Přenášení míčku tam a zpět.'},
  {name:'Kimova hra', category:'Klidná', duration:7, equipment:['10–20 předmětů','šátek'], rules:'Děti si prohlédnou předměty, poté zakryjte a vyjmenovat co chybí.'}
].map(g => ({id: uuid(), ...g}));

function load(key, fb){ try { return JSON.parse(localStorage.getItem(key)) ?? fb; } catch { return fb; } }
function save(key, v){ localStorage.setItem(key, JSON.stringify(v)); }

let GAMES = load(LS.games, null);
if (!Array.isArray(GAMES) || !GAMES.length) {
  GAMES = defaultGames; // seed on first run
  save(LS.games, GAMES);
}

// ---- THEME ----
const themeBtn = document.getElementById('themeBtn');
(function initTheme(){
  const t = load(LS.theme, 'dark');
  if (t === 'light') document.documentElement.classList.add('light');
})();
themeBtn?.addEventListener('click', ()=> {
  document.documentElement.classList.toggle('light');
  save(LS.theme, document.documentElement.classList.contains('light') ? 'light' : 'dark');
});

// ---- Tabs ----
const tabs = document.querySelectorAll('.tab');
const panels = document.querySelectorAll('.tabpanel');
tabs.forEach(btn => btn.addEventListener('click', () => {
  tabs.forEach(b => b.classList.remove('active'));
  panels.forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  document.querySelector(`#tab-${btn.dataset.tab}`).classList.add('active');
}));

// ---- PWA install ----
let deferredPrompt;
const installBtn = document.getElementById('installBtn');
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredPrompt = e; installBtn.hidden = false; });
installBtn?.addEventListener('click', async () => { if(!deferredPrompt) return; deferredPrompt.prompt(); await deferredPrompt.userChoice; installBtn.hidden = true; deferredPrompt = null; });

// ---- Share ----
document.getElementById('shareBtn')?.addEventListener('click', async () => {
  try{ if(navigator.share) await navigator.share({title:'Tábor Helper', url:location.href}); else await navigator.clipboard.writeText(location.href); alert('Odkaz sdílen / zkopírován.'); }catch{}
});

// ========= HRY =========
const categoryFilter = document.getElementById('categoryFilter');
const searchInput = document.getElementById('searchInput');
const gamesList = document.getElementById('gamesList');
const randomBtn = document.getElementById('randomBtn');
const duplicateBtn = document.getElementById('duplicateBtn');
const deleteBtn = document.getElementById('deleteBtn');
const gameDetail = document.getElementById('gameDetail');
const addGameBtn = document.getElementById('addGameBtn');
const emptyHint = document.getElementById('emptyHint');

let selectedId = null;

function renderFilters(){
  const cats = Array.from(new Set(GAMES.map(g=>g.category))).sort();
  categoryFilter.innerHTML = ['Vše', ...cats].map(c=>`<option value="${c}">${c}</option>`).join('');
}
function filterGames(){
  const cat = categoryFilter.value || 'Vše';
  const q = (searchInput.value||'').toLowerCase();
  return GAMES.filter(g => (cat==='Vše'||g.category===cat) && (q===''||g.name.toLowerCase().includes(q)||g.rules?.toLowerCase().includes(q)));
}
function renderGames(){
  const arr = filterGames();
  gamesList.innerHTML = arr.map(g=>`
    <li data-id="${g.id}">
      <div>
        <div class="badges">
          <span class="badge">${g.category||'Bez kategorie'}</span>
          <span class="badge">${g.duration||'?'} min</span>
          ${g.equipment?.length? `<span class="badge">pomůcky: ${g.equipment.length}</span>`:''}
        </div>
        <strong>${g.name}</strong>
      </div>
      <div class="row">
        <button data-act="select" class="primary">Otevřít</button>
        <button data-act="edit">Upravit</button>
      </div>
    </li>
  `).join('');
  emptyHint.style.display = arr.length ? 'none' : 'block';
}
function fmtM(s){ const m=Math.floor(s/60), ss=s%60; return String(m).padStart(2,'0')+':'+String(ss).padStart(2,'0'); }
let dlgTimerInt;
function renderDetail(g){
  if(!g){ gameDetail.classList.add('empty'); gameDetail.innerHTML = '<p class="muted">Vyber hru vlevo nebo ji losuj.</p>'; duplicateBtn.disabled = deleteBtn.disabled = true; return; }
  gameDetail.classList.remove('empty');
  selectedId = g.id;
  duplicateBtn.disabled = deleteBtn.disabled = false;
  const equip = (g.equipment||[]).filter(Boolean);
  gameDetail.innerHTML = `
    <h3>${g.name}</h3>
    <div class="kv">
      <span>${g.category||'Bez kategorie'}</span>
      <span>${g.duration||'?'} min</span>
      ${equip.length? `<span>pomůcky: ${equip.join(', ')}</span>`:''}
    </div>
    ${g.rules? `<p>${g.rules}</p>`:''}
    <hr style="border:0;border-top:1px solid var(--line)">
    <div class="timer">
      <button id="t3" class="">3 min</button>
      <button id="t5" class="">5 min</button>
      <button id="t10" class="">10 min</button>
      <span class="big" id="dlgClock"></span>
      <button id="dlgStart" class="primary">Start/Pauza</button>
      <button id="dlgReset">Reset</button>
    </div>
  `;
  let remaining=0, running=false;
  const clock=document.getElementById('dlgClock');
  function setMin(m){ remaining=m*60; clock.textContent=fmtM(remaining); }
  ['t3','t5','t10'].forEach(id=> document.getElementById(id).onclick = ()=> setMin(parseInt(id.slice(1),10)));
  document.getElementById('dlgStart').onclick = ()=> running = !running;
  document.getElementById('dlgReset').onclick = ()=> { running=false; clock.textContent=''; remaining=0; };
  clearInterval(dlgTimerInt);
  dlgTimerInt = setInterval(()=>{ if(running && remaining>0){ remaining--; clock.textContent=fmtM(remaining); if(remaining===0) running=false; } },1000);
}

gamesList.addEventListener('click', (e)=>{
  const li = e.target.closest('li[data-id]'); if(!li) return;
  const id = li.dataset.id;
  const act = e.target.closest('button')?.dataset.act;
  const g = GAMES.find(x=>x.id===id);
  if (act==='select'){ renderDetail(g); }
  if (act==='edit'){ openGameDialog(g); }
});

randomBtn.addEventListener('click', ()=>{
  const arr = filterGames();
  if(!arr.length) return;
  const g = arr[Math.floor(Math.random()*arr.length)];
  renderDetail(g);
});

duplicateBtn.addEventListener('click', ()=>{
  if(!selectedId) return;
  const g = GAMES.find(x=>x.id===selectedId);
  const copy = {...g, id:uuid(), name:g.name+' (kopie)'};
  GAMES.push(copy); save(LS.games, GAMES); renderFilters(); renderGames(); renderDetail(copy);
});
deleteBtn.addEventListener('click', ()=>{
  if(!selectedId) return;
  if(!confirm('Smazat vybranou hru?')) return;
  GAMES = GAMES.filter(x=>x.id!==selectedId); save(LS.games, GAMES);
  selectedId = null; renderFilters(); renderGames(); renderDetail(null);
});
addGameBtn.addEventListener('click', ()=> openGameDialog());

// ---- Dialog add/edit ----
const dlg = document.getElementById('gameDialog');
const form = document.getElementById('gameForm');
const saveBtn = document.getElementById('saveGameBtn');

function openGameDialog(g=null){
  form.reset();
  form.dataset.id = g?.id || '';
  document.getElementById('dlgTitle').textContent = g? 'Upravit hru' : 'Nová hra';
  form.name.value = g?.name || '';
  form.category.value = g?.category || '';
  form.duration.value = g?.duration || 10;
  form.equipment.value = (g?.equipment||[]).join(', ');
  form.rules.value = g?.rules || '';
  if(!dlg.open) dlg.showModal();
}
saveBtn.addEventListener('click', (e)=>{
  e.preventDefault();
  const obj = {
    id: form.dataset.id || uuid(),
    name: form.name.value.trim(),
    category: form.category.value.trim(),
    duration: Math.max(1, parseInt(form.duration.value,10)||10),
    equipment: form.equipment.value.split(',').map(s=>s.trim()).filter(Boolean),
    rules: form.rules.value.trim()
  };
  if(form.dataset.id){
    const i = GAMES.findIndex(x=>x.id===form.dataset.id);
    if(i>-1) GAMES[i]=obj;
  } else {
    GAMES.push(obj);
  }
  save(LS.games, GAMES);
  renderFilters(); renderGames(); renderDetail(obj);
  dlg.close();
});

renderFilters(); renderGames(); renderDetail(null);

// ========= TÝMY =========
const playersText = document.getElementById('playersText');
const teamsCount = document.getElementById('teamsCount');
const genTeamsBtn = document.getElementById('genTeamsBtn');
const teamsOut = document.getElementById('teamsOut');

function loadLS(key, def){ try{ const v = JSON.parse(localStorage.getItem(key)); return (v===null||v===undefined)? def : v; }catch{return def;} }
playersText.value = loadLS(LS.playersText, playersText.value);
teamsCount.value = loadLS(LS.teamsCount, parseInt(teamsCount.value,10));
playersText.addEventListener('input', ()=> localStorage.setItem(LS.playersText, JSON.stringify(playersText.value)));
teamsCount.addEventListener('input', ()=> localStorage.setItem(LS.teamsCount, JSON.stringify(parseInt(teamsCount.value,10))) );

function parsePlayers(text){ return text.split(/\n|,/).map(s=>s.trim()).filter(Boolean); }
function makeTeams(players, n){
  const arr = [...players].sort(()=>Math.random()-0.5);
  const buckets = Array.from({length:n}, ()=>[]);
  arr.forEach((p,i)=> buckets[i % n].push(p));
  return buckets;
}
function renderTeams(b){ teamsOut.innerHTML = b.map((m,i)=>`
  <div class="team-card"><h4>Tým ${i+1}</h4><ul>${m.map(p=>`<li>${p}</li>`).join('')}</ul></div>`).join(''); }
genTeamsBtn.addEventListener('click', ()=>{
  const n = Math.max(2, Math.min(12, parseInt(teamsCount.value,10)||2));
  renderTeams(makeTeams(parsePlayers(playersText.value), n));
});

// ========= PLÁN DNE =========
const planList = document.getElementById('planList');
const slotTime = document.getElementById('slotTime');
const slotTitle = document.getElementById('slotTitle');
const addSlotBtn = document.getElementById('addSlotBtn');
const clearPlanBtn = document.getElementById('clearPlanBtn');
let PLAN = load(LS.plan, []);

function sortPlan(){ PLAN.sort((a,b)=> a.time.localeCompare(b.time)); }
function renderPlan(){
  sortPlan();
  planList.innerHTML = PLAN.map((s,i)=>`
    <li data-i="${i}">
      <input class="time" value="${s.time}" size="5">
      <div><strong>${s.title}</strong></div>
      <div class="row">
        <button data-act="up">↑</button>
        <button data-act="down">↓</button>
        <button data-act="del" class="danger">Smazat</button>
      </div>
    </li>
  `).join('');
}
planList.addEventListener('input', (e)=>{
  const li = e.target.closest('li[data-i]'); if(!li) return;
  const i = parseInt(li.dataset.i,10);
  if (e.target.classList.contains('time')) {
    PLAN[i].time = e.target.value;
    save(LS.plan, PLAN);
  }
});
planList.addEventListener('click', (e)=>{
  const li = e.target.closest('li[data-i]'); if(!li) return;
  const i = parseInt(li.dataset.i,10);
  const act = e.target.closest('button')?.dataset.act;
  if (act==='del') { PLAN.splice(i,1); save(LS.plan, PLAN); renderPlan(); }
  if (act==='up' && i>0) { [PLAN[i-1], PLAN[i]] = [PLAN[i], PLAN[i-1]]; save(LS.plan, PLAN); renderPlan(); }
  if (act==='down' && i<PLAN.length-1) { [PLAN[i+1], PLAN[i]] = [PLAN[i], PLAN[i+1]]; save(LS.plan, PLAN); renderPlan(); }
});
addSlotBtn.addEventListener('click', ()=>{
  const t = (slotTime.value||'').trim() || '10:00';
  const title = (slotTitle.value||'').trim();
  if(!title) return;
  PLAN.push({time:t, title});
  save(LS.plan, PLAN);
  slotTitle.value='';
  renderPlan();
});
clearPlanBtn.addEventListener('click', ()=>{
  if(confirm('Vymazat celý plán?')){ PLAN=[]; save(LS.plan, PLAN); renderPlan(); }
});
renderPlan();

}); // onReady end
