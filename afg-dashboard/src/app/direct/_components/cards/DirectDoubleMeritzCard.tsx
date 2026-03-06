"use client";

import React from "react";
import { APPLE_CARD_BASE } from "@/app/_components/dashboard/constants";
import { formatMan } from "@/app/_components/dashboard/utils";

const DOUBLE_MERITZ_TIERS = [20, 30, 40, 50, 60, 70, 80, 90, 100]; // 만원 단위

export type DirectDoubleMeritzCardProps = {
  prevMonthPerf: number;
  currentMonthPerf: number;
  doubleMeritzPrize: number;
  monthLabel?: string;
  prevMonthLabel?: string;
};

export function DirectDoubleMeritzCard({
  prevMonthPerf,
  currentMonthPerf,
  doubleMeritzPrize,
  monthLabel = "당월",
  prevMonthLabel = "전월",
}: DirectDoubleMeritzCardProps) {
  const eligible = prevMonthPerf >= 200000;
  const achieved = eligible && currentMonthPerf >= 200000;
  
  const nextTierMan = DOUBLE_MERITZ_TIERS.find((tierMan) => {
    const tierValue = tierMan * 10000;
    return !(achieved && currentMonthPerf >= tierValue);
  });

  return (
    <div className={`${APPLE_CARD_BASE} h-full border-amber-300/80 dark:border-amber-600/80 bg-gradient-to-br from-white/80 via-white/40 to-amber-50/30 dark:from-white/10 dark:via-white/5 dark:to-amber-900/10`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-200 tracking-tight">Only AFG CLUB</p>
          <h3 className="text-[15.5px] font-bold text-gray-900 dark:text-white tracking-tight leading-tight">
            2배 메리츠 클럽
          </h3>
          <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
            {prevMonthLabel}·{monthLabel} 각 20만 이상 시
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="relative w-9 h-9 flex-shrink-0">
            <div className="absolute inset-0 bg-amber-500 rounded-2xl rotate-6 opacity-20 animate-pulse" />
            <span className="relative flex items-center justify-center w-9 h-9 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-400 text-white text-xs font-extrabold shadow-md border border-amber-300/50">
              X2
            </span>
          </div>
          {!eligible ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600">
              미대상
            </span>
          ) : (
            <span
              className={`text-[10px] font-semibold whitespace-nowrap ${
                achieved ? "text-emerald-600 dark:text-emerald-300" : "text-amber-600 dark:text-amber-300"
              }`}
            >
              {achieved ? "연속 달성" : "도전중"}
            </span>
          )}
        </div>
      </div>

      <div className="mt-2.5 grid grid-cols-5 gap-1.5">
        {DOUBLE_MERITZ_TIERS.map((tierMan) => {
          const tierValue = tierMan * 10000;
          const isAchieved = achieved && currentMonthPerf >= tierValue;
          const isNextTarget = eligible && nextTierMan === tierMan;
          return (
            <span
              key={tierMan}
              className={`inline-flex items-center justify-center rounded-xl px-2 py-1.5 text-[11px] font-semibold transition-all ${
                isAchieved
                  ? "bg-amber-500 text-white dark:bg-amber-600 dark:text-white shadow-sm ring-2 ring-amber-400/30"
                  : isNextTarget
                    ? "bg-white/80 dark:bg-gray-800/70 text-amber-600 dark:text-amber-400 border-2 border-dashed border-amber-400 shadow-sm"
                    : "bg-white/40 dark:bg-gray-800/40 text-gray-400 dark:text-gray-500 border border-gray-100 dark:border-gray-700"
              }`}
            >
              {tierMan}만
            </span>
          );
        })}
      </div>

      <div className="mt-auto pt-2.5 border-t border-gray-100/80 dark:border-gray-700/80">
        <div className="flex items-center justify-between text-[11px] text-gray-600 dark:text-gray-400">
          <span>{monthLabel} {formatMan(currentMonthPerf)}만 / 예상 시상금</span>
          <span className="text-base font-bold text-amber-600 dark:text-amber-300">
            {formatMan(doubleMeritzPrize)}만원
          </span>
        </div>
        {eligible && (() => {
          if (nextTierMan == null) return null;
          const nextTierValue = nextTierMan * 10000;
          const remaining = Math.max(0, nextTierValue - currentMonthPerf);
          if (remaining <= 0) return null;
          return (
            <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400 font-medium whitespace-nowrap overflow-hidden text-ellipsis">
              {nextTierMan}만까지 <span className="font-bold underlineDecoration">{formatMan(remaining)}만원</span> 남음
            </p>
          );
        })()}
      </div>
    </div>
  );
}
