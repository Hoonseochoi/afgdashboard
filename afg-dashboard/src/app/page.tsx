"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import januaryClosedData from "@/data/january_closed.json";

const januaryClosed = januaryClosedData as Record<string, { code: string; performance: Record<string, number>; weekly: { week1: number; week2: number; week3?: number } }>;

export default function Dashboard() {
  const [agents, setAgents] = useState<any[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [globalRanks, setGlobalRanks] = useState<Record<string, number[]>>({});
  const [updateDate, setUpdateDate] = useState<string>("");
  const [selectedViewMonth, setSelectedViewMonth] = useState<1 | 2>(2); // 1월 | 2월
  const [agentSearchOpen, setAgentSearchOpen] = useState(false);
  const [agentSearchQuery, setAgentSearchQuery] = useState("");

  // 비밀번호 변경 모달 상태
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  const router = useRouter();

  useEffect(() => {
    // 세션 및 에이전트 데이터 가져오기
    const fetchData = async () => {
      try {
        // 1. 세션 확인
        const authRes = await fetch("/api/auth/me");
        const authData = await authRes.json();

        if (!authData.user) {
          router.push("/login");
          return;
        }

        setUser(authData.user);

        if (authData.user.isFirstLogin) {
          setShowPasswordModal(true);
        }

        // 2. 에이전트 데이터 가져오기
        const agentsRes = await fetch("/api/agents");
        const agentsData = await agentsRes.json();

        if (agentsData.error) {
          console.error(agentsData.error);
          router.push("/login");
          return;
        }

        setAgents(agentsData.agents);
        setUpdateDate(agentsData.updateDate || "");
        if (agentsData.agents.length > 0) {
          const sorted = [...agentsData.agents].sort((a, b) => (b.performance?.["2026-02"] || 0) - (a.performance?.["2026-02"] || 0));
          setSelectedAgent(sorted[0]);
        }
        // 3. 글로벌 순위 데이터 가져오기
        const ranksRes = await fetch("/api/ranks");
        const ranksData = await ranksRes.json();
        if (ranksData.ranks) {
          setGlobalRanks(ranksData.ranks);
        }
      } catch (err) {
        console.error("데이터 로드 실패", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");

    if (newPassword.length < 4) {
      setPasswordError("비밀번호는 최소 4자 이상이어야 합니다.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("비밀번호가 일치하지 않습니다.");
      return;
    }

    setPasswordLoading(true);

    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setPasswordError(data.error || "비밀번호 변경에 실패했습니다.");
        setPasswordLoading(false);
        return;
      }

      setShowPasswordModal(false);
      setPasswordLoading(false);
      setUser({ ...user, isFirstLogin: false });
      alert("비밀번호가 성공적으로 변경되었습니다.");
    } catch (err) {
      setPasswordError("서버와 통신할 수 없습니다.");
      setPasswordLoading(false);
    }
  };

  const handleLogout = async () => {
    // 쿠키 삭제를 위해 logout API 호출 필요 (간단하게 직접 구현)
    // 여기서는 쿠키 만료로 처리 (클라이언트 사이드 편의)
    document.cookie = "auth_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    router.push("/login");
  };

  if (loading) return <div className="flex h-screen items-center justify-center">Loading...</div>;

  if (!selectedAgent && !loading && !user?.isFirstLogin) {
    return <div className="flex flex-col h-screen items-center justify-center">
      <p>조회 가능한 데이터가 없습니다.</p>
      <button onClick={handleLogout} className="mt-4 text-primary underline">로그아웃</button>
    </div>;
  }

  // 시상 실적 구간 (1주/2주/월간/MC+ 통합, 유니크 오름차순)
  const ALL_REWARD_TIERS = [200000, 300000, 400000, 500000, 600000, 800000, 1000000, 1200000, 1500000, 1800000, 2000000, 2500000];
  const MAX_TIER = 2500000; // 모든 시상 최고 구간

  // 데이터 포맷팅
  let performanceData: any[] = [];
  let currentMonthPerf = 0;
  let prevMonthPerf = 0;
  let diff = 0;
  let prizeDiff = 0; // 2월 시 전월 대비: 시상금 차이 (2월 시상금 - 1월 시상금)
  let monthlyGoal = 400000;   // 누적실적 목표 (기본 40만)
  let goalLabel = "40만원";   // 목표 표시 텍스트
  let targetRankDisplay: number | null = null; // RANK N위 목표일 때 N (null이면 금액 목표)
  let isRank1 = false;        // 1등 여부 (전국TOP)
  let progress = 0;
  
  // 시상금 계산 변수들
  let week1Prize = 0;
  let week2Prize = 0;
  let week3Prize = 0;
  let monthlyPrize = 0;
  let doubleMeritzPrize = 0;
  let meritzClubPlusPrize = 0;
  let regularPrize = 0;
  let totalEstimatedPrize = 0;
  
  // 다음 구간 표시용
  const WEEK_TIERS = [200000, 300000, 500000, 800000, 1000000, 1200000];
  // 1월 주차 시상 (threshold → prize)
  const JAN_W1_PRIZES: [number, number][] = [[1200000, 6000000], [1000000, 4000000], [800000, 2400000], [500000, 1000000], [300000, 300000], [200000, 200000]];
  const JAN_W2_PRIZES: [number, number][] = [[1200000, 4800000], [1000000, 2500000], [800000, 1600000], [500000, 800000], [300000, 300000], [200000, 200000]];
  const JAN_W3_PRIZES: [number, number][] = [[1200000, 3600000], [1000000, 2000000], [800000, 1000000], [500000, 500000], [300000, 300000], [200000, 100000]];
  // 2월 주차 시상 (기존)
  const FEB_W1_PRIZES: [number, number][] = [[1200000, 6000000], [1000000, 4000000], [800000, 2400000], [500000, 1000000], [300000, 300000], [200000, 200000]];
  const FEB_W2_PRIZES: [number, number][] = [[1200000, 4800000], [1000000, 3000000], [800000, 1600000], [500000, 1000000], [300000, 300000], [200000, 200000]];
  const MONTHLY_TIERS = [1000000, 1200000, 1500000, 1800000, 2000000, 2500000];
  const PLUS_TIERS = [200000, 400000, 600000, 800000, 1000000];
  
  let week1Next = "";
  let week1Progress = 0;
  let week2Next = "";
  let week2Progress = 0;
  let week3Next = "";
  let week3Progress = 0;
  let monthlyNext = "";
  let monthlyProgress = 0;
  let plusTarget = 0;      // 목표 구간 (min 기준)
  let plusNext = "";
  let plusProgress = 0;
  let currentMonthNum = new Date().getMonth() + 1;
  let febPerf = 0;
  let marchPerf = 0;
  let viewW1 = 0;
  let viewW2 = 0;
  let viewW3 = 0;
  let week1Past = false;
  let week2Past = false;
  // 업데이트 날짜(MMDD) 기준 현재 주차. updateDate는 fetch 후 state에서 옴
  const dayFromUpdate = (updateDate && updateDate.length >= 4) ? parseInt(updateDate.slice(2, 4), 10) : new Date().getDate();
  const currentWeekNum = Math.min(4, Math.max(1, Math.ceil((dayFromUpdate || 1) / 7)));

  if (selectedAgent && selectedAgent.performance) {
    performanceData = [
      { name: "8월", value: selectedAgent.performance["2025-08"] || 0 },
      { name: "9월", value: selectedAgent.performance["2025-09"] || 0 },
      { name: "10월", value: selectedAgent.performance["2025-10"] || 0 },
      { name: "11월", value: selectedAgent.performance["2025-11"] || 0 },
      { name: "12월", value: selectedAgent.performance["2025-12"] || 0 },
      { name: "1월", value: selectedAgent.performance["2026-01"] || 0 },
      { name: "2월", value: selectedAgent.performance["2026-02"] || 0 },
    ];

    // 선택 월에 따른 데이터 소스 (1월=마감데이터, 2월=현재)
    const code = String(selectedAgent.code || "");
    const janData = januaryClosed[code];
    const isJanuaryView = selectedViewMonth === 1;

    currentMonthPerf = isJanuaryView
      ? (janData?.performance["2026-01"] ?? selectedAgent.performance["2026-01"] ?? 0)
      : (selectedAgent.performance["2026-02"] || 0);
    prevMonthPerf = isJanuaryView
      ? (janData?.performance["2025-12"] ?? selectedAgent.performance["2025-12"] ?? 0)
      : (janData?.performance["2026-01"] ?? selectedAgent.performance["2026-01"] ?? 0); // 2월 전월대비: 1월 마감 데이터 우선
    diff = currentMonthPerf - prevMonthPerf;

    // 누적실적 목표 계산: 기본 40만, 40만 초과 시 다음구간, 전구간 초과 시 RANK-1 실적, 1등은 전국TOP
    const rankKey = isJanuaryView ? "2026-01" : "2026-02";
    const monthRanks = globalRanks[rankKey] || [];
    const rankIndex = monthRanks.indexOf(currentMonthPerf); // -1이면 순위 미확인

    if (rankIndex === 0) {
      isRank1 = true;
      goalLabel = "전국TOP";
      monthlyGoal = currentMonthPerf; // progress 100% 표시용
    } else if (currentMonthPerf >= MAX_TIER && rankIndex > 0) {
      monthlyGoal = monthRanks[rankIndex - 1];
      targetRankDisplay = rankIndex;
      goalLabel = `RANK ${rankIndex}위`;
    } else if (currentMonthPerf > 400000) {
      const nextTier = ALL_REWARD_TIERS.find((t) => t > currentMonthPerf);
      monthlyGoal = nextTier || MAX_TIER;
      goalLabel = `${Math.round(monthlyGoal / 10000)}만원`;
    } else {
      monthlyGoal = 400000;
      goalLabel = "40만원";
    }
    progress = monthlyGoal > 0 ? Math.min(100, Math.round((currentMonthPerf / monthlyGoal) * 100)) : 0;
    
    // 시상금 로직 계산 (선택 월 기준)
    viewW1 = isJanuaryView ? (janData?.weekly?.week1 ?? 0) : (selectedAgent.weekly?.week1 || 0);
    viewW2 = isJanuaryView ? (janData?.weekly?.week2 ?? 0) : (selectedAgent.weekly?.week2 || 0);
    viewW3 = isJanuaryView ? (janData?.weekly?.week3 ?? 0) : 0;
    const w1 = viewW1;
    const w2 = viewW2;
    const w3 = viewW3;
    
    const getWeekPrize = (perf: number, tiers: [number, number][]) => {
      for (const [thresh, prize] of tiers) {
        if (perf >= thresh) return prize;
      }
      return 0;
    };
    
    // 1주차 시상 (1월/2월 티어 다름)
    week1Prize = isJanuaryView ? getWeekPrize(w1, JAN_W1_PRIZES) : getWeekPrize(w1, FEB_W1_PRIZES);
    
    // 2주차 시상
    week2Prize = isJanuaryView ? getWeekPrize(w2, JAN_W2_PRIZES) : getWeekPrize(w2, FEB_W2_PRIZES);
    
    // 3주차 시상 (1월만)
    week3Prize = isJanuaryView ? getWeekPrize(w3, JAN_W3_PRIZES) : 0;
    
    // 월간 현금시상
    if (currentMonthPerf >= 2500000) monthlyPrize = 5000000;
    else if (currentMonthPerf >= 2000000) monthlyPrize = 4000000;
    else if (currentMonthPerf >= 1800000) monthlyPrize = 3600000;
    else if (currentMonthPerf >= 1500000) monthlyPrize = 3000000;
    else if (currentMonthPerf >= 1200000) monthlyPrize = 2000000;
    else if (currentMonthPerf >= 1000000) monthlyPrize = 1500000;
    
    // 2배 메리츠클럽
    if (prevMonthPerf >= 200000 && currentMonthPerf >= 200000) {
      let baseTier = Math.floor(currentMonthPerf / 100000) * 100000;
      if (baseTier > 1000000) baseTier = 1000000;
      doubleMeritzPrize = baseTier * 2;
    }
    
    // 메리츠클럽 PLUS
    const minPerf = Math.min(prevMonthPerf, currentMonthPerf);
    if (minPerf >= 1000000) meritzClubPlusPrize = 3000000;
    else if (minPerf >= 800000) meritzClubPlusPrize = 2400000;
    else if (minPerf >= 600000) meritzClubPlusPrize = 1800000;
    else if (minPerf >= 400000) meritzClubPlusPrize = 1200000;
    else if (minPerf >= 200000) meritzClubPlusPrize = 600000;
    
    // 정규시상 (100%)
    regularPrize = currentMonthPerf;
    
    // 총 예상 시상금
    totalEstimatedPrize = week1Prize + week2Prize + week3Prize + monthlyPrize + doubleMeritzPrize + meritzClubPlusPrize + regularPrize;

    // 2월 시: 전월(1월) 시상금 계산 → 시상금 차이 (전월 대비)
    if (!isJanuaryView) {
      const jData = janData ?? { performance: { "2026-01": selectedAgent.performance["2026-01"] ?? 0, "2025-12": selectedAgent.performance["2025-12"] ?? 0 }, weekly: { week1: 0, week2: 0, week3: 0 } };
      const jW1 = jData.weekly?.week1 ?? 0;
      const jW2 = jData.weekly?.week2 ?? 0;
      const jW3 = jData.weekly?.week3 ?? 0;
      const jCur = jData.performance["2026-01"] ?? 0;
      const jPrev = jData.performance["2025-12"] ?? 0;
      let jWeek1 = getWeekPrize(jW1, JAN_W1_PRIZES);
      let jWeek2 = getWeekPrize(jW2, JAN_W2_PRIZES);
      let jWeek3 = getWeekPrize(jW3, JAN_W3_PRIZES);
      let jMonthly = 0;
      if (jCur >= 2500000) jMonthly = 5000000;
      else if (jCur >= 2000000) jMonthly = 4000000;
      else if (jCur >= 1800000) jMonthly = 3600000;
      else if (jCur >= 1500000) jMonthly = 3000000;
      else if (jCur >= 1200000) jMonthly = 2000000;
      else if (jCur >= 1000000) jMonthly = 1500000;
      let jDouble = 0;
      if (jPrev >= 200000 && jCur >= 200000) {
        let bt = Math.floor(jCur / 100000) * 100000;
        if (bt > 1000000) bt = 1000000;
        jDouble = bt * 2;
      }
      const jMin = Math.min(jPrev, jCur);
      let jPlus = 0;
      if (jMin >= 1000000) jPlus = 3000000;
      else if (jMin >= 800000) jPlus = 2400000;
      else if (jMin >= 600000) jPlus = 1800000;
      else if (jMin >= 400000) jPlus = 1200000;
      else if (jMin >= 200000) jPlus = 600000;
      const prevMonthTotalPrize = jWeek1 + jWeek2 + jWeek3 + jMonthly + jDouble + jPlus + jCur;
      prizeDiff = totalEstimatedPrize - prevMonthTotalPrize;
    }
    
    // 1주차: 지난 주차면 "다음 구간" 대신 "달성 실패" 또는 "달성 OO만원" (1월 선택 시 모두 마감)
    week1Past = isJanuaryView || currentWeekNum >= 2;
    const nextW1 = WEEK_TIERS.find(t => t > w1);
    const week1AchievedTier = week1Past && w1 >= 200000 ? WEEK_TIERS.filter(t => t <= w1).pop() : null;
    week1Next = week1Past
      ? (week1Prize > 0 ? `달성 ${Math.round((week1AchievedTier || 200000) / 10000)}만원 구간 !` : "달성 실패")
      : (nextW1 ? `${Math.round(nextW1 / 10000)}만원` : "최대구간");
    week1Progress = nextW1 ? Math.min(100, (w1 / nextW1) * 100) : 100;
    
    // 2주차: 지난 주차면 동일 (1월 선택 시 모두 마감)
    week2Past = isJanuaryView || currentWeekNum >= 3;
    const nextW2 = WEEK_TIERS.find(t => t > w2);
    const week2AchievedTier = week2Past && w2 >= 200000 ? WEEK_TIERS.filter(t => t <= w2).pop() : null;
    week2Next = week2Past
      ? (week2Prize > 0 ? `달성 ${Math.round((week2AchievedTier || 200000) / 10000)}만원 구간 !` : "달성 실패")
      : (nextW2 ? `${Math.round(nextW2 / 10000)}만원` : "최대구간");
    week2Progress = nextW2 ? Math.min(100, (w2 / nextW2) * 100) : 100;
    
    // 3주차 (1월만, 마감됨)
    if (isJanuaryView) {
      const nextW3 = WEEK_TIERS.find(t => t > w3);
      const week3AchievedTier = w3 >= 200000 ? WEEK_TIERS.filter(t => t <= w3).pop() : null;
      week3Next = week3Prize > 0 ? `달성 ${Math.round((week3AchievedTier || 200000) / 10000)}만원 구간 !` : "달성 실패";
      week3Progress = nextW3 ? Math.min(100, (w3 / nextW3) * 100) : 100;
    }
    
    // 월간 다음 구간
    const nextM = MONTHLY_TIERS.find(t => t > currentMonthPerf);
    monthlyNext = nextM ? `${Math.round(nextM / 10000)}만원` : "최대구간";
    monthlyProgress = nextM ? Math.min(100, (currentMonthPerf / nextM) * 100) : 100;
    
    // 메리츠클럽+ : 2월=1월 달성구간이 목표, 진척바=2월실적/목표. 3월=min(1,2) 구간이 목표. 1월 선택 시: 1월 달성구간 목표, 2월 실적
    const janPerf = selectedAgent.performance["2026-01"] || 0;
    febPerf = selectedAgent.performance["2026-02"] || 0;
    marchPerf = selectedAgent.performance["2026-03"] || 0;
    const getAchievedTier = (p: number) => {
      if (p >= 1000000) return 1000000;
      if (p >= 800000) return 800000;
      if (p >= 600000) return 600000;
      if (p >= 400000) return 400000;
      if (p >= 200000) return 200000;
      return 0;
    };
    if (isJanuaryView) {
      plusTarget = getAchievedTier(currentMonthPerf); // 1월 실적 기준
      plusProgress = plusTarget > 0 ? Math.min(100, (febPerf / plusTarget) * 100) : (febPerf / 200000) * 100;
      const nextPlus = PLUS_TIERS.find(t => t > (plusTarget || 0));
      const plusFebDone = febPerf >= (plusTarget || 200000) && plusTarget > 0;
      plusNext = plusFebDone
        ? "완성"
        : currentMonthPerf >= (plusTarget || 200000) && plusTarget > 0
          ? `2월에도 ${Math.round((plusTarget || 200000) / 10000)}만원달성시 완성`
          : (nextPlus ? `${Math.round(nextPlus / 10000)}만원` : "최대구간");
    } else if (currentMonthNum >= 3) {
      plusTarget = getAchievedTier(Math.min(janPerf, febPerf));
      plusProgress = plusTarget > 0 ? Math.min(100, (marchPerf / plusTarget) * 100) : 0;
      const nextPlus = PLUS_TIERS.find(t => t > (plusTarget || 0));
      const plusMarDone = marchPerf >= plusTarget && plusTarget > 0;
      plusNext = plusMarDone ? "완성" : (nextPlus ? `${Math.round(nextPlus / 10000)}만원` : "최대구간");
    } else {
      plusTarget = getAchievedTier(janPerf);
      plusProgress = plusTarget > 0 ? Math.min(100, (febPerf / plusTarget) * 100) : (febPerf / 200000) * 100;
      const nextPlus = PLUS_TIERS.find(t => t > (plusTarget || 0));
      const plusFebDone = currentMonthNum < 3 && febPerf >= (plusTarget || 200000) && plusTarget > 0;
      plusNext = plusFebDone
        ? `3월에도 ${Math.round((plusTarget || 200000) / 10000)}만원달성시 완성`
        : (nextPlus ? `${Math.round(nextPlus / 10000)}만원` : "최대구간");
    }
  }

  // 월간·MC플러스 다음구간까지 남은 금액 (배너 표시용)
  const getTier = (p: number) => {
    if (p >= 1000000) return 1000000;
    if (p >= 800000) return 800000;
    if (p >= 600000) return 600000;
    if (p >= 400000) return 400000;
    if (p >= 200000) return 200000;
    return 0;
  };
  let remainingMonthly = 0;
  let remainingPlus = 0;
  if (selectedAgent?.performance) {
    const curM = selectedAgent.performance["2026-02"] || 0;
    const nextM = MONTHLY_TIERS.find(t => t > curM);
    remainingMonthly = nextM ? Math.max(0, nextM - curM) : 0;
    const jan = selectedAgent.performance["2026-01"] || 0;
    const feb = selectedAgent.performance["2026-02"] || 0;
    const mar = selectedAgent.performance["2026-03"] || 0;
    const min12 = Math.min(jan, feb);
    if (currentMonthNum >= 3) {
      const pt = getTier(min12);
      remainingPlus = pt > 0 && mar < pt ? Math.max(0, pt - mar) : 0;
    } else {
      const pt = getTier(jan);
      const febDone = feb >= (pt || 200000) && pt > 0;
      if (febDone) {
        remainingPlus = pt; // 3월에 pt만원 달성 필요
      } else {
        const nextP = PLUS_TIERS.find(t => t > pt);
        remainingPlus = nextP ? Math.max(0, nextP - min12) : 0;
      }
    }
  }
  const remainToShow = selectedViewMonth === 2 && [remainingMonthly, remainingPlus].filter(r => r > 0).length > 0
    ? Math.min(...[remainingMonthly, remainingPlus].filter(r => r > 0))
    : 0;

  return (
    <>
      {/* 비밀번호 강제 변경 모달 */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-surface-dark rounded-xl shadow-2xl w-full max-w-md p-8 border border-gray-200 dark:border-gray-700">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">비밀번호 변경</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">
              최초 로그인 시 안전을 위해 비밀번호를 변경해야 합니다.
            </p>
            <form onSubmit={handleChangePassword} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  새로운 비밀번호
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
                  placeholder="새 비밀번호 입력"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  새로운 비밀번호 확인
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
                  placeholder="새 비밀번호 다시 입력"
                />
              </div>
              
              {passwordError && (
                <p className="text-red-500 text-sm">{passwordError}</p>
              )}

              <button
                type="submit"
                disabled={passwordLoading}
                className="w-full py-3 px-4 bg-primary hover:bg-red-700 text-white font-bold rounded-lg transition-colors disabled:opacity-50"
              >
                {passwordLoading ? "변경 중..." : "비밀번호 변경하기"}
              </button>
            </form>
          </div>
        </div>
      )}

      {selectedAgent && (
        <>
          <header className="bg-surface-light dark:bg-surface-dark border-b border-gray-200 dark:border-gray-700 sticky top-0 z-30 shadow-sm">
            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center">
                  <span className="text-2xl font-bold tracking-tight text-primary">
                    meritz
                  </span>
                  <span className="ml-2 text-lg font-medium text-meritz-gray dark:text-gray-300">
                    메리츠화재
                  </span>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                {user?.role === 'admin' || user?.role === 'manager' ? (
                  <div className="relative">
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        placeholder="이름 검색..."
                        value={agentSearchOpen ? agentSearchQuery : (selectedAgent ? `${selectedAgent.name} (${selectedAgent.branch})` : "")}
                        onChange={(e) => {
                          setAgentSearchQuery(e.target.value);
                          setAgentSearchOpen(true);
                        }}
                        onFocus={() => setAgentSearchOpen(true)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            const perfKey = "2026-02";
                            const sorted = [...agents].sort((a, b) => (b.performance?.[perfKey] || 0) - (a.performance?.[perfKey] || 0));
                            const filtered = agentSearchQuery.trim()
                              ? sorted.filter((a) => a.name?.toLowerCase().includes(agentSearchQuery.toLowerCase()))
                              : sorted;
                            setAgentSearchOpen(true);
                            if (filtered.length === 1) {
                              setSelectedAgent(filtered[0]);
                              setAgentSearchOpen(false);
                              setAgentSearchQuery("");
                            }
                          }
                        }}
                        className="form-input text-sm border border-gray-300 dark:border-gray-600 rounded-md py-1.5 pl-3 pr-4 w-64 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setAgentSearchQuery("");
                          setAgentSearchOpen(!agentSearchOpen);
                        }}
                        className="p-1.5 rounded-md border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                        title="리스트 보기"
                      >
                        <span className="material-symbols-outlined text-lg text-gray-600 dark:text-gray-400">format_list_bulleted</span>
                      </button>
                    </div>
                    {agentSearchOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setAgentSearchOpen(false)} />
                        <div className="absolute top-full left-0 mt-1 w-80 max-h-64 overflow-y-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg z-50">
                          {(() => {
                            const perfKey = "2026-02";
                            const sorted = [...agents].sort((a, b) => (b.performance?.[perfKey] || 0) - (a.performance?.[perfKey] || 0));
                            const filtered = agentSearchQuery.trim()
                              ? sorted.filter((a) => a.name?.toLowerCase().includes(agentSearchQuery.toLowerCase()))
                              : sorted;
                            return filtered.length > 0 ? (
                              filtered.map((agent) => (
                                <button
                                  key={agent.code}
                                  type="button"
                                  onClick={() => {
                                    setSelectedAgent(agent);
                                    setAgentSearchOpen(false);
                                    setAgentSearchQuery("");
                                  }}
                                  className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between ${
                                    selectedAgent?.code === agent.code ? "bg-primary/10 text-primary" : "text-gray-900 dark:text-white"
                                  }`}
                                >
                                  <span>{agent.name} ({agent.branch})</span>
                                  <span className="text-xs text-gray-500">
                                    {Math.round((agent.performance?.[perfKey] || 0) / 10000)}만
                                  </span>
                                </button>
                              ))
                            ) : (
                              <div className="px-3 py-4 text-sm text-gray-500 text-center">검색 결과 없음</div>
                            );
                          })()}
                        </div>
                      </>
                    )}
                  </div>
                ) : null}
                <div className="flex items-center space-x-4 pl-4 border-l border-gray-200 dark:border-gray-700">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-full bg-meritz-gold flex items-center justify-center text-white font-bold text-xs shadow-md">
                      {user?.name?.charAt(0) || 'U'}
                    </div>
                    <div className="hidden lg:block text-sm text-right">
                      <p className="font-bold text-gray-800 dark:text-gray-100">
                        {user?.name} {user?.role === 'admin' ? '관리자' : user?.role === 'manager' ? '매니저' : 'FP'}
                      </p>
                    </div>
                  </div>
                  <button onClick={handleLogout} className="text-xs text-gray-500 hover:text-primary underline">
                    로그아웃
                  </button>
                </div>
              </div>
            </div>
          </header>
          <main className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="bg-surface-light dark:bg-surface-dark rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6 mb-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-meritz-gold/10 rounded-full -mr-16 -mt-16 z-0"></div>
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/5 rounded-full -ml-12 -mb-12 z-0"></div>
              <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start justify-between gap-6">
                <div className="flex items-center gap-6 w-full md:w-auto">
                  <div className="relative">
                    <div className="w-24 h-24 rounded-full border-4 border-meritz-gold shadow-lg flex items-center justify-center bg-gradient-to-br from-yellow-50 to-yellow-100 text-3xl font-bold text-meritz-gold overflow-hidden">
                      <span className="material-symbols-outlined text-5xl">
                        person
                      </span>
                    </div>
                    <div className="absolute -bottom-2 -right-2 bg-meritz-gold text-white text-xs font-bold px-3 py-1 rounded-full shadow border-2 border-white dark:border-surface-dark flex items-center">
                      <span className="material-symbols-outlined text-sm mr-1">
                        military_tech
                      </span>{" "}
                      VIP
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                        {selectedAgent.name}{" "}
                        <span className="text-lg font-normal text-gray-500 dark:text-gray-400">
                          FP님
                        </span>
                      </h2>
                    </div>
                    <p className="text-gray-600 dark:text-gray-300 mb-2">
                      {selectedAgent.branch}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {totalEstimatedPrize > 0 && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-meritz-gold/10 text-meritz-gold border border-meritz-gold/30">
                          2월 시상 달성
                        </span>
                      )}
                      {prevMonthPerf >= 200000 && currentMonthPerf >= 200000 && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                          연속가동 달성
                        </span>
                      )}
                    </div>
                    {remainToShow > 0 && (
                      <div className="mt-3 inline-flex items-center px-3 py-1.5 rounded-md bg-primary/10 border border-primary/30 animate-shake">
                        <span className="text-sm font-bold text-primary">
                          {Math.round(remainToShow / 10000).toLocaleString()}만원 더 채우세요 !
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto mt-4 md:mt-0">
                  <div className="bg-gradient-to-br from-primary to-red-600 rounded-xl p-5 text-white shadow-lg min-w-[200px] flex-1">
                    <p className="text-sm opacity-90 mb-1">이번달 총 예상 시상금</p>
                    <div className="flex items-baseline gap-1">
                      <h3 className="text-3xl font-extrabold">
                        {Math.round(totalEstimatedPrize / 10000).toLocaleString()}
                        <span className="text-lg font-medium">만원</span>
                      </h3>
                    </div>
                    {selectedViewMonth === 2 && (
                      <div className="mt-2 text-xs bg-white/20 inline-block px-2 py-1 rounded">
                        전월 대비{" "}
                        <span className="font-bold">
                          {prizeDiff > 0 ? "+" : ""}
                          {Math.round(prizeDiff / 10000).toLocaleString()}만원
                        </span>{" "}
                        {prizeDiff >= 0 ? "▲" : "▼"}
                      </div>
                    )}
                  </div>
                  <div className="bg-surface-light dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm min-w-[200px] flex-1">
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                      현재 인보험 누적 실적
                    </p>
                    <div className="flex items-baseline gap-1">
                      <h3 className="text-3xl font-bold text-gray-900 dark:text-white">
                        {Math.round(currentMonthPerf / 10000).toLocaleString()}
                        <span className="text-lg font-medium text-gray-500">
                          만원
                        </span>
                      </h3>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-3">
                      <div
                        className="bg-primary h-1.5 rounded-full"
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-right mt-1 text-gray-400 whitespace-nowrap">
                      {isRank1 ? (
                        "전국 TOP 실적 달성!"
                      ) : (
                        `${targetRankDisplay != null ? `RANK ${targetRankDisplay}위` : goalLabel}까지 ${Math.max(0, Math.round((monthlyGoal - currentMonthPerf) / 10000)).toLocaleString()}만원 남았어요`
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
                  <span className="w-1.5 h-6 bg-meritz-gold rounded-sm mr-3"></span>
                  나의 시상 현황 (My Rewards)
                </h2>
                <div className="flex rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden bg-surface-light dark:bg-surface-dark">
                  {([1, 2] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setSelectedViewMonth(m)}
                      className={`px-4 py-2 text-sm font-medium transition-colors ${
                        selectedViewMonth === m
                          ? "bg-primary text-white"
                          : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                      }`}
                    >
                      {m}월
                    </button>
                  ))}
                </div>
              </div>
              <div className={`grid grid-cols-1 gap-5 mb-6 ${selectedViewMonth === 1 ? "md:grid-cols-4" : "md:grid-cols-3"}`}>
                {/* 1줄: 1주차, 2주차, (3주차 1월만), 월간 */}
                {/* 1주차 현금시상 */}
                <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow border-l-4 border-green-500 p-4 hover:shadow-lg transition-shadow">
                  <div className="flex justify-between items-start mb-3">
                    <div className="bg-green-100 dark:bg-green-900/30 p-1.5 rounded-lg">
                      <span className="material-symbols-outlined text-green-600 dark:text-green-400">payments</span>
                    </div>
                    {week1Prize > 0 ? (
                      <span className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 text-xs px-2 py-1 rounded font-bold">달성완료</span>
                    ) : (
                      <span className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 text-xs px-2 py-1 rounded font-bold">달성 실패</span>
                    )}
                  </div>
                  <h4 className="text-base font-bold text-gray-900 dark:text-white mb-0.5">1주차 현금시상</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">1주차 실적 기준</p>
                  <div className="mb-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-600 dark:text-gray-300">현재 {Math.round(viewW1 / 10000)}만</span>
                      <span className={`font-bold ${week1Next === "달성 실패" ? "text-red-500" : "text-green-600 dark:text-green-400"}`}>
                        {week1Past ? week1Next : `다음 구간 ${week1Next}`}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                      <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${week1Progress}%` }}></div>
                    </div>
                  </div>
                  <div className="border-t border-gray-100 dark:border-gray-700 pt-2 flex justify-between items-center">
                    <span className="text-xs text-gray-500">예상 시상금</span>
                    <span className="text-base font-bold text-green-600 dark:text-green-400">{Math.round(week1Prize / 10000).toLocaleString()}만원</span>
                  </div>
                </div>

                {/* 2주차 현금시상 */}
                <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow border-l-4 border-primary p-4 hover:shadow-lg transition-shadow relative overflow-hidden">
                  <div className="flex justify-between items-start mb-3 relative z-10">
                    <div className="bg-red-50 dark:bg-red-900/20 p-1.5 rounded-lg">
                      <span className="material-symbols-outlined text-primary">add_task</span>
                    </div>
                    {week2Prize > 0 ? (
                      <span className="bg-red-50 text-primary dark:bg-red-900/30 text-xs px-2 py-1 rounded font-bold">달성완료</span>
                    ) : (
                      <span className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 text-xs px-2 py-1 rounded font-bold">
                        {currentWeekNum >= 3 ? "달성 실패" : "진행중"}
                      </span>
                    )}
                  </div>
                  <h4 className="text-base font-bold text-gray-900 dark:text-white mb-0.5 relative z-10">2주차 현금시상</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 relative z-10">2주차 실적 기준</p>
                  <div className="mb-3 relative z-10">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-600 dark:text-gray-300">현재 {Math.round(viewW2 / 10000)}만</span>
                      <span className={`font-bold ${week2Next === "달성 실패" ? "text-red-500" : "text-primary"}`}>
                        {week2Past ? week2Next : `다음 구간 ${week2Next}`}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                      <div className="bg-primary h-1.5 rounded-full relative" style={{ width: `${week2Progress}%` }}></div>
                    </div>
                  </div>
                  <div className="border-t border-gray-100 dark:border-gray-700 pt-2 flex justify-between items-center relative z-10">
                    <span className="text-xs text-gray-500">예상 시상금</span>
                    <span className="text-base font-bold text-primary">{Math.round(week2Prize / 10000).toLocaleString()}만원</span>
                  </div>
                </div>

                {/* 3주차 현금시상 (1월만) */}
                {selectedViewMonth === 1 && (
                  <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow border-l-4 border-purple-500 p-4 hover:shadow-lg transition-shadow">
                    <div className="flex justify-between items-start mb-3">
                      <div className="bg-purple-100 dark:bg-purple-900/30 p-1.5 rounded-lg">
                        <span className="material-symbols-outlined text-purple-600 dark:text-purple-400">calendar_month</span>
                      </div>
                      {week3Prize > 0 ? (
                        <span className="bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300 text-xs px-2 py-1 rounded font-bold">달성완료</span>
                      ) : (
                        <span className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 text-xs px-2 py-1 rounded font-bold">달성 실패</span>
                      )}
                    </div>
                    <h4 className="text-base font-bold text-gray-900 dark:text-white mb-0.5">3주차 현금시상</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">3주차 실적 기준</p>
                    <div className="mb-3">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-600 dark:text-gray-300">현재 {Math.round(viewW3 / 10000)}만</span>
                        <span className={`font-bold ${week3Next === "달성 실패" ? "text-red-500" : "text-purple-600 dark:text-purple-400"}`}>
                          {week3Next}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                        <div className="bg-purple-500 h-1.5 rounded-full" style={{ width: `${week3Progress}%` }}></div>
                      </div>
                    </div>
                    <div className="border-t border-gray-100 dark:border-gray-700 pt-2 flex justify-between items-center">
                      <span className="text-xs text-gray-500">예상 시상금</span>
                      <span className="text-base font-bold text-purple-600 dark:text-purple-400">{Math.round(week3Prize / 10000).toLocaleString()}만원</span>
                    </div>
                  </div>
                )}

                {/* 월간 현금시상 */}
                <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow border-l-4 border-blue-500 p-4 hover:shadow-lg transition-shadow">
                  <div className="flex justify-between items-start mb-3">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-1.5 rounded-lg">
                      <span className="material-symbols-outlined text-blue-600 dark:text-blue-400">emoji_events</span>
                    </div>
                    {monthlyPrize > 0 ? (
                      <span className="bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 text-xs px-2 py-1 rounded font-bold">달성완료</span>
                    ) : (
                      <span className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 text-xs px-2 py-1 rounded font-bold">도전중</span>
                    )}
                  </div>
                  <h4 className="text-base font-bold text-gray-900 dark:text-white mb-0.5">월간 현금시상</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">당월 누적 실적</p>
                  <div className="mb-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-600 dark:text-gray-300">현재 {Math.round(currentMonthPerf / 10000)}만</span>
                      <span className="text-blue-600 dark:text-blue-400 font-bold">다음 구간 {monthlyNext}</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                      <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${monthlyProgress}%` }}></div>
                    </div>
                  </div>
                  <div className="border-t border-gray-100 dark:border-gray-700 pt-2 flex justify-between items-center">
                    <span className="text-xs text-gray-500">예상 시상금</span>
                    <span className="text-base font-bold text-blue-600 dark:text-blue-400">{Math.round(monthlyPrize / 10000).toLocaleString()}만원</span>
                  </div>
                </div>

                {/* 2줄: 2배 메리츠클럽, 메리츠클럽+ */}
                {/* 2배 메리츠클럽 */}
                <div className="bg-gradient-to-br from-amber-950 via-amber-900/95 to-gray-900 dark:from-gray-900 dark:via-amber-950/80 dark:to-gray-950 rounded-xl shadow-lg border border-amber-500/30 p-4 text-white relative overflow-hidden hover:shadow-xl transition-all">
                  <div className="absolute top-0 right-0 p-3 opacity-10 z-0 pointer-events-none">
                    <span className="material-symbols-outlined text-5xl">autorenew</span>
                  </div>
                  <div className="relative z-20">
                  <div className="flex justify-between items-start mb-3">
                    <div className="bg-amber-500/20 p-2 rounded-xl border border-amber-400/20">
                      <span className="material-symbols-outlined text-amber-400 text-xl">autorenew</span>
                    </div>
                    {doubleMeritzPrize > 0 ? (
                      <span className="bg-amber-500/30 text-amber-200 text-xs px-2.5 py-1 rounded-lg font-bold border border-amber-400/20">달성완료</span>
                    ) : (
                      <span className="bg-white/10 text-gray-300 text-xs px-2.5 py-1 rounded-lg font-bold border border-white/10">도전중</span>
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
                      ></div>
                    </div>
                  </div>
                  <div className="border-t border-amber-400/20 pt-2 flex justify-between items-center">
                    <span className="text-xs text-amber-100">예상 시상금</span>
                    <span className="text-base font-bold text-white">{Math.round(doubleMeritzPrize / 10000).toLocaleString()}만원</span>
                  </div>
                  </div>
                </div>

                {/* 메리츠클럽 PLUS */}
                <div className="bg-gradient-to-br from-gray-900 to-gray-800 dark:from-gray-800 dark:to-gray-900 rounded-xl shadow-lg border border-meritz-gold/30 p-4 text-white relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <span className="material-symbols-outlined text-6xl">diamond</span>
                  </div>
                  <div className="flex justify-between items-start mb-3 relative z-10">
                    <div className="bg-meritz-gold/20 p-1.5 rounded-lg">
                      <span className="material-symbols-outlined text-meritz-gold text-lg">diamond</span>
                    </div>
                    {meritzClubPlusPrize > 0 ? (
                      <span className="bg-meritz-gold text-white text-xs px-2 py-1 rounded font-bold shadow-sm">조건 충족</span>
                    ) : (
                      <span className="bg-gray-700 text-gray-300 text-xs px-2 py-1 rounded font-bold shadow-sm">도전중</span>
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
                      <div className="bg-meritz-gold h-1.5 rounded-full" style={{ width: `${Math.min(100, plusProgress)}%` }}></div>
                    </div>
                  </div>
                  <div className="border-t border-gray-700 pt-2 flex justify-between items-center relative z-10">
                    <span className="text-xs text-gray-400">3월 완성시 예상 시상금</span>
                    <span className="text-base font-bold text-white">{Math.round(meritzClubPlusPrize / 10000).toLocaleString()}만원</span>
                  </div>
                </div>

                {/* 2월 정규시상 */}
                <div className="bg-gradient-to-br from-slate-800 via-slate-700/90 to-slate-900 dark:from-slate-900 dark:via-slate-800 dark:to-slate-950 rounded-xl shadow-lg border border-slate-500/30 p-4 text-white relative overflow-hidden hover:shadow-xl transition-all">
                  <div className="absolute top-0 right-0 p-3 opacity-10">
                    <span className="material-symbols-outlined text-5xl">verified</span>
                  </div>
                  <div className="flex justify-between items-start mb-3 relative z-10">
                    <div className="bg-white/10 p-2 rounded-xl border border-white/10">
                      <span className="material-symbols-outlined text-slate-300 text-lg">receipt_long</span>
                    </div>
                    <span className="bg-emerald-500/20 text-emerald-300 text-xs px-2.5 py-1 rounded-lg font-bold border border-emerald-400/20">실적 100%</span>
                  </div>
                  <h4 className="text-base font-bold text-slate-100 mb-0.5 relative z-10">{selectedViewMonth}월 정규시상</h4>
                  <p className="text-xs text-slate-300/80 mb-3 relative z-10">실적의 100% · 1:1 비율</p>
                  <div className="border-t border-white/10 pt-2 flex justify-between items-center relative z-10">
                    <span className="text-xs text-slate-400">예상 시상금</span>
                    <span className="text-base font-bold text-white">{Math.round(regularPrize / 10000).toLocaleString()}만원</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
              <div className="lg:col-span-1 bg-surface-light dark:bg-surface-dark rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-6 flex flex-col items-center justify-center relative">
                <h3 className="w-full text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center">
                  <span className="material-symbols-outlined text-primary mr-2">
                    flag
                  </span>{" "}
                  {selectedViewMonth}월 목표 달성률
                </h3>
                <div className="relative w-48 h-48">
                  <svg
                    className="w-full h-full transform -rotate-90"
                    viewBox="0 0 100 100"
                  >
                    <circle
                      className="dark:stroke-gray-700"
                      cx="50"
                      cy="50"
                      fill="none"
                      r="45"
                      stroke="#E5E7EB"
                      strokeWidth="8"
                    ></circle>
                    <circle
                      cx="50"
                      cy="50"
                      fill="none"
                      r="45"
                      stroke="#EF3B24"
                      strokeDasharray={`${progress * 2.83} 283`}
                      strokeLinecap="round"
                      strokeWidth="8"
                    ></circle>
                  </svg>
                  <div className="absolute top-0 left-0 w-full h-full flex flex-col items-center justify-center">
                    {isRank1 ? (
                      <>
                        <span className="text-2xl font-black text-primary">전국TOP</span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">1위 달성</span>
                      </>
                    ) : (
                      <>
                        <span className="text-4xl font-black text-gray-900 dark:text-white">
                          {progress}
                          <span className="text-xl font-normal">%</span>
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          달성중 ({goalLabel})
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="lg:col-span-2 bg-surface-light dark:bg-surface-dark rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center">
                      <span className="material-symbols-outlined text-meritz-gray mr-2">
                        show_chart
                      </span>{" "}
                      최근 7개월 실적 추이
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">1월·2월 클릭 시 시상 현황 전환</p>
                  </div>
                </div>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={performanceData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(val) => `${Math.round(val / 10000)}만`}
                      />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            const value = payload[0].value as number;
                            let rank = "-";
                            const monthMap: Record<string, string> = {
                              "8월": "2025-08",
                              "9월": "2025-09",
                              "10월": "2025-10",
                              "11월": "2025-11",
                              "12월": "2025-12",
                              "1월": "2026-01",
                              "2월": "2026-02",
                            };
                            const monthKey = label != null ? monthMap[label] : undefined;
                            if (monthKey && globalRanks[monthKey]) {
                              const rankIndex = globalRanks[monthKey].indexOf(value);
                              if (rankIndex !== -1) {
                                rank = (rankIndex + 1).toString();
                              }
                            }
                            return (
                              <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded shadow-md">
                                <p className="text-sm font-bold text-primary mb-1">
                                  {Math.round(value / 10000).toLocaleString()}만원
                                </p>
                                <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                                  RANK : {rank}위
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="#EF3B24"
                        strokeWidth={3}
                        dot={(props: any) => {
                          const { cx, cy, payload } = props;
                          const isClickable = payload?.name === "1월" || payload?.name === "2월";
                          const monthNum = payload?.name === "1월" ? 1 : payload?.name === "2월" ? 2 : null;
                          return (
                            <circle
                              cx={cx}
                              cy={cy}
                              r={isClickable ? 6 : 4}
                              fill="#EF3B24"
                              style={isClickable ? { cursor: "pointer" } : undefined}
                              onClick={monthNum != null ? () => setSelectedViewMonth(monthNum) : undefined}
                            />
                          );
                        }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {updateDate && (
              <div className="fixed bottom-4 right-4 text-xs text-gray-500 dark:text-gray-400">
                업데이트 날짜 : {updateDate.slice(0, 2)}.{updateDate.slice(2, 4)}
              </div>
            )}
          </main>
        </>
      )}
    </>
  );
}
