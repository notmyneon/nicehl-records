import {enableTableSorting,sortableHeader} from './sortable-tables.mjs';
import {buildModel,teamGames,summarise,longestStreak,alumniForSeason} from './franchise-model.mjs';
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number=(n,d=0)=>n==null?'—':Number(n).toLocaleString('en-CA',{maximumFractionDigits:d});
const signed=n=>(n>0?'+':'')+number(n,1);
const pct=n=>(n*100).toFixed(1)+'%';
const record=s=>`${s.wins}–${s.losses}${s.ties?'–'+s.ties:''}`;
const colour=n=>n>0?'positive':n<0?'negative':'';
const json=async path=>{const r=await fetch(path);if(!r.ok)throw Error(`Could not load ${path}`);return r.json();};
const table=(headers,rows)=>`<div class="table-wrap"><table><thead><tr>${headers.map((h,i)=>`<th scope="col">${h.includes('<button')||h==='#'?h:sortableHeader(h,i)}</th>`).join('')}</tr></thead><tbody>${rows.length?rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join(''):`<tr><td colspan="${headers.length}" class="empty">No results for these filters.</td></tr>`}</tbody></table></div>`;
let model,franchise,games,players,sort={key:'FPts',direction:-1};
const franchiseName=id=>model.franchises.find(f=>f.id===id)?.currentName||id;
const link=id=>`team.html?id=${encodeURIComponent(id)}`;
function logo(id){const url=model.logos.get(id);return url?`<img class="logo" src="${esc(url)}" alt="${esc(franchiseName(id))} logo" loading="lazy">`:`<span class="fallback" aria-hidden="true">${esc(franchiseName(id).split(' ').map(w=>w[0]).slice(0,3).join(''))}</span>`;}
function brokenLogos(){document.querySelectorAll('.logo').forEach(img=>{img.addEventListener('error',()=>{const fallback=document.createElement('span');fallback.className='fallback';fallback.textContent=img.alt.split(' ').slice(0,3).map(w=>w[0]).join('');img.replaceWith(fallback);},{once:true});});}
async function init(){
  try{
    const [manifest,franchises,alumni]=await Promise.all([json('data/seasons.json'),json('data/franchises.json'),json('data/nicehl-alumni-index.json')]);
    const seasons=await Promise.all(manifest.seasons.map(async entry=>({entry,data:await json('data/'+entry.file)})));
    model=buildModel(franchises.franchises,seasons);
    $('status').hidden=true;
    if(document.body.dataset.page==='directory'){
      const render=()=>renderDirectory(alumni);$('teamSearch').addEventListener('input',render);$('teamStatus').addEventListener('change',render);render();return;
    }
    const id=new URLSearchParams(location.search).get('id');franchise=model.franchises.find(f=>f.id===id);
    if(!franchise)throw Error('Franchise not found. Choose a team from the Teams page.');
    const playerData=alumni.franchises[id]?await json(alumni.franchises[id].file):{players:[]};
    games=teamGames(model.games,id);players=playerData.players.map((p,i)=>({...p,_index:i}));
    document.title=franchise.currentName+' · NiceHL Records';
    $('franchiseSelect').innerHTML=[...model.franchises].sort((a,b)=>a.currentName.localeCompare(b.currentName)).map(f=>`<option value="${esc(f.id)}" ${f.id===id?'selected':''}>${esc(f.currentName)}</option>`).join('');
    $('franchiseSelect').addEventListener('change',()=>location.href=link($('franchiseSelect').value));
    const seasonIds=[...new Set([...games.map(g=>g.season),...players.flatMap(p=>p.seasons)])].sort().reverse();
    for(const control of ['alumniSeason','gameSeason'])$(control).insertAdjacentHTML('beforeend',seasonIds.map(s=>`<option value="${s}">${s.replace('-','–')}</option>`).join(''));
    renderHero();renderOverview();renderAlumni();renderRivalries();renderGames();
    for(const id of ['alumniGroup','alumniSeason'])$(id).addEventListener('change',renderAlumni);$('alumniSearch').addEventListener('input',renderAlumni);
    for(const id of ['gameSeason','gameResult'])$(id).addEventListener('change',renderGames);
    $('alumniTable').addEventListener('click',event=>{
      const sorter=event.target.closest('[data-sort]');if(sorter){sort={key:sorter.dataset.sort,direction:sort.key===sorter.dataset.sort?-sort.direction:-1};renderAlumni();}
      const player=event.target.closest('[data-player]');if(player){event.preventDefault();openPlayer(players[Number(player.dataset.player)]);}
    });
    $('rivalryTable').addEventListener('click',event=>{const a=event.target.closest('[data-opponent]');if(!a)return;event.preventDefault();showMatchups(a.dataset.opponent);});
    $('closePlayer').addEventListener('click',()=>$('playerDialog').close());
    $('playerDialog').addEventListener('click',e=>{if(e.target===$('playerDialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});
    window.addEventListener('hashchange',selectSection);selectSection();$('teamContent').hidden=false;brokenLogos();
  }catch(error){$('status').hidden=false;$('status').classList.add('error');$('status').textContent=error.message;}
}
function renderDirectory(alumni){
  const query=$('teamSearch').value.trim().toLowerCase(),status=$('teamStatus').value;
  const franchises=model.franchises.filter(f=>[f.currentName,...f.aliases.map(a=>a.name)].some(n=>n.toLowerCase().includes(query))).filter(f=>status==='all'||model.current.has(f.id)===(status==='current')).sort((a,b)=>a.currentName.localeCompare(b.currentName));
  $('teamGrid').innerHTML=franchises.map(f=>{const list=teamGames(model.games,f.id),s=summarise(list),seasons=new Set(list.map(g=>g.season)).size,former=[...new Set(list.map(g=>g.historicalName))].filter(n=>n!==f.currentName);return `<a class="card team-card" href="${link(f.id)}">${logo(f.id)}<div><div class="eyebrow">${model.current.has(f.id)?'Current franchise':'Historical franchise'}</div><h3>${esc(f.currentName)}</h3><div>${record(s)} <span class="muted">· ${pct(s.winPct)}</span></div><small class="muted">${seasons} seasons · ${alumni.franchises[f.id]?.playerCount||0} alumni</small>${former.length?`<small class="muted" style="display:block">Formerly ${esc(former.join(' / '))}</small>`:''}</div></a>`;}).join('')||'<p class="empty">No franchises match your search.</p>';brokenLogos();
}
function metric(label,value,detail='',cls=''){return `<article class="metric"><span>${label}</span><strong class="${cls}">${value}</strong><small>${detail}</small></article>`;}
function renderHero(){
  const previous=[...new Set(games.map(g=>g.historicalName))].filter(n=>n!==franchise.currentName),summary=summarise(games),seasons=new Set(games.map(g=>g.season)).size;
  $('hero').innerHTML=`${logo(franchise.id)}<div><div class="eyebrow">${model.current.has(franchise.id)?'NiceHL franchise':'Historical franchise'}</div><h1>${esc(franchise.currentName)}</h1>${previous.length?`<p class="muted">Previously ${esc(previous.join(' · '))}</p>`:''}<p class="note">${games[0]?.season.replace('-','–')||''} — ${games.at(-1)?.season.replace('-','–')||''} · Regular-season franchise history</p></div>`;
  $('summary').innerHTML=metric('All-time record',record(summary),'Regular season')+metric('Win percentage',pct(summary.winPct),'Ties count as half a win')+metric('Points for',number(summary.pointsFor,1))+metric('Points against',number(summary.pointsAgainst,1))+metric('Differential',signed(summary.differential),'',colour(summary.differential))+metric('Seasons',seasons,`${summary.games} matchups`);
  const top=key=>[...players].sort((a,b)=>b.stats[key]-a.stats[key]||a.playerName.localeCompare(b.playerName))[0];
  const mostSeasons=[...players].sort((a,b)=>b.seasonCount-a.seasonCount||b.stats.FPts-a.stats.FPts)[0];
  const best=players.flatMap(p=>p.seasonStats.map(s=>({...s,playerName:p.playerName}))).sort((a,b)=>b.stats.FPts-a.stats.FPts)[0];
  const leader=(title,p,value,detail='')=>`<article class="card leader"><div class="eyebrow">${title}</div><h3>${esc(p?.playerName||'No player data')}</h3><strong>${value}</strong><small>${detail}</small></article>`;
  $('leaders').innerHTML=leader('Fantasy points',top('FPts'),number(top('FPts')?.stats.FPts,1),'Franchise career FPts')+leader('Games played',top('GP'),number(top('GP')?.stats.GP),'Games credited while in the lineup')+leader('Most seasons',mostSeasons,number(mostSeasons?.seasonCount),'Seasons with starts or points')+leader('Best player season',best,number(best?.stats.FPts,1),best?`${best.season.replace('-','–')} · FPts`:'');
}
function renderOverview(){
  const seasonIds=[...new Set(games.map(g=>g.season))].sort().reverse();
  const seasons=seasonIds.map(season=>{const list=games.filter(g=>g.season===season);return {season,list,...summarise(list)};});
  $('seasonTable').innerHTML=table(['Season','Team name','Rank','Record','Win %','PF','PA','Diff'],seasons.map(s=>[s.season.replace('-','–'),esc(s.list[0].historicalName),model.seasonRanks.get(`${s.season}:${franchise.id}`),record(s),pct(s.winPct),number(s.pointsFor,1),number(s.pointsAgainst,1),`<span class="${colour(s.differential)}">${signed(s.differential)}</span>`]));
  const bestGame=(list,key,dir=1)=>[...list].sort((a,b)=>dir*(b[key]-a[key]))[0];
  const details=g=>g?`${g.season} · Week ${g.period} · vs ${franchiseName(g.opponentId)} · ${g.result} ${number(g.own,1)}–${number(g.against,1)}`:'No qualifying games';
  const card=(label,value,detail)=>`<article class="card record"><div class="eyebrow">${label}</div><strong>${value}</strong><small>${esc(detail)}</small></article>`;
  const records=[];
  for(const [label,key,dir] of [['Highest score','own',1],['Lowest score','own',-1],['Biggest win','margin',1],['Biggest loss','margin',-1]]){const list=key==='margin'?games.filter(g=>g.result===(dir===1?'W':'L')):games,g=bestGame(list,key,dir);records.push(card(label,g?number(Math.abs(g[key]),1):'—',details(g)));}
  const close=bestGame(games.filter(g=>g.result==='W'),'margin',-1);records.push(card('Closest win',close?number(close.margin,1):'—',details(close)));
  for(const [label,result] of [['Longest winning streak','W'],['Longest losing streak','L']]){const run=longestStreak(games,result);records.push(card(label,run.length,run.length?`${run[0].season} W${run[0].period} → ${run.at(-1).season} W${run.at(-1).period}`:'No qualifying games'));}
  for(const [label,key,format]of[['Most season wins','wins',number],['Best season win %','winPct',pct],['Most season points','pointsFor',number],['Best season differential','differential',signed]]){const best=[...seasons].sort((a,b)=>b[key]-a[key])[0];records.push(card(label,best?format(best[key]):'—',best?`${best.season} · ${record(best)}`:''));}
  $('records').innerHTML=records.join('');
  $('timeline').innerHTML=[...seasons].reverse().map(s=>`<article class="card"><strong>${s.season.replace('-','–')}</strong><h3>${esc(s.list[0].historicalName)}</h3><div>${record(s)} · Rank ${model.seasonRanks.get(`${s.season}:${franchise.id}`)}</div></article>`).join('');
}
function renderAlumni(){
  const group=$('alumniGroup').value,season=$('alumniSeason').value,query=$('alumniSearch').value.trim().toLowerCase();
  let list=alumniForSeason(players,season).filter(p=>(group==='all'||p.group===group)&&p.playerName.toLowerCase().includes(query));
  const columns=group==='goalies'?['FPts','GP','FP/G','GS','W','L','OW','OL+ShL','GA','SHO','G','A']:group==='skaters'?['FPts','GP','FP/G','G','A','BP','ESP','PPP','SHP','HT','Blk']:['FPts','GP','FP/G','G','A','PPP','SHP'];
  if(!columns.includes(sort.key)&&sort.key!=='seasonCount'&&sort.key!=='playerName')sort={key:'FPts',direction:-1};
  const value=(p,key)=>key==='seasonCount'?p.seasonCount:key==='playerName'?p.playerName:p.stats[key];
  list.sort((a,b)=>{const av=value(a,sort.key),bv=value(b,sort.key);if(av==null)return bv==null?a.playerName.localeCompare(b.playerName):1;if(bv==null)return-1;return sort.direction*(typeof av==='string'?av.localeCompare(bv):av-bv)||a.playerName.localeCompare(b.playerName);});
  const head=(label,key)=>`<button data-sort="${key}" aria-pressed="${sort.key===key}">${label}${sort.key===key?(sort.direction<0?' ↓':' ↑'):''}</button>`;
  $('alumniTable').innerHTML=table(['#',head('Player','playerName'),head('Seasons','seasonCount'),...columns.map(k=>head(k,k))],list.map((p,i)=>[i+1,`<a href="#alumni" data-player="${p._index}">${esc(p.playerName)}</a><small>${p.group==='goalies'?'Goalie':'Skater'} · ${esc(p.seasons.join(', '))}</small>`,p.seasonCount,...columns.map(k=>{const text=number(p.stats[k],k==='FP/G'?2:1),covered=p.seasonStats.filter(s=>s.stats[k]!=null).length;return season==='all'&&p.stats[k]!=null&&covered<p.seasonStats.length?`<span title="Recorded in ${covered} of ${p.seasonStats.length} seasons">${text}*</span>`:text;})]));
  $('alumniCount').textContent=`${list.length} players shown · ${season==='all'?'All seasons':season} · FP/G = points ÷ games. Missing categories are shown as —; * totals cover only seasons that tracked that category.`;
}
function openPlayer(player){
  $('playerTitle').textContent=player.playerName;
  const columns=player.group==='goalies'?['FPts','GP','GS','W','L','GA','SHO']:['FPts','GP','G','A','PPP','SHP','Blk'];
  $('playerDetails').innerHTML=`<p class="muted">${esc(franchise.currentName)} contributions only</p>`+table(['Season','Team name',...columns],player.seasonStats.map(s=>[s.season.replace('-','–'),esc(s.teamName),...columns.map(k=>number(s.stats[k],1))]));
  if(player.identityStatus==='name-only')$('playerDetails').insertAdjacentHTML('beforeend','<p class="note">Historical export identifies this player by name; a player ID is not available.</p>');
  $('playerDialog').showModal();
}
function gameRows(list){return list.map(g=>[g.season.replace('-','–'),g.period,`<a href="${link(g.opponentId)}">${esc(franchiseName(g.opponentId))}</a>`,g.result,number(g.own,1),number(g.against,1),`<span class="${colour(g.margin)}">${signed(g.margin)}</span>`,esc(g.dateRange||'')]);}
function renderGames(){const season=$('gameSeason').value,result=$('gameResult').value;const list=games.filter(g=>(season==='all'||g.season===season)&&(result==='all'||g.result===result)).slice().reverse();$('gameTable').innerHTML=table(['Season','Week','Opponent','Result','PF','PA','Diff','Dates'],gameRows(list));}
function renderRivalries(){const ids=[...new Set(games.map(g=>g.opponentId))];const rows=ids.map(id=>({id,...summarise(games.filter(g=>g.opponentId===id))})).sort((a,b)=>b.games-a.games||franchiseName(a.id).localeCompare(franchiseName(b.id)));$('rivalryTable').innerHTML=table(['Opponent','GP','Record','Win %','PF','PA','Diff'],rows.map(s=>[`<a href="#rivalries" data-opponent="${s.id}">${esc(franchiseName(s.id))}</a>`,s.games,record(s),pct(s.winPct),number(s.pointsFor,1),number(s.pointsAgainst,1),`<span class="${colour(s.differential)}">${signed(s.differential)}</span>`]));}
function showMatchups(id){$('matchupHistory').innerHTML=`<h3 style="margin:24px 0 12px">${esc(franchise.currentName)} vs ${esc(franchiseName(id))}</h3>`+table(['Season','Week','Opponent','Result','PF','PA','Diff','Dates'],gameRows(games.filter(g=>g.opponentId===id).slice().reverse()));$('matchupHistory').scrollIntoView({behavior:'smooth',block:'nearest'});}
function selectSection(){const section=['overview','alumni','rivalries','games'].includes(location.hash.slice(1))?location.hash.slice(1):'overview';for(const id of ['overview','alumni','rivalries','games'])$(id).hidden=id!==section;document.querySelectorAll('[data-section]').forEach(a=>{if(a.dataset.section===section)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});}
enableTableSorting(document);
init();
