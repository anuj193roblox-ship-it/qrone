# Feature designs: next additions

Five features that fit QrOne's promise ("QR codes that never die"), designed against the system as it is today:
- a site Worker with D1 and an `/api/*` router;
- a redirect Worker that reads one D1 row per scan;
- one-time payments and no scan tracking.

Cloudflare limits used below were checked against Cloudflare's docs on 2026-11-26:
- Workers Free: 50 outside requests per run, 5 cron triggers per account, 100,000 D1 row writes a day.
- Workers Paid ($5 a month): 10,000 outside requests per run.

Recommended build order: **1 → 2 → 3 → 4**, then **5**, which last needs a privacy decision.

| # | Feature | Why it matters | Size |
|---|---------|----------------|------|
| 1 ✅ built | Link watchdog + backup link | A code can't die even when the page it points to dies | ~1 day |
| 2 | Scheduled destination changes | Menus, events and sales change without logging in at midnight | ~1 day |
| 3 | Bulk create + sticker sheet | Restaurants and shops need 20–75 codes at once (Plus/Pro) | ~1 day |
| 4 | Rescue a vendor code | Turns the /check page into sign-ups | ~½ day |
| 5 | Opt-in scan counts | The most-asked feature, but it changes our privacy promise | ~1 day |

---

## 1. Link watchdog + backup link

**What the owner sees:**
- Each code shows "Destination OK · checked 3 h ago" or "Destination failing since 14:20".
- An optional **Backup link** field. If the main destination fails 3 checks in a row, scans go to the backup until the main page works again.
- An email alert when it happens (once Resend is live).

**Database (migration `0006_watchdog.sql`):**
```sql
ALTER TABLE codes ADD COLUMN backup_destination TEXT;
ALTER TABLE codes ADD COLUMN check_status TEXT;          -- NULL never checked | 'ok' | 'unknown' | 'failing'
ALTER TABLE codes ADD COLUMN check_fails INTEGER NOT NULL DEFAULT 0;
ALTER TABLE codes ADD COLUMN checked_at INTEGER;
ALTER TABLE codes ADD COLUMN failing_since INTEGER;
CREATE INDEX codes_check_due ON codes(check_fails DESC, checked_at);
```

**Checker (a `scheduled()` handler on the site Worker, cron `*/15 * * * *`):**
1. Pick a batch:
   ```sql
   SELECT id, destination FROM codes WHERE disabled = 0
   ORDER BY check_fails DESC, checked_at ASC NULLS FIRST LIMIT ?batch
   ```
   Failing codes come first, so a failure is confirmed within about 45 minutes. The rest are checked oldest first.
2. **Batch size:** each check follows at most 3 redirects by hand, so it uses at most 4 outside requests.
   - On Free (50 a run), that's 10 codes per run: 960 checks a day, enough for about 900 codes checked daily.
   - On Paid, 400 codes per run.
3. **Each check:**
   - `fetch(url, { redirect: "manual", signal: AbortSignal.timeout(8000), headers: { "user-agent": "QrOneLinkCheck/1.0 (+https://<domain>/link-check)" } })`.
   - Every hop is re-checked with the existing `isSafeDestination()`. An unsafe hop counts as a failure.
4. **How results are classed:**
   - `200–399` at the end of the chain = **ok**.
   - `404`, `410`, `5xx`, DNS errors and timeouts = **fail**.
   - `401`, `403` and `429` = **unknown**. Many sites block bots, so these never trigger the backup.
5. **State:**
   - A fail adds 1 to `check_fails`. Reaching 3 sets `check_status='failing'` and `failing_since=now`, and sends one alert.
   - One success resets everything to `ok`.
   - All updates for the batch are written in one `DB.batch()`.

**Redirect change:**
- Add `check_status, backup_destination` to the existing `SELECT` in `worker/src/index.js`. That's still one query per scan, so scans don't get slower.
- In `decide()`, after the expiry and end checks: if `check_status === 'failing'` and `isSafeDestination(backup)`, redirect to the backup.

**Edge cases:**
- Pages behind a login show "unknown", never "failing".
- When the owner edits the destination, reset `check_fails` and `check_status` so the old failure doesn't carry over.
- The backup link goes through the same `normalizeDestination()` checks as the main one.

**Privacy:** we visit the *destination*, never the person scanning. Add one line to the privacy page: "We check once a day that each code's destination still loads."

**Tests:**
- How status codes are classed.
- The 3-strikes state machine.
- `decide()` picking the backup only when failing.
- The batch query order, against local D1.

---

## 2. Scheduled destination changes

**What the owner sees:** a "Schedule a change" list on each code. For example: "Dec 24, 18:00 → /holiday-menu", then "Jan 2, 09:00 → /menu". Times are shown in the owner's own time zone and stored in UTC.

**Database (`0007_schedule.sql`):**
```sql
CREATE TABLE code_schedule (
  id INTEGER PRIMARY KEY,
  code_id INTEGER NOT NULL REFERENCES codes(id) ON DELETE CASCADE,
  starts_at INTEGER NOT NULL,
  destination TEXT NOT NULL
);
CREATE INDEX code_schedule_due ON code_schedule(starts_at);
```

**How it runs:**
- A second cron, `* * * * *` (every minute; we'd use 2 of the 5 free cron triggers), applies changes that are due:
  ```sql
  SELECT id, code_id, destination FROM code_schedule WHERE starts_at <= ?now ORDER BY starts_at LIMIT 100
  ```
- For each row, `UPDATE codes SET destination = ?, check_fails = 0, check_status = NULL WHERE id = ?`, then `DELETE` the schedule row, all in one batch.
- If two changes for one code are due together, the later one wins, because rows are applied in time order.
- The redirect Worker doesn't change at all. It keeps reading `codes.destination`, so scans stay one query. The cost is that a change can land up to about 1 minute late.

**API:**
- `GET /api/codes/:id/schedule`
- `POST /api/codes/:id/schedule { starts_at, destination }`
- `DELETE /api/codes/:id/schedule/:sid`

All three use the existing `withAccount` ownership check.

**Rules:**
- At most 20 upcoming changes per code.
- `starts_at` must be at least 5 minutes ahead and before the code's `ends_at`.
- The destination goes through `normalizeDestination()`.
- Deleting the code removes its schedule (`ON DELETE CASCADE`). The account-delete batch also gets `DELETE FROM code_schedule WHERE code_id IN (SELECT id FROM codes WHERE account_id = ?1)`, placed **before** the codes delete. The restore checklist gets the same line.

**Tests:**
- Applying due rows in order.
- The "latest due wins" rule.
- Validation limits.
- Account deletion leaving no schedule rows behind.

---

## 3. Bulk create + sticker sheet

**What the owner sees (Plus/Pro):** a "Create many" box.
1. Paste one code per line as `Label, https://…`, or upload a `.csv` with those two columns.
2. A preview marks each row ✓ or shows its error.
3. **Create all**, then **Print all as stickers**, which reuses the existing `#print-sheet` print layout and `frame.js`.

No ZIP download, so no new dependency.

**API:** `POST /api/codes/bulk { rows: [{ label, destination }] }`.
- `readJson` caps bodies at 2,000 characters. Give this route its own cap: 75 rows × about 600 characters, so roughly 48 KB.
- Validate **every** row first with `normalizeDestination()` and `cleanLabel()`. If any row fails, create nothing and return the errors by row number.
- Insert all rows in one `DB.batch()`, each using the existing guarded insert:
  ```sql
  INSERT … SELECT … WHERE (SELECT COUNT(*) FROM codes WHERE account_id = ?1) < ?limit
  ```
  Each row sees the rows before it, because D1 runs a batch as one transaction. So the plan limit holds even with two tabs open.
- Return how many were created and, if the limit stopped it, which rows weren't.
- **Slugs:** use `newSlug()` per row. On a `UNIQUE` clash, retry just the rows that clashed, like single create's retry loop.

**Tests:**
- Parsing (commas inside quotes, a header row, blank lines).
- All-or-nothing validation.
- The plan limit with 76 rows on Pro.

---

## 4. Rescue a vendor code

**What the visitor sees:** on `/check`, when the checker recognises a vendor's short link (it already does, via `classify()`), a new button appears: **"Make a QrOne code for the same page"**. The text stays honest: "Your printed code still points at <vendor>. This makes a new code that goes to the same page. You'll need to print the new one."

**API:** `POST /api/rescue { url }`, signed-in users only.
- **Only for known vendor hosts:** the host must be on the verified vendor list in `src/vendors`. That stops the endpoint being used as an open proxy to fetch any URL.
- Follow at most 5 redirects with `redirect: "manual"`, re-checking each hop with `isSafeDestination()`, with an 8-second timeout.
- Return `{ destination }`. The dashboard then opens "New code" with it filled in. Nothing is created automatically.
- **Rate limit:** 10 an hour per account, counted in a small `rescue_log(account_id, at)` table, the same pattern as `login_tokens`.

**Tests:**
- Hosts not on the list are refused.
- A redirect chain to a private or unsafe address is refused.
- The rate limit.

---

## 5. Opt-in scan counts (privacy decision first)

The privacy page says **"We don't record scans."** This feature changes that, so:
- it's **off by default**, switched on per code by the owner;
- the privacy page is updated **before** it ships;
- we count totals only: scans per code per day, plus country.
  - Country comes from Cloudflare's `request.cf.country`.
  - No IP address, browser details, cookies or per-scan rows are ever stored.

**Storage, recommended: Workers Analytics Engine.** It writes nothing to D1.
- **Redirect Worker:** when `row.count_scans = 1`, call `env.SCANS.writeDataPoint({ indexes: [String(codeId)], blobs: [country] })`. It doesn't wait for a reply, so scans don't slow down.
- **Dashboard:** `GET /api/codes/:id/scans?days=30`. The site Worker queries Analytics Engine's SQL API, using a read-only API token stored as a secret, and returns daily totals.
- Before building, check Analytics Engine's current free-plan availability, limits and how long it keeps data.

**Not recommended: a D1 counter** (`INSERT … ON CONFLICT DO UPDATE SET n = n + 1` per scan). On Workers Free it spends the 100,000-a-day D1 write allowance shared with everything else. One popular code could then break sign-in and code creation for the rest of the day.

**Database:** `ALTER TABLE codes ADD COLUMN count_scans INTEGER NOT NULL DEFAULT 0;`

---

## Already planned: custom domains (roadmap phase G)

The biggest "never die" feature: codes on the customer's own domain, so their printed codes outlive QrOne itself, together with the export. It needs your own domain first. It would use Cloudflare for SaaS custom hostnames; check its current free allowance before pricing it.
