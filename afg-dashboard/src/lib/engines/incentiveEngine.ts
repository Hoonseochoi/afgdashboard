import { Agent, PerformanceData, WeeklyPerformance } from "@/types";

const formatMan = (v: number) => {
  if (!v) return "0";
  return String(Math.floor(v / 10000));
};

// --- Constants ---

export const ALL_REWARD_TIERS = [200000, 300000, 400000, 500000, 600000, 800000, 1000000, 1200000, 1500000, 1800000, 2000000, 2500000];
export const MAX_TIER = 2500000;

export const WEEK_TIERS = [200000, 300000, 500000, 800000, 1000000, 1200000];

// 1월 주차 시상 (threshold → prize)
export const JAN_W1_PRIZES: [number, number][] = [[1200000, 6000000], [1000000, 4000000], [800000, 2400000], [500000, 1000000], [300000, 300000], [200000, 200000]];
export const JAN_W2_PRIZES: [number, number][] = [[1200000, 4800000], [1000000, 2500000], [800000, 1600000], [500000, 800000], [300000, 300000], [200000, 200000]];
export const JAN_W3_PRIZES: [number, number][] = [[1200000, 3600000], [1000000, 2000000], [800000, 1000000], [500000, 500000], [300000, 300000], [200000, 100000]];

// 2월 주차 시상
export const FEB_W1_PRIZES: [number, number][] = [[1200000, 6000000], [1000000, 4000000], [800000, 2400000], [500000, 1000000], [300000, 300000], [200000, 200000]];
export const FEB_W2_PRIZES: [number, number][] = [[1200000, 4800000], [1000000, 3000000], [800000, 1600000], [500000, 1000000], [300000, 300000], [200000, 200000]];

// 3월 주차 시상
export const MAR_W1_SPECIAL_PRIZES: [number, number][] = [[1200000, 6000000], [1000000, 4000000], [800000, 2400000], [500000, 1000000], [300000, 300000], [200000, 200000]];
export const MAR_W1_PATAYA_PRIZES: [number, number][] = [[1000000, 5000000], [700000, 2100000], [500000, 1000000], [300000, 300000], [200000, 200000]];

export const MONTHLY_TIERS = [1000000, 1200000, 1500000, 1800000, 2000000, 2500000];
export const PLUS_TIERS = [200000, 400000, 600000, 800000, 1000000];

// --- Calculation Functions ---

/**
 * 인센티브 티어 및 다음 단계 계산 (공통)
 */
export const calculateIncentiveTier = (perf: number, tiers: [number, number][]) => {
  let prize = 0;
  let nextLevel = "";
  let progress = 0;

  const sortedTiers = [...tiers].sort((a, b) => a[0] - b[0]);
  
  for (let i = 0; i < sortedTiers.length; i++) {
    const [threshold, p] = sortedTiers[i];
    if (perf >= threshold) {
      prize = p;
    } else {
      nextLevel = `${Math.floor(threshold / 10000)}만`;
      const prevThreshold = i > 0 ? sortedTiers[i - 1][0] : 0;
      progress = Math.min(100, Math.round(((perf - prevThreshold) / (threshold - prevThreshold)) * 100));
      break;
    }
  }

  if (!nextLevel) {
    nextLevel = "최고 등급";
    progress = 100;
  }

  return { prize, nextLevel, progress };
};

/**
 * 주차별 시상금 계산 (순수 함수)
 */
export const getWeekPrize = (perf: number, tiers: [number, number][]) => {
  return calculateIncentiveTier(perf, tiers);
};

export const MONTHLY_PRIZE_TIERS: [number, number][] = [
  [1000000, 1500000],
  [1200000, 2000000],
  [1500000, 3000000],
  [1800000, 3600000],
  [2000000, 4000000],
  [2500000, 5000000]
];

/**
 * 월간 현금시상 계산
 */
export const calculateMonthlyPrize = (perf: number) => {
  return calculateIncentiveTier(perf, MONTHLY_PRIZE_TIERS);
};

/**
 * 2배 메리츠클럽 시상금 계산
 */
export const calculateDoubleMeritzPrize = (prevPerf: number, currentPerf: number): number => {
  if (prevPerf >= 200000 && currentPerf >= 200000) {
    let baseTier = Math.floor(currentPerf / 100000) * 100000;
    if (baseTier > 1000000) baseTier = 1000000;
    return baseTier * 2;
  }
  return 0;
};

/**
 * 메리츠클럽 PLUS 시상금 계산
 */
export const calculateMeritzClubPlusPrize = (minPerf: number): number => {
  if (minPerf >= 1000000) return 3000000;
  if (minPerf >= 800000) return 2400000;
  if (minPerf >= 600000) return 1800000;
  if (minPerf >= 400000) return 1200000;
  if (minPerf >= 200000) return 600000;
  return 0;
};

/**
 * 파트너 지사 티어 시상금 계산
 */
export const getPartnerTierPrize = (perf: number): number => {
  if (perf >= 500000) return 500000;
  if (perf >= 300000) return 300000;
  if (perf >= 200000) return 200000;
  if (perf >= 100000) return 100000;
  return 0;
};

/**
 * 파트너 연속가동 시상금 계산
 */
export const getPartnerContinuousPrize = (perf: number): number => {
  if (perf >= 500000) return 1800000;
  if (perf >= 300000) return 800000;
  if (perf >= 200000) return 600000;
  if (perf >= 100000) return 200000;
  return 0;
};

/**
 * 파타야 여행 시상금 로직 (3월 특별)
 */
export const calculatePatayaTravelIncentive = (w1Perf: number): any => {
  return calculateIncentiveTier(w1Perf, MAR_W1_PATAYA_PRIZES);
};

/**
 * 3월 1주차 특별 시상금
 */
export const calculateMarW1SpecialPrize = (w1Perf: number): any => {
  return calculateIncentiveTier(w1Perf, MAR_W1_SPECIAL_PRIZES);
};

/**
 * 정규시상 계산
 */
export const calculateRegularPrize = (perf: number, isPartner: boolean): number => {
  return isPartner ? Math.round(perf * 4.5) : perf;
};

/**
 * 누적실적 목표 달성률 계산
 */
export const calculateProgress = (perf: number, goal: number): number => {
  if (goal <= 0) return 0;
  return Math.min(100, Math.round((perf / goal) * 100));
};

/**
 * 달성 티어 반환 (메리츠클럽+ 전용)
 */
export const getAchievedTier = (perf: number): number => {
  const tiers = [1000000, 800000, 600000, 400000, 200000];
  for (const t of tiers) {
    if (perf >= t) return t;
  }
  return 0;
};

/**
 * 차트용 실적 데이터 가공
 */
export interface ChartDataItem {
  name: string;
  value: number;
  prize: number;
}

export const preparePerformanceChartData = (agent: Agent): ChartDataItem[] => {
  const performance = agent.performance || {};
  const monthly = (agent as any).weekly || {};
  const months = [
    { label: "8월", key: "2025-08", month: null as null | number },
    { label: "9월", key: "2025-09", month: null },
    { label: "10월", key: "2025-10", month: null },
    { label: "11월", key: "2025-11", month: null },
    { label: "12월", key: "2025-12", month: null },
    { label: "1월", key: "2026-01", month: 1 },
    { label: "2월", key: "2026-02", month: 2 },
    { label: "3월", key: "2026-03", month: 3 },
  ];

  const computePrize = (monthNum: number, perf: number): number => {
    // weekly performance for the current view month (from .weekly for current session,
    // but for chart we only have performance totals for past months, so estimate from totals)
    const w1 = monthly?.week1 ?? 0;
    const w2 = monthly?.week2 ?? 0;
    const w3 = monthly?.week3 ?? 0;

    let weekPrizeSum = 0;
    if (monthNum === 1) {
      weekPrizeSum = getWeekPrize(w1, JAN_W1_PRIZES).prize +
                    getWeekPrize(w2, JAN_W2_PRIZES).prize +
                    getWeekPrize(w3, JAN_W3_PRIZES).prize;
    } else if (monthNum === 2) {
      weekPrizeSum = getWeekPrize(w1, FEB_W1_PRIZES).prize +
                    getWeekPrize(w2, FEB_W2_PRIZES).prize;
    } else if (monthNum === 3) {
      weekPrizeSum = calculateMarW1SpecialPrize(w1).prize;
    }

    const monthly_ = calculateMonthlyPrize(perf).prize;
    const prevKey = monthNum === 1 ? "2025-12" : `2026-${String(monthNum - 1).padStart(2, "0")}`;
    const prevPerf = performance[prevKey] ?? 0;
    const dm = calculateDoubleMeritzPrize(prevPerf, perf);
    const cp = calculateMeritzClubPlusPrize(perf);
    const regular = perf; // non-partner estimate

    if (monthNum === 3) {
      return weekPrizeSum + dm + cp + regular;
    }
    return weekPrizeSum + monthly_ + dm + cp + regular;
  };

  return months.map((m) => {
    const value = performance[m.key] || 0;
    const prize = m.month !== null ? computePrize(m.month, value) : 0;
    return { name: m.label, value, prize };
  });
};


/**
 * 특정 월의 총 예상 시상금 합산 (비파트너 기준)
 */
export const calculateTotalPrizeForMonth = (params: {
  month: number;
  weekPrizes: any[];
  monthlyPrize: any;
  doubleMeritz: number;
  clubPlus: number;
  regular: number;
}): number => {
  const { month, weekPrizes, monthlyPrize, doubleMeritz, clubPlus, regular } = params;
  const weeklySum = weekPrizes.reduce((a, b) => a + (typeof b === "number" ? b : b.prize || 0), 0);
  const mPrize = typeof monthlyPrize === "number" ? monthlyPrize : monthlyPrize.prize || 0;
  
  if (month === 3) {
    return weeklySum + doubleMeritz + clubPlus + regular;
  }
  
  return weeklySum + mPrize + doubleMeritz + clubPlus + regular;
};

/**
 * 목표 실적 및 달성률 계산
 */
export const calculateGoalAndProgress = (
  currentPerf: number,
  rankIndex: number,
  monthRanks: number[],
  isPartner: boolean
) => {
  let monthlyGoal = 400000;
  let goalLabel = "40만원";
  let targetRankDisplay: number | null = null;
  let isRank1 = false;

  if (rankIndex === 0) {
    isRank1 = true;
    goalLabel = isPartner ? "파트너 TOP" : "전국TOP";
    monthlyGoal = currentPerf;
  } else if (currentPerf >= MAX_TIER && rankIndex > 0) {
    monthlyGoal = monthRanks[rankIndex - 1];
    targetRankDisplay = rankIndex;
    goalLabel = `RANK ${rankIndex}위`;
  } else if (currentPerf > 400000) {
    const nextTier = ALL_REWARD_TIERS.find((t) => t > currentPerf);
    monthlyGoal = nextTier || MAX_TIER;
    goalLabel = `${Math.round(monthlyGoal / 10000)}만원`;
  } else {
    monthlyGoal = 400000;
    goalLabel = "40만원";
  }

  const progress = calculateProgress(currentPerf, monthlyGoal);
  return { monthlyGoal, goalLabel, targetRankDisplay, isRank1, progress };
};

/**
 * 2026 MY HOT (연도시상) 계산
 */
export const calculateMYHOTRank = (
  agentCode: string,
  agents: any[],
  selectedViewMonth: number,
  excludeCode: string
) => {
  const MY_HOT_TIERS = [5000000, 6500000, 8000000, 10000000];
  const yearMonths = Array.from({ length: selectedViewMonth }, (_, i) => `2026-${String(i + 1).padStart(2, "0")}`);
  
  const calculateSum = (a: any) => {
    let s = 0;
    for (const m of yearMonths) s += a.performance?.[m] ?? 0;
    return s;
  };

  const currentAgent = agents.find(a => a.code === agentCode);
  const myHotSum = currentAgent ? calculateSum(currentAgent) : 0;
  
  const agentSums = agents
    .filter((a: any) => a.code !== excludeCode)
    .map((a: any) => ({ code: a.code, sum: calculateSum(a) }));
    
  agentSums.sort((a, b) => b.sum - a.sum);
  let myHotRank = agentSums.findIndex((a) => a.code === agentCode) + 1;
  if (myHotRank === 0) myHotRank = 999;
  
  const myHotIsChamp = myHotRank === 1;
  const myHotNextTier = MY_HOT_TIERS.find((t) => t > myHotSum) ?? null;
  const myHotProgress = myHotNextTier ? Math.min(100, Math.round((myHotSum / myHotNextTier) * 100)) : 100;
  const myHotLabel = myHotIsChamp ? "CHAMP" : myHotNextTier ? `meritz ${myHotNextTier / 10000}` : "CHAMP (1위)";

  return { myHotSum, myHotRank, myHotIsChamp, myHotNextTier, myHotProgress, myHotLabel };
};

/**
 * 상단 배너 "더 채우세요" 정보 계산
 */
export const calculateBannerInfo = (params: {
  currentMonthPerf: number;
  remainingMonthly: number;
  remainingPlus: number;
  rankInMonth: number;
  sortedByMonth: any[];
  rankKeyMonth: string;
}) => {
  const { currentMonthPerf, remainingMonthly, remainingPlus, rankInMonth, sortedByMonth, rankKeyMonth } = params;
  const allTiersFilled = remainingMonthly === 0;
  let remainToShow = 0;
  let remainLabel: "more" | "gap" = "more";

  if (allTiersFilled) {
    if (rankInMonth === 1 && sortedByMonth.length >= 2) {
      const secondPerf = sortedByMonth[1]?.performance?.[rankKeyMonth] ?? 0;
      const gap = Math.max(0, currentMonthPerf - secondPerf);
      if (gap > 0) {
        remainToShow = gap;
        remainLabel = "gap";
      }
    } else if (rankInMonth >= 2) {
      const nextRankPerf = sortedByMonth[rankInMonth - 2]?.performance?.[rankKeyMonth] ?? 0;
      const gapToNext = Math.max(0, nextRankPerf - currentMonthPerf);
      if (gapToNext > 0) {
        remainToShow = gapToNext;
        remainLabel = "more";
      }
    }
  } else {
    const candidates = [remainingMonthly, remainingPlus].filter((r) => r > 0);
    if (candidates.length > 0) {
      remainToShow = Math.min(...candidates);
      remainLabel = "more";
    }
  }

  return { remainToShow, remainLabel };
};

/**
 * 전체 인센티브 데이터를 통합 계산하는 함수
 */
export const calculateIncentiveData = (
  agent: Agent,
  allAgents: Agent[],
  selectedMonth: number,
  globalRanks: Record<string, number[]>,
  updateDate: string
) => {
  const isPartner = (agent.branch || "").includes("파트너");
  const monthKey = `2026-${String(selectedMonth).padStart(2, "0")}`;
  const currentPerf = agent.performance?.[monthKey] ?? 0;
  
  // 주간 실적 데이터: 선택 월에 따라 올바른 소스 사용
  let weekData = agent.weekly_data || [];
  if (weekData.length === 0) {
    const rawAgent = agent as any;
    // 1월 선택 시: january_closed.json의 _janWeekly 필드 우선 사용
    // 2월 선택 시: february_closed.json의 _febWeekly 필드 우선 사용
    // 3월(현재월): agent.weekly (실시간 데이터)
    const janWeekly = rawAgent._janWeekly;
    const febWeekly = rawAgent._febWeekly;
    const stdWeekly = rawAgent.weekly ?? {};
    const src =
      selectedMonth === 1 && janWeekly ? janWeekly :
      selectedMonth === 2 && febWeekly ? febWeekly :
      stdWeekly;
    const w1 = src.week1 ?? 0;
    const w2 = src.week2 ?? 0;
    const w3 = src.week3 ?? 0;
    weekData = [
      { week: 1, performance: w1 },
      { week: 2, performance: w2 },
      { week: 3, performance: w3 },
    ];
  }


  
  const weekPrizes = weekData.map(w => {
    if (selectedMonth === 1) {
      if (w.week === 1) return getWeekPrize(w.performance, JAN_W1_PRIZES);
      if (w.week === 2) return getWeekPrize(w.performance, JAN_W2_PRIZES);
      if (w.week === 3) return getWeekPrize(w.performance, JAN_W3_PRIZES);
    } else if (selectedMonth === 2) {
      if (w.week === 1) return getWeekPrize(w.performance, FEB_W1_PRIZES);
      if (w.week === 2) return getWeekPrize(w.performance, FEB_W2_PRIZES);
    } else if (selectedMonth === 3) {
      if (w.week === 1) return calculateMarW1SpecialPrize(w.performance);
    }
    return { prize: 0, nextLevel: "", progress: 0 };
  });

  const monthlyPrize = calculateMonthlyPrize(currentPerf);

  // 2배 메리츠클럽
  const prevMonthKey = `2026-${String(selectedMonth - 1).padStart(2, "0")}`;
  const prevPerf = agent.performance?.[prevMonthKey] ?? 0;
  const doubleMeritzPrize = calculateDoubleMeritzPrize(prevPerf, currentPerf);

  // 메리츠클럽 PLUS
  const clubPlusPrize = calculateMeritzClubPlusPrize(currentPerf);

  // 정규 시상
  const regularPrizeSize = calculateRegularPrize(currentPerf, isPartner);

  // 총 합계
  const totalPrize = calculateTotalPrizeForMonth({
    month: selectedMonth,
    weekPrizes,
    monthlyPrize,
    doubleMeritz: doubleMeritzPrize,
    clubPlus: clubPlusPrize,
    regular: regularPrizeSize
  });

  // 순위 및 목표
  const monthRanks = globalRanks[monthKey] || [];
  const rankInMonth = monthRanks.indexOf(currentPerf) + 1 || 999;
  
  const goalInfo = calculateGoalAndProgress(currentPerf, rankInMonth - 1, monthRanks, isPartner);

  // MY HOT
  const myHotData = calculateMYHOTRank(agent.code, allAgents, selectedMonth, "exclude_code_placeholder");

  // 파타야 및 3월 특별 시상 (3월 1주차 기준)
  const week1Perf = weekData.find(w => w.week === 1)?.performance ?? 0;
  const patayaResult = selectedMonth === 3 ? calculatePatayaTravelIncentive(week1Perf) : null;
  const marchW1SpecialResult = selectedMonth === 3 ? calculateMarW1SpecialPrize(week1Perf) : null;
  const patayaPrize = patayaResult ? patayaResult.prize : 0;
  const marchW1SpecialPrize = marchW1SpecialResult ? marchW1SpecialResult.prize : 0;

  // 메리츠클럽 PLUS 상세
  const janPerf = agent.performance?.["2026-01"] ?? 0;
  const febPerf = agent.performance?.["2026-02"] ?? 0;
  const marchPerf = agent.performance?.["2026-03"] ?? 0;
  const plusTargetMinPerf = Math.min(janPerf, febPerf) || 200000;
  const plusProgress = (currentPerf / plusTargetMinPerf) * 100;

  // 주차별 상세 (NonPartnerCards용)
  const week1 = weekData.find(w => w.week === 1);
  const week2 = weekData.find(w => w.week === 2);
  const week3 = weekData.find(w => w.week === 3);

  return {
    currentPerf,
    weekPrizes,
    monthlyPrize,
    doubleMeritzPrize,
    clubPlusPrize,
    regularPrizeSize,
    totalPrize,
    rankInMonth,
    goalInfo,
    myHotData,
    patayaPrize,
    marchW1SpecialPrize,
    janPerf,
    febPerf,
    marchPerf,
    plusTargetMinPerf,
    plusProgress,
    week1Perf,
    // 추가 주차 데이터
    week1Prize: weekPrizes[0]?.prize || 0,
    week1Next: weekPrizes[0]?.nextLevel || "",
    week1Progress: weekPrizes[0]?.progress || 0,
    viewW1: week1?.performance || 0,
    week2Prize: weekPrizes[1]?.prize || 0,
    week2Next: weekPrizes[1]?.nextLevel || "",
    week2Progress: weekPrizes[1]?.progress || 0,
    viewW2: week2?.performance || 0,
    week3Prize: weekPrizes[2]?.prize || 0,
    week3Next: weekPrizes[2]?.nextLevel || "",
    week3Progress: weekPrizes[2]?.progress || 0,
    viewW3: week3?.performance || 0,
    monthlyNext: monthlyPrize.nextLevel || "",
    monthlyProgress: monthlyPrize.progress || 0,
    plusNext: currentPerf >= plusTargetMinPerf ? "완성" : `${formatMan(plusTargetMinPerf - currentPerf)}만 더`,
    plusGoal: plusTargetMinPerf,
    performanceData: preparePerformanceChartData(agent),
    updateDate
  };
};
