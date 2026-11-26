"use client";

import React, { useState, useRef, useEffect } from "react";
import { AssignableUser } from "@/server/contacts";
import { ChevronDown, Search, UserCheck, Check, UserX } from "lucide-react";

interface OwnerSelectProps {
  users: AssignableUser[];
  value: string | null;
  onChange: (ownerId: string | null) => void;
  disabled?: boolean;
  placeholder?: string;
  allowUnassigned?: boolean;
  compact?: boolean;
}

export function OwnerSelect({
  users,
  value,
  onChange,
  disabled = false,
  placeholder = "انتخاب کارشناس...",
  allowUnassigned = true,
  compact = false,
}: OwnerSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const selectedUser = users.find((u) => u.id === value) || null;

  const filteredUsers = users.filter((u) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return u.name.toLowerCase().includes(q) || u.phone.includes(q);
  });

  const handleSelect = (id: string | null) => {
    onChange(id);
    setOpen(false);
    setQuery("");
  };

  return (
    <div ref={containerRef} className="relative text-right">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className={`w-full flex items-center justify-between gap-2 border border-border rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed ${
          compact
            ? "px-2.5 py-1.5 text-[11px] bg-muted/30 hover:bg-muted/60 min-w-[140px]"
            : "p-2.5 text-xs bg-muted/40 hover:bg-muted/60"
        }`}
      >
        <span className="flex items-center gap-1.5 truncate">
          <UserCheck className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <span className={selectedUser ? "text-foreground font-medium truncate" : "text-muted-foreground truncate"}>
            {selectedUser ? selectedUser.name : value === null && allowUnassigned ? "تخصیص‌نیافته" : placeholder}
          </span>
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 mt-1.5 w-60 bg-card border border-border rounded-2xl shadow-xl p-2 z-50 space-y-1.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-muted-foreground absolute right-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="جستجوی نام یا موبایل..."
              autoFocus
              className="w-full pl-2 pr-8 py-1.5 bg-muted/40 border border-border rounded-lg text-[11px] focus:outline-none focus:border-primary"
            />
          </div>

          <div className="max-h-48 overflow-y-auto space-y-0.5">
            {allowUnassigned && (
              <button
                type="button"
                onClick={() => handleSelect(null)}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-[11px] transition-colors ${
                  value === null
                    ? "bg-primary/10 text-primary font-bold"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <UserX className="w-3.5 h-3.5" />
                  <span>تخصیص‌نیافته</span>
                </span>
                {value === null && <Check className="w-3.5 h-3.5" />}
              </button>
            )}

            {filteredUsers.length === 0 ? (
              <div className="text-center py-3 text-[11px] text-muted-foreground">
                کارشناسی یافت نشد
              </div>
            ) : (
              filteredUsers.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => handleSelect(u.id)}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-[11px] transition-colors ${
                    value === u.id
                      ? "bg-primary/10 text-primary font-bold"
                      : "text-foreground hover:bg-muted"
                  }`}
                >
                  <div className="flex flex-col items-start truncate">
                    <span className="truncate">{u.name}</span>
                    <span className="text-[10px] text-muted-foreground font-mono">{u.phone}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="px-1.5 py-0.5 rounded bg-muted text-[9px] text-muted-foreground">
                      {u.role === "MANAGER" ? "مدیر" : "کارشناس"}
                    </span>
                    {value === u.id && <Check className="w-3.5 h-3.5 text-primary" />}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
