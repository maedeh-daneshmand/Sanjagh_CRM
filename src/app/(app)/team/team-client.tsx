"use client";

import React, { useState } from "react";
import Link from "next/link";
import { formatNumber } from "@/lib/utils";
import { formatJalaliDate } from "@/lib/jalali";
import type { TeamRepRow } from "@/server/dashboard";
import type { RepDetailData } from "@/server/team";
import {
  getRepDetailAction,
  bulkReassignRepContactsAction,
} from "@/server/actions/team";
import {
  Users,
  Briefcase,
  DollarSign,
  CheckCircle2,
  ArrowRightLeft,
  X,
  Eye,
} from "lucide-react";

export default function TeamClient({ initialReps }: { initialReps: TeamRepRow[] }) {
  const [reps, setReps] = useState<TeamRepRow[]>(initialReps);
  const [reassignModalOpen, setReassignModalOpen] = useState(false);
  const [selectedRep, setSelectedRep] = useState<TeamRepRow | null>(null);
  const [targetRepId, setTargetRepId] = useState(initialReps[0]?.id || "");
  const [isReassigning, setIsReassigning] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Rep Detail Drawer
  const [repDetail, setRepDetail] = useState<RepDetailData | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const totalTeamRevenue = reps.reduce((sum, r) => sum + r.revenue, 0);
  const totalDealsWon = reps.reduce((sum, r) => sum + r.dealsWon, 0);

  const handleOpenDetail = async (repId: string) => {
    setLoadingDetail(true);
    const res = await getRepDetailAction(repId);
    setLoadingDetail(false);
    if (res.ok && res.data) {
      setRepDetail(res.data);
    } else {
      alert(res.error || "خطا در دریافت اطلاعات کارشناس");
    }
  };

  const handleBulkReassign = async () => {
    if (!selectedRep || !targetRepId) return;
    setIsReassigning(true);

    const res = await bulkReassignRepContactsAction({
      fromUserId: selectedRep.id,
      toUserId: targetRepId,
    });

    setIsReassigning(false);

    if (!res.ok || !res.data) {
      alert(res.error || "خطا در بازتخصیص");
      return;
    }

    const moved = res.data.count;
    setReps((prev) =>
      prev.map((r) => {
        if (r.id === selectedRep.id) return { ...r, assignedLeads: 0 };
        if (r.id === targetRepId) return { ...r, assignedLeads: r.assignedLeads + moved };
        return r;
      })
    );

    setReassignModalOpen(false);
    setStatusMessage(
      `تعداد ${moved} مخاطب/سرنخ از «${selectedRep.name}» به «${res.data.toUserName}» منتقل شد.`
    );
    setTimeout(() => setStatusMessage(null), 4000);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground flex items-center gap-2.5">
            <Users className="w-6 h-6 text-primary" />
            تیم فروش و عملکرد کارشناسان
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            ارزیابی شاخص‌های کلیدی، نرخ تبدیل، درآمدهای هر نماینده و تقسیم سرنخ‌ها
          </p>
        </div>
      </div>

      {statusMessage && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Top Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-card border border-border shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-muted-foreground">کل فروش تیمی</span>
            <div className="text-xl font-black text-foreground font-mono mt-0.5">
              {formatNumber(totalTeamRevenue)}
              <span className="text-xs text-muted-foreground mr-1">تومان</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-muted-foreground">مجموع معاملات موفق</span>
            <div className="text-xl font-black text-emerald-600 font-mono mt-0.5">
              {totalDealsWon}
              <span className="text-xs text-muted-foreground mr-1">قرارداد نهایی</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-muted-foreground">تعداد کارشناسان فعال</span>
            <div className="text-xl font-black text-foreground font-mono mt-0.5">
              {reps.length}
              <span className="text-xs text-muted-foreground mr-1">نفر</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
            <Briefcase className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Team Performance Table */}
      <div className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-muted-foreground">
                <th className="p-4 font-bold">کارشناس فروش</th>
                <th className="p-4 font-bold">سمت سازمانی</th>
                <th className="p-4 font-bold">مخاطبان تخصیصی</th>
                <th className="p-4 font-bold">معاملات برنده</th>
                <th className="p-4 font-bold">نرخ تبدیل</th>
                <th className="p-4 font-bold">درآمد فروش (تومان)</th>
                <th className="p-4 font-bold">وظایف معوقه</th>
                <th className="p-4 font-bold">فعالیت‌ها (۳۰ روز)</th>
                <th className="p-4 font-bold text-center">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {reps.map((rep) => (
                <tr key={rep.id} className="hover:bg-muted/30 transition-colors">
                  <td className="p-4 font-bold text-foreground">
                    <button
                      type="button"
                      onClick={() => handleOpenDetail(rep.id)}
                      className="flex items-center gap-2 text-right hover:text-primary transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0">
                        {rep.name[0]}
                      </div>
                      <div>
                        <div>{rep.name}</div>
                        <div className="text-[10px] text-muted-foreground font-mono">{rep.phone}</div>
                      </div>
                    </button>
                  </td>
                  <td className="p-4 text-muted-foreground">
                    {rep.role === "MANAGER" ? "مدیر فروش" : "کارشناس فروش"}
                  </td>
                  <td className="p-4 font-mono font-bold text-foreground">{rep.assignedLeads}</td>
                  <td className="p-4 font-mono font-bold text-emerald-600">{rep.dealsWon}</td>
                  <td className="p-4">
                    <span className="font-mono font-bold text-primary">{rep.winRate}%</span>
                  </td>
                  <td className="p-4 font-mono font-bold text-foreground">
                    {formatNumber(rep.revenue)}
                  </td>
                  <td className="p-4">
                    {rep.overdueTasks > 0 ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600 border border-rose-500/20 font-mono">
                        {rep.overdueTasks} معوق
                      </span>
                    ) : (
                      <span className="text-muted-foreground font-mono">0</span>
                    )}
                  </td>
                  <td className="p-4 font-mono text-muted-foreground">{rep.activityCount30d} اقدام</td>
                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenDetail(rep.id)}
                        disabled={loadingDetail}
                        className="p-1.5 rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-primary transition-colors"
                        title="جزئیات عملکرد"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedRep(rep);
                          const firstOther = reps.find((r) => r.id !== rep.id);
                          setTargetRepId(firstOther?.id || "");
                          setReassignModalOpen(true);
                        }}
                        disabled={reps.length < 2}
                        className="px-2.5 py-1.5 rounded-lg border border-border hover:bg-primary hover:text-primary-foreground text-xs font-semibold transition-all flex items-center gap-1 disabled:opacity-40"
                        title="بازتخصیص سرنخ‌ها"
                      >
                        <ArrowRightLeft className="w-3.5 h-3.5" />
                        <span>تقسیم کار</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Rep Detail Modal */}
      {repDetail && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-card border border-border rounded-3xl shadow-2xl p-6 text-right space-y-5 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div>
                <h3 className="font-bold text-foreground text-sm">{repDetail.name}</h3>
                <p className="text-[11px] text-muted-foreground font-mono">{repDetail.phone}</p>
              </div>
              <button
                onClick={() => setRepDetail(null)}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-2">
                <h4 className="font-bold text-foreground">مخاطبین و سرنخ‌ها ({repDetail.contacts.length})</h4>
                {repDetail.contacts.length === 0 ? (
                  <p className="text-muted-foreground">مخاطبی ندارد</p>
                ) : (
                  <div className="space-y-1.5">
                    {repDetail.contacts.map((c) => (
                      <Link
                        key={c.id}
                        href={`/contacts/${c.id}`}
                        className="block p-2.5 rounded-xl bg-muted/40 hover:bg-muted transition-colors"
                      >
                        <div className="font-semibold text-foreground">{c.fullName}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {c.company || "شخصی"} • امتیاز {c.score}
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-foreground">وظایف ({repDetail.tasks.length})</h4>
                {repDetail.tasks.length === 0 ? (
                  <p className="text-muted-foreground">وظیفه‌ای ندارد</p>
                ) : (
                  <div className="space-y-1.5">
                    {repDetail.tasks.map((t) => (
                      <div key={t.id} className="p-2.5 rounded-xl bg-muted/40">
                        <div className="font-semibold text-foreground">{t.title}</div>
                        <div className="text-[10px] text-muted-foreground font-mono">
                          {t.status === "DONE" ? "انجام شده" : "در انتظار"} •{" "}
                          {t.dueAt ? formatJalaliDate(t.dueAt, "short") : "بدون سررسید"}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2 text-xs pt-2 border-t border-border">
              <h4 className="font-bold text-foreground">فعالیت‌های اخیر</h4>
              {repDetail.activities.length === 0 ? (
                <p className="text-muted-foreground">فعالیتی ثبت نشده است</p>
              ) : (
                <div className="space-y-1.5">
                  {repDetail.activities.map((a) => (
                    <div key={a.id} className="p-2.5 rounded-xl bg-muted/30 flex items-center justify-between gap-2">
                      <span className="truncate text-foreground">
                        <strong>{a.contactName}:</strong> {a.body || a.type}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                        {formatJalaliDate(a.createdAt, "short")}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bulk Reassign Modal */}
      {reassignModalOpen && selectedRep && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-card border border-border rounded-3xl shadow-2xl p-6 text-right space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="font-bold text-foreground text-sm">بازتخصیص مخاطبان {selectedRep.name}</h3>
              <button
                onClick={() => setReassignModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <p className="text-muted-foreground leading-relaxed">
                این کارشناس در حال حاضر دارای <strong className="text-foreground">{selectedRep.assignedLeads}</strong> مخاطب و سرنخ فعال است. مایلید همه آن‌ها به کدام کارشناس منتقل شوند؟
              </p>

              <div>
                <label className="block font-semibold mb-1">کارشناس مقصد</label>
                <select
                  value={targetRepId}
                  onChange={(e) => setTargetRepId(e.target.value)}
                  className="w-full p-2.5 bg-muted/40 border border-border rounded-xl focus:outline-none focus:border-primary text-xs"
                >
                  {reps
                    .filter((r) => r.id !== selectedRep.id)
                    .map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.role === "MANAGER" ? "مدیر فروش" : "کارشناس"})
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setReassignModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-border hover:bg-muted text-muted-foreground font-semibold"
                >
                  انصراف
                </button>
                <button
                  type="button"
                  onClick={handleBulkReassign}
                  disabled={isReassigning || !targetRepId}
                  className="px-5 py-2 rounded-xl bg-primary text-primary-foreground font-bold shadow-sm hover:opacity-90 disabled:opacity-50"
                >
                  {isReassigning ? "در حال انتقال..." : "تأیید و انتقال"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
