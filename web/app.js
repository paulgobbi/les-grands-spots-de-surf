import * as maplibregl from 'https://unpkg.com/maplibre-gl@6.11.2/dist/maplibre-gl.mjs';
const $=id=>document.getElementById(id);
const KEY={country:'Pays',break:'Type de break',direction:'Direction',bottom:'Fond',shape:'Morphologie',level:'Niveau min',power:'Puissance',frequency:'Fréquence'};
const labels={country:'Pays',break:'Type de break',direction:'Direction',bottom:'Nature du fond',shape:'Morphologie',level:'Niveau du surfeur',power:'Puissance',frequency:'Fréquence de fonctionnement'};
const order=['Débutant','Intermédiaire','Avancé','Expert','Élite'];
const months=['Jan','Fév','Mar','Avr','Mai','Juin','Juil','Aoû','Sep','Oct','Nov','Déc'];
const filters=['country','break','direction','bottom','shape','level','power','size','month','frequency','quality','danger','history'];
const numeric=[{id:'size',label:'Taille des vagues',min:0,max:30,step:.5,unit:'m'},{id:'quality',label:'Qualité / prestige',min:0,max:10,step:1,unit:'/10'},{id:'danger',label:'Dangerosité',min:0,max:10,step:1,unit:'/10'},{id:'history',label:'Importance historique',min:0,max:10,step:1,unit:'/10'}];
const state={tab:'filters',q:'',sels:{},ranges:{},months:new Set(),sort:'quality',ascending:false,selected:null,visible:[],satellite:false};
const normalized=s=>String(s??'').toLocaleLowerCase('fr').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
const escapeHtml=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const get=(o,k)=>o[k]??'';
const num=(o,k)=>{let v=Number(String(get(o,k)).replace(',','.'));return get(o,k)===''||!Number.isFinite(v)?null:v};
const sizeMin=o=>num(o,'Taille caractéristique min (face, m)');const sizeMax=o=>num(o,'Taille caractéristique max (face, m)');
const score=(o,id)=>num(o,{quality:'Qualité / prestige /10',danger:'Dangerosité /10',history:'Importance historique /10'}[id]);
const tokens=(val,id)=>String(val??'').split(/\s*;\s*|\s*\/\s*|\s*,\s*/).map(x=>x.trim()).filter(Boolean).map(v=>id==='break'&&normalized(v)==='point beak'?'Point break':v);
const opts={};
for(const id of Object.keys(KEY)){
 let all=[];
 if(id==='level')all=order;
 else if(id==='direction')all=['Gauche','Droite','Variable'];
 else all=SPOTS.flatMap(o=>tokens(o[KEY[id]],id));
 opts[id]=[...new Set(all)].sort((a,b)=>a.localeCompare(b,'fr'));
 state.sels[id]=new Set();
}
for(const n of numeric)state.ranges[n.id]=[n.min,n.max];
const isActiveRange=id=>{const n=numeric.find(x=>x.id===id);const r=state.ranges[id];return r[0]>n.min||r[1]<n.max};
function levelsOf(o){const a=order.indexOf(get(o,'Niveau min')),b=order.indexOf(get(o,'Niveau max'));return a>=0&&b>=a?order.slice(a,b+1):[]}
function seasonOf(o){const a=num(o,'Saison mois début'),b=num(o,'Saison mois fin');if(!a||!b||a<1||a>12||b<1||b>12)return [];let out=[];for(let m=1;m<=12;m++)if(a<=b?m>=a&&m<=b:m>=a||m<=b)out.push(m);return out}
function matches(o){
 if(state.q&&!['Nom du spot','Pays','Région','Localisation'].some(k=>normalized(get(o,k)).includes(normalized(state.q))))return false;
 for(const [id,selected] of Object.entries(state.sels)){
 if(!selected.size)continue;
 const values=id==='level'?levelsOf(o):id==='direction'?(get(o,'Direction')==='Gauche et droite'?['Gauche','Droite']:tokens(get(o,'Direction'),id)):tokens(get(o,KEY[id]),id);
 if(!values.length||![...selected].some(v=>values.some(a=>normalized(a)===normalized(v))))return false;
 }
 if(state.months.size&&!seasonOf(o).some(m=>state.months.has(m)))return false;
 if(isActiveRange('size')){const a=sizeMin(o),b=sizeMax(o),r=state.ranges.size;if(a===null||b===null||a>r[1]||b<r[0])return false}
 for(const id of ['quality','danger','history'])if(isActiveRange(id)){const s=score(o,id),r=state.ranges[id];if(s===null||s<r[0]||s>r[1])return false}
 return true;
}
function effectiveScore(o,id){const x=score(o,id);return x===null?(state.ascending?Infinity:-Infinity):x}
function sorted(arr){return [...arr].sort((a,b)=>{
 let cmp=0;if(state.sort==='name')cmp=String(get(a,'Nom du spot')).localeCompare(String(get(b,'Nom du spot')),'fr');
 else if(state.sort==='country')cmp=String(get(a,'Pays')).localeCompare(String(get(b,'Pays')),'fr');
 else {let x=score(a,state.sort),y=score(b,state.sort);cmp=x===null?(y===null?0:1):y===null?-1:x-y; if(!state.ascending)cmp=-cmp;return cmp||String(get(a,'Nom du spot')).localeCompare(String(get(b,'Nom du spot')),'fr')}
 return (state.ascending?cmp:-cmp)||String(get(a,'Nom du spot')).localeCompare(String(get(b,'Nom du spot')),'fr')
 })}
const street='https://tiles.openfreemap.org/styles/liberty';
const satellite={version:8,sources:{satellite:{type:'raster',tiles:['https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2020_3857/default/g/{z}/{y}/{x}.jpg'],tileSize:256,attribution:'Imagery © EOX / Sentinel-2 cloudless 2020'}},layers:[{id:'satellite',type:'raster',source:'satellite'}]};
let map, mapReady=false;
try {map=new maplibregl.Map({container:'map',style:street,center:[0,14],zoom:1.55,attributionControl:true});map.addControl(new maplibregl.NavigationControl(),'bottom-right');map.on('load',()=>{mapReady=true;drawMap()});map.on('style.load',()=>{mapReady=true;drawMap()});map.on('error',ev=>{if(ev?.error){$('mapStatus').textContent='Impossible de charger certains éléments du fond de carte. Vérifie ta connexion ou repasse en mode Carte.';$('mapStatus').classList.remove('hidden')}})}catch(err){$('mapStatus').textContent='La carte n’a pas pu démarrer : '+err.message;$('mapStatus').classList.remove('hidden')}
const dataGeo=arr=>({type:'FeatureCollection',features:arr.map(o=>({type:'Feature',geometry:{type:'Point',coordinates:[Number(o.lon),Number(o.lat)]},properties:{id:o.id}}))});
function drawMap(){if(!mapReady||!map?.isStyleLoaded())return;const data=dataGeo(state.visible);
 if(map.getSource('spots')){map.getSource('spots').setData(data);return}
 map.addSource('spots',{type:'geojson',data,cluster:true,clusterRadius:52,clusterMaxZoom:12});
 map.addLayer({id:'clusters',type:'circle',source:'spots',filter:['has','point_count'],paint:{'circle-color':'#087c9e','circle-stroke-color':'#fff','circle-stroke-width':3,'circle-radius':['step',['get','point_count'],19,10,24,25,29]}});
 map.addLayer({id:'cluster-count',type:'symbol',source:'spots',filter:['has','point_count'],layout:{'text-field':['get','point_count_abbreviated'],'text-size':12},paint:{'text-color':'#ffffff'}});
 map.addLayer({id:'unclustered',type:'circle',source:'spots',filter:['!', ['has','point_count']],paint:{'circle-radius':['case',['==',['get','id'],state.selected?.id??''],11,7],'circle-color':['case',['==',['get','id'],state.selected?.id??''],'#e5a82e','#087d9c'],'circle-stroke-color':'#fff','circle-stroke-width':2}});
 map.addLayer({id:'halo',type:'circle',source:'spots',filter:['all',['!', ['has','point_count']],['==',['get','id'],state.selected?.id??'']],paint:{'circle-radius':19,'circle-color':'#f5b72c','circle-opacity':.27,'circle-blur':.3}});
 map.moveLayer('halo','unclustered');
 map.on('click','clusters',e=>{const f=e.features?.[0];if(!f)return;const id=f.properties.cluster_id;map.getSource('spots').getClusterExpansionZoom(id).then(z=>map.easeTo({center:f.geometry.coordinates,zoom:z,duration:650})).catch(()=>{})});
 map.on('click','unclustered',e=>{const id=e.features?.[0]?.properties?.id;const o=SPOTS.find(x=>x.id===id);if(o)selectSpot(o)});
 for(const id of ['clusters','unclustered']){map.on('mouseenter',id,()=>map.getCanvas().style.cursor='pointer');map.on('mouseleave',id,()=>map.getCanvas().style.cursor='')}
}
function paintSelected(){if(mapReady&&map?.getLayer('unclustered')){map.setPaintProperty('unclustered','circle-radius',['case',['==',['get','id'],state.selected?.id??''],11,7]);map.setPaintProperty('unclustered','circle-color',['case',['==',['get','id'],state.selected?.id??''],'#e5a82e','#087d9c']);map.setFilter('halo',['all',['!', ['has','point_count']],['==',['get','id'],state.selected?.id??'']])}}
function resize(){setTimeout(()=>{map?.resize()},270)}
function setTab(tab){state.tab=tab;document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));$('filtersPanel').classList.toggle('hidden',tab!=='filters');$('resultsPanel').classList.toggle('hidden',tab!=='results')}
document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>setTab(b.dataset.tab)));
$('hamburger').addEventListener('click',()=>{const closed=$('shell').classList.toggle('left-closed');$('hamburger').setAttribute('aria-label',closed?'Afficher les filtres':'Masquer les filtres');resize()});
// On small screens, the map starts fully visible.
if(window.matchMedia('(max-width:650px)').matches)$('shell').classList.add('left-closed');
$('detailClose').addEventListener('click',()=>{state.selected=null;$('detail').classList.remove('open');paintSelected();renderResults();resize()});
$('street').addEventListener('click',()=>setStyle(false));$('satellite').addEventListener('click',()=>setStyle(true));
function setStyle(isSatellite){state.satellite=isSatellite;$('street').classList.toggle('on',!isSatellite);$('satellite').classList.toggle('on',isSatellite);$('mapStatus').classList.add('hidden');mapReady=false;map.setStyle(isSatellite?satellite:street)}
$('search').addEventListener('input',e=>{state.q=e.target.value;refresh()});
$('reset').addEventListener('click',()=>{state.q='';$('search').value='';Object.values(state.sels).forEach(v=>v.clear());state.months.clear();for(const n of numeric)state.ranges[n.id]=[n.min,n.max];renderControls();refresh()});
$('sort').addEventListener('change',e=>{state.sort=e.target.value;state.ascending=['name','country'].includes(e.target.value);syncSort();renderResults()});
$('sortDir').addEventListener('click',()=>{state.ascending=!state.ascending;syncSort();renderResults()});
function syncSort(){$('sortDir').textContent=state.ascending?'↑':'↓';$('sortDir').title=state.ascending?'Tri croissant':'Tri décroissant'}
function filterControl(id){const div=document.createElement('div');div.className='filter-group';const label=document.createElement('div');label.className='filter-label';label.textContent=labels[id];div.append(label);
 const box=document.createElement('div');box.className='selectbox';const button=document.createElement('button');button.className='select-toggle';button.type='button';const sel=state.sels[id];button.innerHTML=`<span>${sel.size?escapeHtml([...sel].join(', ')):'Toutes les valeurs'}</span><span>⌄</span>`;
 const dropdown=document.createElement('div');dropdown.className='select-dropdown hidden';if(id==='country'){const q=document.createElement('input');q.type='search';q.placeholder='Rechercher un pays…';q.addEventListener('input',()=>dropdown.querySelectorAll('.option').forEach(row=>row.classList.toggle('hidden',!normalized(row.dataset.value).includes(normalized(q.value)))));dropdown.append(q)}
 for(const value of opts[id]){const item=document.createElement('label');item.className='option';item.dataset.value=value;const check=document.createElement('input');check.type='checkbox';check.checked=sel.has(value);check.addEventListener('change',()=>{check.checked?sel.add(value):sel.delete(value);button.querySelector('span').textContent=sel.size?[...sel].join(', '):'Toutes les valeurs';refresh()});item.append(check,document.createTextNode(value));dropdown.append(item)}
 button.addEventListener('click',()=>{document.querySelectorAll('.select-dropdown').forEach(el=>{if(el!==dropdown)el.classList.add('hidden')});dropdown.classList.toggle('hidden')});box.append(button,dropdown);div.append(box);return div}
function rangeControl(n){const root=document.createElement('div');root.className='filter-group';root.innerHTML=`<div class="filter-label">${n.label}</div><div class="range-values"><span id="${n.id}Low"></span><span id="${n.id}High"></span></div><div class="range-pair"><div class="range-track"><div class="range-fill" id="${n.id}Fill"></div></div><input aria-label="${n.label} minimum" type="range" min="${n.min}" max="${n.max}" step="${n.step}" value="${state.ranges[n.id][0]}"><input aria-label="${n.label} maximum" type="range" min="${n.min}" max="${n.max}" step="${n.step}" value="${state.ranges[n.id][1]}"></div>`;
 const inp=root.querySelectorAll('input');function sync(){const r=state.ranges[n.id];inp[0].value=r[0];inp[1].value=r[1];root.querySelector(`#${n.id}Low`).textContent=`Min ${r[0]}${n.unit}`;root.querySelector(`#${n.id}High`).textContent=`Max ${r[1]}${n.unit}`;const el=root.querySelector(`#${n.id}Fill`);el.style.left=(r[0]-n.min)/(n.max-n.min)*100+'%';el.style.right=(n.max-r[1])/(n.max-n.min)*100+'%'}
 inp.forEach((input,i)=>input.addEventListener('input',()=>{const r=state.ranges[n.id];r[i]=Number(input.value);if(r[0]>r[1])r[1-i]=r[i];sync();refresh()}));sync();return root}
function monthControl(){const root=document.createElement('div');root.className='filter-group';root.innerHTML='<div class="filter-label">Saison favorable</div>';const grid=document.createElement('div');grid.className='month-grid';months.forEach((m,i)=>{const btn=document.createElement('button');btn.className='month'+(state.months.has(i+1)?' active':'');btn.textContent=m;btn.type='button';btn.addEventListener('click',()=>{state.months.has(i+1)?state.months.delete(i+1):state.months.add(i+1);btn.classList.toggle('active',state.months.has(i+1));refresh()});grid.append(btn)});root.append(grid);return root}
function renderControls(){const root=$('filterControls');root.replaceChildren();['country','break','direction','bottom','shape','level','power'].forEach(id=>root.append(filterControl(id)));root.append(rangeControl(numeric[0]));root.append(monthControl());root.append(filterControl('frequency'));numeric.slice(1).forEach(n=>root.append(rangeControl(n)))}
document.addEventListener('click',e=>{if(!e.target.closest('.selectbox'))document.querySelectorAll('.select-dropdown').forEach(x=>x.classList.add('hidden'))});
function renderChips(){const root=$('chips');root.replaceChildren();let count=0;
 const add=(text,clear)=>{count++;const b=document.createElement('button');b.className='chip';b.textContent=text+' ×';b.title='Supprimer ce filtre';b.addEventListener('click',()=>{clear();renderControls();refresh()});root.append(b)};
 for(const [id,set] of Object.entries(state.sels))for(const val of set)add(`${labels[id]} : ${val}`,()=>set.delete(val));
 for(const n of numeric)if(isActiveRange(n.id)){const r=state.ranges[n.id];add(`${n.label} : ${r[0]}–${r[1]}${n.unit}`,()=>state.ranges[n.id]=[n.min,n.max])}
 for(const m of [...state.months].sort((a,b)=>a-b))add(`Mois : ${months[m-1]}`,()=>state.months.delete(m));
 if(state.q)add(`Recherche : ${state.q}`,()=>{$('search').value='';state.q=''})
 $('activeCount').textContent=count?`(${count})`:'';
}
function statBadge(icon,cls,n){return `<span class="stat"><span class="${cls}">${icon}</span>${n===null?'—':n}/10</span>`}
function renderResults(){const sortedSpots=sorted(state.visible);$('spotResults').replaceChildren();for(const o of sortedSpots){const b=document.createElement('button');b.className='spot-card'+(o.id===state.selected?.id?' active':'');b.innerHTML=`<div class="spot-name">${escapeHtml(get(o,'Nom du spot'))}</div><div class="spot-location">${escapeHtml([get(o,'Localisation'),get(o,'Pays')].filter(Boolean).join(' · '))}</div><div class="stats">${statBadge('★','s-quality',score(o,'quality'))}${statBadge('⚠','s-danger',score(o,'danger'))}${statBadge('▥','s-history',score(o,'history'))}</div>`;b.addEventListener('click',()=>selectSpot(o));$('spotResults').append(b)}if(!sortedSpots.length)$('spotResults').innerHTML='<div class="empty">Aucun spot ne correspond aux critères.</div>';}
function refresh(){state.visible=SPOTS.filter(matches);const n=state.visible.length;$('resultCount').textContent=n;$('footerCount').textContent=`${n} spots sur ${SPOTS.length}`;$('mapCount').textContent=n===1?'1 spot':`${n} spots`;$('resultSummary').textContent=`${n} résultat${n>1?'s':''}`;renderChips();renderResults();drawMap()}
const fmt=v=>v===null?'—':String(v).replace('.',',');
function row(label,value){return `<div class="detail-row"><label>${escapeHtml(label)}</label><b>${escapeHtml(value||'—')}</b></div>`}
function meter(id,caption,icon,color,o){const n=score(o,id);return `<div class="note-item"><div class="note-top"><span style="color:${color}">${icon}</span> ${n??'—'}/10</div><div class="vertical-meter"><div class="fill" style="height:${n===null?0:Math.min(100,Math.max(0,n*10))}%;background:${color}"></div></div><div class="meter-name">${caption}</div></div>`}
function badges(items,active,extra=''){return `<div class="badgegrid ${extra}">${items.map(v=>`<div class="mini-badge ${active(v)?'active':''}">${escapeHtml(v)}</div>`).join('')}</div>`}
function selectSpot(o){state.selected=o;$('detail').classList.add('open');const a=sizeMin(o),b=sizeMax(o);const l=Math.max(0,Math.min(100,(a??0)/30*100)),r=Math.max(0,Math.min(100,(b??0)/30*100));const season=seasonOf(o);const ls=levelsOf(o);
 $('detailContent').innerHTML=`<div class="detail-inner"><h2>${escapeHtml(get(o,'Nom du spot'))}</h2><p class="detail-sub">${escapeHtml([get(o,'Localisation'),get(o,'Région'),get(o,'Pays')].filter(Boolean).join(' · '))}</p>
 <div class="section"><div class="note-row">${meter('quality','Qualité','★','#dea322',o)}${meter('danger','Danger','⚠','#dd5963',o)}${meter('history','Histoire','▥','#328dc4',o)}</div></div>
 <div class="section">${row('Type de break',get(o,'Type de break'))}${row('Fond',get(o,'Fond'))}${row('Direction',get(o,'Direction'))}</div>
 <div class="section"><div class="section-title">Taille caractéristique (face, m)</div><div class="wave-track"><div class="wave-range" style="left:${l}%;width:${Math.max(0,r-l)}%"></div></div><div class="wave-endpoints"><span>0 m</span><span>30 m</span></div><div class="wave-actual">${fmt(a)} – ${fmt(b)} m</div><div style="margin-top:10px">${row('Morphologie',get(o,'Morphologie'))}${row('Puissance',get(o,'Puissance'))}</div></div>
 <div class="section"><div class="section-title">Niveaux de surfeur</div>${badges(order,v=>ls.includes(v))}</div>
 <div class="section"><div class="section-title">Saison favorable</div><div id="realMonths" class="badgegrid months">${months.map((m,i)=>`<div class="mini-badge ${season.includes(i+1)?'active':''}">${m}</div>`).join('')}</div><div style="margin-top:11px">${row('Fréquence',get(o,'Fréquence'))}</div></div>
 <div class="section"><div class="section-title">Pourquoi ce spot est reconnu</div><p class="para">${escapeHtml(get(o,'Pourquoi ce spot est reconnu')||'Non renseigné')}</p></div>
 <div class="section"><div class="section-title">Risques</div><p class="para">${escapeHtml(get(o,'Facteurs de danger')||'Non renseignés')}</p></div></div>`;
 paintSelected();renderResults();resize();if(map){map.easeTo({center:[Number(o.lon),Number(o.lat)],zoom:map.getZoom(),duration:750,essential:true})}
 if(window.matchMedia('(max-width:650px)').matches)$('shell').classList.add('left-closed');
}
// Cleanly preserve all 146 records and their source labels; sorting and filtering never mutate them.
renderControls();syncSort();refresh();
