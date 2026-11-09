// Паук НРР/ЕНИР belenir.com — обход ПО СБОРНИКАМ, расценки качаются сразу (inline).
// Шифр = <h1> на /code/X ; Наиме = текст между <h1> и "Состав работ" ; Ед. = колонка "Единица измер".
//
//   node scripts/crawl_rates.js                          // КАРТА сборников (survey, быстро)
//   node scripts/crawl_rates.js --only Е1,Е6             // карта только этих сборников
//   node scripts/crawl_rates.js --go --only Е1,Е6,Е12    // СОБРАТЬ выбранные (расценки пойдут сразу)
//   node scripts/crawl_rates.js --go --all               // собрать всё (долго, но прогрессивно)
//   флаги: --debug  --delay=800  --reset
import fs from 'fs';
import * as cheerio from 'cheerio';

const BASE = 'https://belenir.com';
const ROOT = '/enir/sbor';
const OUT = 'public/rates_full.json';
const STATE = 'crawl_state.json';
const DELAY0 = parseInt((process.argv.find(a=>a.startsWith('--delay='))||'').split('=')[1]) || 650;
const GO  = process.argv.includes('--go');
const ALL = process.argv.includes('--all');
const DBG = process.argv.includes('--debug');
if (process.argv.includes('--reset') && fs.existsSync(STATE)) fs.unlinkSync(STATE);

// латиница -> кириллица, чтобы "E1" и "Е1" совпадали
const toCyr = s => String(s)
  .replace(/E/g,'Е').replace(/e/g,'е').replace(/P/g,'Р').replace(/p/g,'р')
  .replace(/C/g,'С').replace(/c/g,'с').replace(/O/g,'О').replace(/o/g,'о')
  .replace(/T/g,'Т').replace(/y/g,'У').replace(/x/g,'Х').replace(/a/g,'а')
  .replace(/H/g,'Н').replace(/h/g,'н').replace(/M/g,'М').replace(/m/g,'м')
  .replace(/B/g,'В').replace(/b/g,'в').replace(/K/g,'К').replace(/k/g,'к');
const normCode = s => toCyr(String(s).trim().toUpperCase());

// --only принимает "--only X,Y" и "--only=X,Y", регистр/кириллица-латиница не важны
function parseOnly(){
  let raw=null;
  for(let i=0;i<process.argv.length;i++){
    const a=process.argv[i];
    if(a.startsWith('--only=')){raw=a.slice(7);break;}
    if(a==='--only'&&process.argv[i+1]){raw=process.argv[i+1];break;}
  }
  return raw?raw.split(',').map(normCode).filter(Boolean):null;
}
const WL = parseOnly();

const sleep = ms => new Promise(r=>setTimeout(r, ms+Math.random()*250));
const dec = u => { try{return decodeURIComponent(u);}catch{return u;} };

async function getHTML(raw){
  let url = raw.startsWith('/') ? BASE+raw : raw;
  try{ url = encodeURI(dec(url)); }catch{ url = encodeURI(url); }
  for(let t=0;t<3;t++){
    try{
      const res = await fetch(url,{headers:{
        'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36',
        'Accept-Language':'ru,en;q=0.9'}});
      if(res.status===429||res.status>=500){console.warn('  ~ HTTP',res.status,'пауза 5с');await sleep(5000);continue;}
      if(!res.ok) throw new Error('HTTP '+res.status);
      return await res.text();
    }catch(e){ if(t===2){console.warn('  ! fail',url,e.message);return null;} await sleep(2000); }
  }
  return null;
}

function parseCode($, urlCode){
  const code = ($('h1').first().text()||'').replace(/\s+/g,' ').trim() || urlCode;
  let name='';
  $('h1').first().nextUntil('h5,h4,h3').each((_,el)=>{
    const t=$(el).text().replace(/\s+/g,' ').trim();
    if(!name && t.length>15 && !/^\d+[\.\)]/.test(t) && !/состав\s*работ/i.test(t)) name=t;
  });
  let unit='', unitIdx=-1, rowName='';
  $('table').each((_,tb)=>{
    $(tb).find('tr').each((_,tr)=>{
      const cells=$(tr).find('td,th').map((__,c)=>$(c).text().replace(/\s+/g,' ').trim()).get();
      if(unitIdx<0) cells.forEach((c,i)=>{ if(/единиц|изм|ед\.?\s*изм/i.test(c)) unitIdx=i; });
      const c0=cells[0]||'';
      if((code&&c0.includes(code))||/минск|с\s*ндс/i.test(c0)){
        unit=cells[unitIdx>=0?unitIdx:2]||'';
        if(!rowName) rowName=cells[1]||'';
      }
    });
  });
  if(!name) name=rowName;
  return { code, name, unit:(unit||'').trim() };
}

function links($){
  const code=[], nav=[];
  $('a[href]').each((_,el)=>{
    let h=$(el).attr('href')||'';
    if(h.startsWith(BASE)) h=h.slice(BASE.length);
    h=h.split('#')[0].split('?')[0];
    if(h.startsWith('/code/')) code.push(h);
    else if(h.startsWith(ROOT)) nav.push(h);
  });
  return { code, nav };
}

// ---- состояние: какие сборники уже собраны (resume на уровне сборников) ----
let st = { doneCollections: [] };
if (fs.existsSync(STATE)){ try{ st = JSON.parse(fs.readFileSync(STATE,'utf8')); }catch{} }
const doneColl = new Set(st.doneCollections||[]);
const results = {};                       // code -> {code,name,unit}
// подхватываем ранее собранные расценки из файла, если он есть (чтобы не терять при --reset state)
if (fs.existsSync(OUT)){ try{ JSON.parse(fs.readFileSync(OUT,'utf8')).forEach(r=>{ if(r.code) results[r.code]=r; }); }catch{} }
const saveFile = () => { fs.mkdirSync('public',{recursive:true});
  fs.writeFileSync(OUT, JSON.stringify(Object.values(results).sort((a,b)=>a.code.localeCompare(b.code,'ru')))); };
const saveState = () => fs.writeFileSync(STATE, JSON.stringify({ doneCollections:[...doneColl] }));

// обход ОДНОГО сборника: nav-поддерево в пределах collPath; code-страницы качаем inline сразу
async function traverseCollection(collPath, fetchCode){
  const visitedNav = new Set([collPath]);
  const visitedCode = new Set();
  const queue = [collPath];
  let found = 0;
  while(queue.length){
    const url = queue.shift();
    const html = await getHTML(url);
    if(!html) continue;
    const $ = cheerio.load(html);
    const L = links($);
    if(fetchCode){
      for(const c of L.code){
        if(visitedCode.has(c)) continue;
        visitedCode.add(c);
        const ch = await getHTML(c);
        if(!ch) continue;
        const urlCode = dec(c.split('/').pop()||'');
        const r = parseCode(cheerio.load(ch), urlCode);
        if(r.code && r.name){
          results[r.code]=r; found++;
          if(DBG && found<=10) console.log('   + '+r.code+' | ед.: '+(r.unit||'—')+' | '+r.name.slice(0,55));
        }
        await sleep(DELAY0);
      }
    } else {
      found += L.code.length;             // survey: только считаем
    }
    // nav-подссылки строго внутри этого сборника
    for(const n of L.nav){
      if(!n.startsWith(collPath+'/') && n!==collPath) continue;
      if(visitedNav.has(n)) continue;
      visitedNav.add(n); queue.push(n);
    }
    await sleep(DELAY0);
  }
  return found;
}

(async () => {
  // 1) список сборников с корня
  const rootHtml = await getHTML(ROOT);
  if(!rootHtml){ console.error('главная не открылась'); process.exit(1); }
  const root$ = cheerio.load(rootHtml);
  let colls = links(root$).nav.filter(p=>/^\/enir\/sbor\/[^/]+$/.test(p));
  // имена сборников для карты
  const collTitle = {};
  // фильтр по --only (если задан и не --all)
  if(WL && !ALL) colls = colls.filter(p=>WL.includes(normCode(dec(p.split('/')[3]||''))));
  console.log(GO?`РЕЖИМ СБОР: сборников ${colls.length}${WL?' (фильтр '+WL.join(',')+')':''}`
                :`РЕЖИМ КАРТЫ: сборников ${colls.length}${WL?' (фильтр '+WL.join(',')+')':''}`);
  console.log('задержка ~'+DELAY0+'мс. Ctrl+C безопасен — resume по сборникам.\n');

  let grand=0;
  for(let i=0;i<colls.length;i++){
    const cp = colls[i];
    const seg = normCode(dec(cp.split('/')[3]||''));
    const already = doneColl.has(seg);
    if(GO && already){ console.log(`[${i+1}/${colls.length}] ${seg} — уже собран, пропуск`); continue; }
    process.stdout.write(`[${i+1}/${colls.length}] ${seg} ... `);
    const n = await traverseCollection(cp, GO);
    if(GO){
      grand+=n; doneColl.add(seg); saveState(); saveFile();
      console.log(`+${n} расценок (всего ${Object.keys(results).length})`);
    } else {
      const th = await getHTML(cp);
      const title = th ? cheerio.load(th)('h1').first().text().replace(/\s+/g,' ').trim() : '';
      collTitle[seg] = { title, positions: n };
      grand += n;
      console.log(`${String(n).padStart(5)} позиций  |  ${title}`);
    }
  }

  if(!GO){
    console.log('\n===== КАРТА СБОРНИКОВ:  код | позиций | название =====');
    Object.entries(collTitle)
      .sort((a,b)=>a[0].localeCompare(b[0],'ru'))
      .forEach(([c,v])=>console.log('  '+c.padEnd(6)+String(v.positions).padStart(6)+'   '+(v.title||'')));
    console.log('========================================================');
    console.log('Сборников: '+Object.keys(collTitle).length+'   Позиций всего: '+grand);
    console.log('\nСобирать выбранное:  node scripts/crawl_rates.js --go --only Е1,Е4,Е6,...');
    console.log('(коды берите из таблицы выше по РУССКИМ названиям; латиница/кириллица оба работают)');
  } else {    saveFile();
    const total = Object.keys(results).length;
    console.log(`\n✅ Готово: ${total} расценок -> ${OUT}`);
    console.log('ПРОВЕРКА (первые 6 — убедитесь, что шифр/наим/ед. на месте):');
    console.log(JSON.stringify(Object.values(results).sort((a,b)=>a.code.localeCompare(b.code,'ru')).slice(0,6), null, 2));
  }
})();