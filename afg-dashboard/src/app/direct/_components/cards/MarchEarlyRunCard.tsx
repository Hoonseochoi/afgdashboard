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

export type MarchEarlyRunCardProps = {
  weekPrizes: number[];
  weekPerfs: number[];
};

export function MarchEarlyRunCard({ weekPrizes, weekPerfs }: MarchEarlyRunCardProps) {
  const total = weekPrizes.reduce((a, b) => a + b, 0);

  return (
    <motion.div className={`${card} ${glass} p-3 flex flex-col h-full`}>
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 tracking-tight uppercase">
            AFG 조기가동
          </p>
          <h3 className="text-[15.5px] font-bold text-gray-900 dark:text-white tracking-tight leading-tight">
            3월 조기가동
          </h3>
        </div>
        {total > 0 && (
          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-400/30 dark:border-emerald-500/30 px-2 py-0.5 rounded-full whitespace-nowrap">
            합계 {formatMan(total)}만원
          </span>
        )}
      </div>

      <div className="space-y-2 flex-1 min-h-0">
        {WEEK_LABELS.map(({ week, rate }, i) => {
          const perf = weekPerfs[i] ?? 0;
          const prize = weekPrizes[i] ?? 0;
          return (
            <div
              key={week}
              className="flex items-center justify-between text-xs py-1.5 px-2 rounded-lg bg-gray-50/80 dark:bg-white/[0.04] border border-gray-100 dark:border-white/[0.06]"
            >
              <span className="font-semibold text-gray-600 dark:text-gray-300">
                {week}주차 {rate}
              </span>
              <div className="flex items-center gap-3">
                <span className="text-gray-500 dark:text-gray-400">
                  실적 {formatMan(perf)}만
                </span>
                <span className="font-bold text-gray-900 dark:text-white min-w-[3rem] text-right">
                  {formatMan(prize)}만원
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-2 pt-2 border-t border-gray-100 dark:border-white/[0.06] italic">
        *ACFP기준으로 지급되며 대시보드는 FP기준으로 표시됩니다.
      </p>
    </motion.div>
  );
}
