/* Home Inventory — Google Sheets sync (Apps Script Web App)
   Your inventory is stored as REAL rows you can sort, filter, and edit:
     · "Items"  tab — one row per item (with a readable place path)
     · "Places" tab — the room/container tree
     · "Meta"   tab — a last-updated timestamp used for conflict resolution

   One-time setup:
   1. Create a Google Sheet (sheets.new)
   2. Extensions → Apps Script → delete the default code, paste this whole file
   3. Change TOKEN below to your own secret
   4. Deploy → New deployment → type: Web app → execute as: Me → access: Anyone
   5. Copy the /exec URL, then in Home Inventory press "Sync to Sheet" and paste URL + token
*/
const TOKEN = 'change-me-to-something-secret';

const ITEM_COLS = ['id','name','category','locId','place','qty','value','condition','min','added','warranty','lentTo','tags','notes'];
const LOC_COLS  = ['id','parentId','name','path'];

function doGet(e){
  if(!e || !e.parameter || e.parameter.token !== TOKEN) return json({error:'bad token'});
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return json({
    updatedAt: Number(metaSheet(ss).getRange('B1').getValue()) || 0,
    items: readRows(ss,'Items',ITEM_COLS).map(function(r){ return {
      id:Number(r.id), name:String(r.name||''), category:String(r.category||''),
      locId:String(r.locId||''), qty:Number(r.qty)||0, value:Number(r.value)||0,
      condition:String(r.condition||'Good'), min:Number(r.min)||0,
      added:isoDate(r.added), warranty:isoDate(r.warranty),
      lentTo:String(r.lentTo||''), notes:String(r.notes||''),
      tags:String(r.tags||'').split(',').map(function(t){return t.trim();}).filter(String)
    };}).filter(function(i){return i.id && i.name;}),
    locs: readRows(ss,'Places',LOC_COLS).map(function(r){ return {
      id:String(r.id), parentId:r.parentId?String(r.parentId):null, name:String(r.name||'')
    };}).filter(function(l){return l.id && l.name;})
  });
}

function doPost(e){
  var body; try{ body = JSON.parse(e.postData.contents); }catch(err){ return json({error:'bad body'}); }
  if(body.token !== TOKEN) return json({error:'bad token'});
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const pathOf = mkPathOf(body.locs||[]);
  writeRows(ss,'Items',ITEM_COLS,(body.items||[]).map(function(i){ return [
    i.id, i.name, i.category, i.locId, pathOf(i.locId), i.qty, i.value, i.condition, i.min,
    i.added||'', i.warranty||'', i.lentTo||'', (i.tags||[]).join(', '), i.notes||''
  ];}));
  writeRows(ss,'Places',LOC_COLS,(body.locs||[]).map(function(l){ return [l.id, l.parentId||'', l.name, pathOf(l.id)];}));
  metaSheet(ss).getRange('A1:B1').setValues([['updatedAt', body.updatedAt||Date.now()]]);
  return json({ok:true});
}

/* Simple trigger: if you hand-edit rows in the Sheet, stamp it as newest so
   the app adopts your edits on next load instead of overwriting them. */
function onEdit(e){
  var name = e.range.getSheet().getName();
  if(name !== 'Items' && name !== 'Places') return;
  metaSheet(e.source).getRange('A1:B1').setValues([['updatedAt', Date.now()]]);
}

function mkPathOf(locs){
  var byId = {}; locs.forEach(function(l){ byId[l.id]=l; });
  return function(id){ var out=[], cur=byId[id], g=0;
    while(cur && g++<20){ out.unshift(cur.name); cur = cur.parentId ? byId[cur.parentId] : null; }
    return out.join(' > '); };
}
function sheetOf(ss,name){ return ss.getSheetByName(name) || ss.insertSheet(name); }
function metaSheet(ss){ var sh=sheetOf(ss,'Meta'); if(!sh.getRange('A1').getValue()) sh.getRange('A1:B1').setValues([['updatedAt',0]]); return sh; }
function readRows(ss,name,cols){
  var sh=ss.getSheetByName(name); if(!sh || sh.getLastRow()<2) return [];
  var head=sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(String);
  return sh.getRange(2,1,sh.getLastRow()-1,sh.getLastColumn()).getValues().map(function(row){
    var o={}; cols.forEach(function(c){ var i=head.indexOf(c); o[c]= i<0 ? '' : row[i]; }); return o; });
}
function writeRows(ss,name,cols,rows){
  var sh=sheetOf(ss,name); sh.clearContents();
  sh.getRange(1,1,1,cols.length).setValues([cols]).setFontWeight('bold');
  if(rows.length) sh.getRange(2,1,rows.length,cols.length).setValues(rows);
  sh.setFrozenRows(1);
}
function isoDate(v){
  if(v instanceof Date) return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  return String(v||'');
}
function json(o){ return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
