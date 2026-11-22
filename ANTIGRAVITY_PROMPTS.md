# Antigravity brief + prompts

How to use: put the **Project brief** in the project root as `AGENTS.md` (or paste it at the start of every new agent session). Then paste ONE stage prompt at a time. After each stage: run the app, test by hand, commit, then go to the next stage. Put `schema.prisma` at `prisma/schema.prisma`.

---

## Project brief (AGENTS.md)

You are building a Persian (RTL) CRM web app for sales teams. It is a bootcamp final project graded on: (1) zero bugs and all features working, (2) code quality and architecture, (3) UI/UX quality, (4) deployment on Liara.

**Stack (do not change):** Next.js (App Router, Server Actions) + TypeScript, Tailwind + shadcn/ui, PostgreSQL + Prisma, Redis (OTP + BullMQ queues), Zod, dnd-kit (kanban), Recharts (charts), React Flow (automation builder, later), Vitest. Single codebase, single deployment on Liara. The data model is in `prisma/schema.prisma`: follow it; ask before changing it.

**Roles:** ADMIN (everything, manages users), MANAGER (everything except user admin; sees global stats and team performance; creates campaigns/automations; assigns tasks to reps), SALES (sees only contacts/deals/tasks assigned to them; no global stats, no team management, no campaigns/automations).

**Rules**
- All UI text in Persian, RTL layout, Vazirmatn font, Jalali (Shamsi) dates in the UI; store UTC in the DB.
- Every Server Action/API: validate input with Zod, call `requireUser()`, and enforce role/ownership on the SERVER (never rely on hidden menu items).
- Business logic in `src/server/*` (contacts, deals, tasks, dashboard, messaging, automations, ai); UI in `src/app/(app)/*`; shared types/labels/schemas in `src/lib/*`.
- Login is OTP only: send a code by SMS, store only a HASH in Redis with ~2 min TTL, rate-limit sends and attempts. In development, print the code to the console and never call the real SMS API unless the number is in `MESSAGING_ALLOWLIST`.
- All sending (OTP, single message, campaign, automation) goes through BullMQ queues. Messages are created as QUEUED, then the worker sends and updates status. SMS and email providers sit behind a small interface so they can be swapped (Kavenegar for SMS, Nodemailer/SMTP for email, plus a `fake` provider for dev/demo that just records messages).
- AI never changes data directly. It returns JSON validated with Zod, saved as `AiSuggestion` (PENDING); data changes only after the user clicks Approve.
- Every screen needs loading (skeleton), empty, and error states. Mobile responsive.
- Config only via env vars; keep `.env.example` updated. Never commit secrets.
- Write small Vitest tests for permission checks and critical logic. Keep `npm run lint` and `npm run typecheck` clean.
- Stage by stage: do only what the current prompt asks. At the end, list what you did and how to test it.

**Env vars:** DATABASE_URL, REDIS_URL, SESSION_SECRET, KAVENEGAR_API_KEY, KAVENEGAR_OTP_TEMPLATE, KAVENEGAR_SENDER, SMTP_HOST/PORT/USER/PASS/FROM, AI_BASE_URL, AI_API_KEY, AI_MODEL, MESSAGING_ALLOWLIST, MESSAGING_PROVIDER (kavenegar|fake).

---

## Stage 2: Database

> Set up Prisma with the provided `prisma/schema.prisma` (adapt only the generator/datasource block if the installed Prisma version requires it). Create the first migration. Add a Prisma client singleton in `src/server/db.ts`. Write `prisma/seed.ts` that creates: 1 ADMIN (phone from env `SEED_ADMIN_PHONE`), 1 MANAGER, 3 SALES users; ~25 contacts (mix of LEAD/CUSTOMER, all sources, random Persian names, fake phones not starting with real prefixes), ~15 deals spread across all 6 stages with amounts, ~20 tasks (some overdue), activities for several contacts, and 4 preset automations (see Stage 7 list) with isPreset=true. Add `docker-compose.yml` for Postgres and Redis for local dev and `.env.example`. Add npm scripts `db:migrate`, `db:seed`. Do not build UI yet.

## Stage 3: Auth, roles, layout

> Build OTP login. Page `/login`: phone step → code step. Server side: generate a 6-digit code, store its hash in Redis with 2-minute TTL, limit to 3 sends per 10 minutes per phone and 5 wrong attempts, send via the messaging queue (dev: console.log the code). Only phones that exist as active Users can log in. On success create a Session row and an httpOnly signed cookie. Implement `requireUser()`, `requireRole(...roles)`, middleware protecting `(app)` routes, logout. Build the app shell with shadcn/ui: RTL sidebar + header (search box placeholder, user menu). Sidebar items depend on role: Dashboard, Contacts, Leads, Pipeline, Tasks, Calendar (all); Team, Campaigns, Automations (MANAGER/ADMIN); Users (ADMIN). Use a clean, modern look, light/dark theme, Vazirmatn font. Add tests for requireRole.

## Stage 4a: Contacts and leads

> Build `/contacts` (kind=CUSTOMER) and `/leads` (kind=LEAD) with server-side search, filters (source, status, priority, owner, tags) and pagination in a table. Create/edit via a dialog or side sheet (Zod validated). Delete with confirmation. Assign owner via a select (MANAGER/ADMIN only). Detail page `/contacts/[id]`: info card, tabs for Timeline (Activity), Deals, Tasks, Messages. Add a note form that creates an Activity. Convert lead→customer button (flips kind, sets convertedAt, writes a CONVERSION activity). Lead score: simple function in `src/lib/lead-score.ts` (source + priority + recent activity) with tests. SALES only sees their own. Write an Activity row for every important change (status, assignment, conversion).

## Stage 4b: Pipeline (kanban)

> Build `/pipeline`: kanban with 6 columns (DealStage), dnd-kit drag and drop (mouse, touch, keyboard), per-column deal count and total amount, cards show title, contact name, amount, owner avatar. Dropping updates `stage` and `position` through a Server Action with optimistic update and rollback on error, writes a STAGE_CHANGE activity, sets closedAt when WON/LOST. Add "new deal" dialog. Filter by owner (manager). SALES sees only own deals.

## Stage 4c: Tasks and calendar

> Build `/tasks` (tabs: overdue, today, upcoming, done) and `/calendar` (Jalali monthly calendar showing tasks by due date; click a day to create a task). SALES can create tasks for themselves (origin SELF). MANAGER can create tasks for any rep (origin MANAGER) and sees all. Mark done, edit, delete. Link a task optionally to a contact/deal. Show an overdue badge in the sidebar.

## Stage 5: Dashboards

> Build `/` dashboard. For SALES: my open deals by stage, my tasks today/overdue, my new leads. For MANAGER/ADMIN: KPI cards (total leads, new customers this week/month, sales this week/month with % change vs previous period, win rate, open pipeline value), monthly sales bar/line chart (Recharts), deal stage distribution, lead sources chart, and a team performance table (per rep: assigned leads, deals won, revenue, overdue tasks, activities count in the last 30 days). Add `/team` for MANAGER/ADMIN: list of reps, click a rep to see their contacts, tasks and recent activity, and reassign contacts in bulk. Aggregations live in `src/server/dashboard.ts` with tests. Role-gate on the server.

## Stage 6: Queue, messaging, campaigns

> Set up BullMQ with two queues (`messages`, `automations`) and start the worker inside the Next server via `src/instrumentation.ts` (only when env enables it). Implement provider interface `{ send(to, body, subject?) }` with `kavenegar` (SMS, use their verify/lookup for OTP and normal send for others), `smtp` (Nodemailer) and `fake` providers; respect MESSAGING_ALLOWLIST and opt-out flags. Single message: send SMS/email from a contact page. Campaigns (`/campaigns`, MANAGER/ADMIN): create with name, channel, body with placeholders `{{fullName}}`, audience filter builder (kind, source, status, owner, tags) with live recipient count; send now → creates a parent job that creates a Message per recipient (QUEUED) and one child job each; retries with backoff; progress page showing total/sent/failed with auto refresh; failed messages list. Each message also writes a MESSAGE activity on the contact.

## Stage 7a: Automation engine

> Build the automation engine. Domain events (`LEAD_CREATED`, `LEAD_STATUS_CHANGED`, `DEAL_STAGE_CHANGED`, `CUSTOMER_CREATED`) are emitted from the existing server actions via `emitEvent()`. The engine finds active automations matching the trigger and conditions, creates an AutomationRun and enqueues step jobs. Steps (JSON in `Automation.steps`): WAIT (delayed job), SEND_SMS, SEND_EMAIL, CREATE_TASK, ASSIGN_OWNER, CHANGE_LEAD_STATUS. Support `stopOnReply`. Add a cron-like repeatable job for `LEAD_INACTIVE` and `TASK_OVERDUE`. Seed 4 presets: welcome new lead (SMS now + task tomorrow), lead untouched 7 days → reminder task for owner, deal WON → thank-you SMS, deal LOST → feedback email. Page `/automations`: list with on/off toggle, run history and per-run log. Tests for matching and step execution.

## Stage 7b: Automation builder

> Build a visual builder at `/automations/new` and `/automations/[id]` using React Flow: a Trigger node (with config), optional Condition nodes (field/op/value), and Action nodes (the step types above) connected in sequence. Saving converts the graph to the JSON stored in `Automation`; loading converts back. Validate with Zod (a trigger is required, steps connected, required fields filled). Include a "test run on a selected contact" button that runs against the `fake` provider and shows the log.

## Stage 8: AI features

> Add `src/server/ai/` with an OpenAI-compatible client (env AI_BASE_URL/AI_API_KEY/AI_MODEL) that requests strict JSON output; validate every response with Zod and handle failure gracefully (friendly error + retry). Features: (1) Customer summary on the contact page: button "Summary and next step" sends the contact + last ~30 activities, returns { summary, risk, nextStep }, cached in AiSummary. (2) Smart note: a textarea on the contact page; AI returns suggestions (CREATE_TASK with title/dueAt, CHANGE_DEAL_STAGE, CHANGE_LEAD_STATUS) stored as PENDING AiSuggestion; show them as cards with Approve/Reject; Approve applies through the SAME server actions used elsewhere (permission checks included) and writes an activity; Reject marks rejected. The raw note is also saved as a NOTE activity. (3) Follow-up message writer: dialog with tone select (formal, friendly, short, persuasive) and channel; returns a draft the user can edit, copy, or send through the messaging queue. Also add "write with AI" to the campaign and automation message fields. Never send contact data that isn't needed. Add tests for the Zod parsing and the apply-suggestion permission checks.

## Stage 9: Polish and deploy

> Audit: run lint, typecheck, tests; fix everything. Check every page for loading/empty/error states, mobile layout, RTL glitches, and role access (try each role). Add a `liara.json` and make the app run in standalone mode. Write README (overview, features, stack, architecture, ERD image, env vars, local setup, deploy steps, demo accounts). Make sure no secrets are committed and `.env.example` is complete.

---

## Tips for working with the agent
- One stage per session. Start each with: "Read AGENTS.md and prisma/schema.prisma first."
- After every stage: `npm run lint && npm run typecheck && npm test`, click through the pages, then `git commit`.
- If the agent wants to change the schema or stack, make it explain why before accepting.
- If something breaks, paste the exact error message plus the file it points to.
