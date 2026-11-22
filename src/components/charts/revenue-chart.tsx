"use client";

import React, { useEffect, useState } from "react";
import { formatNumber } from "@/lib/utils";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const monthlyData = [
  { month: "فروردین", revenue: 28000, deals: 18 },
  { month: "اردیبهشت", revenue: 34000, deals: 22 },
  { month: "خرداد", revenue: 31000, deals: 20 },
  { month: "تیر", revenue: 42000, deals: 29 },
  { month: "مرداد", revenue: 39000, deals: 26 },
  { month: "شهریور", revenue: 46000, deals: 31 },
  { month: "مهر", revenue: 52000, deals: 36 },
  { month: "آبان", revenue: 48295, deals: 34 },
];

export default function RevenueChart() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
        <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
            tickFormatter={(val) => `${val / 1000}k`}
          />
          <Tooltip
            formatter={(value: any) => [`${formatNumber(value)} هزار تومان`, "درآمد"]}
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
            dataKey="revenue"
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
