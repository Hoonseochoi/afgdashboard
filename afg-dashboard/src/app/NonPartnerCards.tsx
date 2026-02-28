"use client";

import React from "react";

export interface NonPartnerCardsProps {
  week1Prize: number;
  week1Next: string;
  week1Past: boolean;
  week1Progress: number;
  viewW1: number;
  week2Prize: number;
  week2Next: string;
  week2Past: boolean;
  week2Progress: number;
  viewW2: number;
  week3Prize: number;
  week3Next: string;
  week3Progress: number;
  viewW3: number;
  selectedViewMonth: 1 | 2;
  monthlyPrize: number;
  monthlyNext: string;
  monthlyProgress: number;
  currentMonthPerf: number;
  doubleMeritzPrize: number;
  prevMonthPerf: number;
  meritzClubPlusPrize: number;
  currentMonthNum: number;
  plusTarget: number | null;
  febPerf: number;
  marchPerf: number;
  plusNext: string;
  plusProgress: number;
  regularPrize: number;
  dailyDiff: number;
}

export function NonPartnerCards(props: NonPartnerCardsProps) {
  const {
    week1Prize,
    week1Next,
    week1Past,
    week1Progress,
    viewW1,
    week2Prize,
    week2Next,
    week2Past,
    week2Progress,
    viewW2,
    week3Prize,
    week3Next,
    week3Progress,
    viewW3,
    selectedViewMonth,
    monthlyPrize,
    monthlyNext,
    monthlyProgress,
    currentMonthPerf,
    doubleMeritzPrize,
    prevMonthPerf,
    meritzClubPlusPrize,
    currentMonthNum,
    plusTarget,
    febPerf,
    marchPerf,
    plusNext,
    plusProgress,
    regularPrize,
    dailyDiff,
  } = props;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5 mb-6">
      {/* 비파트너 전용: 3열 그리드. 2월 6장(3x2), 1월 7장(3+3+1). 2월과 동일 양식(1주→2주→월간→2배→MC+→정규), 1월만 3주차 추가 */}
      {/* 1주차 현금시상 */}
      <div className="group rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 md:p-4 hover:shadow-md hover:border-emerald-400/40 dark:hover:border-emerald-500/40 transition-all duration-200 relative overflow-hidden bg-emerald-500/5 dark:bg-emerald-400/5">
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500 dark:bg-emerald-400 rounded-l-xl" aria-hidden />
        <div className="flex justify-between items-start mb-3 pl-1">
          <div className="flex items-center gap-2">
            <div className="bg-emerald-500/20 dark:bg-emerald-400/20 p-1.5 rounded-lg border border-emerald-500/20 dark:border-emerald-400/20 flex items-center justify-center w-10 h-10">
              <svg viewBox="0 0 24 14" className="w-6 h-4 flex-shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden>
                <text x="0" y="11" fill="currentColor" fontSize="12" fontWeight="800" fontFamily="var(--font-nunito), sans-serif">1W</text>
              </svg>
            </div>
          </div>
          {week1Prize > 0 ? (
            <span className="text-[11px] font-semibold px-2 py-1 rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 whitespace-nowrap">달성완료</span>
          ) : (
            <span className="text-[11px] font-semibold px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-600 whitespace-nowrap">달성 실패</span>
          )}
        </div>
        <h4 className="text-base font-bold text-gray-900 dark:text-white mb-0.5 pl-1">1주차 현금시상</h4>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 pl-1">1주차 실적 기준</p>
        <div className="mb-3 pl-1">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-600 dark:text-gray-400">현재 {Math.round(viewW1 / 10000)}만</span>
            <span className={`font-semibold ${week1Next === "달성 실패" ? "text-red-500" : "text-emerald-600 dark:text-emerald-400"}`}>
              {week1Past ? week1Next : `다음 구간 ${week1Next}`}
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div className="bg-emerald-500 dark:bg-emerald-400 h-2 rounded-full transition-[width] duration-300" style={{ width: `${week1Progress}%` }} />
          </div>
        </div>
        <div className="border-t border-gray-100 dark:border-gray-700 pt-2.5 flex justify-between items-center pl-1">
          <span className="text-xs text-gray-500 dark:text-gray-400">예상 시상금</span>
          <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">{Math.round(week1Prize / 10000).toLocaleString()}만원</span>
        </div>
      </div>

      {/* 2주차 현금시상 */}
      <div className="group rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 md:p-4 hover:shadow-md hover:border-primary/50 dark:hover:border-primary/50 transition-all duration-200 relative overflow-hidden bg-primary/5">
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-l-xl" aria-hidden />
        <div className="flex justify-between items-start mb-3 pl-1 relative z-10">
          <div className="flex items-center gap-2">
            <div className="bg-primary/20 p-1.5 rounded-lg border border-primary/20 flex items-center justify-center w-10 h-10">
              <svg viewBox="0 0 24 14" className="w-6 h-4 flex-shrink-0 text-primary" aria-hidden>
                <text x="0" y="11" fill="currentColor" fontSize="12" fontWeight="800" fontFamily="var(--font-nunito), sans-serif">2W</text>
              </svg>
            </div>
          </div>
          {week2Prize > 0 ? (
            <span className="text-[11px] font-semibold px-2 py-1 rounded-md bg-primary/15 text-primary border border-primary/20 whitespace-nowrap">달성완료</span>
          ) : (
            <span className="text-[11px] font-semibold px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-600 whitespace-nowrap">
              {week2Past ? "달성 실패" : "진행중"}
            </span>
          )}
        </div>
        <h4 className="text-base font-bold text-gray-900 dark:text-white mb-0.5 pl-1 relative z-10">2주차 현금시상</h4>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 pl-1 relative z-10">2주차 실적 기준</p>
        <div className="mb-3 pl-1 relative z-10">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-600 dark:text-gray-400">현재 {Math.round(viewW2 / 10000)}만</span>
            <span className={`font-semibold ${week2Next === "달성 실패" ? "text-red-500" : "text-primary"}`}>
              {week2Past ? week2Next : `다음 구간 ${week2Next}`}
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div className="bg-primary h-2 rounded-full transition-[width] duration-300" style={{ width: `${week2Progress}%` }} />
          </div>
        </div>
        <div className="border-t border-gray-100 dark:border-gray-700 pt-2.5 flex justify-between items-center pl-1 relative z-10">
          <span className="text-xs text-gray-500 dark:text-gray-400">예상 시상금</span>
          <span className="text-base font-bold text-primary">{Math.round(week2Prize / 10000).toLocaleString()}만원</span>
        </div>
      </div>

      {/* 3주차 현금시상 (1월만) */}
      {selectedViewMonth === 1 && (
        <div className="group rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 md:p-4 hover:shadow-md hover:border-violet-400/40 dark:hover:border-violet-500/40 transition-all duration-200 relative overflow-hidden bg-violet-500/5 dark:bg-violet-400/5">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-violet-500 dark:bg-violet-400 rounded-l-xl" aria-hidden />
          <div className="flex justify-between items-start mb-3 pl-1">
            <div className="flex items-center gap-2">
              <div className="bg-violet-500/20 dark:bg-violet-400/20 p-1.5 rounded-lg border border-violet-500/20 dark:border-violet-400/20 flex items-center justify-center w-10 h-10">
                <svg viewBox="0 0 24 14" className="w-6 h-4 flex-shrink-0 text-violet-600 dark:text-violet-400" aria-hidden>
                  <text x="0" y="11" fill="currentColor" fontSize="12" fontWeight="800" fontFamily="var(--font-nunito), sans-serif">3W</text>
                </svg>
              </div>
            </div>
            {week3Prize > 0 ? (
              <span className="text-[11px] font-semibold px-2 py-1 rounded-md bg-violet-500/15 text-violet-700 dark:text-violet-300 border border-violet-500/20 whitespace-nowrap">달성완료</span>
            ) : (
              <span className="text-[11px] font-semibold px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-600 whitespace-nowrap">달성 실패</span>
            )}
          </div>
          <h4 className="text-base font-bold text-gray-900 dark:text-white mb-0.5 pl-1">3주차 현금시상</h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 pl-1">3주차 실적 기준</p>
          <div className="mb-3 pl-1">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-600 dark:text-gray-400">현재 {Math.round(viewW3 / 10000)}만</span>
              <span className={`font-semibold ${week3Next === "달성 실패" ? "text-red-500" : "text-violet-600 dark:text-violet-400"}`}>
                {week3Next}
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div className="bg-violet-500 dark:bg-violet-400 h-2 rounded-full transition-[width] duration-300" style={{ width: `${week3Progress}%` }} />
            </div>
          </div>
          <div className="border-t border-gray-100 dark:border-gray-700 pt-2.5 flex justify-between items-center pl-1">
            <span className="text-xs text-gray-500 dark:text-gray-400">예상 시상금</span>
            <span className="text-base font-bold text-violet-600 dark:text-violet-400">{Math.round(week3Prize / 10000).toLocaleString()}만원</span>
          </div>
        </div>
      )}

      {/* 월간 현금시상 */}
      <div className="group rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 md:p-4 hover:shadow-md hover:border-sky-400/40 dark:hover:border-sky-500/40 transition-all duration-200 relative overflow-hidden bg-sky-500/5 dark:bg-sky-400/5">
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-sky-500 dark:bg-sky-400 rounded-l-xl" aria-hidden />
        <div className="flex justify-between items-start mb-3 pl-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center min-w-[2.5rem] h-7 px-2 rounded-md bg-sky-500 dark:bg-sky-400 text-white text-xs font-bold shadow-sm whitespace-nowrap">월간</span>
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 dark:bg-sky-400/10 flex items-center justify-center border border-sky-500/20 dark:border-sky-400/20">
              <svg viewBox="0 0 24 24" className="w-5 h-5 flex-shrink-0 text-sky-600 dark:text-sky-400 fill-current" aria-hidden><path d="M12 2l2.4 7.4h7.6l-6 4.6 2.3 7-6.3-4.6L5.7 21l2.3-7-6-4.6h7.6L12 2z"/></svg>
            </div>
          </div>
          {monthlyPrize > 0 ? (
            <span className="text-[11px] font-semibold px-2 py-1 rounded-md bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/20 whitespace-nowrap">달성완료</span>
          ) : (
            <span className="text-[11px] font-semibold px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-600 whitespace-nowrap">도전중</span>
          )}
        </div>
        <h4 className="text-base font-bold text-gray-900 dark:text-white mb-0.5 pl-1">월간 현금시상</h4>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 pl-1">당월 누적 실적</p>
        <div className="mb-3 pl-1">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-600 dark:text-gray-400">현재 {Math.round(currentMonthPerf / 10000)}만</span>
            <span className="text-sky-600 dark:text-sky-400 font-semibold">다음 구간 {monthlyNext}</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div className="bg-sky-500 dark:bg-sky-400 h-2 rounded-full transition-[width] duration-300" style={{ width: `${monthlyProgress}%` }} />
          </div>
        </div>
        <div className="border-t border-gray-100 dark:border-gray-700 pt-2.5 flex justify-between items-center pl-1">
          <span className="text-xs text-gray-500 dark:text-gray-400">예상 시상금</span>
          <span className="text-base font-bold text-sky-600 dark:text-sky-400">{Math.round(monthlyPrize / 10000).toLocaleString()}만원</span>
        </div>
      </div>

      {/* 2배 메리츠클럽 */}
      <div className="bg-gradient-to-br from-amber-950 via-amber-900/95 to-gray-900 dark:from-gray-900 dark:via-amber-950/80 dark:to-gray-950 rounded-xl shadow-lg border border-amber-500/30 p-3 md:p-4 text-white relative overflow-hidden hover:shadow-xl transition-all">
        <div className="absolute top-0 right-0 p-3 opacity-10 z-0 pointer-events-none font-extrabold text-2xl text-amber-400" style={{ fontFamily: "var(--font-nunito), sans-serif" }}>X2</div>
        <div className="relative z-20">
          <div className="flex justify-between items-start mb-3">
            <div className="bg-amber-500/20 p-1.5 rounded-lg border border-amber-400/20 flex items-center justify-center w-10 h-10">
              <svg viewBox="0 0 20 14" className="w-5 h-4 flex-shrink-0 text-amber-400" aria-hidden>
                <text x="0" y="11" fill="currentColor" fontSize="12" fontWeight="800" fontFamily="var(--font-nunito), sans-serif">X2</text>
              </svg>
            </div>
            {doubleMeritzPrize > 0 ? (
              <span className="bg-amber-500/30 text-amber-200 text-xs px-2.5 py-1 rounded-lg font-bold border border-amber-400/20 whitespace-nowrap">달성완료</span>
            ) : (
              <span className="bg-white/10 text-gray-300 text-xs px-2.5 py-1 rounded-lg font-bold border border-white/10 whitespace-nowrap">도전중</span>
            )}
          </div>
          <h4 className="text-base font-bold text-white mb-0.5">2배 메리츠클럽</h4>
          <p className="text-xs text-amber-100 mb-3">전월·당월 각 20만 이상 시</p>
          <div className="mb-3">
            <div className="flex justify-between text-xs mb-1 text-amber-100">
              <span>전월 {Math.round(prevMonthPerf / 10000)}만 / 당월 {Math.round(currentMonthPerf / 10000)}만</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-1.5 border border-amber-400/10">
              <div
                className="bg-gradient-to-r from-amber-500 to-amber-400 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${prevMonthPerf >= 200000 && currentMonthPerf >= 200000 ? Math.min(100, (currentMonthPerf / 1000000) * 100) : 0}%` }}
              />
            </div>
          </div>
          <div className="border-t border-amber-400/20 pt-2 flex justify-between items-center">
            <span className="text-xs text-amber-100">예상 시상금</span>
            <span className="text-base font-bold text-white">{Math.round(doubleMeritzPrize / 10000).toLocaleString()}만원</span>
          </div>
        </div>
      </div>

      {/* 메리츠클럽 PLUS */}
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 dark:from-gray-800 dark:to-gray-900 rounded-xl shadow-lg border border-meritz-gold/30 p-3 md:p-4 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
          <svg viewBox="0 0 24 24" className="w-14 h-14 fill-current text-meritz-gold/30" aria-hidden><path d="M12 2L2 12l10 10 10-10L12 2z"/></svg>
        </div>
        <div className="flex justify-between items-start mb-3 relative z-10">
          <div className="bg-meritz-gold/20 p-1.5 rounded-lg">
            <svg viewBox="0 0 24 24" className="w-5 h-5 flex-shrink-0 text-meritz-gold fill-current" aria-hidden><path d="M12 2L2 12l10 10 10-10L12 2z"/></svg>
          </div>
          {meritzClubPlusPrize > 0 ? (
            <span className="bg-meritz-gold text-white text-xs px-2 py-1 rounded font-bold shadow-sm whitespace-nowrap">조건 충족</span>
          ) : (
            <span className="bg-gray-700 text-gray-300 text-xs px-2 py-1 rounded font-bold shadow-sm whitespace-nowrap">도전중</span>
          )}
        </div>
        <h4 className="text-base font-bold text-meritz-gold mb-0.5">메리츠 클럽+</h4>
        <p className="text-xs text-gray-300 mb-3">
          {selectedViewMonth === 1
            ? "1월 달성 구간 목표 · 2월 실적"
            : currentMonthNum >= 3
              ? "min(1,2월) 구간 목표 · 3월 실적"
              : "1월 달성 구간 목표 · 2월 실적"}
        </p>
        <div className="mb-3 relative z-10">
          <div className="flex justify-between text-xs mb-1 text-gray-300">
            <span>
              {selectedViewMonth === 1
                ? `2월 ${Math.round(febPerf / 10000)}만 / 목표 ${Math.round((plusTarget || 200000) / 10000)}만`
                : currentMonthNum >= 3
                  ? `3월 ${Math.round(marchPerf / 10000)}만 / 목표 ${Math.round((plusTarget || 200000) / 10000)}만`
                  : `2월 ${Math.round(febPerf / 10000)}만 / 목표 ${Math.round((plusTarget || 200000) / 10000)}만`}
            </span>
            <span className="text-meritz-gold font-bold">
              {plusNext === "완성" || plusNext.startsWith("3월에도") ? plusNext : `다음 구간 ${plusNext}`}
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-1.5 border border-gray-600">
            <div className="bg-meritz-gold h-1.5 rounded-full" style={{ width: `${Math.min(100, plusProgress)}%` }} />
          </div>
        </div>
        <div className="border-t border-gray-700 pt-2 flex justify-between items-center relative z-10">
          <span className="text-xs text-gray-400">3월 완성시 예상 시상금</span>
          <span className="text-base font-bold text-white">{Math.round(meritzClubPlusPrize / 10000).toLocaleString()}만원</span>
        </div>
      </div>

      {/* 2월 정규시상 */}
      <div className="bg-gradient-to-br from-slate-800 via-slate-700/90 to-slate-900 dark:from-slate-900 dark:via-slate-800 dark:to-slate-950 rounded-xl shadow-lg border border-slate-500/30 p-3 md:p-4 text-white relative overflow-hidden hover:shadow-xl transition-all">
        <div className="absolute top-0 right-0 p-3 opacity-10 pointer-events-none">
          <svg viewBox="0 0 24 24" className="w-12 h-12 fill-current text-slate-400/30" aria-hidden><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
        </div>
        <div className="flex justify-between items-start mb-3 relative z-10">
          <div className="bg-white/10 px-2.5 py-1.5 rounded-xl border border-white/10 flex items-center justify-center">
            <span className="text-slate-300 text-sm font-extrabold" style={{ fontFamily: "var(--font-nunito), sans-serif" }}>￦</span>
          </div>
          <span className="bg-emerald-500/20 text-emerald-300 text-xs px-2.5 py-1 rounded-lg font-bold border border-emerald-400/20 whitespace-nowrap">실적 100%</span>
        </div>
        <h4 className="text-base font-bold text-slate-100 mb-0.5 relative z-10">{selectedViewMonth}월 정규시상</h4>
        <p className="text-xs text-slate-300/80 mb-3 relative z-10">실적의 100% · 1:1 비율</p>
        <div className="border-t border-white/10 pt-2 flex justify-between items-center relative z-10">
          <span className="text-xs text-slate-400">예상 시상금</span>
          <span className="text-base font-bold text-white">{Math.round(regularPrize / 10000).toLocaleString()}만원</span>
        </div>
        <div className="mt-2 flex justify-end relative z-10">
          <span
            className={`inline-flex items-center text-[11px] font-medium rounded-md px-2 py-1 ${
              dailyDiff > 0
                ? "bg-red-500/15 text-red-300 border border-red-400/40"
                : "text-slate-300 bg-white/10 border border-white/20"
            }`}
          >
            {dailyDiff === 0
              ? "전일비 변화 없음"
              : `전일비 ${dailyDiff > 0 ? "+" : "-"}${Math.round(Math.abs(dailyDiff) / 10000).toLocaleString()}만원`}
          </span>
        </div>
      </div>
    </div>
  );
}
