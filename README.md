# سنجاق CRM (Sanjagh CRM)

نرم‌افزار مدیریت ارتباط با مشتری (CRM) فارسی و راست‌به‌چپ (RTL) ویژه تیم‌های فروش، مجهز به قیف فروش کانبان، اتوماسیون، صف پیام BullMQ و دستیار هوش مصنوعی.

---

## امکانات کلیدی

- **احراز هویت امن OTP و نقش‌های کاربری**: ورود با کد یکبار مصرف پیامکی (SHA-256 در Redis، محدودیت ۳ درخواست در ۱۰ دقیقه و قفل شدن پس از ۵ تلاش ناموفق)، نشست‌های ذخیره‌شده در دیتابیس + کوکی `httpOnly` امضاشده با `jose`، و کنترل دسترسی سه‌سطحی (`ADMIN`، `MANAGER`، `SALES`) در Edge Middleware و Server Actions.
- **مخاطبان و سرنخ‌ها (`/leads`، `/contacts`، `/contacts/[id]`)**: محاسبه خودکار امتیاز حرارتی (`Lead Score`)، تخصیص تکی و گروهی به کارشناسان (`assignOwnerAction` / `assignManyAction`)، تایم‌لاین کامل رویدادها، تبدیل سرنخ به مشتری و ارسال پیامک/ایمیل تکی.
- **قیف فروش کانبان (`/pipeline`)**: ۶ مرحله فروش با Drag & Drop (`@dnd-kit` برای موس، تاچ و کیبورد)، موقعیت‌دهی اعشاری (`Float position`)، آپدیت خوش‌بینانه با Rollback، ثبت خودکار `closedAt` در مراحل برنده/بازنده و رویداد `STAGE_CHANGE`.
- **وظایف و تقویم (`/tasks`، `/calendar`)**: دسته‌بندی خودکار بر اساس منطقه زمانی `Asia/Tehran` (معوقه، امروز، آینده، انجام‌شده)، شمارنده معوقه زنده در منو، و تقویم ماهانه شمسی با اعداد انگلیسی.
- **داشبورد، تیم و کاربران (`/`، `/team`، `/users`، `/settings`)**: شاخص‌های واقعی فروش، نمودار ۸ ماه اخیر، سهم کانال‌های جذب، عملکرد کارشناسان با امکان بازتخصیص گروهی و مدیریت کاربران (به‌همراه بستن فوری نشست‌ها هنگام غیرفعال‌سازی).
- **صف پیام BullMQ و کمپین‌ها (`/campaigns`، `/admin/queues`، `/api/health`)**: ارسال غیرهمگام تمام پیام‌ها (OTP، تکی، کمپین، اتوماسیون) از طریق Worker با رعایت `optOutSms`/`optOutEmail`، پشتیبانی از `fake`، `kavenegar` و `smtp`، و صفحه مانیتورینگ صف‌ها.
- **موتور اتوماسیون (`/automations`، `/automations/builder`)**: اجرای خودکار سناریوها بر اساس رویدادهای `LEAD_CREATED`، `LEAD_STATUS_CHANGED`، `DEAL_STAGE_CHANGED` و `CUSTOMER_CREATED` با پشتیبانی از گام‌های `WAIT`، `SEND_SMS`، `SEND_EMAIL`، `CREATE_TASK`، `ASSIGN_OWNER` و `CHANGE_LEAD_STATUS` + ۴ سناریوی پیش‌فرض و تست آزمایشی (`dryRun`).
- **دستیار هوش مصنوعی (`/ai-assistant` و پروفایل مخاطب)**: خلاصه‌سازی ۳۰ فعالیت اخیر مخاطب، یادداشت هوشمند (`Smart Note`) با پیشنهادهای `PENDING` و تایید انسانی، تولید پیش‌نویس پیام با لحن انتخابی و نگارش خودکار قالب پیام در کمپین‌ها و اتوماسیون‌ها.

---

## پشته فناوری (Tech Stack)

- **Frontend / Fullstack**: Next.js 14.2 (App Router, Server Actions, Instrumentation Hook), TypeScript, Tailwind CSS, `@dnd-kit`, Recharts, `jalaali-js`, Lucide Icons
- **Database**: PostgreSQL + Prisma ORM 5.22
- **Queue & Cache**: Redis (`ioredis`) + BullMQ
- **Auth & Validation**: `jose` (JWT), `zod`
- **Testing**: Vitest (`vitest run`)

---

## معماری سیستم

- **احراز هویت و نشست‌ها**:
  - `src/middleware.ts` با `jose` کوکی `sanjagh_session` را در Edge بررسی و مسیرهای محافظت‌شده را بر اساس نقش فیلتر می‌کند.
  - `src/server/auth.ts` در لایه سرور علاوه بر JWT، وجود سشن در جدول `Session` و فعال بودن `User.isActive` را بررسی می‌کند.
- **صف‌ها و Worker (`BullMQ`)**:
  - صف `messages`: تمام پیامک‌ها و ایمیل‌ها (شامل OTP با `priority: 1`) ابتدا در جدول `Message` با وضعیت `QUEUED` ذخیره و سپس با `jobId = messageId` وارد صف می‌شوند؛ هیچ بخشی خارج از Worker مستقیماً پروایدر را صدا نمی‌زند.
  - صف `automations`: اجرای گام‌های گردش کار و زمان‌بندی تأخیرهای `WAIT`.
  - Worker به صورت خودکار از طریق `src/instrumentation.ts` (هنگام `ENABLE_WORKER=true`) یا به صورت پروسه مستقل (`npm run worker`) اجرا می‌شود.

---

## متغیرهای محیطی (Environment Variables)

| متغیر | توضیح | مقدار نمونه |
|---|---|---|
| `DATABASE_URL` | آدرس اتصال PostgreSQL | `postgresql://crm_user:crm_password@localhost:5432/sanjagh_crm?schema=public` |
| `REDIS_URL` | آدرس اتصال Redis | `redis://localhost:6379` |
| `SESSION_SECRET` | کلید امضای JWT (در Production اجباری) | رشته تصادفی حداقل ۳۲ کاراکتر |
| `ENABLE_WORKER` | اجرای Worker داخل سرور Next.js | `"true"` یا `"false"` |
| `MESSAGING_PROVIDER` | پروایدر ارسال پیام | `fake` \| `kavenegar` \| `smtp` |
| `MESSAGING_ALLOWLIST` | شماره‌های مجاز برای ارسال واقعی (جداشده با کاما) | `09123456789` |
| `KAVENEGAR_API_KEY` | کلید API کاوه‌نگار | `""` |
| `KAVENEGAR_OTP_TEMPLATE` | نام الگوی Verify Lookup در کاوه‌نگار | `""` |
| `KAVENEGAR_SENDER` | شماره خط ارسال کاوه‌نگار (اختیاری) | `""` |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` | تنظیمات سرور ایمیل SMTP | `localhost` / `587` |
| `AI_BASE_URL` / `AI_API_KEY` / `AI_MODEL` | تنظیمات مدل هوش مصنوعی سازگار با OpenAI | `https://api.openai.com/v1` / `gpt-4o-mini` |
| `DEMO_MODE` / `DEMO_CODE` | فعال‌سازی دکمه‌های ورود سریع و کد ثابت دمو (فقط وقتی `MESSAGING_PROVIDER=fake` باشد) | `"true"` / `"123456"` |
| `SEED_ADMIN_PHONE` / `SEED_MANAGER_PHONE` / `SEED_SALES_PHONE` | شماره‌های کاربران اولیه در Seed | `09123456789` |

> **نکته مهم Redis**: برای عملکرد پایدار BullMQ، سرور Redis باید حتماً با سیاست `maxmemory-policy noeviction` تنظیم شده باشد تا کلیدهای صف در زمان پر شدن حافظه حذف نشوند.

---

## راه‌اندازی لوکال (Local Setup)

### ۱. راه‌اندازی PostgreSQL و Redis با Docker
```bash
docker run -d --name sanjagh-pg -e POSTGRES_USER=crm_user -e POSTGRES_PASSWORD=crm_password -e POSTGRES_DB=sanjagh_crm -p 5432:5432 postgres:16
docker run -d --name sanjagh-redis -p 6379:6379 redis:7 redis-server --maxmemory-policy noeviction
```

### ۲. نصب وابستگی‌ها و آماده‌سازی دیتابیس
```bash
cp .env.example .env
npm install
npx prisma migrate deploy
npx prisma db seed
```

### ۳. اجرای برنامه
```bash
npm run dev
```
در صورتی که `ENABLE_WORKER=false` تنظیم شده باشد، Worker را در یک ترمینال جداگانه اجرا کنید:
```bash
npm run worker
```

### حساب‌های دمو (در حالت `DEMO_MODE=true` و `MESSAGING_PROVIDER=fake`)
- **مدیر ارشد (ADMIN)**: `09123456789` (کد: `123456` یا کد `DEMO_CODE`)
- **مدیر فروش (MANAGER)**: `09120000002`
- **کارشناس فروش (SALES)**: `09120000003`

---

## راهنمای دیپلوی در لیارا (Liara Deployment)

فایل [`liara.json`](./liara.json) برای پلتفرم Next.js روی پورت `3000` آماده شده است.

1. در پنل لیارا یک برنامه از نوع **Next.js** بسازید و دو دیتابیس **PostgreSQL** و **Redis** (با `maxmemory-policy noeviction`) ایجاد کنید.
2. متغیرهای محیطی (به‌خصوص `DATABASE_URL`، `REDIS_URL`، `SESSION_SECRET`، `ENABLE_WORKER=true` و تنظیمات کاوه‌نگار/AI) را در بخش تنظیمات محیطی لیارا وارد کنید. (در محیط Production مقدار `DEMO_MODE` را `"false"` بگذارید.)
3. برنامه را دیپلوی کنید:
   ```bash
   liara deploy
   ```
4. پس از استقرار، مایگریشن‌ها و Seed اولیه را در کنسول برنامه اجرا کنید:
   ```bash
   npx prisma migrate deploy
   npx prisma db seed
   ```
5. سلامت سرویس‌ها را از طریق مسیر `/api/health` بررسی کنید.
