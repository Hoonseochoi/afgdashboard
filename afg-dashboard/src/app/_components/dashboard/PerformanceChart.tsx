"use client";

import React from "react";
import {
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
  Line,
} from "recharts";
import { formatMan } from "./utils";

const MONTH_MAP: Record<string, string> = {
  "8월": "2025-08",
  "9월": "2025-09",
  "10월": "2025-10",
  "11월": "2025-11",
  "12월": "2025-12",
  "1월": "2026-01",
  "2월": "2026-02",
  "3월": "2026-03",
};

export interface PerformanceChartProps {
  /** 7개월 실적 데이터 { name, value, prize }[] */
  data: { name: string; value: number; prize: number }[];
  /** 1·2·3월 클릭 시 호출 */
  onMonthClick: (month: 1 | 2 | 3) => void;
  /** 툴팁 RANK 표시: (실적값, monthKey) => "1" | "2" | "-" 등 */
  getRank: (value: number, monthKey: string) => string;
}

export function PerformanceChart({ data, onMonthClick, getRank }: PerformanceChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="name" axisLine={false} tickLine={false} />
        <YAxis
          yAxisId="left"
          axisLine={false}
          tickLine={false}
          tickFormatter={(val) => `${formatMan(val as number)}만`}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          axisLine={false}
          tickLine={false}
          tickFormatter={(val) => `${formatMan(val as number)}만`}
        />
        <Tooltip
          content={({ active, payload, label }) => {
            if (active && payload && payload.length) {
              const value = payload.find((p) => p.dataKey === "value")?.value as number | undefined;
              const prize = payload.find((p) => p.dataKey === "prize")?.value as number | undefined;
              const monthKey = label != null ? MONTH_MAP[label] : undefined;
              const rank = value != null && monthKey ? getRank(value, monthKey) : "-";
              return (
                <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded shadow-md">
                  {value != null && (
                    <p className="text-sm font-bold text-primary mb-1">
                      실적 {formatMan(value)}만원
                    </p>
                  )}
                  {prize != null && prize > 0 && (
                    <p className="text-sm font-bold text-amber-600 dark:text-amber-400 mb-1">
                      시상금 {formatMan(prize)}만원
                    </p>
                  )}
                  {value != null && (
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                      RANK : {rank}위
                    </p>
                  )}
                </div>
              );
            }
            return null;
          }}
        />
        <Bar yAxisId="right" dataKey="prize" fill="#D4A574" radius={[4, 4, 0, 0]} />
        <Line
          yAxisId="left"
          type="monotone"
          dataKey="value"
          stroke="#EF3B24"
          strokeWidth={3}
          dot={(props: any) => {
            const { cx, cy, payload } = props;
            const isClickable =
              payload?.name === "1월" || payload?.name === "2월" || payload?.name === "3월";
            const monthNum =
              payload?.name === "1월" ? 1 : payload?.name === "2월" ? 2 : payload?.name === "3월" ? 3 : null;
            return (
              <circle
                cx={cx}
                cy={cy}
                r={isClickable ? 6 : 4}
                fill="#EF3B24"
                style={isClickable ? { cursor: "pointer" } : undefined}
                onClick={monthNum != null ? () => onMonthClick(monthNum) : undefined}
              />
            );
          }}
          activeDot={{ r: 6 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
