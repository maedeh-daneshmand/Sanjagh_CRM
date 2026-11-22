"use client";

import React, { useSyncExternalStore } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

const sourceData = [
  { name: "وب‌سایت مستقیم", value: 35, color: "#10b981" },
  { name: "اینستاگرام", value: 28, color: "#06b6d4" },
  { name: "معرفی و توصیه", value: 22, color: "#3b82f6" },
  { name: "شبکه‌های اجتماعی", value: 15, color: "#a855f7" },
];

const emptySubscribe = () => () => {};

export default function SourcePieChart() {
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);

  if (!mounted) {
    return (
      <div className="h-52 w-full flex items-center justify-center bg-muted/10 rounded-xl text-xs text-muted-foreground animate-pulse">
        در حال بارگذاری نمودار...
      </div>
    );
  }

  return (
    <div className="h-52 w-full flex items-center justify-center my-2">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={sourceData}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={75}
            paddingAngle={4}
            dataKey="value"
          >
            {sourceData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(val: unknown) => [`${typeof val === "number" || typeof val === "string" ? val : ""}%`, "سهم"]}
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              borderColor: "hsl(var(--border))",
              borderRadius: "0.75rem",
              fontSize: "12px",
              direction: "rtl",
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
