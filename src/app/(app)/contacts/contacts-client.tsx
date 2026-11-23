"use client";

import React, { useState } from "react";
import Link from "next/link";
import { formatNumber } from "@/lib/utils";
import { formatJalaliDate } from "@/lib/jalali";
import { SerializableContact } from "@/server/contacts";
import { createContactAction, deleteContactAction } from "@/server/actions/contacts";
import { Source, Priority, ContactKind } from "@prisma/client";
import {
  Users,
  Search,
  Plus,
  Eye,
  Trash2,
  X,
} from "lucide-react";

export default function ContactsClient({
  initialContacts,
}: {
  initialContacts: SerializableContact[];
}) {
  const [contacts, setContacts] = useState<SerializableContact[]>(initialContacts);
  const [search, setSearch] = useState("");
  const [selectedTag, setSelectedTag] = useState<string>("ALL");
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [newContact, setNewContact] = useState({
    fullName: "",
    company: "",
    phone: "",
    email: "",
    city: "تهران",
    source: "WEBSITE" as Source,
    priority: "HIGH" as Priority,
    tagInput: "",
  });

  const filteredContacts = contacts.filter((c) => {
    const matchesSearch =
      c.fullName.includes(search) ||
      (c.company && c.company.includes(search)) ||
      (c.phone && c.phone.includes(search)) ||
      (c.email && c.email.includes(search));

    const matchesTag = selectedTag === "ALL" || c.tags.includes(selectedTag);

    return matchesSearch && matchesTag;
  });

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContact.fullName.trim()) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    const tags = newContact.tagInput
      ? newContact.tagInput.split(",").map((t) => t.trim()).filter(Boolean)
      : ["مشتری"];

    const res = await createContactAction({
      fullName: newContact.fullName,
      company: newContact.company || null,
      phone: newContact.phone || null,
      email: newContact.email || null,
      city: newContact.city || null,
      source: newContact.source,
      priority: newContact.priority,
      kind: ContactKind.CUSTOMER,
      tags,
    });

    setIsSubmitting(false);

    if (!res.ok) {
      setErrorMessage(res.error || "خطا در ثبت مشتری");
      return;
    }

    if (res.data?.id) {
      const createdItem: SerializableContact = {
        id: res.data.id,
        kind: ContactKind.CUSTOMER,
        fullName: newContact.fullName,
        company: newContact.company || null,
        phone: newContact.phone || null,
        email: newContact.email || null,
        city: newContact.city || null,
        source: newContact.source,
        sourceNote: null,
        leadStatus: "NEW",
        priority: newContact.priority,
        score: 25,
        tags,
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
      setContacts([createdItem, ...contacts]);
    }

    setShowAddModal(false);
    setNewContact({
      fullName: "",
      company: "",
      phone: "",
      email: "",
      city: "تهران",
      source: "WEBSITE",
      priority: "HIGH",
      tagInput: "",
    });
  };

  const handleDeleteContact = async (id: string) => {
    if (!confirm("آیا از حذف این مشتری اطمینان دارید؟")) return;
    const res = await deleteContactAction(id);
    if (res.ok) {
      setContacts(contacts.filter((c) => c.id !== id));
    } else {
      alert(res.error || "خطا در حذف مشتری");
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Title & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground flex items-center gap-2.5">
            <Users className="w-6 h-6 text-primary" />
            مشتریان (Customers)
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            بانک اطلاعات مشتریان تبدیل‌شده، سابقه خریدها و اطلاعات ارتباطی
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-sm hover:opacity-90 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>ثبت مشتری جدید</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-card border border-border shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="جستجو بر اساس نام، شرکت، تلفن..."
            className="w-full pl-3 pr-9 py-2 bg-muted/40 hover:bg-muted/70 focus:bg-background border border-border rounded-xl text-xs transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>

        {/* Filter tags */}
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          <span className="text-xs font-semibold text-muted-foreground shrink-0">برچسب:</span>
          {["ALL", "VIP", "نرم‌افزار", "پزشکی", "آموزش", "گردشگری"].map((t) => (
            <button
              key={t}
              onClick={() => setSelectedTag(t)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all shrink-0 ${
                selectedTag === t
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "ALL" ? "همه مشتریان" : t}
            </button>
          ))}
        </div>
      </div>

      {/* Contacts Table */}
      <div className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-muted-foreground">
                <th className="p-4 font-bold">نام و نام خانوادگی</th>
                <th className="p-4 font-bold">شرکت / سازمان</th>
                <th className="p-4 font-bold">شماره تماس</th>
                <th className="p-4 font-bold">شهر</th>
                <th className="p-4 font-bold">مجموع خرید (تومان)</th>
                <th className="p-4 font-bold">تاریخ ثبت</th>
                <th className="p-4 font-bold">برچسب‌ها</th>
                <th className="p-4 font-bold text-center">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredContacts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-muted-foreground">
                    مشتری با این مشخصات یافت نشد.
                  </td>
                </tr>
              ) : (
                filteredContacts.map((contact) => (
                  <tr key={contact.id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-4">
                      <Link
                        href={`/contacts/${contact.id}`}
                        className="font-bold text-foreground hover:text-primary transition-colors flex items-center gap-2"
                      >
                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0">
                          {contact.fullName[0]}
                        </div>
                        <div>
                          <div>{contact.fullName}</div>
                          <div className="text-[10px] text-muted-foreground">{contact.email || "-"}</div>
                        </div>
                      </Link>
                    </td>
                    <td className="p-4 font-medium text-foreground">{contact.company || "-"}</td>
                    <td className="p-4 font-mono text-muted-foreground">{contact.phone || "-"}</td>
                    <td className="p-4 text-muted-foreground">{contact.city || "-"}</td>
                    <td className="p-4 font-bold font-mono text-foreground">
                      {formatNumber(contact.totalSpent)}
                    </td>
                    <td className="p-4 text-muted-foreground font-mono">
                      {formatJalaliDate(contact.createdAt, "short")}
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1">
                        {contact.tags.map((tg) => (
                          <span
                            key={tg}
                            className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20"
                          >
                            {tg}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Link
                          href={`/contacts/${contact.id}`}
                          className="p-1.5 rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-primary transition-colors"
                          title="پروفایل مشتری ۳۶۰ درجه"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => handleDeleteContact(contact.id)}
                          className="p-1.5 rounded-lg border border-border hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                          title="حذف"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Contact Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-card border border-border rounded-3xl shadow-2xl p-6 text-right space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="font-bold text-foreground text-sm">ثبت مشتری جدید در سامانه</h3>
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

            <form onSubmit={handleAddContact} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold mb-1">نام و نام خانوادگی *</label>
                <input
                  type="text"
                  required
                  value={newContact.fullName}
                  onChange={(e) => setNewContact({ ...newContact, fullName: e.target.value })}
                  placeholder="مثال: مهندس رامین خسروی"
                  className="w-full p-2.5 bg-muted/40 border border-border rounded-xl focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">شرکت یا نام برند</label>
                  <input
                    type="text"
                    value={newContact.company}
                    onChange={(e) => setNewContact({ ...newContact, company: e.target.value })}
                    placeholder="شرکت تجهیزات هوشمند"
                    className="w-full p-2.5 bg-muted/40 border border-border rounded-xl focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">شماره تماس (انگلیسی)</label>
                  <input
                    type="text"
                    value={newContact.phone}
                    onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                    placeholder="09121234567"
                    className="w-full p-2.5 bg-muted/40 border border-border rounded-xl focus:outline-none focus:border-primary font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">ایمیل</label>
                  <input
                    type="email"
                    value={newContact.email}
                    onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                    placeholder="info@company.ir"
                    className="w-full p-2.5 bg-muted/40 border border-border rounded-xl focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">شهر</label>
                  <input
                    type="text"
                    value={newContact.city}
                    onChange={(e) => setNewContact({ ...newContact, city: e.target.value })}
                    className="w-full p-2.5 bg-muted/40 border border-border rounded-xl focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">برچسب‌ها (با کاما جدا کنید)</label>
                <input
                  type="text"
                  value={newContact.tagInput}
                  onChange={(e) => setNewContact({ ...newContact, tagInput: e.target.value })}
                  placeholder="VIP, سخت‌افزار, قرارداد سالانه"
                  className="w-full p-2.5 bg-muted/40 border border-border rounded-xl focus:outline-none focus:border-primary"
                />
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
                  {isSubmitting ? "در حال ذخیره..." : "ذخیره مشتری"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
