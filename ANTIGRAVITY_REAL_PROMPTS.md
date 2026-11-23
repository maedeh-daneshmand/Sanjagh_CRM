# Sanjagh: turn the mock UI into a real app (stage-by-stage prompts)

How to use:
1. Create a git branch first: `git checkout -b real-data`.
2. One stage per Antigravity session. Start each session with the COMMON RULES block below (paste it every time), then the stage prompt.
3. After each stage: `npm run lint && npx tsc --noEmit && npm test && npm run build`, run the manual test listed under the stage, then `git commit`.
4. Do not start the next stage until the current one passes its manual test.

Facts from the audit (do not re-discover): Next.js 14.2 (App Router), Prisma 5.22, `prisma/schema.prisma` has 12 models (keep it; ask before changing), `prisma/seed.ts` exists, `src/server/auth.ts` has unused helpers (in-memory Map OTP, jose JWT cookie helpers, requireRole), every page uses hardcoded arrays + useState, role comes from localStorage `sanjagh_acting_role`, there is no middleware, no API/Server Actions, no queue, no providers, no AI client. Splash, theme system and lead-score logic are real and must keep working.

---

## COMMON RULES (paste at the start of every stage)

```
Project: Sanjagh (سنجاق), Persian RTL CRM. Stack: Next.js 14.2 App Router + TypeScript,
Tailwind/shadcn, Prisma 5.22 + PostgreSQL, Redis (ioredis), BullMQ, Zod, jose, Vitest.
We are replacing mock data with a real backend, stage by stage.

Rules:
- Do NOT change the visual design, layout, theme system, splash screen, RTL or Latin-digit
  formatting. Only change where the data comes from and the behavior behind buttons.
- Data reads: Server Components (or server functions in src/server/*) query Prisma and pass
  plain serializable props to the existing client components. Convert Decimal to number/string
  and Dates to ISO strings at the boundary.
- Writes: Server Actions ("use server") in src/server/actions/*. Every action must:
  (1) validate input with Zod (schemas in src/lib/schemas/*), (2) call requireUser()/requireRole()
  from the REAL server session, (3) enforce ownership (SALES only touches rows where
  ownerId/assigneeId is themselves), (4) write an Activity row for important changes,
  (5) revalidatePath the affected pages, (6) return { ok, data } or { ok:false, error } with a
  friendly Persian message. Never trust role/userId/ownerId sent by the client.
- Only add API routes where unavoidable (/api/health). No mock arrays may remain in the pages
  touched by this stage.
- Keep Prisma types; no `any`. Keep lint at 0 errors/0 warnings, tsc clean, build green.
- Add Vitest tests for permission checks and the core logic of the stage.
- Do not change prisma/schema.prisma without asking first.
- At the end report: files changed, how to test manually, anything left undone.
```

---

## Stage A: Foundation (DB, real login, session, middleware, real roles)

```
Stage A. Goal: real OTP login, real session, route protection and server-side roles.

1. DB: make sure migrations exist and run (`prisma migrate`), add the Prisma client singleton
   (src/server/db.ts). Update prisma/seed.ts so it creates real users from env:
   SEED_ADMIN_PHONE (ADMIN), SEED_MANAGER_PHONE (MANAGER), SEED_SALES_PHONE (SALES), plus 2 more
   SALES users with fake phones. Keep the demo data seeding (contacts, deals, tasks, activities,
   4 preset automations) but make sure all of it is linked to these users.
2. Redis: src/server/redis.ts (ioredis, maxRetriesPerRequest: null, REDIS_URL).
3. Providers (src/server/messaging/*): interface { send({to, body, subject?, template?, token?}) }
   with `fake` (logs to server console, e.g. "[OTP fake] 09xx -> 123456"), `kavenegar` (use
   Verify Lookup with KAVENEGAR_OTP_TEMPLATE for OTP, normal Send for plain SMS, use
   KAVENEGAR_SENDER only if set) and `smtp` (nodemailer). Pick by MESSAGING_PROVIDER.
   Respect MESSAGING_ALLOWLIST (if set, only those numbers get real sends; others behave like fake).
   TEMPORARY: OTP is sent by calling the provider directly; Stage F moves it to the queue.
4. OTP (replace the in-memory Map in src/server/auth.ts): requestOtp(phone) server action:
   normalize to 09xxxxxxxxx (accept Persian/Arabic digits on input, store Latin), only active
   Users may log in (do not reveal whether the number exists: same generic response), code =
   crypto.randomInt 6 digits, store HASH only in Redis key otp:{phone} with TTL 120s, limit 3
   requests per 10 min per phone and per IP, 5 wrong attempts then lock for 10 min.
   verifyOtp(phone, code): constant-time compare, delete key on success, create a Session row,
   set httpOnly SameSite=Lax cookie (Secure in production) with a jose-signed JWT {sessionId,
   userId, role}, 7 days. logout action deletes the Session row and cookie.
   SESSION_SECRET is mandatory in production (throw if missing).
5. Server helpers: getCurrentUser() (React cache; verifies cookie AND checks the Session row +
   user.isActive), requireUser(), requireRole(...roles).
6. src/middleware.ts: verify the JWT with jose (Edge-compatible, no Prisma). Redirect
   unauthenticated users to /login (except /login, /api/health, static assets), redirect
   authenticated users away from /login, and block /team, /campaigns, /automations, /users
   for SALES, /users for MANAGER (redirect to / ). Middleware is only the first gate: pages
   and actions still call requireRole().
7. Replace the client-side role: remove acting_role/localStorage from theme-context, sidebar,
   header, settings, dashboard and the customizer drawer (delete the role-switch buttons from
   the drawer). Make (app)/layout.tsx a Server Component that loads the current user and gives
   it to a client UserProvider; sidebar/header/settings read role+name from it (display and menu
   filtering only; real enforcement is on the server). Keep theme/color/density/layout in theme-context.
8. Login page: keep the UI; wire it to requestOtp/verifyOtp (remove setTimeout fake code
   123456). Show friendly Persian errors (wrong code, expired, too many attempts). The quick-login
   demo buttons may only render and work when DEMO_MODE=true AND MESSAGING_PROVIDER=fake; in
   that mode, the 3 seeded demo phones accept the fixed code from env DEMO_CODE. It must be
   impossible to use DEMO_CODE when DEMO_MODE is not "true".
9. Env: update .env.example (DATABASE_URL, REDIS_URL, SESSION_SECRET, MESSAGING_PROVIDER,
   MESSAGING_ALLOWLIST, KAVENEGAR_API_KEY, KAVENEGAR_OTP_TEMPLATE, KAVENEGAR_SENDER, SMTP_*,
   DEMO_MODE, DEMO_CODE, SEED_*_PHONE). Never put real secrets in it.
10. Tests: OTP hashing/expiry/rate-limit/attempt-lock (mock Redis or use ioredis-mock),
    requireRole, middleware redirect rules.
```

**Manual test (A):** log in with each seeded phone using `MESSAGING_PROVIDER=fake` (code is printed in the server console); wrong code; 5 wrong attempts lock; code expires after 2 min; without login open `/leads` → redirected to `/login`; log in as SALES and open `/team`, `/campaigns`, `/users` by typing the URL → redirected; no role switch in the customizer; logout works; refresh keeps you logged in.

---

## Stage B: Contacts and leads

```
Stage B. Goal: leads and customers from the database.

- Queries in src/server/contacts.ts: listContacts({ kind, search, source, status, priority,
  ownerId, tags, page, pageSize }) with server-side filtering/pagination, scoped by role
  (SALES: ownerId = me). getContact(id) with deals, tasks, activities (newest first), messages.
- Pages /contacts (CUSTOMER) and /leads (LEAD) read from the DB; /contacts/[id] reads the real
  record (404 if missing or not allowed for SALES).
- Server Actions: createContact, updateContact, deleteContact (confirm in UI), assignOwner
  (MANAGER/ADMIN only), changeLeadStatus, changePriority, addNote (creates Activity NOTE),
  logActivity (CALL/MEETING), convertLeadToCustomer (kind=CUSTOMER, convertedAt, CONVERSION
  activity). Each important change writes an Activity.
- Lead score: use src/lib/lead-score.ts and store the result in Contact.score whenever
  relevant fields/activities change.
- Remove all mock arrays and local-state-only data in these pages. Keep the existing UI.
- Tests: scope (SALES cannot read/update others' contacts), convert lead, assign permission.
```

**Manual test (B):** create a lead, refresh (F5), restart the server, check it in `npx prisma studio`; assign to a rep as manager; log in as that rep and see it; as another rep you must NOT see it (also try `/contacts/<id>` by URL); add a note and a call, refresh, they remain in the timeline; convert to customer, it leaves `/leads` and appears in `/contacts`.

---

## Stage C: Pipeline (kanban)

```
Stage C. Goal: deals from the database, kanban persistence.

- src/server/deals.ts: listDealsByStage (scoped by role, manager can filter by owner),
  column counts and amount totals computed on the server.
- Server Actions: createDeal (contactId, title, amount, stage, ownerId defaults to me),
  moveDeal(dealId, toStage, newPosition) with Float positions (midpoint insertion),
  updateDeal, deleteDeal. moveDeal writes a STAGE_CHANGE Activity, sets closedAt when WON/LOST,
  clears it when reopened.
- Pipeline page: keep @dnd-kit (mouse, touch, keyboard) and the arrow buttons; optimistic
  update with rollback and an error toast if the action fails.
- Remove the mock array. Tests: moveDeal permission, closedAt handling, position ordering.
```

**Manual test (C):** drag a card to another column, refresh, it stays; restart the server, it stays; move to "WON", the column total and the dashboard (after Stage E) change; as SALES you only see your deals; trying to move someone else's deal fails.

---

## Stage D: Tasks and calendar

```
Stage D. Goal: tasks and the Jalali calendar from the database.

- src/server/tasks.ts: listTasks (tabs: overdue, today, upcoming, done) scoped by role
  (SALES: assigneeId = me; MANAGER/ADMIN: all, filter by assignee). getTasksByRange(from,to)
  for the calendar.
- Server Actions: createTask (SALES: only for themselves, origin SELF; MANAGER/ADMIN: any
  assignee, origin MANAGER), updateTask, toggleDone (completedAt), deleteTask. Optional link to
  contact/deal. A task assigned by a manager writes an Activity TASK on the contact when linked.
- Tasks page and Calendar page read from DB; clicking a day lists that day's tasks and lets you
  create one. Overdue count badge in the sidebar comes from the DB.
- Remove mocks. Tests: SALES cannot assign to others, overdue calculation with timezone
  Asia/Tehran vs UTC storage.
```

**Manual test (D):** as manager create a task for a rep; as that rep see it in Today/Upcoming and on the right day in the calendar; mark it done; as SALES try to assign a task to someone else (must fail); overdue tab shows past-due tasks.

---

## Stage E: Dashboard, team and users

```
Stage E. Goal: real KPIs, charts, team pages and user admin.

- src/server/dashboard.ts: getManagerDashboard() (total leads, new leads/customers this
  week/month, sales this week/month with % change vs previous period, win rate, open pipeline
  value, monthly sales for the last 8 Jalali months from WON deals by closedAt, stage
  distribution, lead sources, recent deals, team performance table: per rep assigned leads,
  deals won, revenue, overdue tasks, activities in the last 30 days). getSalesDashboard(userId)
  scoped to the rep. Pages and charts receive data as props (remove hardcoded arrays in
  revenue-chart.tsx and source-pie-chart.tsx).
- /team (MANAGER/ADMIN): rep list with real stats, rep detail (their contacts, tasks, recent
  activity), bulk reassign action (moves selected contacts to another rep, writes ASSIGNMENT
  activities).
- /users (ADMIN only): list users, create user (name, phone, role), change role, activate/
  deactivate (deactivating deletes their Sessions). Add it to the sidebar for ADMIN.
- Settings page: show the real profile of the current user (name/phone/role) and remove the
  fake quota meters or compute them from real data (e.g. messages sent from the Message table).
- Tests for the aggregations (use a small fixed dataset) and role gating.
```

**Manual test (E):** after creating a lead and winning a deal, the dashboard numbers and charts change; SALES dashboard shows only their numbers and no team table; `/team` and `/users` open only for the right roles; bulk reassign works; deactivated user cannot log in.

---

## Stage F: Queue, messaging, campaigns (BullMQ)

```
Stage F. Goal: every message goes through BullMQ.

- Next 14 needs `experimental: { instrumentationHook: true }` in next.config.mjs. Create
  src/instrumentation.ts: when process.env.NEXT_RUNTIME === 'nodejs' and ENABLE_WORKER === 'true',
  start the BullMQ workers exactly once (global singleton guard against HMR), handle SIGTERM.
  Use dynamic import inside register() so Edge builds are not affected.
- Queues "messages" and "automations" (src/server/queue/*), ioredis with
  maxRetriesPerRequest: null, attempts 3 with exponential backoff, removeOnComplete/Fail limits,
  jobId = messageId for idempotency.
- Rule: no code outside the worker calls a provider. Single message, campaign, automation step
  and OTP all create a Message row (QUEUED) and enqueue. OTP jobs use top priority; the login
  action enqueues and returns; failures mark the Message FAILED and are visible in the queue page.
  Worker: sends via the provider, sets SENT (providerMessageId, sentAt) or FAILED (error), respects
  opt-out flags and MESSAGING_ALLOWLIST, writes a MESSAGE Activity on the contact.
- Single message from the contact page (SMS/email) via a server action.
- Campaigns page (MANAGER/ADMIN): name, channel, body with {{fullName}} placeholders, audience
  filter builder (kind, source, status, owner, tags) with a live recipient count server action,
  "send now" creates a parent job that creates Message rows in batches and one child job each;
  Campaign counters (total/sent/failed) update as jobs finish; status DONE when all processed;
  progress page with auto refresh and a list of failed messages with a retry button.
- GET /api/health -> { db, redis, worker } (no secrets). Simple ADMIN-only page /admin/queues
  with job counts and "retry failed".
- Tests: enqueue-instead-of-send, retries end in FAILED, campaign counters, opt-out respected.
- README: Redis must use maxmemory-policy noeviction; fallback to run the worker as a separate
  process (src/worker.ts + `npm run worker`).
```

**Manual test (F):** with `ENABLE_WORKER=false` send a message: it stays QUEUED (check `prisma studio`); turn the worker on: it becomes SENT; run a campaign for ~5 contacts and watch the counters; simulate a failing provider: 3 attempts then FAILED with the error text; contacts with opt-out are skipped; `/api/health` is green.

---

## Stage G: Automations

```
Stage G. Goal: a real automation engine.

- emitEvent(type, payload) called from the existing actions: LEAD_CREATED, LEAD_STATUS_CHANGED,
  DEAL_STAGE_CHANGED, CUSTOMER_CREATED. The engine finds active automations whose trigger and
  conditions match (conditions JSON: [{field, op, value}]), creates an AutomationRun and
  enqueues step jobs in the "automations" queue.
- Step types (Automation.steps JSON): WAIT (delayed job), SEND_SMS, SEND_EMAIL (both create a
  Message and use the messages queue, with {{fullName}} placeholders), CREATE_TASK (origin
  AUTOMATION), ASSIGN_OWNER, CHANGE_LEAD_STATUS. Support stopOnReply (flag only if reply tracking
  exists; otherwise store it and note it as not implemented). Store a per-step log in
  AutomationRun.log.
- Seed/ensure 4 presets (isPreset=true): welcome new lead (SMS now + task tomorrow), lead
  contacted but idle -> reminder task, deal WON -> thank-you SMS, deal LOST -> feedback email.
- Pages: /automations lists from DB with an on/off switch (server action), run history and
  per-run log. The builder page saves/loads the steps JSON from the DB (validate with Zod). Add a
  "test run" that runs the automation for a chosen contact with the fake provider and shows
  the log (no real messages).
- Remove the mock arrays and the setTimeout simulation. Tests: matching, WAIT scheduling, step
  execution, permission (MANAGER/ADMIN only).
```

**Manual test (G):** turn on the "welcome new lead" preset; create a lead; within seconds there is a run in history, a Message (QUEUED→SENT) and a task for tomorrow; turn the automation off and create another lead: nothing happens; test-run shows the log.

---

## Stage H: AI

```
Stage H. Goal: real LLM features with human approval.

- src/server/ai/client.ts: OpenAI-compatible chat-completions via fetch (no heavy SDK) using
  AI_BASE_URL, AI_API_KEY, AI_MODEL; request strict JSON; validate every response with Zod; one
  retry on invalid JSON; timeouts; friendly Persian errors. Never send data that isn't needed
  (no other customers' data). If AI_API_KEY is missing, features show a clear "AI is not
  configured" state.
- Customer summary (contact page): action summarizeContact(contactId) uses the contact + last ~30
  activities, returns { summary, risk: low|medium|high, nextStep }, cached in AiSummary, with a
  "refresh" button. Respect role scope.
- Smart note: textarea on the contact page; action analyzeNote(contactId, text) saves the note as
  a NOTE activity and returns suggestions (CREATE_TASK with title/dueAt, CHANGE_DEAL_STAGE,
  CHANGE_LEAD_STATUS) stored as AiSuggestion PENDING. UI shows cards with Approve/Reject.
  approveSuggestion applies it through the SAME server actions used elsewhere (permission checks
  included, Activity written, status ACCEPTED, decidedAt); rejectSuggestion marks REJECTED.
  Nothing changes while PENDING.
- Follow-up message writer: action draftMessage(contactId, channel, tone: formal|friendly|short|
  persuasive) returns an editable draft; the user can copy it or send it through the messaging
  queue. Replace the mock /ai-assistant page logic with this (keep the UI).
- "Write with AI" buttons in the campaign body and automation message steps.
- Tests: Zod parsing of good/bad model output (mock fetch), approve applies only allowed changes,
  SALES cannot approve suggestions for contacts they don't own.
```

**Manual test (H):** with a real key: summary appears and survives refresh; write a note like "customer liked the demo, send the final quote tomorrow" → suggestions appear as pending cards; approve → the task really exists in Tasks; reject → nothing changes; message draft respects the chosen tone; with the key removed you get the friendly "not configured" state, not a crash.

---

## Stage I: Cleanup, security and deploy prep

```
Stage I. Goal: remove leftovers and make the app deployable.

- Search the whole codebase: no leftover mock arrays, no `acting_role`/actingRole, no setTimeout
  fake logic, no hardcoded demo numbers in pages. Report anything left.
- Security pass: cookies httpOnly/Secure/SameSite, SESSION_SECRET required in production, DEMO_CODE
  unusable unless DEMO_MODE=true, all actions call requireUser/requireRole, no secrets in the repo
  or logs (never log API keys; OTP is logged only for the fake provider), input validation
  everywhere, rate limits on OTP.
- Add liara.json (platform per Liara's Next.js/Node support, port 3000), `next.config.mjs`
  with output standalone only if it works with Liara; confirm `npm run build` and `npm start`.
- README: overview, features, stack, architecture (queues, session, roles), ERD image link,
  env var table, local setup (docker compose for Postgres+Redis), migrate/seed commands,
  Liara deployment steps, demo accounts and how DEMO_MODE works.
- Run lint, tsc, tests, build; list the results.
```

---

## Suggested order and what can wait

- Must be done in order: A → B → C → D → E.
- F (queue, messaging, campaigns) and then G (automations) after that; H (AI) can go before or after G.
- Real Kavenegar sending and the Liara deployment come after Stage A works locally with the `fake` provider.
- If time is short, ship with: A, B, C, D, E, F (single message + campaign), G with the presets and the simple builder, H with the three AI features.
