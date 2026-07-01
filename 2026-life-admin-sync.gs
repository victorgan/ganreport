/**
 * The Year — sync backend (Google Apps Script)
 * ------------------------------------------------------------------
 * The Sheet is the source of truth; the app's localStorage is a cache.
 *
 * SETUP (one time):
 *   1. Create a new Google Sheet (this is your private store).
 *   2. Extensions → Apps Script. Delete the stub, paste this file.
 *   3. Change TOKEN below to a long random string (your shared secret).
 *   4. Deploy → New deployment → type "Web app".
 *        - Execute as:      Me
 *        - Who has access:  Anyone            (this is what makes it login-free)
 *   5. Copy the Web app URL (ends in /exec).
 *   6. In the app: Sync → paste the URL and the same TOKEN → Save & sync.
 *
 * Model: the whole app state is stored as one JSON blob (the truth, lossless).
 * A human-readable "Log" tab is regenerated on every write as a read-only view —
 * it is never read back, so it can never corrupt the truth.
 */

var TOKEN = 'CHANGE-ME-to-a-long-random-string';   // <-- set this, and paste the same value into the app
var STATE_SHEET = '_state';                         // hidden tab holding the canonical JSON blob
var LOG_SHEET   = 'Log';                            // human view, regenerated each write

function doGet(e) {
  if (!e || !e.parameter || e.parameter.token !== TOKEN) return json({ error: 'unauthorized' });
  return json(readState());
}

function doPost(e) {
  var body;
  try { body = JSON.parse(e.postData.contents); }     // token is in the BODY (text/plain → no CORS preflight)
  catch (err) { return json({ error: 'bad json' }); }
  if (!body || body.token !== TOKEN) return json({ error: 'unauthorized' });
  var lock = LockService.getScriptLock();
  try { lock.waitLock(10000); } catch (err) { return json({ error: 'busy' }); }
  try {
    writeState(body.state || {});
    if (body.catalog) writeLog(body.state || {}, body.catalog);   // catalog present on full pushes, absent on beacon flushes
  } finally { lock.releaseLock(); }
  return json({ ok: true });
}

function json(o) {
  return ContentService.createTextOutput(JSON.stringify(o))
    .setMimeType(ContentService.MimeType.JSON);
}

function ss() { return SpreadsheetApp.getActiveSpreadsheet(); }

function stateSheet() {
  var sh = ss().getSheetByName(STATE_SHEET);
  if (!sh) { sh = ss().insertSheet(STATE_SHEET); sh.hideSheet(); }
  return sh;
}

function readState() {
  var v = stateSheet().getRange('A1').getValue();
  if (!v) return {};
  try { return JSON.parse(v); } catch (err) { return {}; }
}

function writeState(state) {
  stateSheet().getRange('A1').setValue(JSON.stringify(state));   // canonical truth
}

// Regenerate the human-readable Log tab from state. Projection only — never read back.
function writeLog(state, catalog) {
  var sh = ss().getSheetByName(LOG_SHEET);
  if (!sh) sh = ss().insertSheet(LOG_SHEET);
  sh.clear();

  var meta = {};                                   // id -> {label, area} for legible rows
  (catalog || []).forEach(function (c) { meta[c.id] = c; });
  var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  var rows = [['Task', 'Area', 'When', 'Every (days)', 'Tier', 'Updated']];
  var dials = state.dials || {};
  Object.keys(dials).forEach(function (id) {
    var d = dials[id] || {};
    var m = meta[id] || {};
    var when;
    if (d.chain || d.step != null) {
      when = 'chain · step ' + (d.step || 0);
    } else if (d.mode === 'date' || d.dueM != null) {
      var due = (d.dueM != null ? months[d.dueM] : '?') + ' ' + (d.dueD || 1);
      when = d.doneYear ? ('due ' + due + ' · done ' + d.doneYear) : ('due ' + due);
    } else {
      when = d.last || '—';
    }
    var updated = d.updatedAt ? new Date(d.updatedAt) : (state.updatedAt ? new Date(state.updatedAt) : '');
    rows.push([m.label || id, m.area || '', when, d.interval || '', d.tier || '', updated]);
  });

  rows.sort(function (a, b) { return String(a[1]).localeCompare(String(b[1])) || String(a[0]).localeCompare(String(b[0])); });
  // (header got sorted in; put it back on top)
  for (var i = 0; i < rows.length; i++) { if (rows[i][0] === 'Task') { rows.splice(i, 1); break; } }
  rows.unshift(['Task', 'Area', 'When', 'Every (days)', 'Tier', 'Updated']);

  sh.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
  sh.setFrozenRows(1);
  sh.getRange(1, 1, 1, rows[0].length).setFontWeight('bold');
}
