"use client";

import React from "react";
import { APPLE_CARD_BASE } from "@/app/_components/dashboard/constants";
import { formatMan } from "@/app/_components/dashboard/utils";

const PARTNER_RATE = 4.5; // 450%

export type PartnerRegularPlusCardProps = {
  /** 해당월 실적 (원) */
  currentPerf: number;
};

export function PartnerRegularPlusCard({ currentPerf }: PartnerRegularPlusCardProps) {
  const prize = currentPerf * PARTNER_RATE;

  return (
    <div className={`${APPLE_CARD_BASE} h-full border-emerald-200/60 dark:border-emerald-700/40 bg-gradient-to-br from-white via-white/95 to-emerald-50/40 dark:from-[#050509] dark:via-[#050509] dark:to-emerald-950/20`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 tracking-tight">
            월간 정률시상
          </p>
          <h3 className="text-[15.5px] font-bold text-gray-900 dark:text-white tracking-tight leading-tight mt-0.5">
            정규시상+ 파트너추가 시상
          </h3>
        </div>
        <span className="flex-shrink-0 inline-flex items-center px-2 py-1 rounded-lg text-[11px] font-bold bg-emerald-500 text-white dark:bg-emerald-600 shadow-sm border border-emerald-400/50">
          450%
        </span>
      </div>
      <div className="mt-auto pt-2.5 border-t border-gray-200/60 dark:border-gray-600/50">
        <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-0.5">
          시상금 (해당월 실적 × 450%)
        </p>
        <p className="text-2xl font-bold text-primary drop-shadow-sm">
          {formatMan(prize)}만원
        </p>
      </div>
    </div>
  );
}
