"use client";

import React, { useState } from "react";
import Link from "next/link";
import { formatNumber } from "@/lib/utils";
import {
  Users,
  Search,
  Plus,
  Eye,
  Trash2,
  X,
} from "lucide-react";

interface ContactItem {
  id: string;
  fullName: string;
  company: string;
  phone: string;
  email: string;
  city: string;
  source: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  tags: string[];
  dealsCount: number;
  totalSpent: number;
  createdAt: string;
}

const mockCustomers: ContactItem[] = [
  { id: "c1", fullName: "مهندس کامران رستمی", company: "توسعه نرم‌افزار نوین", phone: "0910000001", email: "rostami@novin.com", city: "تهران", source: "وب‌سایت", priority: "HIGH", tags: ["VIP", "نرم‌افزار"], dealsCount: 2, totalSpent: 125000000, createdAt: "1403/07/12" },
  { id: "c2", fullName: "دکتر نیلوفر سپهری", company: "کلینیک دندانپزشکی مهر", phone: "0910000002", email: "sepehri@mehr.ir", city: "اصفهان", source: "معرفی", priority: "HIGH", tags: ["پزشکی", "قرارداد سالانه"], dealsCount: 1, totalSpent: 32500000, createdAt: "1403/07/18" },
  { id: "c3", fullName: "پیمان صادقی", company: "بازرگانی جهان گستر", phone: "0910000003", email: "sadeghi@jg.ir", city: "مشهد", source: "تماس تلفنی", priority: "MEDIUM", tags: ["بازرگانی"], dealsCount: 3, totalSpent: 180000000, createdAt: "1403/07/25" },
  { id: "c4", fullName: "زهرا ملکی", company: "آژانس مسافرتی پرواز", phone: "0910000004", email: "maleki@parvaz.com", city: "شیراز", source: "اینستاگرام", priority: "MEDIUM", tags: ["گردشگری"], dealsCount: 1, totalSpent: 14200000, createdAt: "1403/08/02" },
  { id: "c5", fullName: "فاطمه بهرامی", company: "موسسه آموزشی رشد", phone: "0910000006", email: "bahrami@roshd.org", city: "تهران", source: "وب‌سایت", priority: "HIGH", tags: ["آموزش", "VIP"], dealsCount: 2, totalSpent: 84000000, createdAt: "1403/08/10" },
  { id: "c6", fullName: "محسن کریمی", company: "صنایع غذایی ترنج", phone: "0910000007", email: "karimi@toranj.ir", city: "کرج", source: "تلگرام", priority: "MEDIUM", tags: ["صنایع غذایی"], dealsCount: 1, totalSpent: 45000000, createdAt: "1403/08/15" },
  { id: "c7", fullName: "شیما حیدری", company: "داروسازی سینا", phone: "0910000010", email: "heidari@sina-pharma.ir", city: "تهران", source: "معرفی", priority: "HIGH", tags: ["داروسازی", "VIP"], dealsCount: 2, totalSpent: 98000000, createdAt: "1403/08/20" },
];

export default function ContactsPage() {
  const [contacts, setContacts] = useState<ContactItem[]>(mockCustomers);
  const [search, setSearch] = useState("");
  const [selectedTag, setSelectedTag] = useState<string>("ALL");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newContact, setNewContact] = useState({
    fullName: "",
    company: "",
    phone: "",
    email: "",
    city: "تهران",
    source: "وب‌سایت",
    priority: "HIGH" as "HIGH" | "MEDIUM" | "LOW",
    tagInput: "",
  });

  const filteredContacts = contacts.filter((c) => {
    const matchesSearch =
      c.fullName.includes(search) ||
      c.company.includes(search) ||
      c.phone.includes(search) ||
      c.email.includes(search);

    const matchesTag = selectedTag === "ALL" || c.tags.includes(selectedTag);

    return matchesSearch && matchesTag;
  });

  const handleAddContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContact.fullName) return;

    const tags = newContact.tagInput
      ? newContact.tagInput.split(",").map((t) => t.trim())
      : ["مشتری"];

    const created: ContactItem = {
      id: `c_${Date.now()}`,
      fullName: newContact.fullName,
      company: newContact.company || "شخصی",
      phone: newContact.phone || "09120000000",
      email: newContact.email || "-",
      city: newContact.city,
      source: newContact.source,
      priority: newContact.priority,
      tags,
      dealsCount: 0,
      totalSpent: 0,
      createdAt: "1403/08/30",
    };

    setContacts([created, ...contacts]);
    setShowAddModal(false);
    setNewContact({
      fullName: "",
      company: "",
      phone: "",
      email: "",
      city: "تهران",
      source: "وب‌سایت",
      priority: "HIGH",
      tagInput: "",
    });
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
                <th className="p-4 font-bold">برچسب‌ها</th>
                <th className="p-4 font-bold text-center">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredContacts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-muted-foreground">
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
                          <div className="text-[10px] text-muted-foreground">{contact.email}</div>
                        </div>
                      </Link>
                    </td>
                    <td className="p-4 font-medium text-foreground">{contact.company}</td>
                    <td className="p-4 font-mono text-muted-foreground">{contact.phone}</td>
                    <td className="p-4 text-muted-foreground">{contact.city}</td>
                    <td className="p-4 font-bold font-mono text-foreground">
                      {formatNumber(contact.totalSpent)}
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
                          onClick={() => setContacts(contacts.filter((c) => c.id !== contact.id))}
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
                  className="px-5 py-2 rounded-xl bg-primary text-primary-foreground font-bold shadow-sm hover:opacity-90"
                >
                  ذخیره مشتری
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
