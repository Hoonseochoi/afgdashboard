"use client";

import React from "react";
import { APPLE_CARD_BASE } from "@/app/_components/dashboard/constants";
import { formatMan } from "@/app/_components/dashboard/utils";
import { motion } from "framer-motion";

export type DirectRegularPrizeCardProps = {
  title: string;
  perf: number;
  prize: number;
  dailyDiff?: number;
  monthLabel?: string;
  variant?: "slate" | "sky" | "indigo";
};

export function DirectRegularPrizeCard({
  title,
  perf,
  prize,
  dailyDiff = 0,
  monthLabel = "당월",
  variant = "slate",
}: DirectRegularPrizeCardProps) {
  const themes = {
    slate: "border-slate-200/60 dark:border-slate-500/30 bg-gradient-to-br from-white/90 via-white/50 to-slate-50/40 dark:from-white/10 dark:via-white/5 dark:to-slate-900/10",
    sky: "border-sky-200/60 dark:border-sky-500/30 bg-gradient-to-br from-white/90 via-white/50 to-sky-50/40 dark:from-white/10 dark:via-white/5 dark:to-sky-900/10",
    indigo: "border-indigo-200/60 dark:border-indigo-500/30 bg-gradient-to-br from-white/90 via-white/50 to-indigo-50/40 dark:from-white/10 dark:via-white/5 dark:to-indigo-900/10",
  };

  const accentColors = {
    slate: "text-slate-900 dark:text-slate-100",
    sky: "text-sky-900 dark:text-sky-100",
    indigo: "text-indigo-900 dark:text-indigo-100",
  };

  return (
    <div
      className={`${APPLE_CARD_BASE} h-full ${themes[variant]} shadow-sm relative overflow-hidden group hover:shadow-md transition-all duration-300 border`}
    >
      <div className="absolute top-0 right-0 p-3 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-500">
        <svg viewBox="0 0 24 24" className="w-16 h-16 fill-current text-gray-400 dark:text-white/40" aria-hidden>
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
        </svg>
      </div>

      <div className="relative z-10 h-full flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-gray-500 dark:text-white/60 tracking-tight uppercase">{monthLabel} 마감 목표</p>
            <h3 className={`text-[15.5px] font-bold ${accentColors[variant]} truncate leading-tight tracking-tight`}>
              {title}
            </h3>
          </div>
          <span className="flex-shrink-0 bg-emerald-500/10 text-emerald-600 text-[10px] px-2 py-0.5 rounded-full font-bold border border-emerald-400/20 whitespace-nowrap shadow-sm dark:bg-emerald-500/20 dark:text-emerald-300">
            시상 100%
          </span>
        </div>

        <p className="text-[11px] text-gray-400 dark:text-white/50 mb-auto italic">실적과 시상금 1:1 매칭 구간</p>

        <div className="mt-4 pt-3 border-t border-gray-100 dark:border-white/10 flex items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] text-gray-500 dark:text-white/60 font-medium uppercase tracking-wider mb-0.5">현재 실적</p>
            <p className="text-sm font-bold text-gray-900 dark:text-white tracking-tight">{formatMan(perf)}<span className="text-[10px] font-normal ml-0.5 opacity-80">만원</span></p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-[10px] text-gray-500 dark:text-white/60 font-medium uppercase tracking-wider mb-0.5">예상 시상금</p>
            <p className="text-2xl font-black text-gray-900 dark:text-white leading-none tracking-tight drop-shadow-sm">
              {formatMan(prize)}<span className="text-xs font-bold ml-0.5">만원</span>
            </p>
          </div>
        </div>

        {dailyDiff !== 0 && (
          <motion.div 
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            className="mt-2.5 flex justify-end"
          >
            <div className={`inline-flex items-center gap-1.5 text-[10.5px] font-bold rounded-lg px-2.5 py-1 ${
              dailyDiff > 0
                ? "bg-red-500 text-white shadow-sm ring-1 ring-red-400/50"
                : "bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-white/80 border border-gray-200 dark:border-white/20"
            }`}>
              <span className="text-[8px] opacity-80">{dailyDiff > 0 ? "▲" : "▼"}</span>
              {`전일비 ${dailyDiff > 0 ? "+" : ""}${formatMan(dailyDiff)}만원`}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
