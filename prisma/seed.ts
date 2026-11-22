import {
  PrismaClient,
  Role,
  ContactKind,
  LeadStatus,
  Priority,
  Source,
  DealStage,
  TaskStatus,
  TaskOrigin,
  ActivityType,
  AutomationTrigger,
  Prisma,
} from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Sanjagh CRM database...");

  // 1. Clean existing records in reverse dependency order
  await prisma.aiSummary.deleteMany();
  await prisma.aiSuggestion.deleteMany();
  await prisma.message.deleteMany();
  await prisma.automationRun.deleteMany();
  await prisma.automation.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.task.deleteMany();
  await prisma.deal.deleteMany();
  await prisma.contact.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();

  // 2. Users: 1 ADMIN, 1 MANAGER, 3 SALES
  const adminPhone = process.env.SEED_ADMIN_PHONE || "09123456789";

  await prisma.user.create({
    data: {
      name: "مدیر ارشد سنجاق",
      phone: adminPhone,
      email: "admin@sanjagh.ir",
      role: Role.ADMIN,
    },
  });

  const manager = await prisma.user.create({
    data: {
      name: "سارا احمدی (مدیر فروش)",
      phone: "09120000002",
      email: "manager@sanjagh.ir",
      role: Role.MANAGER,
    },
  });

  const sales1 = await prisma.user.create({
    data: {
      name: "علی رضایی (کارشناس فروش)",
      phone: "09120000003",
      email: "ali@sanjagh.ir",
      role: Role.SALES,
    },
  });

  const sales2 = await prisma.user.create({
    data: {
      name: "مریم کاظمی (کارشناس فروش)",
      phone: "09120000004",
      email: "maryam@sanjagh.ir",
      role: Role.SALES,
    },
  });

  const sales3 = await prisma.user.create({
    data: {
      name: "حسین عباسی (کارشناس فروش)",
      phone: "09120000005",
      email: "hossein@sanjagh.ir",
      role: Role.SALES,
    },
  });

  const allSales = [sales1, sales2, sales3];

  console.log("Created 5 users: 1 Admin, 1 Manager, 3 Sales reps.");

  // 3. Contacts: 25 contacts (mix of LEAD & CUSTOMER)
  const contactData = [
    { fullName: "مهندس کامران رستمی", company: "توسعه نرم‌افزار نوین", kind: ContactKind.CUSTOMER, source: Source.WEBSITE, leadStatus: LeadStatus.QUALIFIED, priority: Priority.HIGH, phone: "0910000001", email: "rostami@novin.com", city: "تهران", tags: ["VIP", "نرم‌افزار"] },
    { fullName: "دکتر نیلوفر سپهری", company: "کلینیک دندانپزشکی مهر", kind: ContactKind.CUSTOMER, source: Source.REFERRAL, leadStatus: LeadStatus.QUALIFIED, priority: Priority.HIGH, phone: "0910000002", email: "sepehri@mehr.ir", city: "اصفهان", tags: ["پزشکی", "قرارداد سالانه"] },
    { fullName: "پیمان صادقی", company: "بازرگانی جهان گستر", kind: ContactKind.CUSTOMER, source: Source.PHONE, leadStatus: LeadStatus.QUALIFIED, priority: Priority.MEDIUM, phone: "0910000003", email: "sadeghi@jg.ir", city: "مشهد", tags: ["بازرگانی"] },
    { fullName: "زهرا ملکی", company: "آژانس مسافرتی پرواز", kind: ContactKind.CUSTOMER, source: Source.INSTAGRAM, leadStatus: LeadStatus.QUALIFIED, priority: Priority.MEDIUM, phone: "0910000004", email: "maleki@parvaz.com", city: "شیراز", tags: ["گردشگری"] },
    { fullName: "امیرحسین تهرانی", company: "فروشگاه قطعات خودرو", kind: ContactKind.CUSTOMER, source: Source.EVENT, leadStatus: LeadStatus.QUALIFIED, priority: Priority.LOW, phone: "0910000005", email: "tehrani@carparts.ir", city: "تبریز", tags: ["خودرو"] },
    { fullName: "فاطمه بهرامی", company: "موسسه آموزشی رشد", kind: ContactKind.CUSTOMER, source: Source.WEBSITE, leadStatus: LeadStatus.QUALIFIED, priority: Priority.HIGH, phone: "0910000006", email: "bahrami@roshd.org", city: "تهران", tags: ["آموزش"] },
    { fullName: "محسن کریمی", company: "صنایع غذایی ترنج", kind: ContactKind.CUSTOMER, source: Source.TELEGRAM, leadStatus: LeadStatus.QUALIFIED, priority: Priority.MEDIUM, phone: "0910000007", email: "karimi@toranj.ir", city: "کرج", tags: ["صنایع غذایی"] },
    { fullName: "ساناز شریفی", company: "استودیو طراحی مکعب", kind: ContactKind.CUSTOMER, source: Source.INSTAGRAM, leadStatus: LeadStatus.QUALIFIED, priority: Priority.MEDIUM, phone: "0910000008", email: "sharifi@cube.design", city: "تهران", tags: ["طراحی"] },
    { fullName: "سعید نادری", company: "شرکت مهندسی عمران بتن", kind: ContactKind.CUSTOMER, source: Source.OTHER, leadStatus: LeadStatus.QUALIFIED, priority: Priority.HIGH, phone: "0910000009", email: "naderi@omranbeton.com", city: "قم", tags: ["ساختمان"] },
    { fullName: "شیما حیدری", company: "داروسازی سینا", kind: ContactKind.CUSTOMER, source: Source.REFERRAL, leadStatus: LeadStatus.QUALIFIED, priority: Priority.HIGH, phone: "0910000010", email: "heidari@sina-pharma.ir", city: "تهران", tags: ["داروسازی", "VIP"] },

    // Leads
    { fullName: "علیرضا جعفری", company: "پخش عمده البرز", kind: ContactKind.LEAD, source: Source.WEBSITE, leadStatus: LeadStatus.NEW, priority: Priority.HIGH, phone: "0910000011", email: "jafari@alborz.ir", city: "قزوین", tags: ["سرنخ داغ"] },
    { fullName: "پریسا فرهمند", company: "فروشگاه آنلاین آلا", kind: ContactKind.LEAD, source: Source.INSTAGRAM, leadStatus: LeadStatus.NEW, priority: Priority.MEDIUM, phone: "0910000012", email: "farahmand@ala.ir", city: "تهران", tags: ["ایکامرس"] },
    { fullName: "بابک میرزایی", company: "واردات قطعات الکترونیک", kind: ContactKind.LEAD, source: Source.PHONE, leadStatus: LeadStatus.CONTACTED, priority: Priority.HIGH, phone: "0910000013", email: "mirzaei@electro.com", city: "تهران", tags: ["الکترونیک"] },
    { fullName: "نگین رحیمی", company: "مجتمع آموزشی پارس", kind: ContactKind.LEAD, source: Source.TELEGRAM, leadStatus: LeadStatus.CONTACTED, priority: Priority.MEDIUM, phone: "0910000014", email: "rahimi@pars-edu.ir", city: "اصفهان", tags: ["آموزش"] },
    { fullName: "سینا داوودی", company: "استارتاپ لجستیک بارنت", kind: ContactKind.LEAD, source: Source.EVENT, leadStatus: LeadStatus.QUALIFIED, priority: Priority.HIGH, phone: "0910000015", email: "davoodi@barnet.ir", city: "تهران", tags: ["استارتاپ"] },
    { fullName: "هانیه مرادی", company: "تولیدی پوشاک ایرانیان", kind: ContactKind.LEAD, source: Source.INSTAGRAM, leadStatus: LeadStatus.NEW, priority: Priority.LOW, phone: "0910000016", email: "moradi@iranian-wear.ir", city: "یزد", tags: ["پوشاک"] },
    { fullName: "رضا ابراهیمی", company: "تجهیزات صنعتی کارا", kind: ContactKind.LEAD, source: Source.WEBSITE, leadStatus: LeadStatus.QUALIFIED, priority: Priority.HIGH, phone: "0910000017", email: "ebrahimi@kara-ind.ir", city: "اراک", tags: ["صنعتی"] },
    { fullName: "سمیرا انصاری", company: "کلینیک زیبایی بهار", kind: ContactKind.LEAD, source: Source.REFERRAL, leadStatus: LeadStatus.CONTACTED, priority: Priority.MEDIUM, phone: "0910000018", email: "ansari@bahar-clinic.com", city: "رشت", tags: ["پزشکی"] },
    { fullName: "مسعود یوسفی", company: "دفتر وکالت عدالت", kind: ContactKind.LEAD, source: Source.PHONE, leadStatus: LeadStatus.NEW, priority: Priority.LOW, phone: "0910000019", email: "yousefi@edalat-law.ir", city: "ساری", tags: ["حقوقی"] },
    { fullName: "الهام باقری", company: "استودیو عکاسی نور", kind: ContactKind.LEAD, source: Source.INSTAGRAM, leadStatus: LeadStatus.LOST, priority: Priority.LOW, phone: "0910000020", email: "bagheri@noor-studio.ir", city: "کرمان", tags: ["رسانه"] },
    { fullName: "حمید محمودی", company: "سامانه پرداخت آسان", kind: ContactKind.LEAD, source: Source.WEBSITE, leadStatus: LeadStatus.QUALIFIED, priority: Priority.HIGH, phone: "0910000021", email: "mahmoudi@asanpay.ir", city: "تهران", tags: ["فین‌تک"] },
    { fullName: "رویا اکبری", company: "شرکت تبلیغاتی آوان", kind: ContactKind.LEAD, source: Source.OTHER, leadStatus: LeadStatus.CONTACTED, priority: Priority.MEDIUM, phone: "0910000022", email: "akbari@avan-ads.ir", city: "اهواز", tags: ["تبلیغات"] },
    { fullName: "جواد قاسمی", company: "فروشگاه زنجیره‌ای سپهر", kind: ContactKind.LEAD, source: Source.REFERRAL, leadStatus: LeadStatus.NEW, priority: Priority.HIGH, phone: "0910000023", email: "ghasemi@sepehr-mart.ir", city: "تهران", tags: ["خرده‌فروشی"] },
    { fullName: "الناز صبوری", company: "مرکز مشاوره نیکان", kind: ContactKind.LEAD, source: Source.TELEGRAM, leadStatus: LeadStatus.CONTACTED, priority: Priority.LOW, phone: "0910000024", email: "saboori@nikan.ir", city: "زنجان", tags: ["خدمات"] },
    { fullName: "فرهاد سلیمانی", company: "تولید درب و پنجره آریا", kind: ContactKind.LEAD, source: Source.PHONE, leadStatus: LeadStatus.QUALIFIED, priority: Priority.MEDIUM, phone: "0910000025", email: "soleimani@aria-door.ir", city: "همدان", tags: ["ساختمان"] },
  ];

  const createdContacts = [];
  for (let i = 0; i < contactData.length; i++) {
    const c = contactData[i];
    const assignedRep = allSales[i % allSales.length];
    const contact = await prisma.contact.create({
      data: {
        ...c,
        ownerId: assignedRep.id,
        createdById: manager.id,
        score: Math.floor(Math.random() * 50) + 40,
        convertedAt: c.kind === ContactKind.CUSTOMER ? new Date(Date.now() - 15 * 86400000) : null,
      },
    });
    createdContacts.push(contact);
  }

  console.log(`Created ${createdContacts.length} contacts.`);

  // 4. Deals: 15 deals across all 6 stages
  const dealStages = [
    DealStage.NEW,
    DealStage.CONTACTED,
    DealStage.PROPOSAL,
    DealStage.NEGOTIATION,
    DealStage.WON,
    DealStage.LOST,
  ];

  const dealTitles = [
    "خرید اشتراک سالانه تیم ۵۰ نفره",
    "قرارداد استقرار CRM سازمانی و آموزش",
    "سفارشی‌سازی ماژول ارسال پیامک خودکار",
    "لایسنس پرو نرم‌افزار برای شعبه مرکزی",
    "پکیج اتوماسیون مارکتینگ و ارتباط با مشتری",
    "خرید ۵۰ حساب کاربری اختصاصی کارشناسان",
    "ارتقای پلن استارتر به نسخه سازمانی",
    "پیاده‌سازی یکپارچگی اختصاصی و اتصال API",
    "مشاوره و استقرار قیف فروش اختصاصی",
    "قرارداد پشتیبانی فنی و SLA طلایی ۲۴/۷",
    "افزونه هوش مصنوعی و خلاصه‌ساز تماس‌ها",
    "پکیج سالانه خط فروش و پایپ‌لاین پیشرفته",
    "توسعه داشبورد اختصاصی گزارش‌گیری مدیران",
    "لایسنس مادام‌العمر نسخه لوکال برای بانک",
    "اشتراک ماهانه آزمایشی ۱۰ کاربره",
  ];

  const amounts = [
    48000000, 125000000, 32500000, 84000000, 21600000, 65000000, 14200000,
    98000000, 45000000, 36000000, 28000000, 72000000, 54000000, 180000000, 12000000
  ];

  const createdDeals = [];
  for (let i = 0; i < dealTitles.length; i++) {
    const contact = createdContacts[i % createdContacts.length];
    const stage = dealStages[i % dealStages.length];
    const isClosed = stage === DealStage.WON || stage === DealStage.LOST;

    const deal = await prisma.deal.create({
      data: {
        title: dealTitles[i],
        amount: amounts[i],
        stage: stage,
        position: i * 1000,
        contactId: contact.id,
        ownerId: contact.ownerId || sales1.id,
        closedAt: isClosed ? new Date() : null,
      },
    });
    createdDeals.push(deal);
  }

  console.log(`Created ${createdDeals.length} deals across 6 kanban stages.`);

  // 5. Tasks: 20 tasks (some overdue, today, upcoming, done)
  const taskTitles = [
    "تماس پیگیری پیش‌فاکتور ارسال شده",
    "جلسه آنلاین دمو نرم‌افزار با مدیران IT",
    "ارسال قرارداد رسمی و الحاقیه‌ها برای امضا",
    "هماهنگی جلسه حضوری در محل شرکت مشتری",
    "بررسی شرایط تخفیف سالانه با مدیر فروش",
    "ارسال راهنمای اتصال خط پیامکی کاوه‌نگار",
    "پیگیری دریافت چک مرحله اول قرارداد",
    "تماس با سرنخ وبسایت و اعتبارسنجی اولیه",
    "جلسه مشاوره بهینه‌سازی پایپ‌لاین فروش",
    "آماده‌سازی پیش‌نویس پروپوزال فنی و مالی",
    "بررسی بازخورد مشتری از نسخه آزمایشی",
    "تماس مجدد با مشتری پس از تعطیلات",
    "ارسال کاتالوگ امکانات جدید نسخه پاییز",
    "ثبت تیکت فنی برای رفع مغایرت گزارش",
    "تنظیم قرارداد محرمانگی NDA",
    "تماس خوش‌آمدگویی و فعال‌سازی اکانت",
    "پیگیری پرداخت فاکتور اشتراک ماهانه",
    "بررسی لاگ‌های ارسال پیامک خودکار",
    "هماهنگی وبینار آموزش تیم فروش مشتری",
    "ارسال هدیه سالانه مشتریان وفادار",
  ];

  const now = Date.now();
  const dayMs = 86400000;

  for (let i = 0; i < taskTitles.length; i++) {
    const contact = createdContacts[i % createdContacts.length];
    const deal = createdDeals[i % createdDeals.length];
    const assignee = allSales[i % allSales.length];

    // Some overdue (-2 days), some today, some future (+3 days), some DONE
    const dueAt = new Date(now + ((i % 5) - 2) * dayMs);
    const status = i % 4 === 0 ? TaskStatus.DONE : TaskStatus.TODO;

    await prisma.task.create({
      data: {
        title: taskTitles[i],
        description: `توضیحات تکمیلی برای ${taskTitles[i]} به همراه یادداشت‌های مذاکره قبلی.`,
        dueAt: dueAt,
        status: status,
        priority: i % 3 === 0 ? Priority.HIGH : i % 3 === 1 ? Priority.MEDIUM : Priority.LOW,
        origin: i % 2 === 0 ? TaskOrigin.SELF : TaskOrigin.MANAGER,
        assigneeId: assignee.id,
        createdById: manager.id,
        contactId: contact.id,
        dealId: deal.id,
        completedAt: status === TaskStatus.DONE ? new Date() : null,
      },
    });
  }

  console.log("Created 20 tasks.");

  // 6. Activities: timeline items for contacts
  const activityTemplates = [
    { type: ActivityType.CALL, body: "تماس تلفنی ۳۰ دقیقه‌ای با مدیر خرید انجام شد. نسبت به امکانات اتوماسیون ابراز رضایت کردند." },
    { type: ActivityType.MEETING, body: "جلسه حضوری در دفتر مشتری برگزار شد و سناریوهای استقرار بررسی گردید." },
    { type: ActivityType.NOTE, body: "مشتری درخواست تخفیف ۱۰ درصدی برای پرداخت نقدی سالانه داشت." },
    { type: ActivityType.MESSAGE, body: "پیش‌فاکتور رسمی به همراه کاتالوگ به ایمیل مسئول خرید ارسال شد." },
    { type: ActivityType.STAGE_CHANGE, body: "وضعیت معامله به مرحله «مذاکره نهایی» ارتقا یافت.", meta: { from: "PROPOSAL", to: "NEGOTIATION" } },
    { type: ActivityType.STATUS_CHANGE, body: "سرنخ واجد شرایط تشخیص داده شد و به لیست ارزیابی رفت.", meta: { from: "CONTACTED", to: "QUALIFIED" } },
  ];

  for (let i = 0; i < createdContacts.length; i++) {
    const contact = createdContacts[i];
    const count = (i % 3) + 1;
    for (let j = 0; j < count; j++) {
      const act = activityTemplates[(i + j) % activityTemplates.length];
      await prisma.activity.create({
        data: {
          type: act.type,
          body: act.body,
          meta: act.meta ? (act.meta as Prisma.InputJsonValue) : undefined,
          contactId: contact.id,
          userId: contact.ownerId || sales1.id,
          createdAt: new Date(now - (j * 2 + 1) * dayMs),
        },
      });
    }
  }

  console.log("Created activities for contacts.");

  // 7. Preset Automations (4 presets)
  await prisma.automation.createMany({
    data: [
      {
        name: "خوش‌آمدگویی به سرنخ جدید (ارسال پیامک فوری + ایجاد وظیفه فردا)",
        description: "به محض ثبت یک سرنخ، پیامک خوش‌آمد ارسال شده و فردا وظیفه پیگیری برای کارشناس ایجاد می‌شود.",
        isActive: true,
        isPreset: true,
        trigger: AutomationTrigger.LEAD_CREATED,
        steps: [
          { type: "SEND_SMS", body: "سلام {{fullName}} عزیز، به خانواده سنجاق خوش آمدید! همکاران ما به زودی با شما تماس خواهند گرفت." },
          { type: "WAIT", minutes: 1440 },
          { type: "CREATE_TASK", title: "تماس اول و معرفی اولیه به سرنخ جدید", dueInHours: 24 }
        ],
      },
      {
        name: "یادآوری عدم پیگیری سرنخ بعد از ۷ روز",
        description: "در صورتی که ۷ روز با سرنخ تماسی گرفته نشود، یک وظیفه فوری برای کارشناس ثبت می‌شود.",
        isActive: true,
        isPreset: true,
        trigger: AutomationTrigger.LEAD_INACTIVE,
        triggerConfig: { days: 7 },
        steps: [
          { type: "CREATE_TASK", title: "سرنخ بیش از ۷ روز رها شده است! لطفاً تماس بگیرید", dueInHours: 4 }
        ],
      },
      {
        name: "تبریک و تشکر معامله برنده (Deal WON)",
        description: "به محض برنده شدن معامله، پیامک تشکر از اعتماد برای مشتری ارسال می‌شود.",
        isActive: true,
        isPreset: true,
        trigger: AutomationTrigger.DEAL_STAGE_CHANGED,
        triggerConfig: { toStage: "WON" },
        steps: [
          { type: "SEND_SMS", body: "{{fullName}} گرامی، از پیوستن شما به جمع مشتریان ارزشمند سنجاق صمیمانه سپاسگزاریم." },
          { type: "CREATE_TASK", title: "شروع فرایند Onboarding و آموزش کاربر", dueInHours: 48 }
        ],
      },
      {
        name: "ایمیل نظرسنجی و دلایل شکست معامله (Deal LOST)",
        description: "در صورت از دست رفتن معامله، ایمیلی جهت نظرسنجی و بررسی دلایل برای مشتری ارسال می‌شود.",
        isActive: true,
        isPreset: true,
        trigger: AutomationTrigger.DEAL_STAGE_CHANGED,
        triggerConfig: { toStage: "LOST" },
        steps: [
          { type: "SEND_EMAIL", subject: "کمک به ارتقای خدمات ما در سنجاق", body: "با سلام خدمت شما {{fullName}} گرامی، خوشحال می‌شویم با تکمیل فرم کوتاه زیر، دلایل عدم همکاری را با ما در میان بگذارید." }
        ],
      },
    ],
  });

  console.log("Created 4 preset automations.");
  console.log("Seeding finished successfully!");
}

main()
  .catch((e) => {
    console.error("Error seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
