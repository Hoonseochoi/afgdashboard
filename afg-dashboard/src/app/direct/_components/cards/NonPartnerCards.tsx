"use client";

import React from "react";
import { motion } from "framer-motion";
import { DirectDoubleMeritzCard } from "./DirectDoubleMeritzCard";
import { DirectMeritzClubPlusCard } from "./DirectMeritzClubPlusCard";
import { DirectRegularPrizeCard } from "./DirectRegularPrizeCard";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: "spring" as const, stiffness: 120, damping: 14 } },
};

const card = "relative overflow-hidden rounded-2xl backdrop-blur-xl border transition-all duration-200";
const glassLight = "bg-white/70 dark:bg-white/[0.06] border-white/50 dark:border-white/[0.12] shadow-[0_2px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_20px_rgba(0,0,0,0.3)]";
const labelCls = "text-[11px] font-medium tracking-wide uppercase text-gray-600 dark:text-gray-400";
const prizeCls = "text-xl font-bold tracking-tight text-red-600 dark:text-red-400";

/** 금액 표시: 원 단위를 '만원' 기준 소수 첫째 자리(천원 단위)까지, 반올림 없이 표시 */
function formatMan(amount: number | null | undefined): string {
  const v = typeof amount === "number" ? amount : Number(amount ?? 0);
  if (!Number.isFinite(v) || v === 0) return "0";
  const manTimes10 = Math.floor((v / 10000) * 10);
  const man = manTimes10 / 10;
  const hasDecimal = manTimes10 % 10 !== 0;
  return man.toLocaleString("ko-KR", hasDecimal ? { minimumFractionDigits: 1, maximumFractionDigits: 1 } : { maximumFractionDigits: 0 });
}

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
  selectedViewMonth: 1 | 2 | 3;
  monthlyPrize: number;
  monthlyNext: string;
  monthlyProgress: number;
  currentMonthPerf: number;
  doubleMeritzPrize: number;
  prevMonthPerf: number;
  meritzClubPlusPrize: number;
  currentMonthNum: number;
  plusTarget: number | null;
  janPerf: number;
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
    janPerf,
    febPerf,
    marchPerf,
    plusNext,
    plusProgress,
    regularPrize,
    dailyDiff,
  } = props;

  return (
    <motion.section
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-3 mb-6"
    >
      {/* 1주차 현금시상 — 3월 카드와 동일 UI */}
      <motion.div variants={itemVariants} className={`${card} ${glassLight} p-2 flex flex-col h-full`}>
        <div className="flex items-center justify-between mb-1">
          <div>
            <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 tracking-tight">{selectedViewMonth}월 주차 시상</p>
            <h3 className="text-[14px] font-bold text-gray-900 dark:text-white leading-tight">1주차 현금시상</h3>
          </div>
          {week1Prize > 0 ? (
            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-500/20 border border-emerald-200 dark:border-emerald-500/30 px-2 py-0.5 rounded-full">달성완료</span>
          ) : (
            <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-500/20 border border-amber-200 dark:border-amber-500/30 px-2 py-0.5 rounded-full">달성 실패</span>
          )}
        </div>
        <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-1">현재 {formatMan(viewW1)}만 · {week1Past ? week1Next : `다음 구간 ${week1Next}`}</p>
        <div className="w-full bg-gray-200/80 dark:bg-white/[0.06] rounded-full h-1.5 mb-1">
          <div className="bg-emerald-500 dark:bg-emerald-400 h-1.5 rounded-full transition-[width] duration-300" style={{ width: `${week1Progress}%` }} />
        </div>
        <div className="mt-1.5 pt-1.5 border-t border-gray-200/60 dark:border-white/[0.06] flex items-end justify-between">
          <div>
            <p className={labelCls}>현재</p>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{formatMan(viewW1)}만</p>
          </div>
          <div className="text-right">
            <p className={labelCls}>예상 시상금</p>
            <p className={prizeCls}>{formatMan(week1Prize)}만원</p>
          </div>
        </div>
      </motion.div>

      {/* 2주차 현금시상 */}
      <motion.div variants={itemVariants} className={`${card} ${glassLight} p-2 flex flex-col h-full`}>
        <div className="flex items-center justify-between mb-1">
          <div>
            <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 tracking-tight">{selectedViewMonth}월 주차 시상</p>
            <h3 className="text-[14px] font-bold text-gray-900 dark:text-white leading-tight">2주차 현금시상</h3>
          </div>
          {week2Prize > 0 ? (
            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-500/20 border border-emerald-200 dark:border-emerald-500/30 px-2 py-0.5 rounded-full">달성완료</span>
          ) : (
            <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-500/20 border border-amber-200 dark:border-amber-500/30 px-2 py-0.5 rounded-full">{week2Past ? "달성 실패" : "진행중"}</span>
          )}
        </div>
        <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-1">현재 {formatMan(viewW2)}만 · {week2Past ? week2Next : `다음 구간 ${week2Next}`}</p>
        <div className="w-full bg-gray-200/80 dark:bg-white/[0.06] rounded-full h-1.5 mb-1">
          <div className="bg-primary h-1.5 rounded-full transition-[width] duration-300" style={{ width: `${week2Progress}%` }} />
        </div>
        <div className="mt-1.5 pt-1.5 border-t border-gray-200/60 dark:border-white/[0.06] flex items-end justify-between">
          <div>
            <p className={labelCls}>현재</p>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{formatMan(viewW2)}만</p>
          </div>
          <div className="text-right">
            <p className={labelCls}>예상 시상금</p>
            <p className={prizeCls}>{formatMan(week2Prize)}만원</p>
          </div>
        </div>
      </motion.div>

      {/* 3주차 현금시상 (1월만) */}
      {selectedViewMonth === 1 && (
        <motion.div variants={itemVariants} className={`${card} ${glassLight} p-2 flex flex-col h-full`}>
          <div className="flex items-center justify-between mb-1">
            <div>
              <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 tracking-tight">1월 주차 시상</p>
              <h3 className="text-[14px] font-bold text-gray-900 dark:text-white leading-tight">3주차 현금시상</h3>
            </div>
            {week3Prize > 0 ? (
              <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-500/20 border border-emerald-200 dark:border-emerald-500/30 px-2 py-0.5 rounded-full">달성완료</span>
            ) : (
              <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-500/20 border border-amber-200 dark:border-amber-500/30 px-2 py-0.5 rounded-full">달성 실패</span>
            )}
          </div>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-1">현재 {formatMan(viewW3)}만 · {week3Next}</p>
          <div className="w-full bg-gray-200/80 dark:bg-white/[0.06] rounded-full h-1.5 mb-1">
            <div className="bg-violet-500 dark:bg-violet-400 h-1.5 rounded-full transition-[width] duration-300" style={{ width: `${week3Progress}%` }} />
          </div>
          <div className="mt-1.5 pt-1.5 border-t border-gray-200/60 dark:border-white/[0.06] flex items-end justify-between">
            <div>
              <p className={labelCls}>현재</p>
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{formatMan(viewW3)}만</p>
            </div>
            <div className="text-right">
              <p className={labelCls}>예상 시상금</p>
              <p className={prizeCls}>{formatMan(week3Prize)}만원</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* 월간 현금시상 — 3월 카드와 동일 UI */}
      <motion.div variants={itemVariants} className={`${card} ${glassLight} p-2 flex flex-col h-full`}>
        <div className="flex items-center justify-between mb-1">
          <div>
            <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 tracking-tight">당월 누적</p>
            <h3 className="text-[14px] font-bold text-gray-900 dark:text-white leading-tight">월간 현금시상</h3>
          </div>
          {monthlyPrize > 0 ? (
            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-500/20 border border-emerald-200 dark:border-emerald-500/30 px-2 py-0.5 rounded-full">달성완료</span>
          ) : (
            <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-500/20 border border-amber-200 dark:border-amber-500/30 px-2 py-0.5 rounded-full">도전중</span>
          )}
        </div>
        <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-1">현재 {formatMan(currentMonthPerf)}만 · 다음 구간 {monthlyNext}</p>
        <div className="w-full bg-gray-200/80 dark:bg-white/[0.06] rounded-full h-1.5 mb-1">
          <div className="bg-sky-500 dark:bg-sky-400 h-1.5 rounded-full transition-[width] duration-300" style={{ width: `${monthlyProgress}%` }} />
        </div>
        <div className="mt-1.5 pt-1.5 border-t border-gray-200/60 dark:border-white/[0.06] flex items-end justify-between">
          <div>
            <p className={labelCls}>현재</p>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{formatMan(currentMonthPerf)}만</p>
          </div>
          <div className="text-right">
            <p className={labelCls}>예상 시상금</p>
            <p className={prizeCls}>{formatMan(monthlyPrize)}만원</p>
          </div>
        </div>
      </motion.div>

      {/* 2배 메리츠클럽 — 3월과 동일 컴포넌트 */}
      <motion.div variants={itemVariants} className="h-full">
        <DirectDoubleMeritzCard
          prevMonthPerf={prevMonthPerf}
          currentMonthPerf={currentMonthPerf}
          doubleMeritzPrize={doubleMeritzPrize}
          monthLabel={selectedViewMonth === 1 ? "1월" : "2월"}
          prevMonthLabel={selectedViewMonth === 1 ? "전년12월" : "1월"}
          currentMonthNum={selectedViewMonth}
        />
      </motion.div>

      {/* 메리츠 클럽+ — 3월과 동일 컴포넌트 */}
      <motion.div variants={itemVariants} className="h-full">
        <DirectMeritzClubPlusCard
          janPerf={janPerf}
          febPerf={febPerf}
          marchPerf={marchPerf}
          plusTarget={plusTarget}
          plusProgress={plusProgress}
          currentMonthNum={currentMonthNum}
          meritzClubPlusPrize={meritzClubPlusPrize}
          monthLabel="3월"
        />
      </motion.div>

      {/* 정규시상 — 3월과 동일 컴포넌트 */}
      <motion.div variants={itemVariants} className="h-full">
        <DirectRegularPrizeCard
          title={`${selectedViewMonth}월 정규 시상`}
          perf={currentMonthPerf}
          prize={regularPrize}
          dailyDiff={dailyDiff}
          monthLabel={`${selectedViewMonth}월`}
          variant="slate"
          hideSubtitle
          compactTitle
        />
      </motion.div>
    </motion.section>
  );
}
