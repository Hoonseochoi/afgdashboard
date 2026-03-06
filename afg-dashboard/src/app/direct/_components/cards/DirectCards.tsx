"use client";

import React from "react";
import { Agent } from "@/types";
import { MarchCards } from "./MarchCards";
import { NonPartnerCards } from "./NonPartnerCards";

interface DirectCardsProps {
  selectedAgent: Agent;
  selectedViewMonth: number;
  incentiveData: any;
}

export function DirectCards({
  selectedAgent,
  selectedViewMonth,
  incentiveData,
}: DirectCardsProps) {
  if (selectedViewMonth === 3) {
    return (
      <MarchCards 
        viewW1={incentiveData.week1Perf}
        week1SpecialPrize={incentiveData.marchW1SpecialPrize}
        week1PatayaPrize={incentiveData.patayaPrize}
        currentMonthPerf={incentiveData.currentPerf}
        prevMonthPerf={selectedAgent.performance?.["2026-02"] ?? 0}
        doubleMeritzPrize={incentiveData.doubleMeritzPrize}
        meritzClubPlusPrize={incentiveData.clubPlusPrize}
        plusTarget={incentiveData.plusTargetMinPerf}
        plusTargetMinPerf={incentiveData.plusTargetMinPerf}
        plusProgress={incentiveData.plusProgress}
        janPerf={incentiveData.janPerf}
        febPerf={incentiveData.febPerf}
        marchPerf={incentiveData.marchPerf}
        currentMonthNum={selectedViewMonth}
        earlyRunWeekPrizes={incentiveData.earlyRunWeekPrizes ?? [0, 0, 0, 0]}
        earlyRunWeekPerfs={incentiveData.earlyRunWeekPerfs ?? [0, 0, 0, 0]}
      />
    );
  }

  // 1월 또는 2월
  const prevMonthPerf = selectedViewMonth === 1
    ? (selectedAgent.performance?.["2025-12"] ?? 0)
    : (selectedAgent.performance?.["2026-01"] ?? 0);

  return (
    <NonPartnerCards 
      viewW1={incentiveData.viewW1}
      viewW2={incentiveData.viewW2}
      viewW3={incentiveData.viewW3}
      week1Prize={incentiveData.week1Prize}
      week1Next={incentiveData.week1Next}
      week1Past={selectedViewMonth > 1 || (selectedViewMonth === 1 && incentiveData.currentWeek > 1)}
      week1Progress={incentiveData.week1Progress}
      week2Prize={incentiveData.week2Prize}
      week2Next={incentiveData.week2Next}
      week2Past={selectedViewMonth > 2 || (selectedViewMonth === 2 && incentiveData.currentWeek > 2)}
      week2Progress={incentiveData.week2Progress}
      week3Prize={incentiveData.week3Prize}
      week3Next={incentiveData.week3Next}
      week3Progress={incentiveData.week3Progress}
      selectedViewMonth={selectedViewMonth as any}
      monthlyPrize={incentiveData.monthlyPrize.prize}
      monthlyNext={incentiveData.monthlyNext}
      monthlyProgress={incentiveData.monthlyProgress}
      currentMonthPerf={incentiveData.currentPerf}
      doubleMeritzPrize={incentiveData.doubleMeritzPrize}
      prevMonthPerf={prevMonthPerf}
      meritzClubPlusPrize={incentiveData.clubPlusPrize}
      currentMonthNum={selectedViewMonth}
      plusTarget={incentiveData.plusGoal}
      plusNext={incentiveData.plusNext}
      janPerf={incentiveData.janPerf}
      febPerf={incentiveData.febPerf}
      marchPerf={incentiveData.marchPerf}
      plusProgress={incentiveData.plusProgress}
      regularPrize={incentiveData.regularPrizeSize}
      dailyDiff={0}
    />
  );
}

