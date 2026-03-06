"use client";

import React from "react";
import { motion } from "framer-motion";
import { TierBadges } from "@/app/_components/shared/cards/TierBadges";
import { DirectDoubleMeritzCard } from "./DirectDoubleMeritzCard";
import { DirectMeritzClubPlusCard } from "./DirectMeritzClubPlusCard";
import { DirectRegularPrizeCard } from "./DirectRegularPrizeCard";
import { MarchEarlyRunCard } from "./MarchEarlyRunCard";
import { MovingBorderCard } from "@/components/ui/moving-border";

/** 금액 표시: 원 단위를 '만원' 기준 소수 첫째 자리(천원 단위)까지, 반올림 없이 표시 */
function formatMan(amount: number | null | undefined): string {
  const v = typeof amount === "number" ? amount : Number(amount ?? 0);
  if (!Number.isFinite(v) || v === 0) return "0";
  const manTimes10 = Math.floor((v / 10000) * 10); // 0.1만원(=천원 단위) 내림
  const man = manTimes10 / 10;
  const hasDecimal = manTimes10 % 10 !== 0;
  return man.toLocaleString(undefined, hasDecimal ? { minimumFractionDigits: 1, maximumFractionDigits: 1 } : { maximumFractionDigits: 0 });
}

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
const accentCyan = "bg-gradient-to-br from-cyan-50/90 via-sky-50/70 to-teal-50/60 dark:from-cyan-900/30 dark:via-slate-800/60 dark:to-teal-900/20 border-cyan-200/60 dark:border-cyan-500/25 shadow-[0_2px_24px_rgba(6,182,212,0.08)] dark:shadow-[0_2px_24px_rgba(6,182,212,0.12)]";

const labelCls = "text-[11px] font-medium tracking-wide uppercase text-gray-600 dark:text-gray-400";
const prizeCls = "text-xl font-bold tracking-tight text-red-600 dark:text-red-400";

export interface MarchCardsProps {
  /** MMDD, 조기가동 현재 주차 강조용 */
  updateDate?: string;
  viewW1: number;
  week1SpecialPrize: number;
  week1PatayaPrize: number;
  currentMonthPerf: number;
  prevMonthPerf: number;
  doubleMeritzPrize: number;
  meritzClubPlusPrize: number;
  plusTarget: number | null;
  /** 3월 메리츠클럽+ 달성목표 표기: min(1월,2월) 실적 */
  plusTargetMinPerf: number;
  plusProgress: number;
  janPerf: number;
  febPerf: number;
  marchPerf: number;
  currentMonthNum: number;
  regularPrize?: number;
  dailyDiff?: number;
  earlyRunWeekPrizes?: number[];
  earlyRunWeekPerfs?: number[];
}

export function MarchCards(props: MarchCardsProps) {
  const {
    updateDate,
    viewW1,
    week1SpecialPrize,
    week1PatayaPrize,
    currentMonthPerf,
    prevMonthPerf,
    doubleMeritzPrize,
    meritzClubPlusPrize,
    plusTarget,
    plusTargetMinPerf,
    plusProgress,
    janPerf,
    febPerf,
    marchPerf,
    currentMonthNum,
    regularPrize = 0,
    dailyDiff = 0,
    earlyRunWeekPrizes = [0, 0, 0, 0],
    earlyRunWeekPerfs = [0, 0, 0, 0],
  } = props;

  return (
    <motion.section
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-3 mb-6"
    >
      {/* 1행: 파타야 여행시상 2칸 | AFG 조기가동 1칸 */}
      {/* ── 파타야 여행시상 ── */}
      <motion.div
        variants={itemVariants}
        className="md:col-span-2 rounded-2xl p-[3px] overflow-hidden"
        animate={{
          background: [
            "conic-gradient(from 0deg at 50% 50%, #06b6d4, #0d9488, #14b8a6, #22d3ee, #06b6d4)",
            "conic-gradient(from 360deg at 50% 50%, #06b6d4, #0d9488, #14b8a6, #22d3ee, #06b6d4)",
          ],
          boxShadow: [
            "0 0 20px rgba(6,182,212,0.45), 0 0 40px rgba(13,148,136,0.25)",
            "0 0 32px rgba(34,211,238,0.55), 0 0 56px rgba(20,184,166,0.35)",
            "0 0 20px rgba(6,182,212,0.45), 0 0 40px rgba(13,148,136,0.25)",
          ],
        }}
        transition={{
          background: { duration: 8, repeat: Infinity, ease: "linear" },
          boxShadow: { duration: 2.5, repeat: Infinity, repeatType: "reverse" },
        }}
      >
        <div className={`relative rounded-[14px] overflow-hidden ${card} ${accentCyan} p-2 flex flex-col justify-between min-h-0 w-full h-full`}>
          <div className="absolute -top-10 -right-10 w-36 h-36 rounded-full bg-cyan-300/20 dark:bg-cyan-400/10 blur-2xl pointer-events-none" />
          <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
            <img
              src="/meritzair.png"
              alt=""
              className="absolute inset-0 w-full h-full min-w-full min-h-full object-cover object-center"
            />
          </div>
          <div className="relative z-10 md:drop-shadow-[0_1px_2px_rgba(255,255,255,0.9)] md:[text-shadow:0_0_6px_rgb(255,255,255),0_1px_3px_rgba(0,0,0,0.4)]">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl md:drop-shadow-[0_0_4px_rgba(255,255,255,0.8)]">🌴</span>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">파타야 여행시상</h3>
                <p className="text-[10px] text-gray-800 dark:text-gray-200 font-medium opacity-90">3월 실적 기준</p>
              </div>
            </div>
            <TierBadges tiersMan={[40, 60, 80, 100]} currentPerf={currentMonthPerf} className="mb-1" />
          </div>
          <div className="relative z-10 md:[text-shadow:0_0_6px_rgb(255,255,255),0_1px_3px_rgba(0,0,0,0.4)]">
            {(() => {
              const p = currentMonthPerf;
              const toMan = (n: number) => formatMan(n);
              let label = "";
              let remain = 0;
              if (p < 400000) { label = "탑승까지"; remain = 400000 - p; }
              else if (p < 600000) { label = "1박추가까지"; remain = 600000 - p; }
              else if (p < 800000) { label = "국적기+5성까지"; remain = 800000 - p; }
              else if (p < 1000000) { label = "1인실+1만바트까지"; remain = 1000000 - p; }
              else { label = "챔피언까지"; remain = 0; }
              
              return (
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-800 dark:text-gray-200 uppercase tracking-wide opacity-90">현재 실적</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">{formatMan(p)}<span className="text-sm font-medium text-gray-700 dark:text-gray-300 ml-0.5">만원</span></p>
                  </div>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white bg-white/80 dark:bg-black/40 backdrop-blur-sm px-2.5 py-1 rounded-full border border-gray-200/80 dark:border-white/20 shadow-sm text-right whitespace-nowrap">
                    {`${label} ${toMan(remain)}만원`}
                  </span>
                </div>
              );
            })()}
          </div>
        </div>
      </motion.div>

      {/* ── 3월 AFG 조기가동 (빙글빙글 컬러 테두리) ── */}
      <motion.div variants={itemVariants} className="h-full">
        <MovingBorderCard borderRadius="1.5rem" duration={3500}>
          <MarchEarlyRunCard
            weekPrizes={earlyRunWeekPrizes}
            weekPerfs={earlyRunWeekPerfs}
            updateDate={updateDate}
          />
        </MovingBorderCard>
      </motion.div>

      {/* 2행: 1주차 특별 | 1주차 PATTAYA | 3월 정규 — 세로 패딩 10% 증가, 하단 블록 동일량 하단으로 */}
      {/* ── 1주차 특별 현금시상 ── */}
      <motion.div variants={itemVariants} className={`${card} ${glassLight} px-2 py-[0.55rem] flex flex-col h-full`}>
        {(() => {
          const specialBadge = viewW1 >= 1200000 ? "최대구간 달성완료" : viewW1 >= 1000000 ? "120만구간도전" : viewW1 >= 800000 ? "100만구간도전" : viewW1 >= 500000 ? "80만구간도전" : viewW1 >= 300000 ? "50만구간도전" : viewW1 >= 200000 ? "30만구간도전" : "20만구간도전";
          const isMax = viewW1 >= 1200000;
          return (
            <div className="flex items-center justify-between mb-1">
              <div>
                <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 tracking-tight">1주차 구간 시상</p>
                <h3 className="text-[14px] font-bold text-gray-900 dark:text-white leading-tight">1주차 특별 현금시상</h3>
              </div>
              <span className={isMax
                ? "text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-500/20 border border-emerald-200 dark:border-emerald-500/30 px-2 py-0.5 rounded-full"
                : "text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-500/20 border border-amber-200 dark:border-amber-500/30 px-2 py-0.5 rounded-full"
              }>
                {specialBadge}
              </span>
            </div>
          );
        })()}
        <TierBadges tiersMan={[20, 30, 50, 80, 100, 120]} currentPerf={viewW1} className="mb-1" />
        <div className="mt-[0.05rem]">
          <div className="mt-1.5 pt-1.5 border-t border-gray-200/60 dark:border-white/[0.06] flex items-end justify-between">
            <div>
              <p className={labelCls}>현재</p>
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{formatMan(viewW1)}만</p>
            </div>
            <div className="text-right">
              <p className={labelCls}>예상 시상금</p>
              <p className={prizeCls}>{formatMan(week1SpecialPrize)}만원</p>
            </div>
          </div>
          {(() => {
            const next = getNextTierAndPrize(viewW1, SPECIAL_TIERS_ASC);
            if (!next || next.gap <= 0) return null;
            return <p className="text-[11px] text-emerald-500 dark:text-emerald-400 mt-1 font-medium">+{formatMan(next.gap)}만 더 → 시상금 +{formatMan(next.addPrize)}만</p>;
          })()}
        </div>
      </motion.div>

      {/* ── 1주차 PATTAYA 특별 현금 시상 ── */}
      <motion.div variants={itemVariants} className={`${card} ${glassLight} px-2 py-[0.55rem] flex flex-col h-full`}>
        {(() => {
          const patayaBadge = viewW1 >= 1000000 ? "최대구간 달성완료" : viewW1 >= 700000 ? "100만구간도전" : viewW1 >= 500000 ? "70만구간도전" : viewW1 >= 300000 ? "50만구간도전" : viewW1 >= 200000 ? "30만구간도전" : "20만구간도전";
          const isMax = viewW1 >= 1000000;
          return (
            <div className="flex items-center justify-between mb-1">
              <div>
                <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 tracking-tight">1주차 구간 시상</p>
                <h3 className="text-[14px] font-bold text-gray-900 dark:text-white leading-tight">1주차 PATTAYA 특별 현금 시상</h3>
              </div>
              <span className={isMax
                ? "text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-500/20 border border-emerald-200 dark:border-emerald-500/30 px-2 py-0.5 rounded-full"
                : "text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-500/20 border border-amber-200 dark:border-amber-500/30 px-2 py-0.5 rounded-full"
              }>
                {patayaBadge}
              </span>
            </div>
          );
        })()}
        <TierBadges tiersMan={[20, 30, 50, 70, 100]} currentPerf={viewW1} className="mb-1" />
        <div className="mt-[0.05rem]">
          <div className="mt-1.5 pt-1.5 border-t border-gray-200/60 dark:border-white/[0.06] flex items-end justify-between">
            <div>
              <p className={labelCls}>현재</p>
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{formatMan(viewW1)}만</p>
            </div>
            <div className="text-right">
              <p className={labelCls}>예상 시상금</p>
              <p className={prizeCls}>{formatMan(week1PatayaPrize)}만원</p>
            </div>
          </div>
          {(() => {
            const next = getNextTierAndPrize(viewW1, PATAYA_TIERS_ASC);
            if (!next || next.gap <= 0) return null;
            return <p className="text-[11px] text-orange-500 dark:text-orange-400 mt-1 font-medium">+{formatMan(next.gap)}만 더 → 시상금 +{formatMan(next.addPrize)}만</p>;
          })()}
        </div>
      </motion.div>

      {/* ── 3월 정규시상 ── */}
      <motion.div variants={itemVariants} className="h-full">
        <DirectRegularPrizeCard
          title="3월 정규 시상"
          perf={currentMonthPerf}
          prize={currentMonthPerf}
          dailyDiff={dailyDiff}
          monthLabel="3월"
          variant="indigo"
          hideSubtitle
          compactTitle
          moreVerticalPadding
        />
      </motion.div>

      {/* 3행: 2배 메리츠클럽 | 메리츠 클럽+ */}
      {/* ── 2배 메리츠클럽 ── */}
      <motion.div variants={itemVariants} className="h-full">
        <DirectDoubleMeritzCard
          prevMonthPerf={prevMonthPerf}
          currentMonthPerf={currentMonthPerf}
          doubleMeritzPrize={doubleMeritzPrize}
          currentMonthNum={currentMonthNum}
        />
      </motion.div>

      {/* ── 메리츠 클럽+ ── */}
      <motion.div variants={itemVariants} className="h-full">
        <DirectMeritzClubPlusCard
          janPerf={janPerf}
          febPerf={febPerf}
          marchPerf={marchPerf}
          plusTarget={plusTarget}
          plusProgress={plusProgress}
          currentMonthNum={currentMonthNum}
          meritzClubPlusPrize={meritzClubPlusPrize}
        />
      </motion.div>
    </motion.section>
  );
}
