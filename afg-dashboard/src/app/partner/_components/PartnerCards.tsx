"use client";

import React from "react";
import { Agent } from "@/types";
import {
  PartnerPrizeCardFull,
  PartnerWeekCombinedCard,
  MeritzClubPlusCard,
  PartnerDoubleMeritzCard,
  ContinuousRun12Card,
  ContinuousRun23Card,
} from "./cards";

interface PartnerCardsProps {
  selectedAgent: Agent;
  selectedViewMonth: number;
  incentiveData: any;
}

export function PartnerCards({
  selectedAgent,
  selectedViewMonth,
  incentiveData,
}: PartnerCardsProps) {
  const week1Perf = selectedAgent.weekly_data?.find(w => w.week === 1)?.performance ?? 0;
  const week2Perf = selectedAgent.weekly_data?.find(w => w.week === 2)?.performance ?? 0;
  const week3Perf = selectedAgent.weekly_data?.find(w => w.week === 3)?.performance ?? 0;

  const janPerf = selectedAgent.performance?.["2026-01"] ?? 0;
  const febPerf = selectedAgent.performance?.["2026-02"] ?? 0;
  const marchPerf = selectedAgent.performance?.["2026-03"] ?? 0;
  const prevMonthKey = selectedViewMonth === 1 ? "2025-12" : `2026-${String(selectedViewMonth - 1).padStart(2, "0")}`;
  const prevMonthPerf = selectedAgent.performance?.[prevMonthKey] ?? 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <PartnerPrizeCardFull 
        index={1}
        title={`${selectedViewMonth}월 정규/월간/주간 시상금`}
        subtitle="전체 시상금 합계"
        variant="green"
        showTierButtons={true}
        tierPerf={incentiveData.currentPerf}
        expectedPrize={incentiveData.totalPrize}
        emphasizePrize={true}
        centerPrize={true}
      />
      <PartnerWeekCombinedCard 
        index={2}
        title="주간 시상 현황"
        subtitle={`${selectedViewMonth}월 1, 2주차`}
        line1Label="1주차"
        line2Label="2주차"
        tierPerf1={week1Perf}
        tierPerf2={week2Perf}
        prize1={incentiveData.weekPrizes[0] || 0}
        prize2={incentiveData.weekPrizes[1] || 0}
        variant="sky"
      />
      <MeritzClubPlusCard 
        janPerf={janPerf}
        febPerf={febPerf}
        marchPerf={marchPerf}
        currentMonthNum={selectedViewMonth}
      />
      <PartnerDoubleMeritzCard 
        prevMonthPerf={prevMonthPerf}
        currentMonthPerf={incentiveData.currentPerf}
        doubleMeritzPrize={incentiveData.doubleMeritzPrize}
      />
      <ContinuousRun12Card 
        baseJan={janPerf}
        baseFeb={febPerf}
        basePrize={0}
        extraJan={0}
        extraFeb={0}
        extraPrize={0}
      />
      <ContinuousRun23Card 
        febPerf={febPerf}
        febExtraPerf={0}
        march15Perf={marchPerf}
        march8Perf={0}
        basePrize={0}
        extraPrize={0}
      />
    </div>
  );
}
