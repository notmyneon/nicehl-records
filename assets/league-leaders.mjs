import {leaguePlayers,sortPlayers} from './league-model.mjs';
import {enableTableSorting,sortableHeader} from './sortable-tables.mjs';
const $=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number=(n,d=0)=>n==null?'—':Number(n).toLocaleString('en-CA',{maximumFractionDigits:d});
let data,sort={key:'FPts',direction:-1};
const categories=group=>group==='goalies'?['FPts','GP','FP/G','GS','W','L','OW','OL+ShL','GA','SHO','G','A']:group==='skaters'?['FPts','GP','FP/G','G','A','BP','ESP','PPP','SHP','HT','Blk']:['FPts','GP','FP/G','G','A','PPP','SHP'];
function render(){
 const season=$('leaderSeason').value,group=$('leaderGroup').value,query=$('leaderSearch').value.trim().toLowerCase(),minimum=Number($('minimumGames').value)||0,columns=categories(group);
 if(![...columns,'playerName','seasonCount','teamName'].includes(sort.key))sort={key:'FPts',direction:-1};
 const list=sortPlayers(leaguePlayers(data.players,season).filter(p=>(group==='all'||p.group===group)&&p.playerName.toLowerCase().includes(query)&&p.stats.GP>=minimum),sort.key,sort.direction);
 const header=(label,key)=>`<th scope="col" ${sort.key===key?`aria-sort="${sort.direction<0?'descending':'ascending'}"`:''}><button data-sort="${key}">${label}${sort.key===key?(sort.direction<0?' ↓':' ↑'):' ↕'}</button></th>`;
 $('leaderTable').innerHTML=`<div class="table-wrap"><table><thead><tr><th scope="col">#</th>${header('Player','playerName')}${header('Team','teamName')}${header('Seasons','seasonCount')}${columns.map(k=>header(k,k)).join('')}</tr></thead><tbody>${list.length?list.map((p,i)=>`<tr><td>${i+1}</td><td class="player"><a href="#" data-player="${p.index}" data-franchise="${esc(p.franchiseId)}">${esc(p.playerName)}</a><small>${p.group==='goalies'?'Goalie':'Skater'}</small></td><td class="player"><a href="team.html?id=${encodeURIComponent(p.franchiseId)}">${esc(p.teamName)}</a></td><td>${p.seasonCount}</td>${columns.map(k=>`<td>${number(p.stats[k],k==='FP/G'?2:1)}${p.stats[k]!=null&&p.coverage[k]<p.seasonStats.length?`<span title="Recorded in ${p.coverage[k]} of ${p.seasonStats.length} team-season stints">*</span>`:''}</td>`).join('')}</tr>`).join(''):`<tr><td colspan="${columns.length+4}" class="empty">No players match these filters.</td></tr>`}</tbody></table></div>`;
 $('leaderCount').textContent=`${list.length} player-team entries · ${season==='all'?'All time, 2019–20 through 2025–26':season.replace('-','–')} · Sorted by ${sort.key}`;
}
function openPlayer(index,franchiseId){
 const p=leaguePlayers([data.players[index]],$('leaderSeason').value).find(p=>p.franchiseId===franchiseId),columns=categories(p.group);
 $('playerTitle').textContent=p.playerName+' · '+p.teamName;
 $('playerDetails').innerHTML=`<p class="note">${$('leaderSeason').value==='all'?'All recorded seasons':esc($('leaderSeason').value)} · ${esc(p.teamName)} contributions: ${number(p.stats.FPts,1)} FPts, ${number(p.stats.GP)} GP. Each row is one team-season contribution.</p><div class="table-wrap"><table><thead><tr>${['Season','Team',...columns].map((k,i)=>`<th scope="col">${sortableHeader(k,i)}</th>`).join('')}</tr></thead><tbody>${p.seasonStats.slice().sort((a,b)=>b.season.localeCompare(a.season)||b.stats.FPts-a.stats.FPts).map(s=>`<tr><td>${esc(s.season)}</td><td><a href="team.html?id=${encodeURIComponent(s.franchiseId)}#alumni">${esc(s.teamName)}</a></td>${columns.map(k=>`<td>${number(k==='FP/G'?(s.stats.GP?s.stats.FPts/s.stats.GP:null):s.stats[k],k==='FP/G'?2:1)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>${p.identityStatus==='name-only'?'<p class="note">Historical exports identify this player by name; a player ID is unavailable.</p>':''}`;
 $('playerDialog').showModal();
}
async function init(){try{
 const r=await fetch('data/nicehl-league-leaders.json');if(!r.ok)throw Error('Could not load league player leaders.');data=await r.json();
 $('leaderSeason').insertAdjacentHTML('beforeend',[...data.seasons].reverse().map(s=>`<option value="${s}">${s.replace('-','–')}</option>`).join(''));
 for(const id of ['leaderSeason','leaderGroup'])$(id).addEventListener('change',render);
 for(const id of ['leaderSearch','minimumGames'])$(id).addEventListener('input',render);
 $('leaderTable').addEventListener('click',e=>{const b=e.target.closest('[data-sort]');if(b){sort={key:b.dataset.sort,direction:sort.key===b.dataset.sort?-sort.direction:b.dataset.sort==='playerName'?1:-1};render();}const a=e.target.closest('[data-player]');if(a){e.preventDefault();openPlayer(Number(a.dataset.player),a.dataset.franchise);}});
 $('closePlayer').addEventListener('click',()=>$('playerDialog').close());$('status').hidden=true;$('leaderContent').hidden=false;render();
 }catch(e){$('status').classList.add('error');$('status').textContent=e.message;}}
enableTableSorting(document);init();
