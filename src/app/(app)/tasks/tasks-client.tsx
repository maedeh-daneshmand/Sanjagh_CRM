"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { Priority, TaskStatus } from "@prisma/client";
import { SerializableTask, TaskCategory } from "@/server/tasks";
import { DealContactOption } from "@/server/deals";
import { AssignableUser } from "@/server/contacts";
import {
  createTaskAction,
  toggleTaskDoneAction,
  deleteTaskAction,
} from "@/server/actions/tasks";
import { useUser } from "@/components/auth/user-context";
import { OwnerSelect } from "@/components/contacts/owner-select";
import { formatJalaliDate } from "@/lib/jalali";
import {
  CheckSquare,
  Plus,
  Clock,
  AlertCircle,
  CheckCircle2,
  User,
  Trash2,
  X,
} from "lucide-react";

export default function TasksClient({
  initialTasks,
  contactOptions,
  assignableUsers,
}: {
  initialTasks: SerializableTask[];
  contactOptions: DealContactOption[];
  assignableUsers: AssignableUser[];
}) {
  const { user } = useUser();
  const canAssign = user.role === "ADMIN" || user.role === "MANAGER";

  const [tasks, setTasks] = useState<SerializableTask[]>(initialTasks);
  const [activeTab, setActiveTab] = useState<"ALL" | TaskCategory>("ALL");
  const [assigneeFilter, setAssigneeFilter] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [newTask, setNewTask] = useState<{
    title: string;
    description: string;
    priority: Priority;
    dueDate: string;
    dueTime: string;
    assigneeId: string | null;
    contactId: string;
  }>({
    title: "",
    description: "",
    priority: "HIGH",
    dueDate: new Date().toISOString().slice(0, 10),
    dueTime: "14:00",
    assigneeId: canAssign ? user.id : null,
    contactId: "",
  });

  const visibleTasks = useMemo(() => {
    if (!assigneeFilter) return tasks;
    return tasks.filter((t) => t.assigneeId === assigneeFilter);
  }, [tasks, assigneeFilter]);

  const filteredTasks = useMemo(() => {
    if (activeTab === "ALL") return visibleTasks;
    return visibleTasks.filter((t) => t.category === activeTab);
  }, [visibleTasks, activeTab]);

  const overdueCount = visibleTasks.filter(
    (t) => t.category === "OVERDUE" && t.status !== TaskStatus.DONE
  ).length;
  const todayCount = visibleTasks.filter(
    (t) => t.category === "TODAY" && t.status !== TaskStatus.DONE
  ).length;

  const handleToggleTask = async (id: string) => {
    const snapshot = tasks;
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const nextStatus =
          t.status === TaskStatus.DONE ? TaskStatus.TODO : TaskStatus.DONE;
        return {
          ...t,
          status: nextStatus,
          category: nextStatus === TaskStatus.DONE ? "DONE" : "TODAY",
        };
      })
    );

    const res = await toggleTaskDoneAction(id);
    if (!res.ok) {
      setTasks(snapshot);
      alert(res.error || "خطا در تغییر وضعیت وظیفه");
      return;
    }

    if (res.data) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === id
            ? {
                ...t,
                status: res.data!.status,
                completedAt: res.data!.completedAt,
                category: res.data!.category,
              }
            : t
        )
      );
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (!confirm("آیا از حذف این وظیفه اطمینان دارید؟")) return;
    const snapshot = tasks;
    setTasks(tasks.filter((t) => t.id !== id));

    const res = await deleteTaskAction(id);
    if (!res.ok) {
      setTasks(snapshot);
      alert(res.error || "خطا در حذف وظیفه");
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title.trim()) return;

    setIsSubmitting(true);
    setFormError(null);

    const dueAtIso = newTask.dueDate
      ? new Date(`${newTask.dueDate}T${newTask.dueTime || "12:00"}:00+03:30`).toISOString()
      : null;

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
      setFormError(res.error || "خطا در ثبت وظیفه");
      return;
    }

    setTasks([res.data, ...tasks]);
    setShowAddModal(false);
    setNewTask({
      title: "",
      description: "",
      priority: "HIGH",
      dueDate: new Date().toISOString().slice(0, 10),
      dueTime: "14:00",
      assigneeId: canAssign ? user.id : null,
      contactId: "",
    });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground flex items-center gap-2.5">
            <CheckSquare className="w-6 h-6 text-primary" />
            وظایف و پیگیری‌ها (Tasks)
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            مدیریت کارهای روزانه، تماس‌های موعدرسیده و پیگیری‌های معوقه تیم فروش
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {canAssign && assignableUsers.length > 0 && (
            <div className="w-52">
              <OwnerSelect
                users={assignableUsers}
                value={assigneeFilter}
                onChange={setAssigneeFilter}
                placeholder="همه کارشناسان"
                compact
              />
            </div>
          )}
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-sm hover:opacity-90 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>ثبت وظیفه جدید</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="p-1 rounded-2xl bg-card border border-border shadow-sm flex items-center gap-1 text-xs font-semibold overflow-x-auto">
        <button
          onClick={() => setActiveTab("ALL")}
          className={`flex-1 py-2 px-3 rounded-xl transition-all whitespace-nowrap ${
            activeTab === "ALL" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          همه وظایف ({visibleTasks.length})
        </button>
        <button
          onClick={() => setActiveTab("OVERDUE")}
          className={`flex-1 py-2 px-3 rounded-xl transition-all whitespace-nowrap flex items-center justify-center gap-1.5 ${
            activeTab === "OVERDUE"
              ? "bg-rose-500 text-white shadow-sm"
              : "text-rose-500 hover:bg-rose-500/10"
          }`}
        >
          <AlertCircle className="w-3.5 h-3.5" />
          معوقه و گذشته ({overdueCount})
        </button>
        <button
          onClick={() => setActiveTab("TODAY")}
          className={`flex-1 py-2 px-3 rounded-xl transition-all whitespace-nowrap ${
            activeTab === "TODAY" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          امروز ({todayCount})
        </button>
        <button
          onClick={() => setActiveTab("UPCOMING")}
          className={`flex-1 py-2 px-3 rounded-xl transition-all whitespace-nowrap ${
            activeTab === "UPCOMING" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          آینده و روزهای بعد
        </button>
        <button
          onClick={() => setActiveTab("DONE")}
          className={`flex-1 py-2 px-3 rounded-xl transition-all whitespace-nowrap flex items-center justify-center gap-1.5 ${
            activeTab === "DONE" ? "bg-emerald-600 text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          انجام شده
        </button>
      </div>

      {/* Tasks List */}
      <div className="space-y-3">
        {filteredTasks.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-card border border-border text-xs text-muted-foreground">
            وظیفه‌ای در این دسته‌بندی وجود ندارد.
          </div>
        ) : (
          filteredTasks.map((task) => {
            const isDone = task.status === TaskStatus.DONE;
            const isOverdue = task.category === "OVERDUE" && !isDone;

            return (
              <div
                key={task.id}
                className={`p-4 rounded-2xl bg-card border shadow-sm flex items-start justify-between gap-4 transition-all ${
                  isDone ? "opacity-60 border-border" : isOverdue ? "border-rose-500/30 bg-rose-500/5" : "border-border hover:shadow-md"
                }`}
              >
                <div className="flex items-start gap-3.5 flex-1 min-w-0">
                  <button
                    type="button"
                    onClick={() => handleToggleTask(task.id)}
                    className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                      isDone
                        ? "bg-emerald-500 border-emerald-500 text-white"
                        : "border-muted-foreground/40 hover:border-primary"
                    }`}
                  >
                    {isDone && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </button>

                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className={`font-bold text-xs ${isDone ? "line-through text-muted-foreground" : "text-foreground"}`}>
                        {task.title}
                      </h4>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          task.priority === "HIGH"
                            ? "bg-rose-500/10 text-rose-600"
                            : task.priority === "MEDIUM"
                            ? "bg-amber-500/10 text-amber-600"
                            : "bg-blue-500/10 text-blue-600"
                        }`}
                      >
                        {task.priority === "HIGH" ? "اولویت بالا" : task.priority === "MEDIUM" ? "متوسط" : "عادی"}
                      </span>
                    </div>

                    {task.description && (
                      <p className="text-[11px] text-muted-foreground">{task.description}</p>
                    )}

                    <div className="flex flex-wrap items-center gap-4 pt-1 text-[11px] text-muted-foreground">
                      <span className={`flex items-center gap-1 font-mono ${isOverdue ? "text-rose-500 font-bold" : ""}`}>
                        <Clock className="w-3 h-3" />
                        {task.dueAt ? formatJalaliDate(task.dueAt, "full") : "بدون سررسید"}
                      </span>
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {task.assigneeName}
                      </span>
                      {task.contactId && task.contactName && (
                        <Link
                          href={`/contacts/${task.contactId}`}
                          className="text-primary font-medium hover:underline"
                        >
                          مربوط به: {task.contactName}
                          {task.contactCompany ? ` (${task.contactCompany})` : ""}
                        </Link>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleDeleteTask(task.id)}
                  className="p-1.5 rounded-lg border border-border hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                  title="حذف وظیفه"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Add Task Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-card border border-border rounded-3xl shadow-2xl p-6 text-right space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="font-bold text-foreground text-sm">ثبت وظیفه جدید</h3>
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

            <form onSubmit={handleAddTask} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold mb-1">عنوان وظیفه *</label>
                <input
                  type="text"
                  required
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  placeholder="مثال: تماس با مدیر فنی جهت تایید قرارداد"
                  className="w-full p-2.5 bg-muted/40 border border-border rounded-xl focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">توضیحات</label>
                <textarea
                  rows={2}
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  placeholder="جزئیات بیشتر..."
                  className="w-full p-2.5 bg-muted/40 border border-border rounded-xl focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">تاریخ سررسید</label>
                  <input
                    type="date"
                    value={newTask.dueDate}
                    onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                    className="w-full p-2.5 bg-muted/40 border border-border rounded-xl focus:outline-none focus:border-primary font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">ساعت</label>
                  <input
                    type="time"
                    value={newTask.dueTime}
                    onChange={(e) => setNewTask({ ...newTask, dueTime: e.target.value })}
                    className="w-full p-2.5 bg-muted/40 border border-border rounded-xl focus:outline-none focus:border-primary font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
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
                  {isSubmitting ? "در حال ذخیره..." : "ثبت وظیفه"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
