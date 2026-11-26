"use client";

import React, { useState } from "react";
import { Role } from "@prisma/client";
import type { SerializableUser } from "@/server/users";
import {
  createUserAction,
  changeUserRoleAction,
  toggleUserActiveAction,
} from "@/server/actions/users";
import { formatJalaliDate } from "@/lib/jalali";
import {
  Shield,
  Plus,
  UserCheck,
  UserX,
  CheckCircle2,
  X,
} from "lucide-react";

export default function UsersClient({
  initialUsers,
  currentUserId,
}: {
  initialUsers: SerializableUser[];
  currentUserId: string;
}) {
  const [users, setUsers] = useState<SerializableUser[]>(initialUsers);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const [newUser, setNewUser] = useState<{
    name: string;
    phone: string;
    email: string;
    role: Role;
  }>({
    name: "",
    phone: "",
    email: "",
    role: Role.SALES,
  });

  const showToast = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.name.trim() || !newUser.phone.trim()) return;

    setIsSubmitting(true);
    setFormError(null);

    const res = await createUserAction(newUser);
    setIsSubmitting(false);

    if (!res.ok || !res.data) {
      setFormError(res.error || "خطا در ایجاد کاربر");
      return;
    }

    setUsers([res.data, ...users]);
    setShowAddModal(false);
    setNewUser({ name: "", phone: "", email: "", role: Role.SALES });
    showToast(`کاربر «${res.data.name}» با موفقیت اضافه شد.`);
  };

  const handleRoleChange = async (userId: string, role: Role) => {
    const res = await changeUserRoleAction({ userId, role });
    if (!res.ok) {
      alert(res.error || "خطا در تغییر نقش");
      return;
    }
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role } : u)));
    showToast("نقش کاربر با موفقیت به‌روزرسانی شد.");
  };

  const handleToggleActive = async (userId: string, nextActive: boolean) => {
    const res = await toggleUserActiveAction({ userId, isActive: nextActive });
    if (!res.ok) {
      alert(res.error || "خطا در تغییر وضعیت کاربر");
      return;
    }
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, isActive: nextActive } : u))
    );
    showToast(
      nextActive
        ? "حساب کاربر فعال شد."
        : "حساب کاربر غیرفعال شد و تمام نشست‌های فعال آن بسته شدند."
    );
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground flex items-center gap-2.5">
            <Shield className="w-6 h-6 text-primary" />
            مدیریت کاربران و دسترسی‌ها
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            تعریف کارشناسان فروش، تعیین سطح دسترسی و فعال/غیرفعال‌سازی حساب‌ها
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-sm hover:opacity-90 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>افزودن کاربر جدید</span>
        </button>
      </div>

      {statusMessage && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Users Table */}
      <div className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-muted-foreground">
                <th className="p-4 font-bold">نام و نام خانوادگی</th>
                <th className="p-4 font-bold">شماره موبایل (شناسه ورود)</th>
                <th className="p-4 font-bold">نقش کاربری</th>
                <th className="p-4 font-bold">آمار (مخاطب / معامله)</th>
                <th className="p-4 font-bold">تاریخ عضویت</th>
                <th className="p-4 font-bold">وضعیت</th>
                <th className="p-4 font-bold text-center">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((u) => {
                const isSelf = u.id === currentUserId;
                return (
                  <tr key={u.id} className={`hover:bg-muted/30 transition-colors ${!u.isActive ? "opacity-60" : ""}`}>
                    <td className="p-4 font-bold text-foreground">
                      <div>{u.name}</div>
                      {u.email && (
                        <div className="text-[10px] text-muted-foreground font-normal">{u.email}</div>
                      )}
                    </td>
                    <td className="p-4 font-mono text-muted-foreground">{u.phone}</td>
                    <td className="p-4">
                      <select
                        value={u.role}
                        disabled={isSelf}
                        onChange={(e) => handleRoleChange(u.id, e.target.value as Role)}
                        className="p-1.5 bg-muted/40 border border-border rounded-lg text-xs font-semibold focus:outline-none focus:border-primary disabled:opacity-60"
                      >
                        <option value="ADMIN">مدیر ارشد (ADMIN)</option>
                        <option value="MANAGER">مدیر فروش (MANAGER)</option>
                        <option value="SALES">کارشناس فروش (SALES)</option>
                      </select>
                    </td>
                    <td className="p-4 font-mono text-muted-foreground">
                      {u._count.ownedContacts} مخاطب • {u._count.ownedDeals} معامله
                    </td>
                    <td className="p-4 font-mono text-muted-foreground">
                      {formatJalaliDate(u.createdAt, "short")}
                    </td>
                    <td className="p-4">
                      {u.isActive ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                          فعال
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600 border border-rose-500/20">
                          غیرفعال
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      {!isSelf ? (
                        <button
                          type="button"
                          onClick={() => handleToggleActive(u.id, !u.isActive)}
                          className={`px-3 py-1.5 rounded-lg border text-[11px] font-semibold transition-all inline-flex items-center gap-1 ${
                            u.isActive
                              ? "border-rose-500/30 text-rose-600 hover:bg-rose-500/10"
                              : "border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10"
                          }`}
                        >
                          {u.isActive ? (
                            <>
                              <UserX className="w-3.5 h-3.5" />
                              <span>غیرفعال‌سازی</span>
                            </>
                          ) : (
                            <>
                              <UserCheck className="w-3.5 h-3.5" />
                              <span>فعال‌سازی</span>
                            </>
                          )}
                        </button>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">حساب جاری</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-card border border-border rounded-3xl shadow-2xl p-6 text-right space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="font-bold text-foreground text-sm">افزودن کاربر جدید</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-xs font-semibold">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold mb-1">نام و نام خانوادگی *</label>
                <input
                  type="text"
                  required
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  placeholder="مثال: سارا محمدی"
                  className="w-full p-2.5 bg-muted/40 border border-border rounded-xl focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">شماره موبایل (انگلیسی) *</label>
                <input
                  type="tel"
                  required
                  value={newUser.phone}
                  onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                  placeholder="09120000010"
                  dir="ltr"
                  className="w-full p-2.5 bg-muted/40 border border-border rounded-xl focus:outline-none focus:border-primary font-mono text-left"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">ایمیل (اختیاری)</label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="user@sanjagh.ir"
                  className="w-full p-2.5 bg-muted/40 border border-border rounded-xl focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">نقش کاربری</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value as Role })}
                  className="w-full p-2.5 bg-muted/40 border border-border rounded-xl focus:outline-none focus:border-primary"
                >
                  <option value="SALES">کارشناس فروش (SALES)</option>
                  <option value="MANAGER">مدیر فروش (MANAGER)</option>
                  <option value="ADMIN">مدیر ارشد (ADMIN)</option>
                </select>
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
                  {isSubmitting ? "در حال ایجاد..." : "ایجاد کاربر"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
