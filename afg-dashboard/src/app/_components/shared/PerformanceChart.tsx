import React from "react";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatMan } from "@/app/_components/dashboard/utils";
import { PerformanceData } from "@/types";
import { Agent } from "@/types";

interface PerformanceChartProps {
  performanceData: PerformanceData[];
  showPartnerContent: boolean;
  directRanks: Record<string, number[]>;
  partnerRanks: Record<string, number[]>;
  selectedAgent: Agent;
  agents: Agent[];
  setSelectedViewMonth: (month: 1 | 2 | 3) => void;
}

const MONTH_KEY_MAP: Record<string, string> = {
  "8월": "2025-08",
  "9월": "2025-09",
  "10월": "2025-10",
  "11월": "2025-11",
  "12월": "2025-12",
  "1월": "2026-01",
  "2월": "2026-02",
  "3월": "2026-03",
};

/** Binary-search equivalent: find the rank (#1 is highest) for a given perf value in a sorted-desc array */
function findRank(sortedDesc: number[], perf: number): number | null {
  if (!sortedDesc || sortedDesc.length === 0) return null;
  // Find the first index where sortedDesc[i] <= perf  →  anything equal counts as same rank
  const idx = sortedDesc.findIndex((v) => v <= perf);
  if (idx === -1) return sortedDesc.length + 1;
  // Check if the found value equals perf (exact match)
  if (sortedDesc[idx] === perf) return idx + 1;
  return null; // value not present
}

export function PerformanceChart({
  performanceData,
  showPartnerContent,
  directRanks,
  partnerRanks,
  selectedAgent,
  setSelectedViewMonth,
}: PerformanceChartProps) {
  const rankLabel = showPartnerContent ? "파트너 RANK" : "다이렉트 RANK";
  const cohortRanks = showPartnerContent ? partnerRanks : directRanks;

  return (
    <div className="sm:col-span-2 lg:col-span-6 bg-surface-light dark:bg-surface-dark rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-4 md:p-6 lg:h-full flex flex-col min-h-[400px]">
      <div className="flex justify-between items-center mb-4 shrink-0">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center">
            <svg
              viewBox="0 0 24 24"
              className="w-5 h-5 flex-shrink-0 text-meritz-gray fill-current mr-2"
              aria-hidden
            >
              <path d="M3.5 18.49l6-6.01 4 4L22 6.92l-1.41-1.41-7.09 7.07-4-4L2 16.99z" />
            </svg>
            최근 7개월 실적 추이
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            1월·2월·3월 클릭 시 시상 현황 전환 &nbsp;|&nbsp; 막대: 예상 총 시상금
          </p>
        </div>
      </div>
      <div className="flex-1 min-h-[250px] w-full mt-2">
        <ResponsiveContainer width="100%" height={250}>
          <ComposedChart data={performanceData}>
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
                  const value = payload.find((p) => p.dataKey === "value")?.value as
                    | number
                    | undefined;
                  const prize = payload.find((p) => p.dataKey === "prize")?.value as
                    | number
                    | undefined;

                  let rank: string | null = null;
                  const monthKey = label != null ? MONTH_KEY_MAP[label as string] : undefined;

                  if (value != null && monthKey && cohortRanks[monthKey]) {
                    const r = findRank(cohortRanks[monthKey], value);
                    if (r !== null) rank = String(r);
                  }

                  // Fallback: count from cohort array
                  if (rank === null && value != null && monthKey && cohortRanks[monthKey]) {
                    const arr = cohortRanks[monthKey];
                    const above = arr.filter((v) => v > value).length;
                    rank = String(above + 1);
                  }

                  return (
                    <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded shadow-md">
                      {value != null && (
                        <p className="text-sm font-bold text-primary mb-1">
                          실적 {formatMan(value)}만원
                        </p>
                      )}
                      {prize != null && prize > 0 && (
                        <p className="text-sm font-bold text-amber-600 dark:text-amber-400 mb-1">
                          추정 시상금 {formatMan(prize)}만원
                        </p>
                      )}
                      {value != null && rank !== null && (
                        <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                          {rankLabel} : {rank}위
                        </p>
                      )}
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar
              yAxisId="right"
              dataKey="prize"
              fill="#D4A574"
              radius={[4, 4, 0, 0]}
              opacity={0.7}
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="value"
              stroke="#EF3B24"
              strokeWidth={3}
              dot={(props: any) => {
                const { cx, cy, payload } = props;
                const isClickable =
                  payload?.name === "1월" ||
                  payload?.name === "2월" ||
                  payload?.name === "3월";
                const monthNum =
                  payload?.name === "1월"
                    ? 1
                    : payload?.name === "2월"
                      ? 2
                      : payload?.name === "3월"
                        ? 3
                        : null;
                return (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={isClickable ? 6 : 4}
                    fill="#EF3B24"
                    style={isClickable ? { cursor: "pointer" } : undefined}
                    onClick={
                      monthNum != null ? () => setSelectedViewMonth(monthNum as 1 | 2 | 3) : undefined
                    }
                  />
                );
              }}
              activeDot={{ r: 6 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
