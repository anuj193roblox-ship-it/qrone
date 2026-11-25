# Trust-fix protocol

A repeatable way to find and fix the eight problems that get small products fined, banned from app stores, or dropped by payment providers. Use it on any web app or SaaS, and re-run it before every launch and after any feature that touches data, billing, reviews or AI.

Not legal advice. Laws change and differ by state and country: have a lawyer check the final privacy policy, terms and billing flow. Wherever a law is named below, verify the current version before relying on it.

## The eight problems

| # | Problem | Why it's serious |
|---|---------|------------------|
| 1 | Chatbot with no self-harm response | A person in crisis gets a normal answer, or worse. Some US states now require a crisis protocol for companion-style chatbots (for example California SB 243, in force from 2026). |
| 2 | Storage buckets open to the public | Anyone with the URL, or a scanner, can list and download user files. |
| 3 | "Deleted" data still in storage | Breaks your own promise (deceptive under FTC Act §5) and privacy-law deletion rights (CCPA/CPRA, GDPR). |
| 4 | Privacy policy doesn't say what you collect | Same: the policy is a legal promise, and silence about a collection is a misstatement. |
| 5 | Privacy policy too thin | No retention periods, no list of who receives data, no way to exercise rights. |
| 6 | Free trial auto-charges with no reminder | ROSCA (federal) and state auto-renewal laws (for example California's) require clear terms, consent and, in many cases, a reminder before the charge. |
| 7 | Cancelling is hard | The same laws require cancellation that's as easy as signing up, online if you signed up online. (The FTC's 2024 "click-to-cancel" rule was struck down in 2025; the state laws and ROSCA still apply.) |
| 8 | Fake testimonials | The FTC's rule on fake reviews and testimonials (16 CFR Part 465, from October 2024) allows civil penalties per violation. |

## Order of work

Fix in this order: things hurting people right now come first, wording comes last.

1. **Stop active harm:** #1 (self-harm), #2 (public buckets).
2. **Stop broken promises about data:** #3 (deletion).
3. **Stop billing harm:** #6 (trial reminder), #7 (cancellation).
4. **Stop false claims:** #8 (testimonials).
5. **Make the policy match reality:** #4 and #5. This comes last because the earlier fixes change what the policy must say.

## Phase 0: build the data map (do this first, once)

Every later step checks against this table. Build it from the code and the provider dashboards, never from the current privacy policy.

| Data | Where it enters | Where every copy lives | Who else receives it | Kept for how long | Deleted how |
|------|-----------------|------------------------|----------------------|-------------------|-------------|

How to fill it:
- **Inputs:** search for every form field, upload, API body, cookie, header and analytics call (grep for `formData`, `input`, `upload`, `req.body`, `request.json`, `cookie`, `localStorage`, `gtag`, `posthog`, `segment`, `sentry`, `fetch(`).
- **Copies:** database tables, object storage, caches, search indexes, queues, logs, error trackers, analytics, backups and point-in-time restore, CDN caches, email provider logs.
- **Third parties:** every SDK in `package.json` or its equivalent, and every outbound `fetch`: payments, email, auth, AI model providers, analytics, error tracking, hosting.
- **Retention:** read each provider's own docs for its default retention, including backup windows.

## Phase 1-5: each problem

Each problem has three parts: how to find it, what "fixed" means, and the proof needed before calling it done.

### 1. Chatbot self-harm response

**Find it:**
- Locate every place user text reaches a model: chat endpoints, assistants, AI features in forms.
- Check what runs before the model and after it. Relying on the model's own judgement is not enough.

**Fixed means:**
- **A check on every user message,** before the model answers. Use a moderation or classifier call, plus keyword patterns as a backstop. It must catch indirect wording ("I don't want to be here anymore"), misspellings, other languages the product supports, and role-play framing.
- **On risk, the normal flow stops.** The reply is fixed and human-written:
  - It acknowledges the person and encourages reaching out.
  - It gives crisis contacts. In the US: call or text **988** (Suicide & Crisis Lifeline), or **911** for immediate danger. Elsewhere: a directory such as findahelpline.com.
  - It never gives methods, never argues, and never claims to be human.
- **The bot always says it's an AI,** at the start and when asked.
- **Anything aimed at minors** needs stricter handling and an age check. Check the state laws that apply.
- **Logging:** record only that the protocol fired (time, conversation id), not the message text, unless a stated safety reason requires it.
- **Publish the protocol** in plain words on the site. Some laws require this.

**Proof:**
- An automated test suite of at least 30 risky messages (direct, indirect, misspelled, role-play, non-English) shows a 100% protocol response.
- 30 harmless messages that mention sadness or medicine do not trigger it, or trigger only the gentle version.
- The test runs in CI.

### 2. Public storage buckets

**Find it:** list every bucket and check its access.
- **AWS S3:**
  - `aws s3api list-buckets`
  - Then per bucket: `aws s3api get-public-access-block --bucket B`, `aws s3api get-bucket-policy-status --bucket B` and `aws s3api get-bucket-acl --bucket B`.
- **Google Cloud Storage:** `gcloud storage buckets describe gs://B` (look at `public_access_prevention`), and `gcloud storage buckets get-iam-policy gs://B` (look for `allUsers` or `allAuthenticatedUsers`).
- **Cloudflare R2:** a bucket is public if it has the r2.dev URL turned on or a custom domain attached. Check in the dashboard under R2, then the bucket, then Settings.
- **Supabase:** `select id, public from storage.buckets;`
- **Firebase:** look for `allow read: if true` in the storage rules.
- **Also:** try an anonymous GET on a real object URL and on the bucket's list URL.

**Fixed means:**
- Buckets holding user files are private, with public-access blocking switched on at account level where the provider offers it.
- Users get files through short-lived signed URLs (minutes, not days) issued after an ownership check.
- Truly public assets (logos, marketing images) live in a separate bucket.

**Proof:**
- An anonymous request to a user object returns 403 or 404.
- An expired signed URL fails.
- One user's signed URL can't be used to reach another user's file.
- Save the command output in the report.

### 3. Deletion that actually deletes

**Find it:**
- For each "delete" in the product (file, record, account), follow every copy listed in the data map.
- Look for soft deletes (`deleted_at`, `is_deleted`) that are never purged.
- Look for orphaned objects, where the database row is gone but the file is still in the bucket.
- Look for things that outlive a delete: backups, point-in-time restore, search indexes, CDN caches, and third-party copies (email logs, AI provider logs, analytics).

**Fixed means:**
- **Delete removes every copy we control,** or a scheduled job purges it within a stated time.
- **CDN caches are cleared** for public URLs.
- **Backups age out** on a stated schedule, and a restore never brings deleted users back. Keep a deletion log and re-apply it after any restore.
- **Third parties get a deletion request** where they offer an API.
- **The policy states every exception and its time limit,** for example "backups for up to 30 days" or "the payment provider keeps invoices for tax law".

**Proof:** an automated test that runs these steps.
1. Create a user and upload a file.
2. Delete the user.
3. Query every table, bucket, cache and index for that user's id, email and file key, and find nothing (except what the policy names as an exception).

### 4-5. A privacy policy that matches reality

**Find it:** compare the data map with the policy, line by line, in both directions.
- Anything collected but not in the policy is a gap.
- Anything promised but not done is a false statement.

**Fixed means:** the policy, in plain English, covers:
- what is collected (each field or category);
- why;
- the legal basis, if GDPR applies;
- every recipient, by name or category;
- how long each type is kept;
- cookies and tracking (or that there is none);
- user rights (access, correct, delete, opt out of sale or sharing) and the exact steps for each;
- how to contact you, with a real address;
- children (the minimum age);
- an "effective date" line and how changes are announced.

It must contain no claim the code doesn't back up ("we never…", "encrypted end to end", "deleted immediately") unless you've checked it.

**Proof:**
- A table mapping every policy sentence to the code or the provider setting that makes it true.
- A table mapping every data-map row to the policy sentence that covers it. No row is left empty in either table.

### 6. Free trials and reminders

**Find it:**
- Locate trial creation and the first charge (for example the Stripe `trial_period_days` / `trial_end` setting, or the Paddle or Dodo equivalent).
- Read the signup screen exactly as a new user sees it.

**Fixed means:**
- **Next to the button that starts the trial:** the price after the trial, the date of the first charge, how often it renews, and how to cancel. Not hidden in the terms.
- **Explicit consent:** an unticked box or an unambiguous button label.
- **A reminder email** some days before the first charge, with price, date and a one-click link to cancel or manage. Choose the timing from the state laws that apply (some depend on trial length), and use 7 days if unsure.
- **A receipt** after each charge.

**Proof:**
- A test that fast-forwards a trial (test clock or sandbox) and confirms the reminder is sent before the charge.
- A screenshot of the signup screen showing all the terms.

### 7. Easy cancellation

**Find it:** count the clicks and screens from the account page to "cancelled". Note any forced chat, phone call, email, or a series of "are you sure" screens.

**Fixed means:**
- Cancel online, from the account settings, in no more steps than signing up took.
- At most one retention offer, which can be skipped in one click.
- An on-screen confirmation, plus a confirmation email showing the end date of access.

**Proof:** a test that cancels with the fewest clicks and confirms that billing stops and the email is sent.

### 8. Testimonials and social proof

**Find it:** search the site and ads for quotes, star ratings, review counts, user counts, "as seen in" logos, and case studies (grep for `testimonial`, `review`, `rating`, `stars`, `trusted by`, `customers`, `users`).

**Fixed means:** every item traces to a real, saved source record:
- who said it and when;
- written consent to use it;
- whether they got anything in return. Any reward must be disclosed next to the quote.

Also:
- No AI-written reviews and no invented names.
- No hiding negative reviews.
- Counts come from live data or show the date they were taken.
- Anything that can't be traced is removed today, not "soon".

**Proof:** a list of each item with its source record, or a note that it was removed.

## Report format

```
## <problem>  —  status: fixed | partly fixed | not applicable | blocked
Evidence: commands run, files and lines, test names, screenshots
Change: what changed (files, settings)
Left: anything not done, and who must do it
```

---

## The prompt (copy into an AI coding agent)

> You are auditing and fixing this codebase for eight trust and compliance problems: (1) an AI chatbot with no self-harm response, (2) public storage buckets, (3) deleted data that is still stored, (4) a privacy policy that doesn't say what is collected, (5) a privacy policy that is too thin, (6) free trials that auto-charge with no reminder, (7) hard cancellation, (8) fake testimonials. Follow `docs/TRUST-FIX-PROTOCOL.md` exactly.
>
> Rules:
> - **Evidence first.** Build the Phase 0 data map from the code, config and provider settings, never from the current privacy policy. Every finding names a file and line, a command and its output, or a provider setting. If you can't check something (for example a dashboard you can't reach), mark it "not verified" and say who must check it. Never assume it's fine.
> - **Work in the protocol's order:** self-harm and public buckets first, privacy-policy wording last.
> - For each problem, say whether it applies. "Not applicable" needs evidence too (for example "no AI model is called anywhere: grep for openai, anthropic, generateText found nothing").
> - **Fix with the smallest change** that meets the protocol's "Fixed means", and add the test named under "Proof". A fix without its test is not done.
> - **Never invent facts.** No fake retention periods, no made-up company addresses, no testimonials, no legal claims. Where the policy needs a fact you don't have, leave a clearly marked TODO for the owner.
> - **Ask before anything you can't undo, or that touches real users or money:** deleting stored user data, changing live bucket permissions, changing live billing or trial settings, or emailing users. Make the change in code and config, and list the live steps for the owner to approve.
> - The crisis message is fixed, human-written text. The model never generates it. In the US it gives 988 (call or text) and 911.
> - Laws named in the protocol may have changed. Flag anything legal for a lawyer, and don't present your work as legal advice.
> - Finish with the protocol's report, one section per problem, then a short list of what the owner must do by hand.
