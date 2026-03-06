"use client";

import React from "react";
import { formatMan } from "@/app/_components/dashboard/utils";

export type MyHotData = {
  myHotSum: number;
  myHotRank: number;
  myHotIsChamp: boolean;
  myHotNextTier: number | null;
  myHotProgress: number;
  myHotLabel: string;
};

export type MyHotCardProps = {
  myHotData: MyHotData;
  selectedViewMonth: 1 | 2 | 3;
};

export function MyHotCard({ myHotData, selectedViewMonth }: MyHotCardProps) {
  const {
    myHotSum,
    myHotRank,
    myHotIsChamp,
    myHotProgress,
    myHotLabel,
  } = myHotData;

  return (
    <div className="rounded-xl shadow-lg border border-gray-700/50 overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 dark:from-black dark:via-gray-900 dark:to-black relative min-w-0 w-full h-full flex flex-col">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-meritz-gold/10 via-transparent to-transparent pointer-events-none" />
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-12 -mt-12 pointer-events-none" />
      <div className="relative z-10 p-2.5 md:p-5 flex flex-col items-center flex-1">
        <div className="w-full flex items-center gap-1.5 md:gap-2 mb-1 md:mb-2">
          <svg viewBox="0 0 24 24" className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0 text-meritz-gold fill-current" aria-hidden>
            <path d="M17 11V3H7v8H3v12h8v-4h2v4h8V11h-4zM7 19H5v-2h2v2zm0-4H5v-2h2v2zm0-4H5V9h2v2zm4 4H9v-2h2v2zm0-4H9V9h2v2zm0-4H9V5h2v2zm4 8v-2h2v2h-2zm0-4V9h2v2h-2zm0-4V5h2v2h-2zm4 12v-2h2v2h-2zm0-4v-2h2v2h-2z" />
          </svg>
          <h3 className="text-sm md:text-lg font-bold text-white tracking-tight">2026 MY HOT</h3>
        </div>
        <p className="text-[9px] md:text-[10px] text-gray-400 mb-2 md:mb-3 w-full text-left lg:text-center">
          1월~{selectedViewMonth}월 누적 · 연도시상
        </p>
        <div className="relative w-20 h-20 md:w-32 md:h-32 mb-2 md:mb-3">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" fill="none" r="42" stroke="rgba(75,85,99,0.5)" strokeWidth="10" />
            <circle
              cx="50"
              cy="50"
              fill="none"
              r="42"
              stroke={myHotIsChamp ? "url(#myhot-gold)" : "currentColor"}
              className={myHotIsChamp ? "text-meritz-gold" : "text-primary"}
              strokeDasharray={`${myHotProgress * 2.64} 264`}
              strokeLinecap="round"
              strokeWidth="10"
            />
            <defs>
              <linearGradient id="myhot-gold" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#C5A065" />
                <stop offset="100%" stopColor="#E8C98C" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {myHotIsChamp ? (
              <>
                <span className="text-lg md:text-2xl font-black bg-gradient-to-r from-meritz-gold to-amber-200 bg-clip-text text-transparent">CHAMP</span>
                <span className="text-[10px] md:text-xs text-gray-400 mt-0.5">합산 RANK 1위</span>
              </>
            ) : (
              <>
                <span className="text-xl md:text-3xl font-black text-white">
                  {myHotProgress}
                  <span className="text-sm md:text-lg font-normal text-gray-400">%</span>
                </span>
                <span className="text-[10px] md:text-xs text-gray-400 mt-0.5">{myHotLabel} 목표</span>
              </>
            )}
          </div>
        </div>
        <div className="w-full rounded-lg bg-gray-800/50 border border-gray-700/50 p-1.5 md:p-2 text-center">
          <p className="text-[9px] md:text-[10px] text-gray-500 mb-0.5">현재 합산 실적</p>
          <p className="text-sm md:text-base font-bold text-white">{formatMan(myHotSum)}만원</p>
          {!myHotIsChamp && myHotRank > 0 && myHotRank < 999 && (
            <p className="text-[10px] text-gray-400 mt-0.5">합산 순위 {myHotRank}위</p>
          )}
        </div>
        <p className="mt-1 md:mt-2 w-full text-center text-[9px] md:text-[10px] text-gray-400 whitespace-nowrap">
          {[500, 650, 800, 1000].map((t, i) => {
            const tierWon = t * 10000;
            const achieved = myHotSum >= tierWon;
            return (
              <span key={t}>
                <span className={`font-medium ${achieved ? "text-meritz-gold" : "text-gray-500"}`}>
                  meritz {t}
                </span>
                {i < 3 && <span className="text-gray-600 mx-0.5">·</span>}
              </span>
            );
          })}
        </p>
      </div>
    </div>
  );
}
