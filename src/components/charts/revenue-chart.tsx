"use client";

import React, { useSyncExternalStore } from "react";
import { formatNumber } from "@/lib/utils";
import type { MonthlySalesPoint } from "@/server/dashboard";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const emptySubscribe = () => () => {};

export default function RevenueChart({
  data,
  metric = "revenue",
}: {
  data: MonthlySalesPoint[];
  metric?: "revenue" | "deals";
}) {
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);

  if (!mounted) {
    return (
      <div className="h-72 w-full flex items-center justify-center bg-muted/10 rounded-xl text-xs text-muted-foreground animate-pulse">
        در حال بارگذاری نمودار...
      </div>
    );
  }

  return (
    <div className="h-72 w-full pt-2">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} stroke="none" />
          <YAxis
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            stroke="none"
            tickFormatter={(val) =>
              metric === "revenue" ? `${Math.round(Number(val) / 1000)}k` : `${val}`
            }
          />
          <Tooltip
            formatter={(value: unknown) => [
              metric === "revenue"
                ? `${typeof value === "number" || typeof value === "string" ? formatNumber(value) : "0"} هزار تومان`
                : `${typeof value === "number" || typeof value === "string" ? formatNumber(value) : "0"} معامله`,
              metric === "revenue" ? "درآمد" : "تعداد معاملات",
            ]}
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              borderColor: "hsl(var(--border))",
              borderRadius: "0.75rem",
              fontSize: "12px",
              direction: "rtl",
            }}
          />
          <Area
            type="monotone"
            dataKey={metric}
            stroke="hsl(var(--primary))"
            strokeWidth={2.5}
            fillOpacity={1}
            fill="url(#revenueGrad)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
