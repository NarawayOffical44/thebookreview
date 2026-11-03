# Book Review page — go live (free)

The whole site is one file: `site/index.html`. Edit the SETTINGS block at the top of its <script>.

## 1. Book details
Set `BOOK.title`, `BOOK.link` (Drive link, shared "Anyone with the link – Viewer") and `BOOK.chapters`.

## 2. Storage — JSONBin (hosted JSON)
1. Sign up free at jsonbin.io.
2. Create a bin with this content:  {"issues": []}  → copy its **Bin ID** into `JSONBIN_ID`.
3. API Keys page → create an **Access Key** with *Bins Read* + *Bins Update* → paste into `JSONBIN_KEY`.
Note: the free plan caps a bin at 100 KB (~400 issues). When it fills up, download the JSON, then start a new bin.

(Prefer a Google Sheet instead? See `apps-script/SETUP.md` and set `API_URL`, leaving JSONBIN_ID empty.)

## 3. Host on Render
1. Put this folder on GitHub.
2. render.com → New → **Static Site** → choose the repo → Publish directory: `site` → Create.
3. Share the `.onrender.com` link with readers.

## For you
"Download issues ↓" (top right of the page) saves all issues + reader notes as JSON for your editors.
