"use client";

import React, { useState } from "react";
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

interface TaskItem {
  id: string;
  title: string;
  description?: string;
  category: "OVERDUE" | "TODAY" | "UPCOMING" | "DONE";
  priority: "HIGH" | "MEDIUM" | "LOW";
  dueDate: string;
  assignee: string;
  relatedTo?: string;
  completed: boolean;
}

const initialTasks: TaskItem[] = [
  { id: "t1", title: "تماس پیگیری پیش‌فاکتور ارسال شده", description: "پیگیری شرایط پرداخت با مهندس رستمی", category: "OVERDUE", priority: "HIGH", dueDate: "دیروز - ۱۶:۰۰", assignee: "علی رضایی", relatedTo: "توسعه نرم‌افزار نوین", completed: false },
  { id: "t2", title: "بررسی الحاقیه قرارداد سالانه با مدیر فروش", description: "تایید تخفیف نقدی ۵ درصدی", category: "OVERDUE", priority: "HIGH", dueDate: "۲ روز پیش", assignee: "سارا احمدی", relatedTo: "کلینیک دندانپزشکی مهر", completed: false },
  { id: "t3", title: "جلسه آنلاین دمو نرم‌افزار با مدیران IT", description: "ارائه ماژول قیف فروش و پایپ‌لاین", category: "TODAY", priority: "HIGH", dueDate: "امروز - ۱۱:۳۰", assignee: "مریم کاظمی", relatedTo: "بازرگانی جهان گستر", completed: false },
  { id: "t4", title: "ارسال نسخه نهایی قرارداد برای امضای دیجیتال", description: "الحاق مدارک احراز هویت", category: "TODAY", priority: "MEDIUM", dueDate: "امروز - ۱۷:۰۰", assignee: "حسین عباسی", relatedTo: "داروسازی سینا", completed: false },
  { id: "t5", title: "هماهنگی جلسه حضوری در دفتر شرکت", description: "بررسی سناریوهای اتصال API پیامک", category: "UPCOMING", priority: "MEDIUM", dueDate: "فردا - ۱۰:۰۰", assignee: "علی رضایی", relatedTo: "صنایع غذایی ترنج", completed: false },
  { id: "t6", title: "ارسال پیامک تبریک معامله برنده", description: "شروع فرایند آنبوردینگ مشتری", category: "UPCOMING", priority: "LOW", dueDate: "پس‌فردا", assignee: "مریم کاظمی", relatedTo: "آژانس مسافرتی پرواز", completed: false },
  { id: "t7", title: "تماس اولیه با سرنخ جدید ثبت شده در وبسایت", description: "اعتبارسنجی اولیه نیازمندی‌ها", category: "DONE", priority: "HIGH", dueDate: "۳ روز پیش", assignee: "علی رضایی", relatedTo: "فروشگاه آنلاین آلا", completed: true },
  { id: "t8", title: "ثبت بازخورد مشتری از نسخه آزمایشی", description: "رضایت کامل از سرعت لود داشبورد", category: "DONE", priority: "MEDIUM", dueDate: "هفته گذشته", assignee: "حسین عباسی", relatedTo: "مجتمع آموزشی رشد", completed: true },
];

export default function TasksPage() {
  const [tasks, setTasks] = useState<TaskItem[]>(initialTasks);
  const [activeTab, setActiveTab] = useState<"ALL" | "OVERDUE" | "TODAY" | "UPCOMING" | "DONE">("ALL");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    priority: "HIGH" as "HIGH" | "MEDIUM" | "LOW",
    dueDate: "امروز",
    assignee: "علی رضایی",
    relatedTo: "",
  });

  const toggleTask = (id: string) => {
    setTasks(
      tasks.map((t) => {
        if (t.id !== id) return t;
        const nextCompleted = !t.completed;
        return {
          ...t,
          completed: nextCompleted,
          category: nextCompleted ? "DONE" : "TODAY",
        };
      })
    );
  };

  const filteredTasks = tasks.filter((t) => {
    if (activeTab === "ALL") return true;
    return t.category === activeTab;
  });

  const overdueCount = tasks.filter((t) => t.category === "OVERDUE" && !t.completed).length;
  const todayCount = tasks.filter((t) => t.category === "TODAY" && !t.completed).length;

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title) return;

    const created: TaskItem = {
      id: `t_${Date.now()}`,
      title: newTask.title,
      description: newTask.description,
      priority: newTask.priority,
      category: "TODAY",
      dueDate: newTask.dueDate,
      assignee: newTask.assignee,
      relatedTo: newTask.relatedTo || "مشتری عمومی",
      completed: false,
    };

    setTasks([created, ...tasks]);
    setShowAddModal(false);
    setNewTask({
      title: "",
      description: "",
      priority: "HIGH",
      dueDate: "امروز",
      assignee: "علی رضایی",
      relatedTo: "",
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
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-sm hover:opacity-90 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>ثبت وظیفه جدید</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="p-1 rounded-2xl bg-card border border-border shadow-sm flex items-center gap-1 text-xs font-semibold overflow-x-auto">
        <button
          onClick={() => setActiveTab("ALL")}
          className={`flex-1 py-2 px-3 rounded-xl transition-all whitespace-nowrap ${
            activeTab === "ALL" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          همه وظایف ({tasks.length})
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
          className={`flex-1 py-2 px-3 rounded-xl transition-all whitespace-nowrap ${
            activeTab === "DONE" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          تکمیل شده
        </button>
      </div>

      {/* Tasks List */}
      <div className="space-y-3">
        {filteredTasks.length === 0 ? (
          <div className="p-12 text-center text-xs text-muted-foreground bg-card border border-border rounded-2xl">
            هیچ وظیفه‌ای در این دسته‌بندی یافت نشد.
          </div>
        ) : (
          filteredTasks.map((t) => (
            <div
              key={t.id}
              className={`p-4 rounded-2xl bg-card border shadow-sm flex items-start gap-4 transition-all hover:shadow-md ${
                t.completed ? "opacity-60 border-border" : t.category === "OVERDUE" ? "border-rose-500/30" : "border-border"
              }`}
            >
              <button
                onClick={() => toggleTask(t.id)}
                className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-colors shrink-0 mt-0.5 ${
                  t.completed
                    ? "bg-emerald-600 border-emerald-600 text-white"
                    : "border-border hover:border-primary text-transparent"
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
              </button>

              <div className="flex-1 space-y-1">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h4
                    className={`font-bold text-xs text-foreground ${
                      t.completed ? "line-through text-muted-foreground" : ""
                    }`}
                  >
                    {t.title}
                  </h4>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        t.priority === "HIGH"
                          ? "bg-rose-500/10 text-rose-500"
                          : t.priority === "MEDIUM"
                          ? "bg-amber-500/10 text-amber-500"
                          : "bg-blue-500/10 text-blue-500"
                      }`}
                    >
                      {t.priority === "HIGH" ? "فوری" : t.priority === "MEDIUM" ? "متوسط" : "عادی"}
                    </span>
                    <span className="text-[11px] font-mono text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {t.dueDate}
                    </span>
                  </div>
                </div>

                {t.description && (
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{t.description}</p>
                )}

                <div className="pt-2 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5" /> مسئول: {t.assignee}
                  </span>
                  {t.relatedTo && (
                    <span className="text-primary font-medium">مرتبط با: {t.relatedTo}</span>
                  )}
                </div>
              </div>

              <button
                onClick={() => setTasks(tasks.filter((x) => x.id !== t.id))}
                className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                title="حذف وظیفه"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Add Task Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-card border border-border rounded-3xl shadow-2xl p-6 text-right space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="font-bold text-foreground text-sm">تعریف وظیفه و پیگیری جدید</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddTask} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold mb-1">عنوان وظیفه *</label>
                <input
                  type="text"
                  required
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  placeholder="مثال: تماس پیگیری ارسال پیش‌فاکتور"
                  className="w-full p-2.5 bg-muted/40 border border-border rounded-xl focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">توضیحات تکمیلی</label>
                <textarea
                  rows={2}
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  placeholder="نکات مهم یا هماهنگی‌های قبلی..."
                  className="w-full p-2.5 bg-muted/40 border border-border rounded-xl focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">اولویت اقدام</label>
                  <select
                    value={newTask.priority}
                    onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as "HIGH" | "MEDIUM" | "LOW" })}
                    className="w-full p-2.5 bg-muted/40 border border-border rounded-xl focus:outline-none focus:border-primary"
                  >
                    <option value="HIGH">فوری و مهم (بالا)</option>
                    <option value="MEDIUM">متوسط</option>
                    <option value="LOW">عادی (پایین)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">مسئول انجام</label>
                  <select
                    value={newTask.assignee}
                    onChange={(e) => setNewTask({ ...newTask, assignee: e.target.value })}
                    className="w-full p-2.5 bg-muted/40 border border-border rounded-xl focus:outline-none focus:border-primary"
                  >
                    <option value="علی رضایی">علی رضایی (کارشناس)</option>
                    <option value="مریم کاظمی">مریم کاظمی (کارشناس)</option>
                    <option value="حسین عباسی">حسین عباسی (کارشناس)</option>
                    <option value="سارا احمدی">سارا احمدی (مدیر فروش)</option>
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
                  className="px-5 py-2 rounded-xl bg-primary text-primary-foreground font-bold shadow-sm hover:opacity-90"
                >
                  ثبت وظیفه
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
