"use client";

import React from "react";
import { motion } from "framer-motion";
import { formatMan } from "@/app/_components/dashboard/utils";

const card = "relative overflow-hidden rounded-2xl backdrop-blur-xl border transition-all duration-200";
const glass = "bg-white/70 dark:bg-white/[0.06] border-white/50 dark:border-white/[0.12] shadow-[0_2px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_20px_rgba(0,0,0,0.3)]";

const WEEK_LABELS = [
  { week: 1, rate: "400%" },
  { week: 2, rate: "300%" },
  { week: 3, rate: "250%" },
  { week: 4, rate: "200%" },
];

/** updateDate(MMDD) 기준 3월 현재 주차 1~4. 없거나 비3월이면 0 */
function getMarchCurrentWeek(updateDate: string | undefined): number {
  const s = String(updateDate ?? "").trim();
  if (!s || s === "0000" || s.length < 4) return 0;
  const mm = parseInt(s.slice(0, 2), 10);
  const dd = parseInt(s.slice(2, 4), 10);
  if (mm !== 3 || !Number.isFinite(dd) || dd < 1 || dd > 31) return 0;
  return Math.min(4, Math.ceil(dd / 7));
}

export type MarchEarlyRunCardProps = {
  weekPrizes: number[];
  weekPerfs: number[];
  /** MMDD, 현재 주차 강조용 */
  updateDate?: string;
};

export function MarchEarlyRunCard({ weekPrizes, weekPerfs, updateDate }: MarchEarlyRunCardProps) {
  const total = weekPrizes.reduce((a, b) => a + b, 0);
  const currentWeek = getMarchCurrentWeek(updateDate);

  return (
    <motion.div className={`${card} ${glass} p-2 flex flex-col h-full min-h-[220px]`}>
      <span className="absolute top-0 right-0 z-10 text-[10px] font-bold text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-950/70 border border-red-300 dark:border-red-500/60 px-2 py-1 rounded-bl-lg rounded-tr-2xl shadow-sm">
        ACFP 기준 / 가족계약제외
      </span>
      <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2 min-w-0">
          <img
            src="/logo.png"
            alt=""
            className="w-9 h-9 flex-shrink-0 rounded-lg object-contain bg-white/50 dark:bg-white/10 border border-slate-200/60 dark:border-slate-600/60 shadow-sm"
          />
          <div className="min-w-0">
            <p className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 tracking-tight uppercase">
              AFG 조기가동
            </p>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight leading-tight">
              3월 조기가동
            </h3>
          </div>
        </div>
      </div>

      <div className="space-y-1 flex-1 min-h-0">
        {WEEK_LABELS.map(({ week, rate }, i) => {
          const perf = weekPerfs[i] ?? 0;
          const prize = weekPrizes[i] ?? 0;
          const isCurrentWeek = currentWeek > 0 && week === currentWeek;
          return (
            <div
              key={week}
              className={`flex items-center justify-between rounded-md border transition-all ${
                isCurrentWeek
                  ? "bg-red-50/80 dark:bg-red-950/30 border-2 border-red-500 dark:border-red-400 shadow-sm py-1.5 px-2 text-[13px]"
                  : "bg-gray-50/80 dark:bg-white/[0.04] border border-gray-100 dark:border-white/[0.06] text-xs py-1 px-1.5"
              }`}
            >
              <span className={isCurrentWeek ? "font-semibold text-red-600 dark:text-red-400" : "font-semibold text-gray-600 dark:text-gray-300"}>
                {week}주차 {rate}
              </span>
              <div className="flex items-center gap-3">
                <span className={isCurrentWeek ? "text-red-500 dark:text-red-400" : "text-gray-500 dark:text-gray-400"}>
                  실적 {formatMan(perf)}만
                </span>
                <span className={`font-bold min-w-[3rem] text-right ${isCurrentWeek ? "text-red-600 dark:text-red-300" : "text-gray-900 dark:text-white"}`}>
                  {formatMan(prize)}만원
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {total > 0 && (
        <p className="text-right text-[12px] font-semibold text-red-600 dark:text-red-400 mt-2 mb-1">
          합계 {formatMan(total)}만원
        </p>
      )}
      <p className="text-[9px] text-gray-400 dark:text-gray-500 mt-1.5 pt-1.5 border-t border-gray-100 dark:border-white/[0.06] italic">
        *ACFP기준으로 지급되며 대시보드는 FP기준으로 표시됩니다.
      </p>
      </div>
    </motion.div>
  );
}
