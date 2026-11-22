# Sanjagh CRM — Project Brief

You are building a Persian (RTL) CRM web app for sales teams named **سنجاق (Sanjagh)**. It is a high-grade professional CRM inspired by **Didar CRM** and modern dashboard designs (Apex / shadcn/ui).

**Stack:**
- Next.js 14 (App Router, Server Actions) + TypeScript
- Tailwind CSS + shadcn/ui styling with dynamic theme palettes (Emerald, Blue, Violet, Rose, Orange, Slate)
- PostgreSQL + Prisma ORM
- Redis (OTP login & rate limiting + BullMQ queues)
- Zod (Input validation on all Server Actions & APIs)
- @dnd-kit (6-stage Kanban sales pipeline with drag & drop)
- Recharts (Interactive charts for sales, sources, conversion, targets)
- React Flow / @xyflow/react (Automation workflow builder)
- Jalali calendar support (jalaali-js) for Persian date display with English digits
- Vitest for unit & integration tests

**Roles & Permissions:**
- `ADMIN`: Full access; user management; all settings, campaigns, automations, team stats.
- `MANAGER`: All features except user management; global dashboard & pipeline, team performance, assign leads/deals/tasks.
- `SALES`: Personal dashboard; sees only contacts/deals/tasks assigned to them.

**Key UI & UX Rules:**
- Persian typography with Vazirmatn font, full RTL support.
- Numbers displayed with clean English/Latin numerals (e.g. 1, 2, 3, $48,295, 2,847) as requested.
- Header toolbar: global search dialog (Ctrl+K), quick create (+ معامله جدید / + مخاطب جدید), theme mode toggle (light/dark/system), customization drawer toggle (palette icon), notification center, user avatar dropdown with role display.
- Layout switcher: Standard Sidebar, Mini Sidebar (collapsed icons), Top Nav, Floating, Hybrid.
- Color palettes: Emerald (default), Blue, Violet, Rose, Orange, Slate.
- Mobile responsive with collapsible drawer sidebar.
