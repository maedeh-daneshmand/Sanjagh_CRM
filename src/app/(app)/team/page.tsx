"use client";

import React, { useState } from "react";
import { formatNumber } from "@/lib/utils";
import {
  Users,
  Briefcase,
  DollarSign,
  CheckCircle2,
  ArrowRightLeft,
  X,
} from "lucide-react";

interface SalesRep {
  id: string;
  name: string;
  role: string;
  phone: string;
  email: string;
  assignedLeads: number;
  dealsWon: number;
  revenue: number;
  overdueTasks: number;
  activityCount30d: number;
  winRate: number;
}

const initialReps: SalesRep[] = [
  { id: "u1", name: "علی رضایی", role: "کارشناس ارشد فروش", phone: "09120000003", email: "ali@sanjagh.ir", assignedLeads: 18, dealsWon: 8, revenue: 165000000, overdueTasks: 1, activityCount30d: 46, winRate: 64 },
  { id: "u2", name: "مریم کاظمی", role: "کارشناس فروش", phone: "09120000004", email: "maryam@sanjagh.ir", assignedLeads: 15, dealsWon: 6, revenue: 142000000, overdueTasks: 0, activityCount30d: 38, winRate: 58 },
  { id: "u3", name: "حسین عباسی", role: "کارشناس فروش", phone: "09120000005", email: "hossein@sanjagh.ir", assignedLeads: 12, dealsWon: 5, revenue: 110000000, overdueTasks: 2, activityCount30d: 31, winRate: 52 },
  { id: "u4", name: "سارا احمدی", role: "مدیر فروش و نظارت", phone: "09120000002", email: "manager@sanjagh.ir", assignedLeads: 5, dealsWon: 4, revenue: 95000000, overdueTasks: 0, activityCount30d: 22, winRate: 80 },
];

export default function TeamPage() {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- retained for future state updates
  const [reps, setReps] = useState<SalesRep[]>(initialReps);
  const [reassignModalOpen, setReassignModalOpen] = useState(false);
  const [selectedRep, setSelectedRep] = useState<SalesRep | null>(null);
  const [targetRepId, setTargetRepId] = useState(initialReps[0].id);

  const totalTeamRevenue = reps.reduce((sum, r) => sum + r.revenue, 0);
  const totalDealsWon = reps.reduce((sum, r) => sum + r.dealsWon, 0);

  const handleBulkReassign = () => {
    if (!selectedRep) return;
    alert(`تعداد ${selectedRep.assignedLeads} سرنخ از «${selectedRep.name}» با موفقیت بازتخصیص یافت.`);
    setReassignModalOpen(false);
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

      {/* Top Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-card border border-border shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-muted-foreground">کل فروش تیمی (۳۰ روز اخیر)</span>
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
                <th className="p-4 font-bold">سرنخ‌های تخصیصی</th>
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
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0">
                        {rep.name[0]}
                      </div>
                      <div>
                        <div>{rep.name}</div>
                        <div className="text-[10px] text-muted-foreground font-mono">{rep.phone}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-muted-foreground">{rep.role}</td>
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
                    <button
                      onClick={() => {
                        setSelectedRep(rep);
                        setReassignModalOpen(true);
                      }}
                      className="px-2.5 py-1.5 rounded-lg border border-border hover:bg-primary hover:text-primary-foreground text-xs font-semibold transition-all flex items-center gap-1 mx-auto"
                      title="بازتخصیص سرنخ‌ها"
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5" />
                      <span>تقسیم کار</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bulk Reassign Modal */}
      {reassignModalOpen && selectedRep && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-card border border-border rounded-3xl shadow-2xl p-6 text-right space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="font-bold text-foreground text-sm">بازتخصیص سرنخ‌های {selectedRep.name}</h3>
              <button
                onClick={() => setReassignModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <p className="text-muted-foreground leading-relaxed">
                این کارشناس در حال حاضر دارای <strong className="text-foreground">{selectedRep.assignedLeads}</strong> سرنخ فعال است. مایلید این سرنخ‌ها به کدام کارشناس منتقل شوند؟
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
                        {r.name} ({r.role})
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
                  onClick={handleBulkReassign}
                  className="px-5 py-2 rounded-xl bg-primary text-primary-foreground font-bold shadow-sm hover:opacity-90"
                >
                  تأیید و انتقال
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
