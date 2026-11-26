"use client";

import React, { useState, useMemo } from "react";
import jalaali from "jalaali-js";
import { Priority, TaskStatus } from "@prisma/client";
import { SerializableTask } from "@/server/tasks";
import { DealContactOption } from "@/server/deals";
import { AssignableUser } from "@/server/contacts";
import {
  createTaskAction,
  toggleTaskDoneAction,
  getTasksByRangeAction,
} from "@/server/actions/tasks";
import { useUser } from "@/components/auth/user-context";
import { OwnerSelect } from "@/components/contacts/owner-select";
import { PERSIAN_MONTH_NAMES, WEEKDAY_NAMES, formatJalaliDate } from "@/lib/jalali";
import {
  Calendar as CalendarIcon,
  ChevronRight,
  ChevronLeft,
  Plus,
  Clock,
  CheckCircle2,
  X,
} from "lucide-react";

function pad(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

function getMonthBoundsIso(jy: number, jm: number) {
  const monthLen = jalaali.jalaaliMonthLength(jy, jm);
  const gStart = jalaali.toGregorian(jy, jm, 1);
  const gEnd = jalaali.toGregorian(jy, jm, monthLen);

  const fromIso = new Date(
    `${gStart.gy}-${pad(gStart.gm)}-${pad(gStart.gd)}T00:00:00.000+03:30`
  ).toISOString();
  const toIso = new Date(
    `${gEnd.gy}-${pad(gEnd.gm)}-${pad(gEnd.gd)}T23:59:59.999+03:30`
  ).toISOString();

  // Saturday-first offset: JS getDay() returns 0=Sun..6=Sat -> (getDay() + 1) % 7 makes Sat=0
  const firstDate = new Date(Date.UTC(gStart.gy, gStart.gm - 1, gStart.gd));
  const startOffset = (firstDate.getUTCDay() + 1) % 7;

  return { monthLen, fromIso, toIso, startOffset };
}

function getTehranJalaliParts(isoString: string): { jy: number; jm: number; jd: number } | null {
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return null;
  const ymd = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tehran",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
  const [gy, gm, gd] = ymd.split("-").map(Number);
  return jalaali.toJalaali(new Date(Date.UTC(gy, gm - 1, gd, 12, 0, 0)));
}

export default function CalendarClient({
  initialYear,
  initialMonth,
  todayJalali,
  initialTasks,
  contactOptions,
  assignableUsers,
}: {
  initialYear: number;
  initialMonth: number;
  todayJalali: { jy: number; jm: number; jd: number };
  initialTasks: SerializableTask[];
  contactOptions: DealContactOption[];
  assignableUsers: AssignableUser[];
}) {
  const { user } = useUser();
  const canAssign = user.role === "ADMIN" || user.role === "MANAGER";

  const [jy, setJy] = useState(initialYear);
  const [jm, setJm] = useState(initialMonth);
  const [selectedDay, setSelectedDay] = useState<number>(todayJalali.jd);
  const [tasks, setTasks] = useState<SerializableTask[]>(initialTasks);
  const [loadingMonth, setLoadingMonth] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [newTask, setNewTask] = useState<{
    title: string;
    description: string;
    priority: Priority;
    dueTime: string;
    assigneeId: string | null;
    contactId: string;
  }>({
    title: "",
    description: "",
    priority: "MEDIUM",
    dueTime: "10:00",
    assigneeId: canAssign ? user.id : null,
    contactId: "",
  });

  const { monthLen, startOffset } = useMemo(() => getMonthBoundsIso(jy, jm), [jy, jm]);
  const daysInMonth = useMemo(
    () => Array.from({ length: monthLen }, (_, i) => i + 1),
    [monthLen]
  );

  const taskEventsByDay = useMemo(() => {
    const map: Record<number, SerializableTask[]> = {};
    for (const t of tasks) {
      if (!t.dueAt) continue;
      const jp = getTehranJalaliParts(t.dueAt);
      if (jp && jp.jy === jy && jp.jm === jm) {
        if (!map[jp.jd]) map[jp.jd] = [];
        map[jp.jd].push(t);
      }
    }
    return map;
  }, [tasks, jy, jm]);

  const navigateMonth = async (delta: -1 | 1) => {
    let nextMonth = jm + delta;
    let nextYear = jy;
    if (nextMonth < 1) {
      nextMonth = 12;
      nextYear -= 1;
    } else if (nextMonth > 12) {
      nextMonth = 1;
      nextYear += 1;
    }

    setJy(nextYear);
    setJm(nextMonth);
    setSelectedDay(1);
    setLoadingMonth(true);

    const { fromIso, toIso } = getMonthBoundsIso(nextYear, nextMonth);
    const res = await getTasksByRangeAction(fromIso, toIso);
    setLoadingMonth(false);

    if (res.ok && res.data) {
      setTasks(res.data);
    }
  };

  const handleToggleDone = async (taskId: string) => {
    const snapshot = tasks;
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              status: t.status === TaskStatus.DONE ? TaskStatus.TODO : TaskStatus.DONE,
            }
          : t
      )
    );

    const res = await toggleTaskDoneAction(taskId);
    if (!res.ok) {
      setTasks(snapshot);
      alert(res.error || "خطا در تغییر وضعیت وظیفه");
    }
  };

  const handleAddEventForDay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title.trim()) return;

    setIsSubmitting(true);
    setFormError(null);

    const gDate = jalaali.toGregorian(jy, jm, selectedDay);
    const dueAtIso = new Date(
      `${gDate.gy}-${pad(gDate.gm)}-${pad(gDate.gd)}T${newTask.dueTime || "10:00"}:00+03:30`
    ).toISOString();

    const res = await createTaskAction({
      title: newTask.title.trim(),
      description: newTask.description.trim() || null,
      priority: newTask.priority,
      dueAt: dueAtIso,
      ...(canAssign && newTask.assigneeId ? { assigneeId: newTask.assigneeId } : {}),
      contactId: newTask.contactId || null,
    });

    setIsSubmitting(false);

    if (!res.ok || !res.data) {
      setFormError(res.error || "خطا در ثبت رویداد");
      return;
    }

    setTasks((prev) => [...prev, res.data!]);
    setShowAddModal(false);
    setNewTask({
      title: "",
      description: "",
      priority: "MEDIUM",
      dueTime: "10:00",
      assigneeId: canAssign ? user.id : null,
      contactId: "",
    });
  };

  const monthLabel = `${PERSIAN_MONTH_NAMES[jm - 1]} ${jy}`;
  const selectedDayTasks = taskEventsByDay[selectedDay] || [];

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground flex items-center gap-2.5">
            <CalendarIcon className="w-6 h-6 text-primary" />
            تقویم فروش و پیگیری‌ها
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            مشاهده جلسات، وظایف و برنامه‌ریزی ماهانه با اعداد انگلیسی
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-card border border-border p-1 rounded-2xl shadow-sm text-xs font-bold">
            <button
              type="button"
              onClick={() => navigateMonth(-1)}
              disabled={loadingMonth}
              className="p-1.5 rounded-xl hover:bg-muted text-muted-foreground disabled:opacity-40"
              title="ماه قبل"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <span className="px-3 font-mono">{monthLabel}</span>
            <button
              type="button"
              onClick={() => navigateMonth(1)}
              disabled={loadingMonth}
              className="p-1.5 rounded-xl hover:bg-muted text-muted-foreground disabled:opacity-40"
              title="ماه بعد"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-6 rounded-3xl bg-card border border-border shadow-sm space-y-4">
        {/* Weekday labels */}
        <div className="grid grid-cols-7 text-center font-bold text-xs text-muted-foreground border-b border-border pb-3">
          {WEEKDAY_NAMES.map((w) => (
            <div key={w} className="py-1">
              {w}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: startOffset }).map((_, i) => (
            <div key={`empty-${i}`} className="h-28 rounded-2xl bg-muted/20 opacity-40 border border-transparent" />
          ))}

          {daysInMonth.map((day) => {
            const events = taskEventsByDay[day] || [];
            const isSelected = selectedDay === day;
            const isToday =
              jy === todayJalali.jy && jm === todayJalali.jm && day === todayJalali.jd;

            return (
              <div
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`h-28 p-2.5 rounded-2xl border text-right cursor-pointer transition-all flex flex-col justify-between ${
                  isSelected
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-sm"
                    : isToday
                    ? "border-emerald-500/40 bg-emerald-500/5"
                    : "border-border hover:bg-muted/40"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-bold ${
                      isToday
                        ? "bg-primary text-primary-foreground"
                        : "text-foreground"
                    }`}
                  >
                    {day}
                  </span>
                  {events.length > 0 && (
                    <span className="text-[10px] font-bold text-primary font-mono">
                      {events.length} کار
                    </span>
                  )}
                </div>

                {/* Event previews in cell */}
                <div className="space-y-1 overflow-hidden">
                  {events.slice(0, 2).map((ev) => (
                    <div
                      key={ev.id}
                      className={`text-[10px] font-medium p-1 rounded-lg bg-card border border-border truncate flex items-center gap-1 ${
                        ev.status === TaskStatus.DONE
                          ? "line-through text-muted-foreground opacity-60"
                          : "text-foreground"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                          ev.status === TaskStatus.DONE ? "bg-emerald-500" : "bg-primary"
                        }`}
                      />
                      <span className="truncate">{ev.title}</span>
                    </div>
                  ))}
                  {events.length > 2 && (
                    <span className="text-[9px] text-muted-foreground block text-left">
                      +{events.length - 2} مورد دیگر
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Day Agenda Card */}
      <div className="p-6 rounded-3xl bg-card border border-border shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            برنامه روز {selectedDay} {monthLabel}
          </h3>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>ثبت رویداد برای این روز</span>
          </button>
        </div>

        {selectedDayTasks.length === 0 ? (
          <div className="text-center py-6 text-xs text-muted-foreground">
            وظیفه یا پیگیری برای این روز ثبت نشده است.
          </div>
        ) : (
          <div className="space-y-2.5">
            {selectedDayTasks.map((t) => {
              const isDone = t.status === TaskStatus.DONE;
              return (
                <div
                  key={t.id}
                  className="p-3.5 rounded-2xl bg-muted/30 border border-border flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={() => handleToggleDone(t.id)}
                      className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-all ${
                        isDone
                          ? "bg-emerald-500 border-emerald-500 text-white"
                          : "border-muted-foreground/40 hover:border-primary"
                      }`}
                    >
                      {isDone && <CheckCircle2 className="w-3.5 h-3.5" />}
                    </button>
                    <div className="min-w-0">
                      <div className={`text-xs font-bold truncate ${isDone ? "line-through text-muted-foreground" : "text-foreground"}`}>
                        {t.title}
                      </div>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-3">
                        <span className="font-mono">{t.dueAt ? formatJalaliDate(t.dueAt, "time") : "-"}</span>
                        <span>مسئول: {t.assigneeName}</span>
                        {t.contactName && <span>مخاطب: {t.contactName}</span>}
                      </div>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                      isDone
                        ? "bg-emerald-500/10 text-emerald-600"
                        : t.priority === "HIGH"
                        ? "bg-rose-500/10 text-rose-600"
                        : "bg-primary/10 text-primary"
                    }`}
                  >
                    {isDone ? "انجام شد" : t.priority === "HIGH" ? "فوری" : "در انتظار"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Task Modal for Selected Day */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-card border border-border rounded-3xl shadow-2xl p-6 text-right space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="font-bold text-foreground text-sm">
                ثبت رویداد برای {selectedDay} {monthLabel}
              </h3>
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

            <form onSubmit={handleAddEventForDay} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold mb-1">عنوان رویداد / وظیفه *</label>
                <input
                  type="text"
                  required
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  placeholder="مثال: جلسه دمو آنلاین"
                  className="w-full p-2.5 bg-muted/40 border border-border rounded-xl focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">ساعت</label>
                  <input
                    type="time"
                    value={newTask.dueTime}
                    onChange={(e) => setNewTask({ ...newTask, dueTime: e.target.value })}
                    className="w-full p-2.5 bg-muted/40 border border-border rounded-xl focus:outline-none focus:border-primary font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">اولویت</label>
                  <select
                    value={newTask.priority}
                    onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as Priority })}
                    className="w-full p-2.5 bg-muted/40 border border-border rounded-xl focus:outline-none focus:border-primary"
                  >
                    <option value="HIGH">بالا (فوری)</option>
                    <option value="MEDIUM">متوسط</option>
                    <option value="LOW">عادی</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">مخاطب مرتبط (اختیاری)</label>
                <select
                  value={newTask.contactId}
                  onChange={(e) => setNewTask({ ...newTask, contactId: e.target.value })}
                  className="w-full p-2.5 bg-muted/40 border border-border rounded-xl focus:outline-none focus:border-primary"
                >
                  <option value="">بدون مخاطب</option>
                  {contactOptions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.fullName}
                    </option>
                  ))}
                </select>
              </div>

              {canAssign && assignableUsers.length > 0 && (
                <div>
                  <label className="block font-semibold mb-1">مسئول انجام</label>
                  <OwnerSelect
                    users={assignableUsers}
                    value={newTask.assigneeId}
                    onChange={(assigneeId) => setNewTask({ ...newTask, assigneeId })}
                    allowUnassigned={false}
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
                  {isSubmitting ? "در حال ذخیره..." : "ثبت رویداد"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
