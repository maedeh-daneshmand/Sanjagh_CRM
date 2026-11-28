"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
  useDroppable,
  DragStartEvent,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { DealStage } from "@prisma/client";
import { formatNumber } from "@/lib/utils";
import { SerializableDeal, DealContactOption } from "@/server/deals";
import { AssignableUser } from "@/server/contacts";
import {
  createDealAction,
  moveDealAction,
  deleteDealAction,
} from "@/server/actions/deals";
import { useUser } from "@/components/auth/user-context";
import { OwnerSelect } from "@/components/contacts/owner-select";
import {
  Kanban,
  Plus,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Building,
  User,
  DollarSign,
  TrendingUp,
  X,
  AlertCircle,
  GripVertical,
  Trash2,
} from "lucide-react";

const STAGES: { key: DealStage; title: string; color: string; border: string }[] = [
  { key: "NEW", title: "سرنخ جدید", color: "bg-slate-500/10 text-slate-700 dark:text-slate-300", border: "border-slate-500/20" },
  { key: "CONTACTED", title: "تماس و ارزیابی", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400", border: "border-blue-500/20" },
  { key: "PROPOSAL", title: "پیش‌فاکتور و دمو", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400", border: "border-amber-500/20" },
  { key: "NEGOTIATION", title: "مذاکره نهایی", color: "bg-purple-500/10 text-purple-600 dark:text-purple-400", border: "border-purple-500/20" },
  { key: "WON", title: "بسته شده (برنده)", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400", border: "border-emerald-500/20" },
  { key: "LOST", title: "از دست رفته", color: "bg-rose-500/10 text-rose-600 dark:text-rose-400", border: "border-rose-500/20" },
];

const STAGE_ORDER: DealStage[] = [
  "NEW",
  "CONTACTED",
  "PROPOSAL",
  "NEGOTIATION",
  "WON",
  "LOST",
];

function computeNewPosition(targetList: SerializableDeal[], insertIndex: number): number {
  if (targetList.length === 0) return 1000;
  if (insertIndex <= 0) return targetList[0].position - 1000;
  if (insertIndex >= targetList.length) {
    return targetList[targetList.length - 1].position + 1000;
  }
  const prev = targetList[insertIndex - 1].position;
  const next = targetList[insertIndex].position;
  return (prev + next) / 2;
}

function DealCardContent({
  deal,
  stageKey,
  onMoveStage,
  onDelete,
  isOverlay = false,
}: {
  deal: SerializableDeal;
  stageKey: DealStage;
  onMoveStage?: (dealId: string, direction: "next" | "prev") => void;
  onDelete?: (dealId: string) => void;
  isOverlay?: boolean;
}) {
  return (
    <div
      className={`p-2.5 rounded-xl bg-card border border-border shadow-sm transition-all space-y-2 group ${
        isOverlay ? "shadow-2xl ring-2 ring-primary/40 rotate-1" : "hover:shadow-md"
      }`}
    >
      <div className="flex items-start justify-between gap-1">
        <div className="flex items-start gap-1 min-w-0">
          <GripVertical className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0 mt-0.5 cursor-grab active:cursor-grabbing" />
          <h4 className="font-bold text-foreground text-[11px] leading-snug line-clamp-2">
            {deal.title}
          </h4>
        </div>
        {onDelete && !isOverlay && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(deal.id);
            }}
            className="opacity-0 group-hover:opacity-100 p-0.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all shrink-0"
            title="حذف معامله"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>

      <div className="space-y-0.5 text-[10px] text-muted-foreground">
        <div className="flex items-center gap-1 min-w-0">
          <Building className="w-3 h-3 text-slate-400 shrink-0" />
          <span className="truncate">{deal.company}</span>
        </div>
        <div className="flex items-center gap-1 min-w-0">
          <User className="w-3 h-3 text-slate-400 shrink-0" />
          <Link
            href={`/contacts/${deal.contactId}`}
            onClick={(e) => e.stopPropagation()}
            className="truncate hover:text-primary transition-colors"
          >
            {deal.contactName}
          </Link>
        </div>
      </div>

      <div className="pt-1.5 border-t border-border flex items-center justify-between gap-1">
        <span className="text-[11px] font-black text-foreground font-mono truncate">
          {formatNumber(deal.amount)}{" "}
          <span className="text-[9px] text-muted-foreground font-normal">تومان</span>
        </span>
        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-medium truncate max-w-[72px]">
          {deal.ownerName}
        </span>
      </div>

      {!isOverlay && onMoveStage && (
        <div className="flex items-center justify-between pt-0.5 opacity-80 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={() => onMoveStage(deal.id, "prev")}
            disabled={stageKey === "NEW"}
            className="p-0.5 rounded-md border border-border hover:bg-muted text-muted-foreground disabled:opacity-30 disabled:pointer-events-none transition-colors"
            title="مرحله قبل"
          >
            <ArrowRight className="w-3 h-3" />
          </button>
          <span className="text-[9px] text-muted-foreground">انتقال</span>
          <button
            type="button"
            onClick={() => onMoveStage(deal.id, "next")}
            disabled={stageKey === "LOST"}
            className="p-0.5 rounded-md border border-border hover:bg-muted text-muted-foreground disabled:opacity-30 disabled:pointer-events-none transition-colors"
            title="مرحله بعد"
          >
            <ArrowLeft className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}

function SortableDealCard({
  deal,
  stageKey,
  onMoveStage,
  onDelete,
}: {
  deal: SerializableDeal;
  stageKey: DealStage;
  onMoveStage: (dealId: string, direction: "next" | "prev") => void;
  onDelete: (dealId: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: deal.id,
    data: { type: "deal", deal },
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <DealCardContent
        deal={deal}
        stageKey={stageKey}
        onMoveStage={onMoveStage}
        onDelete={onDelete}
      />
    </div>
  );
}

function StageColumn({
  stage,
  deals,
  onMoveStage,
  onDelete,
}: {
  stage: { key: DealStage; title: string; color: string; border: string };
  deals: SerializableDeal[];
  onMoveStage: (dealId: string, direction: "next" | "prev") => void;
  onDelete: (dealId: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage.key,
    data: { type: "column", stage: stage.key },
  });

  const stageTotal = deals.reduce((sum, d) => sum + d.amount, 0);

  return (
    <div
      ref={setNodeRef}
      className={`w-full min-w-0 rounded-2xl p-2 flex flex-col max-h-[750px] border transition-colors ${
        isOver
          ? "bg-primary/5 border-primary/40"
          : "bg-muted/40 border-border/80"
      }`}
    >
      {/* Column Header */}
      <div className="p-2 rounded-xl bg-card border border-border shadow-sm mb-2">
        <div className="flex items-center justify-between gap-1 mb-1">
          <span className={`px-2 py-0.5 rounded-lg text-[11px] font-bold truncate ${stage.color}`}>
            {stage.title}
          </span>
          <span className="w-5 h-5 rounded-full bg-muted text-foreground flex items-center justify-center text-[10px] font-mono font-bold shrink-0">
            {deals.length}
          </span>
        </div>
        <div className="text-[10px] font-bold text-muted-foreground font-mono truncate">
          {formatNumber(stageTotal)} تومان
        </div>
      </div>

      {/* Deal Cards Container */}
      <SortableContext
        items={deals.map((d) => d.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex-1 overflow-y-auto space-y-2 pr-0.5 min-h-[120px]">
          {deals.length === 0 ? (
            <div className="p-4 text-center text-[11px] text-muted-foreground border-2 border-dashed border-border/60 rounded-xl">
              معامله‌ای نیست
            </div>
          ) : (
            deals.map((deal) => (
              <SortableDealCard
                key={deal.id}
                deal={deal}
                stageKey={stage.key}
                onMoveStage={onMoveStage}
                onDelete={onDelete}
              />
            ))
          )}
        </div>
      </SortableContext>
    </div>
  );
}

export default function PipelineClient({
  initialDeals,
  contactOptions,
  assignableUsers,
}: {
  initialDeals: SerializableDeal[];
  contactOptions: DealContactOption[];
  assignableUsers: AssignableUser[];
}) {
  const { user } = useUser();
  const canFilterByOwner = user.role === "ADMIN" || user.role === "MANAGER";

  const [deals, setDeals] = useState<SerializableDeal[]>(initialDeals);
  const [ownerFilter, setOwnerFilter] = useState<string | null>(null);
  const [activeDealId, setActiveDealId] = useState<string | null>(null);
  const [errorToast, setErrorToast] = useState<string | null>(null);
  const [showAddDealModal, setShowAddDealModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [newDeal, setNewDeal] = useState<{
    title: string;
    contactId: string;
    amount: string;
    stage: DealStage;
    ownerId: string | null;
  }>({
    title: "",
    contactId: contactOptions[0]?.id || "",
    amount: "",
    stage: "NEW",
    ownerId: canFilterByOwner ? user.id : null,
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const showError = (msg: string) => {
    setErrorToast(msg);
    setTimeout(() => setErrorToast(null), 5000);
  };

  const visibleDeals = useMemo(() => {
    const filtered = ownerFilter
      ? deals.filter((d) => d.ownerId === ownerFilter)
      : deals;
    return [...filtered].sort((a, b) => a.position - b.position);
  }, [deals, ownerFilter]);

  const totalPipelineValue = visibleDeals
    .filter((d) => d.stage !== "LOST")
    .reduce((acc, curr) => acc + curr.amount, 0);

  const wonDealsValue = visibleDeals
    .filter((d) => d.stage === "WON")
    .reduce((acc, curr) => acc + curr.amount, 0);

  const activeDeal = activeDealId
    ? deals.find((d) => d.id === activeDealId) || null
    : null;

  const persistMove = async (
    dealId: string,
    toStage: DealStage,
    newPosition: number,
    snapshot: SerializableDeal[]
  ) => {
    try {
      const res = await moveDealAction({ dealId, toStage, newPosition });
      if (!res.ok) {
        setDeals(snapshot);
        showError(res.error || "خطا در انتقال معامله. تغییرات بازگردانی شد.");
        return;
      }
      if (res.data) {
        setDeals((prev) =>
          prev.map((d) =>
            d.id === dealId
              ? { ...d, closedAt: res.data?.closedAt ?? d.closedAt }
              : d
          )
        );
      }
    } catch {
      setDeals(snapshot);
      showError("خطا در ارتباط با سرور. تغییرات بازگردانی شد.");
    }
  };

  const handleMoveStageArrow = (dealId: string, direction: "next" | "prev") => {
    const targetDeal = deals.find((d) => d.id === dealId);
    if (!targetDeal) return;

    const currentIdx = STAGE_ORDER.indexOf(targetDeal.stage);
    const nextIdx = direction === "next" ? currentIdx + 1 : currentIdx - 1;
    if (nextIdx < 0 || nextIdx >= STAGE_ORDER.length) return;

    const toStage = STAGE_ORDER[nextIdx];
    const targetColumnDeals = deals
      .filter((d) => d.stage === toStage && d.id !== dealId)
      .sort((a, b) => a.position - b.position);
    const newPosition = computeNewPosition(targetColumnDeals, targetColumnDeals.length);

    const snapshot = deals;
    setDeals(
      deals.map((d) =>
        d.id === dealId ? { ...d, stage: toStage, position: newPosition } : d
      )
    );
    void persistMove(dealId, toStage, newPosition, snapshot);
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDealId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDealId(null);
    const { active, over } = event;
    if (!over) return;

    const dealId = String(active.id);
    const overId = String(over.id);
    if (dealId === overId) return;

    const draggedDeal = deals.find((d) => d.id === dealId);
    if (!draggedDeal) return;

    let toStage: DealStage | null = null;
    let insertIndex = 0;

    if (STAGE_ORDER.includes(overId as DealStage)) {
      toStage = overId as DealStage;
      const colDeals = visibleDeals.filter(
        (d) => d.stage === toStage && d.id !== dealId
      );
      insertIndex = colDeals.length;
    } else {
      const overDeal = deals.find((d) => d.id === overId);
      if (!overDeal) return;
      toStage = overDeal.stage;
      const colDeals = visibleDeals.filter(
        (d) => d.stage === toStage && d.id !== dealId
      );
      const overIdx = colDeals.findIndex((d) => d.id === overId);
      insertIndex = overIdx >= 0 ? overIdx : colDeals.length;
    }

    const targetColDeals = visibleDeals.filter(
      (d) => d.stage === toStage && d.id !== dealId
    );
    const newPosition = computeNewPosition(targetColDeals, insertIndex);

    const snapshot = deals;
    setDeals(
      deals.map((d) =>
        d.id === dealId ? { ...d, stage: toStage!, position: newPosition } : d
      )
    );

    void persistMove(dealId, toStage, newPosition, snapshot);
  };

  const handleDeleteDeal = async (dealId: string) => {
    if (!confirm("آیا از حذف این معامله اطمینان دارید؟")) return;
    const snapshot = deals;
    setDeals(deals.filter((d) => d.id !== dealId));

    const res = await deleteDealAction(dealId);
    if (!res.ok) {
      setDeals(snapshot);
      showError(res.error || "خطا در حذف معامله");
    }
  };

  const handleAddDeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeal.title.trim() || !newDeal.contactId || newDeal.amount === "") return;

    setIsSubmitting(true);
    setFormError(null);

    const res = await createDealAction({
      title: newDeal.title.trim(),
      contactId: newDeal.contactId,
      amount: Number(newDeal.amount),
      stage: newDeal.stage,
      ...(canFilterByOwner && newDeal.ownerId ? { ownerId: newDeal.ownerId } : {}),
    });

    setIsSubmitting(false);

    if (!res.ok || !res.data) {
      setFormError(res.error || "خطا در ثبت معامله");
      return;
    }

    setDeals([...deals, res.data]);
    setShowAddDealModal(false);
    setNewDeal({
      title: "",
      contactId: contactOptions[0]?.id || "",
      amount: "",
      stage: "NEW",
      ownerId: canFilterByOwner ? user.id : null,
    });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground flex items-center gap-2.5">
            <Kanban className="w-6 h-6 text-primary" />
            قیف فروش و پایپ‌لاین معاملات (Kanban)
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            مدیریت گام‌به‌گام مذاکرات فروش، پیش‌بینی درآمد و انتقال کارت‌های معامله
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {canFilterByOwner && assignableUsers.length > 0 && (
            <div className="w-52">
              <OwnerSelect
                users={assignableUsers}
                value={ownerFilter}
                onChange={setOwnerFilter}
                placeholder="همه کارشناسان"
                compact
              />
            </div>
          )}
          <button
            onClick={() => setShowAddDealModal(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-sm hover:opacity-90 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>ثبت معامله جدید</span>
          </button>
        </div>
      </div>

      {/* Error Toast */}
      {errorToast && (
        <div className="p-3.5 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-bold flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorToast}</span>
          </div>
          <button onClick={() => setErrorToast(null)} className="p-1 hover:bg-destructive/10 rounded-lg">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Pipeline Summary Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-card border border-border shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-muted-foreground">ارزش کل پایپ‌لاین فعال</span>
            <div className="text-lg font-black text-foreground font-mono mt-0.5">
              {formatNumber(totalPipelineValue)}
              <span className="text-xs text-muted-foreground mr-1">تومان</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-muted-foreground">فروش محقق‌شده (برنده)</span>
            <div className="text-lg font-black text-emerald-600 font-mono mt-0.5">
              {formatNumber(wonDealsValue)}
              <span className="text-xs text-muted-foreground mr-1">تومان</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-muted-foreground">تعداد کل معاملات</span>
            <div className="text-lg font-black text-foreground font-mono mt-0.5">
              {visibleDeals.length}
              <span className="text-xs text-muted-foreground mr-1">فقره قرارداد</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Kanban Board with 6 Columns & @dnd-kit */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 pb-6 pt-2">
          {STAGES.map((st) => (
            <StageColumn
              key={st.key}
              stage={st}
              deals={visibleDeals.filter((d) => d.stage === st.key)}
              onMoveStage={handleMoveStageArrow}
              onDelete={handleDeleteDeal}
            />
          ))}
        </div>

        <DragOverlay>
          {activeDeal ? (
            <div className="w-52">
              <DealCardContent
                deal={activeDeal}
                stageKey={activeDeal.stage}
                isOverlay
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Add Deal Modal */}
      {showAddDealModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-card border border-border rounded-3xl shadow-2xl p-6 text-right space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="font-bold text-foreground text-sm">افزودن معامله جدید به پایپ‌لاین</h3>
              <button
                onClick={() => setShowAddDealModal(false)}
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

            <form onSubmit={handleAddDeal} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold mb-1">عنوان معامله *</label>
                <input
                  type="text"
                  required
                  value={newDeal.title}
                  onChange={(e) => setNewDeal({ ...newDeal, title: e.target.value })}
                  placeholder="مثال: خرید اشتراک سالانه ۵۰ کاربره"
                  className="w-full p-2.5 bg-muted/40 border border-border rounded-xl focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">مخاطب / مشتری *</label>
                {contactOptions.length === 0 ? (
                  <div className="p-2.5 rounded-xl bg-muted/40 border border-border text-muted-foreground">
                    ابتدا یک سرنخ یا مشتری ثبت کنید.
                  </div>
                ) : (
                  <select
                    required
                    value={newDeal.contactId}
                    onChange={(e) => setNewDeal({ ...newDeal, contactId: e.target.value })}
                    className="w-full p-2.5 bg-muted/40 border border-border rounded-xl focus:outline-none focus:border-primary"
                  >
                    {contactOptions.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.fullName} {c.company ? `(${c.company})` : ""}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">مبلغ معامله (تومان - عدد انگلیسی) *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={newDeal.amount}
                    onChange={(e) => setNewDeal({ ...newDeal, amount: e.target.value })}
                    placeholder="48000000"
                    className="w-full p-2.5 bg-muted/40 border border-border rounded-xl focus:outline-none focus:border-primary font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">مرحله شروع</label>
                  <select
                    value={newDeal.stage}
                    onChange={(e) => setNewDeal({ ...newDeal, stage: e.target.value as DealStage })}
                    className="w-full p-2.5 bg-muted/40 border border-border rounded-xl focus:outline-none focus:border-primary"
                  >
                    {STAGES.map((s) => (
                      <option key={s.key} value={s.key}>{s.title}</option>
                    ))}
                  </select>
                </div>
              </div>

              {canFilterByOwner && assignableUsers.length > 0 && (
                <div>
                  <label className="block font-semibold mb-1">کارشناس مسئول</label>
                  <OwnerSelect
                    users={assignableUsers}
                    value={newDeal.ownerId}
                    onChange={(ownerId) => setNewDeal({ ...newDeal, ownerId })}
                    allowUnassigned={false}
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowAddDealModal(false)}
                  className="px-4 py-2 rounded-xl border border-border hover:bg-muted text-muted-foreground font-semibold"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || contactOptions.length === 0}
                  className="px-5 py-2 rounded-xl bg-primary text-primary-foreground font-bold shadow-sm hover:opacity-90 disabled:opacity-50"
                >
                  {isSubmitting ? "در حال ثبت..." : "ایجاد معامله"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
