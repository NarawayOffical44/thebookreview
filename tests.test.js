// Runs Code.gs and the similarity block of Index.html against a fake Google Sheet.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

function load() {
  const sheets = {};
  const fakeSheet = () => { const rows = []; return { rows,
    appendRow: (r) => rows.push(r), getDataRange: () => ({ getValues: () => rows.map((r) => [...r]) }) }; };
  let n = 0;
  const ctx = vm.createContext({
    SpreadsheetApp: { getActiveSpreadsheet: () => ({
      getSheetByName: (k) => sheets[k], insertSheet: (k) => (sheets[k] = fakeSheet()) }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    Utilities: { getUuid: () => 'id' + ++n },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: (t) => ({ setMimeType: () => ({ body: JSON.parse(t) }) }) },
  });
  vm.runInContext(readFileSync(new URL('./apps-script/Code.gs', import.meta.url), 'utf8'), ctx);
  const html = readFileSync(new URL('./site/index.html', import.meta.url), 'utf8');
  vm.runInContext(html.split('// <similarity>')[1].split('// </similarity>')[0], ctx);
  return { run: (code) => vm.runInContext(code, ctx), sheets };
}

test('add issue, read back, Anonymous default', () => {
  const { run } = load();
  const d = run(`addIssue({chapter:'Chapter 1', page:'5', text:' Typo here '})`);
  assert.equal(d.issues.length, 1);
  assert.deepEqual([d.issues[0].page, d.issues[0].text, d.issues[0].reader], [5, 'Typo here', 'Anonymous']);
});

test('validation', () => {
  const { run } = load();
  assert.throws(() => run(`addIssue({chapter:'Nope', page:1, text:'x'})`), /chapter/);
  assert.throws(() => run(`addIssue({chapter:'Chapter 1', page:0, text:'x'})`), /page/);
  assert.throws(() => run(`addIssue({chapter:'Chapter 1', page:1, text:'  '})`), /describe/);
});

test('notes attach to issue; unknown issue rejected', () => {
  const { run } = load();
  run(`addIssue({chapter:'Chapter 1', page:2, text:'Typo'})`);
  const d = run(`addNote('id1', {text:'Should be their', reader:'Bo'})`);
  assert.equal(d.issues[0].notes[0].reader, 'Bo');
  assert.throws(() => run(`addNote('zzz', {text:'x'})`), /not found/);
});

test('formula injection is neutralised in sheet but shown as typed', () => {
  const { run, sheets } = load();
  const d = run(`addIssue({chapter:'Chapter 1', page:1, text:'=IMPORTXML("x")'})`);
  assert.equal(sheets.Issues.rows[1][3], `'=IMPORTXML("x")`);
  assert.equal(d.issues[0].text, '=IMPORTXML("x")');
});

test('findSimilar: same chapter, ±1 page, best match first', () => {
  const { run } = load();
  const r = run(`findSimilar([
    {chapter:'Chapter 1', page:10, text:'Date of the battle is wrong'},
    {chapter:'Chapter 1', page:11, text:'Missing comma'},
    {chapter:'Chapter 1', page:20, text:'battle date wrong'},
    {chapter:'Chapter 2', page:10, text:'battle date wrong'}], 'Chapter 1', 10, 'the battle date is wrong')`);
  assert.equal(r.length, 2);
  assert.equal(r[0].text, 'Date of the battle is wrong');
  assert.equal(run(`similarity('abc','')`), 0);
});

test('doPost / doGet JSON API used by the Render page', () => {
  const { run } = load();
  const post = (b) => run(`doPost(${JSON.stringify({ postData: { contents: JSON.stringify(b) } })})`).body;
  assert.equal(post({ action: 'addIssue', chapter: 'Chapter 1', page: 3, text: 'Typo' }).issues.length, 1);
  assert.equal(post({ action: 'addNote', issueId: 'id1', text: 'me too' }).issues[0].notes.length, 1);
  assert.match(post({ action: 'addIssue', chapter: 'X', page: 1, text: 'a' }).error, /chapter/);
  assert.match(post({ action: 'nope' }).error, /Unknown/);
  assert.equal(run('doGet()').body.issues.length, 1);
});

test('applyChange (JSONBin + preview mode)', () => {
  const ctx = vm.createContext({ crypto: { randomUUID: () => 'u1' } });
  const html = readFileSync(new URL('./site/index.html', import.meta.url), 'utf8');
  vm.runInContext(html.split('// <apply>')[1].split('// </apply>')[0], ctx);
  ctx.chs = ['Chapter 1'];
  const run = (c) => vm.runInContext(c, ctx);
  const list = run(`applyChange([], {action:'addIssue', chapter:'Chapter 1', page:'4', text:' Typo '}, chs)`);
  assert.equal(list[0].text, 'Typo'); assert.equal(list[0].page, 4); assert.equal(list[0].reader, 'Anonymous');
  ctx.list = list;
  run(`applyChange(list, {action:'addNote', issueId:'u1', text:'me too', reader:'Bo'}, chs)`);
  assert.equal(list[0].notes[0].reader, 'Bo');
  assert.throws(() => run(`applyChange([], {action:'addIssue', chapter:'X', page:1, text:'a'}, chs)`), /chapter/);
  assert.throws(() => run(`applyChange([], {action:'addIssue', chapter:'Chapter 1', page:1.5, text:'a'}, chs)`), /page/);
  assert.throws(() => run(`applyChange([], {action:'addNote', issueId:'nope'}, chs)`), /not found/);
});

test('chapterForPage picks the section a printed page falls in', () => {
  const { run } = load();
  run(`var S = [['Prologue', 1], ['1. Too Good to Send', 8], ['Perkins, 1929', 22], ['2. First Pass', 23]]`);
  assert.equal(run(`chapterForPage(S, 1)`), 'Prologue');
  assert.equal(run(`chapterForPage(S, 7)`), 'Prologue');
  assert.equal(run(`chapterForPage(S, 8)`), '1. Too Good to Send');
  assert.equal(run(`chapterForPage(S, 22)`), 'Perkins, 1929');
  assert.equal(run(`chapterForPage(S, 500)`), '2. First Pass');
  assert.equal(run(`chapterForPage(S, 0)`), null);
});
