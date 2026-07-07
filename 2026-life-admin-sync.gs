/* The Year — Google Sheets sync (Apps Script Web App)
   Your data is stored as REAL rows you can read, sort, and hand-edit:
     · "Tasks" tab — one row per task (state overrides; blank cell = app default)
     · "Meta"  tab — updatedAt timestamp (conflict resolution), version, UI state, removed ids

   One-time setup:
   1. Create a Google Sheet (sheets.new)
   2. Extensions → Apps Script → delete the default code, paste this whole file
   3. Change TOKEN below to your own secret
   4. Deploy → New deployment → type: Web app → execute as: Me → access: Anyone
   5. Copy the /exec URL, then in The Year press "Sync" and paste URL + token

   Hand-editing: fix a "lastDone" date, change "intervalDays", etc. directly in the
   Sheet — the onEdit trigger stamps it newest, so the app adopts your edits on next
   load. dueMonth is 1–12. chainSteps is a small JSON list like
   [{"label":"Book"},{"label":"File","m":3,"hard":true}] (m = 0-based month). */
const TOKEN = 'change-me-to-something-secret';

const COLS = ['id','name','area','custom','removed','mode','tier','lastDone','intervalDays','step','dueMonth','dueDay','doneYear','chainSteps','resets','requires','icon','tags'];

function doGet(e){
  if(!e || !e.parameter || e.parameter.token !== TOKEN) return json({error:'bad token'});
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const meta = readMeta(ss);
  const dials = {}, custom = [];
  readRows(ss,'Tasks',COLS).forEach(function(r){
    const id = String(r.id||''); if(!id) return;
    const chain = parseChain(r.chainSteps);
    const st = {};
    const edited = String(r.mode||'') !== '';           // the app always writes mode on edit
    if(edited){
      st.mode = String(r.mode);
      st.chain = chain || null;
      if(String(r.tier||'')) st.tier = String(r.tier);
      st.resets = list(r.resets);
      st.requires = list(r.requires);
    } else {
      if(chain) st.chain = chain;
      if(String(r.tier||'')) st.tier = String(r.tier);
      if(String(r.resets||'')) st.resets = list(r.resets);
      if(String(r.requires||'')) st.requires = list(r.requires);
    }
    if(isoDate(r.lastDone)) st.last = isoDate(r.lastDone);
    else if(r.step !== '' && r.step !== null) st.last = null;
    if(r.intervalDays !== '' && r.intervalDays !== null) st.interval = Number(r.intervalDays);
    if(r.step !== '' && r.step !== null) st.step = Number(r.step);
    if(r.dueMonth !== '' && r.dueMonth !== null) st.dueM = Number(r.dueMonth) - 1;
    if(r.dueDay !== '' && r.dueDay !== null) st.dueD = Number(r.dueDay);
    if(r.doneYear !== '' && r.doneYear !== null) st.doneYear = Number(r.doneYear);
    if(Object.keys(st).length) dials[id] = st;
    if(String(r.custom||'')==='yes'){
      const def = {id:id, area:String(r.area||'health'), label:String(r.name||''), icon:String(r.icon||'clock')};
      if(String(r.tier||'')) def.tier = String(r.tier);
      def.mode = chain ? 'interval' : (String(r.mode||'')||'interval');
      if(chain){ def.chain = chain; }
      if(st.interval != null) def.interval = st.interval;
      if(def.mode==='date'){ def.dueM = st.dueM != null ? st.dueM : 0; def.dueD = st.dueD != null ? st.dueD : 1; def.tags = list(r.tags); }
      if(st.resets && st.resets.length) def.resets = st.resets;
      if(st.requires && st.requires.length) def.requires = st.requires;
      custom.push(def);
    }
  });
  return json({updatedAt: meta.updatedAt, version: meta.version, ui: meta.ui, dials: dials, custom: custom, removed: meta.removed});
}

function doPost(e){
  var body; try{ body = JSON.parse(e.postData.contents); }catch(err){ return json({error:'bad body'}); }
  if(body.token !== TOKEN) return json({error:'bad token'});
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const state = body.state || {};
  const names = {}, areas = {};
  readRows(ss,'Tasks',COLS).forEach(function(r){ if(r.id){ names[r.id]=String(r.name||''); areas[r.id]=String(r.area||''); } });
  (body.catalog||[]).forEach(function(c){ names[c.id]=c.label; areas[c.id]=c.area; });
  const customById = {}; (state.custom||[]).forEach(function(c){ customById[c.id]=c; if(c.label)names[c.id]=c.label; if(c.area)areas[c.id]=c.area; });
  const removed = state.removed || [];
  const ids = {};
  Object.keys(state.dials||{}).forEach(function(id){ ids[id]=1; });
  (state.custom||[]).forEach(function(c){ ids[c.id]=1; });
  removed.forEach(function(id){ ids[id]=1; });
  (body.catalog||[]).forEach(function(c){ ids[c.id]=1; });

  const rows = Object.keys(ids).map(function(id){
    const st = (state.dials||{})[id] || {};
    const def = customById[id] || {};
    function pick(k){ var v = st[k]; if(v===undefined||v===null) v = def[k]; return (v===undefined||v===null) ? '' : v; }
    const chain = st.chain !== undefined ? st.chain : def.chain;
    return [
      id, names[id]||def.label||'', areas[id]||def.area||'',
      customById[id] ? 'yes' : '',
      removed.indexOf(id)>=0 ? 'yes' : '',
      st.mode || '',                                   // only set when edited in-app
      pick('tier'),
      pick('last'),
      pick('interval'),
      st.step === undefined || st.step === null ? '' : st.step,
      pick('dueM') === '' ? '' : Number(pick('dueM')) + 1,
      pick('dueD'),
      st.doneYear === undefined || st.doneYear === null ? '' : st.doneYear,
      (chain && chain.length) ? JSON.stringify(chain) : '',
      joinList(st.resets !== undefined ? st.resets : def.resets),
      joinList(st.requires !== undefined ? st.requires : def.requires),
      def.icon || '',
      joinList(def.tags)
    ];
  }).sort(function(a,b){ return (a[2]+'|'+a[1]) < (b[2]+'|'+b[1]) ? -1 : 1; });

  writeRows(ss,'Tasks',COLS,rows);
  writeMeta(ss, state, body);
  return json({ok:true});
}

/* Simple trigger: hand-edits in the Sheet stamp it as newest so the app
   adopts them on next load instead of overwriting them. */
function onEdit(e){
  if(e.range.getSheet().getName() !== 'Tasks') return;
  metaSheet(e.source).getRange('B1').setValue(Date.now());
}

/* ---------- helpers ---------- */
function list(v){ return String(v||'').split(',').map(function(s){return s.trim();}).filter(String); }
function joinList(a){ return (a&&a.length) ? a.join(', ') : ''; }
function parseChain(v){
  var s = String(v||'').trim(); if(!s) return null;
  try{ var j = JSON.parse(s); return (j && j.length) ? j : null; }catch(err){ return null; }
}
function sheetOf(ss,name){ return ss.getSheetByName(name) || ss.insertSheet(name); }
function metaSheet(ss){
  var sh = sheetOf(ss,'Meta');
  if(!sh.getRange('A1').getValue()) sh.getRange('A1:A4').setValues([['updatedAt'],['version'],['ui'],['removed']]);
  return sh;
}
function readMeta(ss){
  var v = metaSheet(ss).getRange('B1:B4').getValues();
  var ui = {}; try{ ui = JSON.parse(String(v[2][0]||'{}'))||{}; }catch(err){}
  return {updatedAt:Number(v[0][0])||0, version:Number(v[1][0])||6, ui:ui, removed:list(v[3][0])};
}
function writeMeta(ss, state, body){
  metaSheet(ss).getRange('B1:B4').setValues([
    [state.updatedAt || body.updatedAt || Date.now()],
    [state.version || 6],
    [JSON.stringify(state.ui || {})],
    [(state.removed||[]).join(', ')]
  ]);
}
function readRows(ss,name,cols){
  var sh = ss.getSheetByName(name); if(!sh || sh.getLastRow()<2) return [];
  var head = sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(String);
  return sh.getRange(2,1,sh.getLastRow()-1,sh.getLastColumn()).getValues().map(function(row){
    var o={}; cols.forEach(function(c){ var i=head.indexOf(c); o[c]= i<0 ? '' : row[i]; }); return o; });
}
function writeRows(ss,name,cols,rows){
  var sh = sheetOf(ss,name); sh.clearContents();
  sh.getRange(1,1,1,cols.length).setValues([cols]).setFontWeight('bold');
  if(rows.length) sh.getRange(2,1,rows.length,cols.length).setValues(rows);
  sh.setFrozenRows(1);
}
function isoDate(v){
  if(v instanceof Date) return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  var s = String(v||'').trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : '';
}
function json(o){ return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
