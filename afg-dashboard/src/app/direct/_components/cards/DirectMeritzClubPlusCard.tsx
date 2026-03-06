"use client";

import React from "react";
import { APPLE_CARD_BASE } from "@/app/_components/dashboard/constants";
import { formatMan } from "@/app/_components/dashboard/utils";
import { motion } from "framer-motion";

export type DirectMeritzClubPlusCardProps = {
  janPerf: number;
  febPerf: number;
  marchPerf: number;
  plusTarget: number | null;
  plusProgress: number;
  currentMonthNum: number;
  meritzClubPlusPrize: number;
  monthLabel?: string;
};

export function DirectMeritzClubPlusCard({
  janPerf,
  febPerf,
  marchPerf,
  plusTarget,
  plusProgress,
  currentMonthNum,
  meritzClubPlusPrize,
  monthLabel = "3월",
}: DirectMeritzClubPlusCardProps) {
  const target = plusTarget ?? 0;
  const hasTarget = target > 0;
  const tierMan = target >= 1000000 ? 100 : target > 0 ? target / 10000 : 20;
  const goalLabel = tierMan >= 100 ? "100만원" : `${tierMan}만원`;
  
  const isDisqualified = !hasTarget;

  const Row = ({
    label,
    perf,
    target: rowTarget,
    isCurrent,
  }: {
    label: string;
    perf: number;
    target?: number;
    isCurrent?: boolean;
  }) => {
    const isDone = rowTarget ? perf >= rowTarget : false;
    return (
      <div
        className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2 bg-white/40 dark:bg-gray-900/40 border transition-all ${
          isCurrent
            ? "border-amber-500/50 ring-1 ring-amber-400/30 shadow-[0_0_12px_rgba(245,158,11,0.1)]"
            : "border-gray-100 dark:border-gray-800"
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`flex-shrink-0 inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold border ${
              isDone
                ? "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-400 dark:border-emerald-800"
                : "bg-gray-50 text-gray-400 border-gray-200 dark:bg-gray-800 dark:text-gray-500 dark:border-gray-700"
            }`}
          >
            {isDone ? "✓" : "•"}
          </span>
          <div className="min-w-0">
            <p className="text-[10.5px] font-semibold text-gray-800 dark:text-gray-100">{label}</p>
            <p className="text-[9.5px] text-gray-500 dark:text-gray-400 truncate">
              {formatMan(perf)}만 {rowTarget ? `/ 목표 ${formatMan(rowTarget)}만` : ""}
            </p>
          </div>
        </div>
        <span
          className={`text-[10px] font-bold ${
            isDone ? "text-emerald-600 dark:text-emerald-400" : isCurrent ? "text-amber-600 dark:text-amber-400" : "text-gray-400 dark:text-gray-500"
          }`}
        >
          {isDone ? "달성" : isCurrent ? "도전중" : "완료"}
        </span>
      </div>
    );
  };

  return (
    <div className={`${APPLE_CARD_BASE} h-full border-amber-300/60 dark:border-amber-600/60 bg-gradient-to-br from-white/90 via-white/50 to-amber-50/40 dark:from-white/10 dark:via-white/5 dark:to-amber-900/10 text-gray-900 dark:text-white overflow-hidden`}>
      <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
        <svg viewBox="0 0 24 24" className="w-16 h-16 fill-current text-amber-600" aria-hidden><path d="M12 2L2 12l10 10 10-10L12 2z"/></svg>
      </div>

      <div className="flex items-start justify-between gap-3 relative z-10">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 flex-shrink-0 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-md border border-white/20">
            <span className="text-[11px] font-extrabold tracking-tight text-white">MC+</span>
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-amber-700/80 dark:text-meritz-gold/80 tracking-tight uppercase">1분기 퀀텀점프</p>
            <h3 className="text-[15.5px] font-bold text-gray-900 dark:text-white truncate mt-0.5 leading-tight tracking-tight">메리츠 클럽 플러스</h3>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-700 border border-amber-500/20 shadow-sm dark:bg-meritz-gold/20 dark:text-meritz-gold dark:border-meritz-gold/40">
            300% 시상
          </span>
          {isDisqualified && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 text-red-600 border border-red-500/20 dark:bg-red-500/20 dark:text-red-400 dark:border-red-500/40">
              미대상
            </span>
          )}
        </div>
      </div>

      <div className="mt-3 space-y-1 relative z-10">
        <Row label="1월 실적" perf={janPerf} target={200000} isCurrent={currentMonthNum === 1} />
        <Row label="2월 실적" perf={febPerf} target={janPerf >= 200000 ? Math.max(200000, janPerf) : 200000} isCurrent={currentMonthNum === 2} />
        <Row label="3월 달성 목표" perf={marchPerf} target={target} isCurrent={currentMonthNum === 3} />
      </div>

      <div className="mt-auto pt-2.5 relative z-10">
        <div className="pt-2.5 border-t border-gray-100 dark:border-white/10 flex items-center justify-between">
          <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">{monthLabel} 상반기 예상</p>
          <p className="text-base font-bold text-gray-900 dark:text-white drop-shadow-sm">
            {formatMan(meritzClubPlusPrize)}만원
          </p>
        </div>
      </div>
    </div>
  );
}
