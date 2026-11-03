# Go live: Google Sheet (stores issues) + Render (hosts the page) — both free

## 1. Google Sheet backend
1. sheets.google.com → new blank sheet ("Book Issues").
2. Extensions → Apps Script → replace `Code.gs` with this folder's `Code.gs`.
   Edit the top: BOOK_TITLE, BOOK_LINK (Drive link, shared "Anyone with the link"), CHAPTERS.
3. Deploy → New deployment → Web app. Execute as: **Me**. Who has access: **Anyone**. Deploy, allow permissions.
4. Copy the Web app URL (ends in `/exec`).

## 2. Connect the page
Open `site/index.html`, set `API_URL` to that URL and leave `JSONBIN_ID` empty.

## 3. Host on Render
1. Push this folder to a GitHub repo.
2. render.com → New → **Static Site** → pick the repo.
   Publish directory: `site` (build command: leave empty). Create.
3. Send readers the `.onrender.com` link.

Issues land in the sheet's "Issues" and "Notes" tabs. For editors: "Download issues" on the page (JSON) or File → Download → .xlsx in the sheet.
Changed Code.gs later? Deploy → Manage deployments → edit → New version (URL stays the same).
