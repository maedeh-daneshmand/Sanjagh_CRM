"use client";

import React, { useSyncExternalStore } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import type { SourceSharePoint } from "@/server/dashboard";

const emptySubscribe = () => () => {};

export default function SourcePieChart({ data }: { data: SourceSharePoint[] }) {
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);

  if (!mounted) {
    return (
      <div className="h-52 w-full flex items-center justify-center bg-muted/10 rounded-xl text-xs text-muted-foreground animate-pulse">
        در حال بارگذاری نمودار...
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="h-52 w-full flex items-center justify-center text-xs text-muted-foreground">
        داده‌ای برای نمایش وجود ندارد
      </div>
    );
  }

  return (
    <div className="h-52 w-full flex items-center justify-center my-2">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={75}
            paddingAngle={4}
            dataKey="value"
          >
            {data.map((entry, index) => (
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
