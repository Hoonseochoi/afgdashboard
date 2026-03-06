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
        plusNext=""
        plusProgress={incentiveData.plusProgress}
        janPerf={incentiveData.janPerf}
        febPerf={incentiveData.febPerf}
        marchPerf={incentiveData.marchPerf}
        currentMonthNum={selectedViewMonth}
      />
    );
  }
  return (
    <NonPartnerCards 
      week1Prize={incentiveData.week1Prize}
      week1Next={incentiveData.week1Next}
      week1Past={selectedViewMonth > 1} // Placeholder logic
      week1Progress={incentiveData.week1Progress}
      viewW1={incentiveData.viewW1}
      week2Prize={incentiveData.week2Prize}
      week2Next={incentiveData.week2Next}
      week2Past={selectedViewMonth > 1}
      week2Progress={incentiveData.week2Progress}
      viewW2={incentiveData.viewW2}
      week3Prize={incentiveData.week3Prize}
      week3Next={incentiveData.week3Next}
      week3Progress={incentiveData.week3Progress}
      viewW3={incentiveData.viewW3}
      selectedViewMonth={selectedViewMonth as any}
      monthlyPrize={incentiveData.monthlyPrize.prize}
      monthlyNext={incentiveData.monthlyNext}
      monthlyProgress={incentiveData.monthlyProgress}
      currentMonthPerf={incentiveData.currentPerf}
      doubleMeritzPrize={incentiveData.doubleMeritzPrize}
      prevMonthPerf={selectedAgent.performance?.["2026-02"] ?? 0}
      meritzClubPlusPrize={incentiveData.clubPlusPrize}
      currentMonthNum={selectedViewMonth}
      plusTarget={incentiveData.plusTargetMinPerf}
      febPerf={incentiveData.febPerf}
      marchPerf={incentiveData.marchPerf}
      plusNext=""
      plusProgress={incentiveData.plusProgress}
      regularPrize={incentiveData.regularPrizeSize}
      dailyDiff={0}
    />
  );
}
