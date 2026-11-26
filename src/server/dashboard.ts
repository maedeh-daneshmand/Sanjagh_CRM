import jalaali from "jalaali-js";
import { DealStage, Prisma, Role, Source, TaskStatus } from "@prisma/client";
import { db } from "./db";
import { requireRole, requireUser } from "./auth";
import { PERSIAN_MONTH_NAMES } from "@/lib/jalali";
import { getTehranDayBounds } from "./tasks";

export interface MonthlySalesPoint {
  month: string;
  revenue: number; // in thousands of Toman for chart readability
  deals: number;
}

export interface SourceSharePoint {
  name: string;
  value: number;
  count: number;
  color: string;
}

export interface RecentDealRow {
  id: string;
  title: string;
  company: string;
  contactId: string;
  amount: number;
  stage: DealStage;
  expectedCloseAt: string | null;
  createdAt: string;
}

export interface RecentActivityRow {
  id: string;
  type: string;
  body: string | null;
  contactId: string;
  contactName: string;
  createdAt: string;
}

export interface TeamRepRow {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  role: Role;
  assignedLeads: number;
  dealsWon: number;
  winRate: number;
  revenue: number;
  overdueTasks: number;
  activityCount30d: number;
}

export interface DashboardData {
  isSalesOnly: boolean;
  totalRevenue: number;
  revenueChangePct: number;
  totalContacts: number;
  contactsGrowthPct: number;
  wonDealsCount: number;
  winRate: number;
  openPipelineValue: number;
  openTasksCount: number;
  monthlySales: MonthlySalesPoint[];
  leadSources: SourceSharePoint[];
  recentDeals: RecentDealRow[];
  recentActivities: RecentActivityRow[];
  teamPerformance?: TeamRepRow[];
}

const SOURCE_META: Record<Source, { label: string; color: string }> = {
  WEBSITE: { label: "وب‌سایت مستقیم", color: "#10b981" },
  INSTAGRAM: { label: "اینستاگرام", color: "#06b6d4" },
  REFERRAL: { label: "معرفی و توصیه", color: "#3b82f6" },
  TELEGRAM: { label: "تلگرام", color: "#a855f7" },
  PHONE: { label: "تماس تلفنی", color: "#f59e0b" },
  EVENT: { label: "رویداد", color: "#ec4899" },
  OTHER: { label: "سایر", color: "#64748b" },
};

function getLastNJalaliMonths(n: number, now: Date): { jy: number; jm: number; label: string }[] {
  const ymd = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tehran",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const [gy, gm, gd] = ymd.split("-").map(Number);
  const current = jalaali.toJalaali(new Date(Date.UTC(gy, gm - 1, gd, 12, 0, 0)));

  const list: { jy: number; jm: number; label: string }[] = [];
  let y = current.jy;
  let m = current.jm;
  for (let i = 0; i < n; i++) {
    list.unshift({ jy: y, jm: m, label: PERSIAN_MONTH_NAMES[m - 1] });
    m -= 1;
    if (m < 1) {
      m = 12;
      y -= 1;
    }
  }
  return list;
}

function getTehranJalaliMonthYear(d: Date): { jy: number; jm: number } {
  const ymd = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tehran",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
  const [gy, gm, gd] = ymd.split("-").map(Number);
  const j = jalaali.toJalaali(new Date(Date.UTC(gy, gm - 1, gd, 12, 0, 0)));
  return { jy: j.jy, jm: j.jm };
}

export async function aggregateDashboard(
  ownerId?: string,
  now: Date = new Date()
): Promise<DashboardData> {
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  const contactWhere: Prisma.ContactWhereInput = {
    isActive: true,
    ...(ownerId ? { ownerId } : {}),
  };
  const dealWhere: Prisma.DealWhereInput = ownerId ? { ownerId } : {};
  const taskWhere: Prisma.TaskWhereInput = {
    status: TaskStatus.TODO,
    ...(ownerId ? { assigneeId: ownerId } : {}),
  };
  const activityWhere: Prisma.ActivityWhereInput = ownerId ? { userId: ownerId } : {};

  const [contacts, deals, openTasksCount, recentActivitiesRaw] = await Promise.all([
    db.contact.findMany({
      where: contactWhere,
      select: { id: true, source: true, createdAt: true },
    }),
    db.deal.findMany({
      where: dealWhere,
      orderBy: { createdAt: "desc" },
      include: {
        contact: { select: { id: true, fullName: true, company: true } },
      },
    }),
    db.task.count({ where: taskWhere }),
    db.activity.findMany({
      where: activityWhere,
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        contact: { select: { id: true, fullName: true } },
      },
    }),
  ]);

  // Contacts stats
  const totalContacts = contacts.length;
  const newContacts30d = contacts.filter((c) => c.createdAt >= thirtyDaysAgo).length;
  const prevContacts30d = contacts.filter(
    (c) => c.createdAt >= sixtyDaysAgo && c.createdAt < thirtyDaysAgo
  ).length;
  const contactsGrowthPct =
    prevContacts30d > 0
      ? Number((((newContacts30d - prevContacts30d) / prevContacts30d) * 100).toFixed(1))
      : newContacts30d > 0
      ? 100
      : 0;

  // Deals stats
  let totalRevenue = 0;
  let revenue30d = 0;
  let revenuePrev30d = 0;
  let wonDealsCount = 0;
  let lostDealsCount = 0;
  let openPipelineValue = 0;

  const jalaliMonths = getLastNJalaliMonths(8, now);
  const monthlyBuckets = new Map<string, { revenue: number; deals: number }>();
  for (const m of jalaliMonths) {
    monthlyBuckets.set(`${m.jy}-${m.jm}`, { revenue: 0, deals: 0 });
  }

  for (const d of deals) {
    const amt = Number(d.amount);
    if (d.stage === DealStage.WON) {
      totalRevenue += amt;
      wonDealsCount += 1;
      const closedDate = d.closedAt ?? d.createdAt;
      if (closedDate >= thirtyDaysAgo) revenue30d += amt;
      else if (closedDate >= sixtyDaysAgo) revenuePrev30d += amt;

      const { jy, jm } = getTehranJalaliMonthYear(closedDate);
      const bucket = monthlyBuckets.get(`${jy}-${jm}`);
      if (bucket) {
        bucket.revenue += Math.round(amt / 1000);
        bucket.deals += 1;
      }
    } else if (d.stage === DealStage.LOST) {
      lostDealsCount += 1;
    } else {
      openPipelineValue += amt;
    }
  }

  const revenueChangePct =
    revenuePrev30d > 0
      ? Number((((revenue30d - revenuePrev30d) / revenuePrev30d) * 100).toFixed(1))
      : revenue30d > 0
      ? 100
      : 0;

  const closedTotal = wonDealsCount + lostDealsCount;
  const winRate = closedTotal > 0 ? Math.round((wonDealsCount / closedTotal) * 100) : 0;

  const monthlySales: MonthlySalesPoint[] = jalaliMonths.map((m) => {
    const b = monthlyBuckets.get(`${m.jy}-${m.jm}`) ?? { revenue: 0, deals: 0 };
    return { month: m.label, revenue: b.revenue, deals: b.deals };
  });

  // Lead sources distribution
  const sourceCounts = new Map<Source, number>();
  for (const c of contacts) {
    sourceCounts.set(c.source, (sourceCounts.get(c.source) ?? 0) + 1);
  }
  const leadSources: SourceSharePoint[] = Array.from(sourceCounts.entries())
    .map(([src, count]) => ({
      name: SOURCE_META[src].label,
      value: totalContacts > 0 ? Math.round((count / totalContacts) * 100) : 0,
      count,
      color: SOURCE_META[src].color,
    }))
    .sort((a, b) => b.count - a.count);

  const recentDeals: RecentDealRow[] = deals.slice(0, 5).map((d) => ({
    id: d.id,
    title: d.title,
    company: d.contact.company || d.contact.fullName,
    contactId: d.contactId,
    amount: Number(d.amount),
    stage: d.stage,
    expectedCloseAt: d.expectedCloseAt ? d.expectedCloseAt.toISOString() : null,
    createdAt: d.createdAt.toISOString(),
  }));

  const recentActivities: RecentActivityRow[] = recentActivitiesRaw.map((a) => ({
    id: a.id,
    type: a.type,
    body: a.body,
    contactId: a.contactId,
    contactName: a.contact.fullName,
    createdAt: a.createdAt.toISOString(),
  }));

  return {
    isSalesOnly: Boolean(ownerId),
    totalRevenue,
    revenueChangePct,
    totalContacts,
    contactsGrowthPct,
    wonDealsCount,
    winRate,
    openPipelineValue,
    openTasksCount,
    monthlySales,
    leadSources,
    recentDeals,
    recentActivities,
  };
}

export async function getTeamPerformanceRows(now: Date = new Date()): Promise<TeamRepRow[]> {
  const { startOfToday } = getTehranDayBounds(now);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const reps = await db.user.findMany({
    where: {
      isActive: true,
      role: { in: [Role.SALES, Role.MANAGER] },
    },
    orderBy: [{ role: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      role: true,
    },
  });

  const [contacts, deals, overdueTasks, activities30d] = await Promise.all([
    db.contact.findMany({
      where: { isActive: true, ownerId: { not: null } },
      select: { ownerId: true },
    }),
    db.deal.findMany({
      select: { ownerId: true, stage: true, amount: true },
    }),
    db.task.findMany({
      where: { status: TaskStatus.TODO, dueAt: { lt: startOfToday } },
      select: { assigneeId: true },
    }),
    db.activity.findMany({
      where: { createdAt: { gte: thirtyDaysAgo }, userId: { not: null } },
      select: { userId: true },
    }),
  ]);

  return reps.map((rep) => {
    const assignedLeads = contacts.filter((c) => c.ownerId === rep.id).length;
    const repDeals = deals.filter((d) => d.ownerId === rep.id);
    const won = repDeals.filter((d) => d.stage === DealStage.WON);
    const lost = repDeals.filter((d) => d.stage === DealStage.LOST);
    const closedTotal = won.length + lost.length;
    const winRate = closedTotal > 0 ? Math.round((won.length / closedTotal) * 100) : 0;
    const revenue = won.reduce((sum, d) => sum + Number(d.amount), 0);
    const overdueCount = overdueTasks.filter((t) => t.assigneeId === rep.id).length;
    const actCount = activities30d.filter((a) => a.userId === rep.id).length;

    return {
      id: rep.id,
      name: rep.name,
      phone: rep.phone,
      email: rep.email,
      role: rep.role,
      assignedLeads,
      dealsWon: won.length,
      winRate,
      revenue,
      overdueTasks: overdueCount,
      activityCount30d: actCount,
    };
  });
}

export async function getManagerDashboard(): Promise<DashboardData> {
  await requireRole("ADMIN", "MANAGER");
  const [data, teamPerformance] = await Promise.all([
    aggregateDashboard(),
    getTeamPerformanceRows(),
  ]);
  return {
    ...data,
    isSalesOnly: false,
    teamPerformance,
  };
}

export async function getSalesDashboard(userId?: string): Promise<DashboardData> {
  const currentUser = await requireUser();
  const targetUserId = currentUser.role === "SALES" ? currentUser.id : userId || currentUser.id;
  return aggregateDashboard(targetUserId);
}
