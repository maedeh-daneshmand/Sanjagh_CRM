"use client";

import React, { useState } from "react";
import Link from "next/link";
import { SerializableContact } from "@/server/contacts";
import {
  createContactAction,
  deleteContactAction,
  convertLeadToCustomerAction,
} from "@/server/actions/contacts";
import { Source, Priority, ContactKind, LeadStatus } from "@prisma/client";
import { formatJalaliDate } from "@/lib/jalali";
import {
  UserCheck,
  Search,
  Plus,
  ArrowRightLeft,
  Flame,
  CheckCircle2,
  Trash2,
  X,
} from "lucide-react";

export default function LeadsClient({
  initialLeads,
}: {
  initialLeads: SerializableContact[];
}) {
  const [leads, setLeads] = useState<SerializableContact[]>(initialLeads);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [showAddModal, setShowAddModal] = useState(false);
  const [conversionMessage, setConversionMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [newLead, setNewLead] = useState({
    fullName: "",
    company: "",
    phone: "",
    email: "",
    source: "WEBSITE" as Source,
    priority: "HIGH" as Priority,
  });

  const filteredLeads = leads.filter((l) => {
    const matchesSearch =
      l.fullName.includes(search) ||
      (l.company && l.company.includes(search)) ||
      (l.phone && l.phone.includes(search));

    const matchesStatus = statusFilter === "ALL" || l.leadStatus === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleConvertLead = async (id: string, name: string) => {
    const res = await convertLeadToCustomerAction(id);
    if (!res.ok) {
      alert(res.error || "خطا در تبدیل سرنخ");
      return;
    }

    setLeads(leads.filter((l) => l.id !== id));
    setConversionMessage(`سرنخ «${name}» با موفقیت به مشتری دائم تبدیل شد و به بخش مشتریان انتقال یافت.`);
    setTimeout(() => setConversionMessage(null), 4000);
  };

  const handleDeleteLead = async (id: string) => {
    if (!confirm("آیا از حذف این سرنخ اطمینان دارید؟")) return;
    const res = await deleteContactAction(id);
    if (res.ok) {
      setLeads(leads.filter((l) => l.id !== id));
    } else {
      alert(res.error || "خطا در حذف سرنخ");
    }
  };

  const handleAddLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLead.fullName.trim()) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    const res = await createContactAction({
      fullName: newLead.fullName,
      company: newLead.company || null,
      phone: newLead.phone || null,
      email: newLead.email || null,
      source: newLead.source,
      priority: newLead.priority,
      kind: ContactKind.LEAD,
      leadStatus: LeadStatus.NEW,
    });

    setIsSubmitting(false);

    if (!res.ok) {
      setErrorMessage(res.error || "خطا در ثبت سرنخ");
      return;
    }

    if (res.data?.id) {
      const createdItem: SerializableContact = {
        id: res.data.id,
        kind: ContactKind.LEAD,
        fullName: newLead.fullName,
        company: newLead.company || null,
        phone: newLead.phone || null,
        email: newLead.email || null,
        city: null,
        source: newLead.source,
        sourceNote: null,
        leadStatus: LeadStatus.NEW,
        priority: newLead.priority,
        score: 60,
        tags: [],
        notes: null,
        ownerId: null,
        ownerName: null,
        createdById: "",
        convertedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        dealsCount: 0,
        totalSpent: 0,
      };
      setLeads([createdItem, ...leads]);
    }

    setShowAddModal(false);
    setNewLead({
      fullName: "",
      company: "",
      phone: "",
      email: "",
      source: "WEBSITE",
      priority: "HIGH",
    });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground flex items-center gap-2.5">
            <UserCheck className="w-6 h-6 text-primary" />
            سرنخ‌های فروش (Leads)
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            پیگیری مشتریان بالقوه، محاسبه امتیاز حرارتی (Lead Score) و تبدیل به مشتری
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-sm hover:opacity-90 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>ثبت سرنخ جدید</span>
        </button>
      </div>

      {conversionMessage && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs font-bold flex items-center gap-2 transition-all">
          <CheckCircle2 className="w-4 h-4" />
          <span>{conversionMessage}</span>
        </div>
      )}

      {/* Filters and Search */}
      <div className="p-4 rounded-2xl bg-card border border-border shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="جستجو در سرنخ‌ها..."
            className="w-full pl-3 pr-9 py-2 bg-muted/40 hover:bg-muted/70 focus:bg-background border border-border rounded-xl text-xs transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          <span className="text-xs font-semibold text-muted-foreground shrink-0">وضعیت:</span>
          {[
            { id: "ALL", name: "همه سرنخ‌ها" },
            { id: "NEW", name: "جدید" },
            { id: "CONTACTED", name: "تماس گرفته شد" },
            { id: "QUALIFIED", name: "واجد شرایط" },
            { id: "LOST", name: "از دست رفته" },
          ].map((st) => (
            <button
              key={st.id}
              onClick={() => setStatusFilter(st.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all shrink-0 ${
                statusFilter === st.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {st.name}
            </button>
          ))}
        </div>
      </div>

      {/* Leads Table */}
      <div className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-muted-foreground">
                <th className="p-4 font-bold">نام سرنخ</th>
                <th className="p-4 font-bold">شرکت / صنف</th>
                <th className="p-4 font-bold">شماره تماس</th>
                <th className="p-4 font-bold">کانال ورود</th>
                <th className="p-4 font-bold">وضعیت پیگیری</th>
                <th className="p-4 font-bold">امتیاز حرارتی (Score)</th>
                <th className="p-4 font-bold">کارشناس مسئول</th>
                <th className="p-4 font-bold">تاریخ ثبت</th>
                <th className="p-4 font-bold text-center">اقدام</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-muted-foreground">
                    هیچ سرنخی با این فیلتر پیدا نشد.
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => {
                  const isHot = lead.score >= 80;
                  return (
                    <tr key={lead.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-4 font-bold text-foreground">
                        <Link href={`/contacts/${lead.id}`} className="hover:text-primary transition-colors">
                          {lead.fullName}
                        </Link>
                      </td>
                      <td className="p-4 text-muted-foreground">{lead.company || "-"}</td>
                      <td className="p-4 font-mono text-muted-foreground">{lead.phone || "-"}</td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded-md text-[10px] bg-muted text-foreground">
                          {lead.source}
                        </span>
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                            lead.leadStatus === "NEW"
                              ? "bg-blue-500/10 text-blue-600 border-blue-500/20"
                              : lead.leadStatus === "CONTACTED"
                              ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                              : lead.leadStatus === "QUALIFIED"
                              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                              : "bg-rose-500/10 text-rose-600 border-rose-500/20"
                          }`}
                        >
                          {lead.leadStatus === "NEW"
                            ? "جدید"
                            : lead.leadStatus === "CONTACTED"
                            ? "تماس برقرار شد"
                            : lead.leadStatus === "QUALIFIED"
                            ? "واجد شرایط خرید"
                            : "ناموفق"}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1.5 font-bold font-mono">
                          {isHot && <Flame className="w-4 h-4 text-rose-500 animate-pulse" />}
                          <span className={isHot ? "text-rose-500" : "text-foreground"}>
                            {lead.score} / 100
                          </span>
                        </div>
                      </td>
                      <td className="p-4 text-muted-foreground">{lead.ownerName || "تخصیص‌نیافته"}</td>
                      <td className="p-4 text-muted-foreground font-mono">
                        {formatJalaliDate(lead.createdAt, "short")}
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleConvertLead(lead.id, lead.fullName)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold text-[11px] shadow-sm hover:bg-emerald-700 transition-colors"
                            title="تبدیل به مشتری دائم (Lead -> Customer)"
                          >
                            <ArrowRightLeft className="w-3.5 h-3.5" />
                            <span>تبدیل به مشتری</span>
                          </button>
                          <button
                            onClick={() => handleDeleteLead(lead.id)}
                            className="p-1.5 rounded-lg border border-border hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                            title="حذف"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Lead Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-card border border-border rounded-3xl shadow-2xl p-6 text-right space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="font-bold text-foreground text-sm">ثبت سرنخ جدید در قیف فروش</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-xs font-semibold">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleAddLead} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold mb-1">نام سرنخ یا متقاضی *</label>
                <input
                  type="text"
                  required
                  value={newLead.fullName}
                  onChange={(e) => setNewLead({ ...newLead, fullName: e.target.value })}
                  placeholder="مثال: مهرداد خسروی"
                  className="w-full p-2.5 bg-muted/40 border border-border rounded-xl focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">شرکت یا کسب‌وکار</label>
                  <input
                    type="text"
                    value={newLead.company}
                    onChange={(e) => setNewLead({ ...newLead, company: e.target.value })}
                    placeholder="بازرگانی پارس"
                    className="w-full p-2.5 bg-muted/40 border border-border rounded-xl focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">شماره تماس (انگلیسی)</label>
                  <input
                    type="text"
                    value={newLead.phone}
                    onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })}
                    placeholder="09121234567"
                    className="w-full p-2.5 bg-muted/40 border border-border rounded-xl focus:outline-none focus:border-primary font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">منبع ورودی</label>
                  <select
                    value={newLead.source}
                    onChange={(e) => setNewLead({ ...newLead, source: e.target.value as Source })}
                    className="w-full p-2.5 bg-muted/40 border border-border rounded-xl focus:outline-none focus:border-primary"
                  >
                    <option value="WEBSITE">وب‌سایت</option>
                    <option value="INSTAGRAM">اینستاگرام</option>
                    <option value="TELEGRAM">تلگرام</option>
                    <option value="PHONE">تماس تلفنی</option>
                    <option value="REFERRAL">معرفی</option>
                    <option value="EVENT">رویداد</option>
                    <option value="OTHER">سایر</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">اولویت</label>
                  <select
                    value={newLead.priority}
                    onChange={(e) => setNewLead({ ...newLead, priority: e.target.value as Priority })}
                    className="w-full p-2.5 bg-muted/40 border border-border rounded-xl focus:outline-none focus:border-primary"
                  >
                    <option value="HIGH">بالا (فوری)</option>
                    <option value="MEDIUM">متوسط</option>
                    <option value="LOW">پایین</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl border border-border hover:bg-muted text-muted-foreground font-semibold"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-primary text-primary-foreground font-bold shadow-sm hover:opacity-90 disabled:opacity-50"
                >
                  {isSubmitting ? "در حال ذخیره..." : "ذخیره سرنخ"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
