"use client";

import React, { useState } from "react";
import Link from "next/link";
import { SerializableContact, AssignableUser } from "@/server/contacts";
import {
  createContactAction,
  deleteContactAction,
  convertLeadToCustomerAction,
  assignOwnerAction,
  assignManyAction,
} from "@/server/actions/contacts";
import { useUser } from "@/components/auth/user-context";
import { OwnerSelect } from "@/components/contacts/owner-select";
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
  assignableUsers,
}: {
  initialLeads: SerializableContact[];
  assignableUsers: AssignableUser[];
}) {
  const { user } = useUser();
  const canAssign = user.role === "ADMIN" || user.role === "MANAGER";

  const defaultOwnerId = canAssign
    ? assignableUsers.some((u) => u.id === user.id)
      ? user.id
      : null
    : user.id;

  const [leads, setLeads] = useState<SerializableContact[]>(initialLeads);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [showAddModal, setShowAddModal] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [assigningId, setAssigningId] = useState<string | null>(null);

  // Bulk assign state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkOwnerId, setBulkOwnerId] = useState<string | null>(
    assignableUsers[0]?.id ?? null
  );
  const [isBulkAssigning, setIsBulkAssigning] = useState(false);

  const [newLead, setNewLead] = useState<{
    fullName: string;
    company: string;
    phone: string;
    email: string;
    source: Source;
    priority: Priority;
    ownerId: string | null;
  }>({
    fullName: "",
    company: "",
    phone: "",
    email: "",
    source: "WEBSITE",
    priority: "HIGH",
    ownerId: defaultOwnerId,
  });

  const filteredLeads = leads.filter((l) => {
    const matchesSearch =
      l.fullName.includes(search) ||
      (l.company && l.company.includes(search)) ||
      (l.phone && l.phone.includes(search));

    const matchesStatus = statusFilter === "ALL" || l.leadStatus === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const allFilteredSelected =
    filteredLeads.length > 0 &&
    filteredLeads.every((l) => selectedIds.includes(l.id));

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      const filteredSet = new Set(filteredLeads.map((l) => l.id));
      setSelectedIds(selectedIds.filter((id) => !filteredSet.has(id)));
    } else {
      const merged = new Set([...selectedIds, ...filteredLeads.map((l) => l.id)]);
      setSelectedIds(Array.from(merged));
    }
  };

  const toggleSelectRow = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const showToast = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const handleConvertLead = async (id: string, name: string) => {
    const res = await convertLeadToCustomerAction(id);
    if (!res.ok) {
      alert(res.error || "خطا در تبدیل سرنخ");
      return;
    }

    setLeads(leads.filter((l) => l.id !== id));
    setSelectedIds((prev) => prev.filter((item) => item !== id));
    showToast(`سرنخ «${name}» با موفقیت به مشتری دائم تبدیل شد و به بخش مشتریان انتقال یافت.`);
  };

  const handleDeleteLead = async (id: string) => {
    if (!confirm("آیا از حذف این سرنخ اطمینان دارید؟")) return;
    const res = await deleteContactAction(id);
    if (res.ok) {
      setLeads(leads.filter((l) => l.id !== id));
      setSelectedIds((prev) => prev.filter((item) => item !== id));
    } else {
      alert(res.error || "خطا در حذف سرنخ");
    }
  };

  const handleAssignOwner = async (contactId: string, newOwnerId: string | null) => {
    setAssigningId(contactId);
    const res = await assignOwnerAction({ contactId, ownerId: newOwnerId });
    setAssigningId(null);

    if (!res.ok) {
      alert(res.error || "خطا در تخصیص کارشناس");
      return;
    }

    const updatedOwnerName = res.data?.ownerName ?? null;
    setLeads((prev) =>
      prev.map((l) =>
        l.id === contactId
          ? { ...l, ownerId: newOwnerId, ownerName: updatedOwnerName }
          : l
      )
    );
    showToast(
      updatedOwnerName
        ? `سرنخ با موفقیت به «${updatedOwnerName}» تخصیص داده شد.`
        : "تخصیص سرنخ برداشته شد."
    );
  };

  const handleBulkAssign = async () => {
    if (selectedIds.length === 0) return;
    setIsBulkAssigning(true);
    const res = await assignManyAction({
      contactIds: selectedIds,
      ownerId: bulkOwnerId,
    });
    setIsBulkAssigning(false);

    if (!res.ok) {
      alert(res.error || "خطا در تخصیص گروهی");
      return;
    }

    const updatedOwnerName = res.data?.ownerName ?? null;
    const selectedSet = new Set(selectedIds);
    setLeads((prev) =>
      prev.map((l) =>
        selectedSet.has(l.id)
          ? { ...l, ownerId: bulkOwnerId, ownerName: updatedOwnerName }
          : l
      )
    );
    const count = res.data?.count ?? selectedIds.length;
    setSelectedIds([]);
    showToast(
      updatedOwnerName
        ? `${count} سرنخ با موفقیت به «${updatedOwnerName}» تخصیص داده شد.`
        : `تخصیص ${count} سرنخ برداشته شد.`
    );
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
      ...(canAssign ? { ownerId: newLead.ownerId } : {}),
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
        score: res.data.score ?? 60,
        tags: [],
        notes: null,
        ownerId: res.data.ownerId ?? null,
        ownerName: res.data.ownerName ?? null,
        createdById: user.id,
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
      ownerId: defaultOwnerId,
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

      {statusMessage && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs font-bold flex items-center gap-2 transition-all">
          <CheckCircle2 className="w-4 h-4" />
          <span>{statusMessage}</span>
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

      {/* Bulk Assign Toolbar for MANAGER / ADMIN */}
      {canAssign && selectedIds.length > 0 && (
        <div className="p-3.5 rounded-2xl bg-primary/5 border border-primary/20 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 font-bold text-primary">
            <span>{selectedIds.length} سرنخ انتخاب شده</span>
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="text-[11px] font-medium text-muted-foreground hover:text-foreground underline"
            >
              لغو انتخاب
            </button>
          </div>
          <div className="flex items-center gap-2">
            <OwnerSelect
              users={assignableUsers}
              value={bulkOwnerId}
              onChange={setBulkOwnerId}
              compact
              disabled={isBulkAssigning}
            />
            <button
              type="button"
              onClick={handleBulkAssign}
              disabled={isBulkAssigning}
              className="px-3.5 py-1.5 rounded-xl bg-primary text-primary-foreground font-bold shadow-sm hover:opacity-90 disabled:opacity-50 transition-all"
            >
              {isBulkAssigning ? "در حال تخصیص..." : "تخصیص به کارشناس"}
            </button>
          </div>
        </div>
      )}

      {/* Leads Table */}
      <div className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-muted-foreground">
                {canAssign && (
                  <th className="p-4 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={allFilteredSelected}
                      onChange={toggleSelectAll}
                      aria-label="انتخاب همه"
                      className="rounded border-border accent-primary cursor-pointer"
                    />
                  </th>
                )}
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
                  <td colSpan={canAssign ? 10 : 9} className="text-center py-12 text-muted-foreground">
                    هیچ سرنخی با این فیلتر پیدا نشد.
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => {
                  const isHot = lead.score >= 80;
                  const isSelected = selectedIds.includes(lead.id);
                  return (
                    <tr
                      key={lead.id}
                      className={`hover:bg-muted/30 transition-colors ${isSelected ? "bg-primary/5" : ""}`}
                    >
                      {canAssign && (
                        <td className="p-4 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectRow(lead.id)}
                            aria-label={`انتخاب ${lead.fullName}`}
                            className="rounded border-border accent-primary cursor-pointer"
                          />
                        </td>
                      )}
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
                      <td className="p-4 text-muted-foreground">
                        {canAssign ? (
                          <OwnerSelect
                            users={assignableUsers}
                            value={lead.ownerId}
                            onChange={(ownerId) => handleAssignOwner(lead.id, ownerId)}
                            compact
                            disabled={assigningId === lead.id}
                          />
                        ) : (
                          <span>{lead.ownerName || "تخصیص‌نیافته"}</span>
                        )}
                      </td>
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

              {canAssign && (
                <div>
                  <label className="block font-semibold mb-1">کارشناس مسئول</label>
                  <OwnerSelect
                    users={assignableUsers}
                    value={newLead.ownerId}
                    onChange={(ownerId) => setNewLead({ ...newLead, ownerId })}
                  />
                </div>
              )}

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
