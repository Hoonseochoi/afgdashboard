"use client";

import React from "react";
import { APPLE_CARD_BASE } from "../../constants";
import { formatMan } from "../../utils";

const DOUBLE_MERITZ_TIERS = [20, 30, 40, 50, 60, 70, 80, 90, 100]; // 만원 단위 (10 제외)

export type PartnerDoubleMeritzCardProps = {
  prevMonthPerf: number;
  currentMonthPerf: number;
  doubleMeritzPrize: number;
};

export function PartnerDoubleMeritzCard({
  prevMonthPerf,
  currentMonthPerf,
  doubleMeritzPrize,
}: PartnerDoubleMeritzCardProps) {
  const eligible = prevMonthPerf >= 200000 && currentMonthPerf >= 200000;
  const ineligible = prevMonthPerf < 200000;
  const nextTierMan = DOUBLE_MERITZ_TIERS.find((tierMan) => {
    const tierValue = tierMan * 10000;
    return !(eligible && currentMonthPerf >= tierValue);
  });

  return (
    <div className={`${APPLE_CARD_BASE} h-full border-amber-300/80 dark:border-amber-600/80`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-200 tracking-tight">Only AFG CLUB</p>
          <h3 className="text-[15.5px] font-bold text-gray-900 dark:text-white tracking-tight leading-tight">
            2배 메리츠 클럽
          </h3>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="inline-flex items-center justify-center w-9 h-9 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-400 text-white text-xs font-extrabold shadow-md">
            X2
          </span>
          {ineligible ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600">
              미대상
            </span>
          ) : (
            <span
              className={`text-[10px] font-semibold whitespace-nowrap ${
                eligible ? "text-emerald-600 dark:text-emerald-300" : "text-gray-600 dark:text-gray-300"
              }`}
            >
              {eligible ? "조건 충족" : "도전중"}
            </span>
          )}
        </div>
      </div>

      <div className="mt-2 grid grid-cols-5 gap-1.5">
        {DOUBLE_MERITZ_TIERS.map((tierMan) => {
          const tierValue = tierMan * 10000;
          const achieved = eligible && currentMonthPerf >= tierValue;
          const isNextTarget = !ineligible && nextTierMan === tierMan;
          return (
            <span
              key={tierMan}
              className={`inline-flex items-center justify-center rounded-xl px-2 py-1.5 text-[11px] font-semibold transition-all ${
                achieved
                  ? "bg-red-500 text-white dark:bg-red-500 dark:text-white shadow-sm"
                  : isNextTarget
                    ? "bg-white/80 dark:bg-gray-800/70 text-gray-500 dark:text-gray-400 border-2 border-dashed border-red-500 dark:border-red-400"
                    : "bg-white/80 dark:bg-gray-800/70 text-gray-500 dark:text-gray-400 border border-gray-200/80 dark:border-gray-700"
              }`}
            >
              {tierMan}만
            </span>
          );
        })}
      </div>

      <div className="mt-2 pt-2 border-t border-gray-100/80 dark:border-gray-700/80">
        <div className="flex items-center justify-between text-[11px] text-gray-600 dark:text-gray-400">
          <span>예상 시상금</span>
          <span className="text-base font-bold text-amber-600 dark:text-amber-300">
            {formatMan(doubleMeritzPrize)}만원
          </span>
        </div>
        {!ineligible && (() => {
          if (nextTierMan == null) return null;
          const nextTierValue = nextTierMan * 10000;
          const remaining = Math.max(0, nextTierValue - currentMonthPerf);
          if (remaining <= 0) return null;
          return (
            <p className="mt-1 text-[13px] text-red-600 dark:text-red-400 font-medium">
              달성까지 남은 금액 {formatMan(remaining)}만원
            </p>
          );
        })()}
      </div>
    </div>
  );
}
