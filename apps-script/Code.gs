// ===== EDIT THESE =====
const BOOK_TITLE = 'My New Book';
const BOOK_LINK = ''; // paste your Google Drive book link here
const CHAPTERS = ['Chapter 1', 'Chapter 2', 'Chapter 3'];
// ======================

// The Render page talks to this script: GET = read all, POST = add issue/note.
function doGet() { return json_(getData()); }

function doPost(e) {
  try {
    const b = JSON.parse(e.postData.contents);
    if (b.action === 'addIssue') return json_(addIssue(b));
    if (b.action === 'addNote') return json_(addNote(b.issueId, b));
    throw new Error('Unknown action');
  } catch (err) {
    return json_({ error: err.message });
  }
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

function sheet_(name, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(name);
  if (!sh) { sh = ss.insertSheet(name); sh.appendRow(headers); }
  return sh;
}
const issuesSheet_ = () => sheet_('Issues', ['ID', 'Chapter', 'Page', 'Issue', 'Reader', 'Created']);
const notesSheet_ = () => sheet_('Notes', ['Issue ID', 'Note', 'Reader', 'Created']);

// Stop reader text like "=HYPERLINK(...)" from running as a sheet formula.
function safe_(s, max) {
  s = String(s == null ? '' : s).trim().slice(0, max);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}
const unsafe_ = (s) => String(s).replace(/^'(?=[=+\-@])/, '');

function getData() {
  const issues = issuesSheet_().getDataRange().getValues().slice(1).map((r) => ({
    id: String(r[0]), chapter: String(r[1]), page: Number(r[2]),
    text: unsafe_(r[3]), reader: unsafe_(r[4]), createdAt: String(r[5]), notes: [],
  }));
  const byId = {};
  issues.forEach((i) => { byId[i.id] = i; });
  notesSheet_().getDataRange().getValues().slice(1).forEach((r) => {
    const i = byId[String(r[0])];
    if (i) i.notes.push({ text: unsafe_(r[1]), reader: unsafe_(r[2]), createdAt: String(r[3]) });
  });
  return { title: BOOK_TITLE, link: BOOK_LINK, chapters: CHAPTERS, issues: issues };
}

function withLock_(fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try { return fn(); } finally { lock.releaseLock(); }
}

function addIssue(input) {
  const chapter = String(input.chapter || '');
  const page = Number(input.page);
  const text = safe_(input.text, 2000);
  if (CHAPTERS.indexOf(chapter) === -1) throw new Error('Please choose a chapter');
  if (!Number.isInteger(page) || page < 1) throw new Error('Please enter a valid page number');
  if (!text) throw new Error('Please describe the issue');
  return withLock_(() => {
    issuesSheet_().appendRow([Utilities.getUuid(), chapter, page, text,
      safe_(input.reader, 80) || 'Anonymous', new Date().toISOString()]);
    return getData();
  });
}

function addNote(issueId, input) {
  return withLock_(() => {
    const ids = issuesSheet_().getDataRange().getValues().slice(1).map((r) => String(r[0]));
    if (ids.indexOf(String(issueId)) === -1) throw new Error('Issue not found');
    notesSheet_().appendRow([String(issueId), safe_(input.text, 2000),
      safe_(input.reader, 80) || 'Anonymous', new Date().toISOString()]);
    return getData();
  });
}
