"use client";

import React from "react";
import { TierBadges } from "./TierBadges";

const SPECIAL_TIERS_ASC: [number, number][] = [[200000, 200000], [300000, 300000], [500000, 1000000], [800000, 2400000], [1000000, 4000000], [1200000, 6000000]];
const PATAYA_TIERS_ASC: [number, number][] = [[200000, 200000], [300000, 300000], [500000, 1000000], [700000, 2100000], [1000000, 5000000]];

function getNextTierAndPrize(perf: number, tiersAsc: [number, number][]): { gap: number; addPrize: number } | null {
  for (let i = 0; i < tiersAsc.length; i++) {
    const [thresh, prize] = tiersAsc[i];
    if (perf < thresh) {
      const currentPrize = i === 0 ? 0 : tiersAsc[i - 1][1];
      return { gap: thresh - perf, addPrize: prize - currentPrize };
    }
  }
  return null;
}

export interface MarchCardsProps {
  viewW1: number;
  week1SpecialPrize: number;
  week1PatayaPrize: number;
  currentMonthPerf: number;
  prevMonthPerf: number;
  doubleMeritzPrize: number;
  meritzClubPlusPrize: number;
  plusTarget: number | null;
  plusNext: string;
  plusProgress: number;
  febPerf: number;
  marchPerf: number;
  currentMonthNum: number;
}

export function MarchCards(props: MarchCardsProps) {
  const {
    viewW1,
    week1SpecialPrize,
    week1PatayaPrize,
    currentMonthPerf,
    prevMonthPerf,
    doubleMeritzPrize,
    meritzClubPlusPrize,
    plusTarget,
    plusNext,
    plusProgress,
    febPerf,
    marchPerf,
    currentMonthNum,
  } = props;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5 mb-6">
      {/* 파타야 여행시상 (3월) — 40/60/80/100 구간 · 휴양지 테마 */}
      <div className="rounded-xl shadow-lg shadow-cyan-200/25 dark:shadow-cyan-900/20 border-2 border-cyan-300/50 dark:border-cyan-500/40 p-4 bg-gradient-to-br from-sky-100 via-cyan-50 to-teal-50 dark:from-slate-800 dark:via-cyan-900/50 dark:to-teal-950">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-cyan-600 dark:text-cyan-400 font-bold">🌴 파타야 여행시상</span>
          <span className="text-xs text-sky-600/80 dark:text-sky-400/80">3월</span>
        </div>
        <p className="text-xs text-sky-600/80 dark:text-sky-400/80 mb-2">3월 실적 기준 · 40/60/80/100만원 구간</p>
        <TierBadges tiersMan={[40, 60, 80, 100]} currentPerf={currentMonthPerf} className="mb-3" />
        <div className="flex justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-300">현재 3월 실적 {Math.round(currentMonthPerf / 10000)}만원</span>
          <span className="font-semibold text-teal-600 dark:text-cyan-400">
            {currentMonthPerf >= 1000000 ? "100만 달성!" : currentMonthPerf >= 800000 ? "다음 100만" : currentMonthPerf >= 600000 ? "다음 80만" : currentMonthPerf >= 400000 ? "다음 60만" : "다음 40만"}
          </span>
        </div>
      </div>

      {/* 1주차 특별 현금시상 */}
      <div className="rounded-xl shadow-sm border border-emerald-200 dark:border-emerald-800 p-4 bg-emerald-500/5 dark:bg-emerald-400/5">
        <h4 className="text-base font-bold text-gray-900 dark:text-white mb-1">1주차 특별 현금시상</h4>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">3월 1주차 실적</p>
        <TierBadges tiersMan={[20, 30, 50, 80, 100, 120]} currentPerf={viewW1} className="mb-2" />
        <div className="flex justify-between text-sm mt-2">
          <span className="text-gray-600 dark:text-gray-400">현재 {Math.round(viewW1 / 10000)}만</span>
          <span className="font-bold text-emerald-600 dark:text-emerald-400">{Math.round(week1SpecialPrize / 10000)}만원</span>
        </div>
        {(() => {
          const next = getNextTierAndPrize(viewW1, SPECIAL_TIERS_ASC);
          if (!next || next.gap <= 0) return null;
          return (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2 pt-2 border-t border-emerald-200/50 dark:border-emerald-700/50">
              {Math.round(next.gap / 10000).toLocaleString()}만원 더하시면 시상금 {Math.round(next.addPrize / 10000).toLocaleString()}만원 추가 !
            </p>
          );
        })()}
      </div>

      {/* 1주차 PATAYA 특별 */}
      <div className="rounded-xl shadow-sm border border-orange-200 dark:border-orange-800 p-4 bg-orange-500/5 dark:bg-orange-400/5">
        <h4 className="text-base font-bold text-gray-900 dark:text-white mb-1">1주차 PATAYA특별 현금시상</h4>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">3월 1주차 실적</p>
        <TierBadges tiersMan={[20, 30, 50, 70, 100]} currentPerf={viewW1} className="mb-2" />
        <div className="flex justify-between text-sm mt-2">
          <span className="text-gray-600 dark:text-gray-400">현재 실적 {Math.round(viewW1 / 10000)}만원</span>
        </div>
        <div className="flex justify-between text-sm mt-0.5">
          <span className="text-gray-500 dark:text-gray-400">예상 시상금</span>
          <span className="font-bold text-orange-600 dark:text-orange-400">{Math.round(week1PatayaPrize / 10000)}만원</span>
        </div>
        {(() => {
          const next = getNextTierAndPrize(viewW1, PATAYA_TIERS_ASC);
          if (!next || next.gap <= 0) return null;
          return (
            <p className="text-xs text-orange-600 dark:text-orange-400 mt-2 pt-2 border-t border-orange-200/50 dark:border-orange-700/50">
              {Math.round(next.gap / 10000).toLocaleString()}만원 더하시면 시상금 {Math.round(next.addPrize / 10000).toLocaleString()}만원 추가 !
            </p>
          );
        })()}
      </div>

      {/* 2배 메리츠클럽 */}
      <div className="bg-gradient-to-br from-amber-950 via-amber-900/95 to-gray-900 dark:from-gray-900 dark:via-amber-950/80 dark:to-gray-950 rounded-xl shadow-lg border border-amber-500/30 p-3 md:p-4 text-white">
        <h4 className="text-base font-bold text-white mb-0.5">2배 메리츠클럽</h4>
        <p className="text-xs text-amber-100 mb-2">2월·3월 각 20만 이상 시</p>
        <div className="flex justify-between text-xs text-amber-100 mb-1">
          <span>2월 {Math.round(prevMonthPerf / 10000)}만 / 3월 {Math.round(currentMonthPerf / 10000)}만</span>
        </div>
        <div className="border-t border-amber-400/20 pt-2 flex justify-between items-center">
          <span className="text-xs text-amber-100">예상 시상금</span>
          <span className="text-base font-bold text-white">{Math.round(doubleMeritzPrize / 10000).toLocaleString()}만원</span>
        </div>
      </div>

      {/* 메리츠클럽+ */}
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 dark:from-gray-800 dark:to-gray-900 rounded-xl shadow-lg border border-meritz-gold/30 p-3 md:p-4 text-white">
        <h4 className="text-base font-bold text-meritz-gold mb-0.5">메리츠 클럽+</h4>
        <p className="text-xs text-gray-300 mb-2">
          {currentMonthNum >= 3 ? "min(1,2월) 구간 목표 · 3월 실적" : "2월 실적 · 목표"}
        </p>
        <div className="flex justify-between text-xs mb-1 text-gray-300">
          <span>3월 {Math.round(marchPerf / 10000)}만 / 목표 {Math.round((plusTarget || 200000) / 10000)}만</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-1.5 border border-gray-600 mb-2">
          <div className="bg-meritz-gold h-1.5 rounded-full" style={{ width: `${Math.min(100, plusProgress)}%` }} />
        </div>
        <div className="border-t border-gray-700 pt-2 flex justify-between items-center">
          <span className="text-xs text-gray-400">예상 시상금</span>
          <span className="text-base font-bold text-white">{Math.round(meritzClubPlusPrize / 10000).toLocaleString()}만원</span>
        </div>
      </div>

      {/* 3월 정규 시상 */}
      <div className="bg-gradient-to-br from-slate-800 via-slate-700/90 to-slate-900 dark:from-slate-900 dark:via-slate-800 dark:to-slate-950 rounded-xl shadow-lg border border-slate-500/30 p-3 md:p-4 text-white">
        <h4 className="text-base font-bold text-slate-100 mb-0.5">3월 정규 시상</h4>
        <p className="text-xs text-slate-300/80 mb-2">3월 실적 100%</p>
        <div className="border-t border-white/10 pt-2 flex justify-between items-center">
          <span className="text-xs text-slate-400">3월 달성분</span>
          <span className="text-base font-bold text-white">{Math.round(marchPerf / 10000).toLocaleString()}만원</span>
        </div>
      </div>
    </div>
  );
}
