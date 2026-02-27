"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toPng } from "html-to-image";
import {
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
  Line,
} from "recharts";
import januaryClosedData from "@/data/january_closed.json";

const januaryClosed = januaryClosedData as Record<
  string,
  {
    code: string;
    performance: Record<string, number>;
    weekly: { week1: number; week2: number; week3?: number };
  }
>;
const RANK_EXCLUDE_CODE = "712345678"; // 테스트용 노연지 계정 — 랭킹·실적 순위에서 제외

export default function Dashboard() {
  const [agents, setAgents] = useState<any[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [globalRanks, setGlobalRanks] = useState<Record<string, number[]>>({});
  const [updateDate, setUpdateDate] = useState<string>("");
  const [selectedViewMonth, setSelectedViewMonth] = useState<1 | 2>(2); // 1월 | 2월
  const [prizeMonthDropdownOpen, setPrizeMonthDropdownOpen] = useState(false);
  const [agentSearchOpen, setAgentSearchOpen] = useState(false);
  const [agentSearchQuery, setAgentSearchQuery] = useState("");
  const [agentsError, setAgentsError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  // 비밀번호 변경 모달 상태
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const exportAreaRef = useRef<HTMLDivElement>(null);

  const router = useRouter();

  // App 처음 열릴 때 백엔드 Appwrite 연결 확인 (브라우저 SDK 직접 호출 시 404 등 오류 방지)
  useEffect(() => {
    fetch("/api/appwrite-health")
      .then((res) => res.json())
      .then((data) => {
        if (data.ok) console.log("[Appwrite] 연결 OK");
      })
      .catch(() => {});
  }, []);

  const handleExportPng = async () => {
    const el = exportAreaRef.current;
    if (!el) return;
    setExportLoading(true);
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const removed: { link: HTMLLinkElement; parent: Node; next: Node | null }[] = [];
    try {
      // cross-origin 스타일시트는 cssRules 접근 시 SecurityError → 캡처 동안만 DOM에서 제거
      document.querySelectorAll('link[rel="stylesheet"]').forEach((linkEl) => {
        const link = linkEl as HTMLLinkElement;
        if (link.href && new URL(link.href).origin !== origin) {
          const parent = link.parentNode;
          if (parent) {
            removed.push({ link, parent, next: link.nextSibling });
            parent.removeChild(link);
          }
        }
      });
      // 화면과 동일한 픽셀 너비로 고정해 클론이 같은 비율로 렌더링되게 함 (글씨 두 줄 내려감 방지)
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      const origStyle = { width: el.style.width, minWidth: el.style.minWidth, maxWidth: el.style.maxWidth, boxSizing: el.style.boxSizing, padding: el.style.padding };
      try {
        el.style.width = `${w}px`;
        el.style.minWidth = `${w}px`;
        el.style.maxWidth = `${w}px`;
        el.style.boxSizing = "border-box";
        el.style.padding = "2px"; // PNG 내보낼 때 네 방향 2px 여백
        const dataUrl = await toPng(el, {
          width: w + 4,
          height: h + 4,
          pixelRatio: 3,
          backgroundColor: document.documentElement.classList.contains("dark") ? "#111827" : "#f3f4f6",
          cacheBust: true,
          skipFonts: false,
        });
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = `대시보드_${selectedAgent?.name ?? "내보내기"}_${new Date().toISOString().slice(0, 10)}.png`;
        a.click();
      } finally {
        el.style.width = origStyle.width;
        el.style.minWidth = origStyle.minWidth;
        el.style.maxWidth = origStyle.maxWidth;
        el.style.boxSizing = origStyle.boxSizing;
        el.style.padding = origStyle.padding;
      }
    } catch (e) {
      console.error("PNG 내보내기 실패:", e);
    } finally {
      removed.forEach(({ link, parent, next }) => parent.insertBefore(link, next));
      setExportLoading(false);
    }
  };

  useEffect(() => {
    // 대시보드 데이터 한 번에 로드 (요청 1회로 로딩 단축)
    const fetchData = async () => {
      try {
        setAgentsError(null);
        const res = await fetch("/api/dashboard");
        const data = await res.json();

        if (!res.ok) {
          if (res.status === 401) {
            router.push("/login");
            return;
          }
          setAgentsError(data.error || "데이터를 불러올 수 없습니다.");
          return;
        }

        if (!data.user) {
          router.push("/login");
          return;
        }

        setUser(data.user);
        if (data.user.isFirstLogin) setShowPasswordModal(true);

        setAgents(data.agents || []);
        setUpdateDate(data.updateDate || "");
        const excludeTest = (data.agents || []).filter((a: any) => a.code !== RANK_EXCLUDE_CODE);
        if (excludeTest.length > 0) {
          const sorted = [...excludeTest].sort((a, b) => (b.performance?.["2026-02"] || 0) - (a.performance?.["2026-02"] || 0));
          setSelectedAgent(sorted[0]);
        }
        if (data.ranks) setGlobalRanks(data.ranks);
      } catch (err) {
        console.error("데이터 로드 실패", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router, retryKey]);

  const rankKeyMonth = selectedViewMonth === 1 ? "2026-01" : "2026-02";
  const sortedByMonth = useMemo(
    () =>
      [...(agents || [])]
        .filter((a: any) => a.code !== RANK_EXCLUDE_CODE)
        .sort((a: any, b: any) => (b.performance?.[rankKeyMonth] ?? 0) - (a.performance?.[rankKeyMonth] ?? 0)),
    [agents, rankKeyMonth]
  );

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

  if (agentsError) {
    return (
      <div className="flex flex-col h-screen items-center justify-center gap-4 px-4">
        <p className="text-red-600 dark:text-red-400 text-center">{agentsError}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center">서버 또는 Firebase 설정을 확인해 주세요.</p>
        <div className="flex gap-3">
          <button onClick={() => { setAgentsError(null); setLoading(true); setRetryKey((k) => k + 1); }} className="px-4 py-2 bg-primary text-white rounded-md">다시 시도</button>
          <button onClick={handleLogout} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md">로그아웃</button>
        </div>
      </div>
    );
  }

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
  // 2026 MY HOT (1~10월 합산 연도시상)
  let myHotSum = 0;
  let myHotRank = 0;
  let myHotIsChamp = false;
  let myHotNextTier: number | null = null;
  let myHotProgress = 0;
  let myHotLabel = "meritz 500";
  
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
  // 주차 종료 여부는 '지금 시점'(오늘 날짜) 기준. 진행중/달성 실패 배지가 실제와 맞도록
  const todayDay = new Date().getDate();
  const currentWeekNum = Math.min(4, Math.max(1, Math.ceil((todayDay || 1) / 7)));
  const dayFromUpdate = (updateDate && updateDate.length >= 4) ? parseInt(updateDate.slice(2, 4), 10) : todayDay;

  if (selectedAgent && selectedAgent.performance) {
    performanceData = [
      { name: "8월", value: selectedAgent.performance["2025-08"] || 0, prize: 0 },
      { name: "9월", value: selectedAgent.performance["2025-09"] || 0, prize: 0 },
      { name: "10월", value: selectedAgent.performance["2025-10"] || 0, prize: 0 },
      { name: "11월", value: selectedAgent.performance["2025-11"] || 0, prize: 0 },
      { name: "12월", value: selectedAgent.performance["2025-12"] || 0, prize: 0 },
      { name: "1월", value: selectedAgent.performance["2026-01"] || 0, prize: 0 },
      { name: "2월", value: selectedAgent.performance["2026-02"] || 0, prize: 0 },
    ];

    // 1·2월 시상금 (실적 추이 차트 막대용)
    const code = String(selectedAgent.code || "");
    const janData = januaryClosed[code];
    const jData = janData ?? { performance: { "2026-01": selectedAgent.performance["2026-01"] ?? 0, "2025-12": selectedAgent.performance["2025-12"] ?? 0 }, weekly: { week1: 0, week2: 0, week3: 0 } };
    const jW1 = jData.weekly?.week1 ?? 0, jW2 = jData.weekly?.week2 ?? 0, jW3 = jData.weekly?.week3 ?? 0;
    const jCur = jData.performance["2026-01"] ?? 0, jPrev = jData.performance["2025-12"] ?? 0;
    const getWeekPrizeChart = (perf: number, tiers: [number, number][]) => { for (const [thresh, prize] of tiers) { if (perf >= thresh) return prize; } return 0; };
    let prizeJan = getWeekPrizeChart(jW1, JAN_W1_PRIZES) + getWeekPrizeChart(jW2, JAN_W2_PRIZES) + getWeekPrizeChart(jW3, JAN_W3_PRIZES);
    let jMonthly = 0;
    if (jCur >= 2500000) jMonthly = 5000000; else if (jCur >= 2000000) jMonthly = 4000000; else if (jCur >= 1800000) jMonthly = 3600000; else if (jCur >= 1500000) jMonthly = 3000000; else if (jCur >= 1200000) jMonthly = 2000000; else if (jCur >= 1000000) jMonthly = 1500000;
    let jDouble = 0;
    if (jPrev >= 200000 && jCur >= 200000) { let bt = Math.floor(jCur / 100000) * 100000; if (bt > 1000000) bt = 1000000; jDouble = bt * 2; }
    const jMin = Math.min(jPrev, jCur);
    let jPlus = 0;
    if (jMin >= 1000000) jPlus = 3000000; else if (jMin >= 800000) jPlus = 2400000; else if (jMin >= 600000) jPlus = 1800000; else if (jMin >= 400000) jPlus = 1200000; else if (jMin >= 200000) jPlus = 600000;
    prizeJan += jMonthly + jDouble + jPlus + jCur;
    const fW1 = selectedAgent.weekly?.week1 || 0, fW2 = selectedAgent.weekly?.week2 || 0;
    const fCur = selectedAgent.performance["2026-02"] ?? 0, fPrev = jCur;
    let prizeFeb = getWeekPrizeChart(fW1, FEB_W1_PRIZES) + getWeekPrizeChart(fW2, FEB_W2_PRIZES);
    let fMonthly = 0;
    if (fCur >= 2500000) fMonthly = 5000000; else if (fCur >= 2000000) fMonthly = 4000000; else if (fCur >= 1800000) fMonthly = 3600000; else if (fCur >= 1500000) fMonthly = 3000000; else if (fCur >= 1200000) fMonthly = 2000000; else if (fCur >= 1000000) fMonthly = 1500000;
    let fDouble = 0;
    if (fPrev >= 200000 && fCur >= 200000) { let bt = Math.floor(fCur / 100000) * 100000; if (bt > 1000000) bt = 1000000; fDouble = bt * 2; }
    const fMin = Math.min(fPrev, fCur);
    let fPlus = 0;
    if (fMin >= 1000000) fPlus = 3000000; else if (fMin >= 800000) fPlus = 2400000; else if (fMin >= 600000) fPlus = 1800000; else if (fMin >= 400000) fPlus = 1200000; else if (fMin >= 200000) fPlus = 600000;
    prizeFeb += fMonthly + fDouble + fPlus + fCur;
    const nameToPrize: Record<string, number> = { "1월": prizeJan, "2월": prizeFeb };
    performanceData = performanceData.map((d) => ({ ...d, prize: nameToPrize[d.name] ?? 0 }));

    // 선택 월에 따른 데이터 소스 (1월=마감데이터, 2월=현재)
    const isJanuaryView = selectedViewMonth === 1;

    currentMonthPerf = isJanuaryView
      ? (janData?.performance["2026-01"] ?? selectedAgent.performance["2026-01"] ?? 0)
      : (selectedAgent.performance["2026-02"] ?? 0);
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

    // 2026 MY HOT: 선택한 월까지 누적 합산 (1월→1월만, 2월→1+2월 …), 테스터 노연지 랭킹 제외
    const MY_HOT_TIERS = [5000000, 6500000, 8000000, 10000000];
    const yearMonths = Array.from({ length: selectedViewMonth }, (_, i) => `2026-${String(i + 1).padStart(2, "0")}`);
    myHotSum = 0;
    for (const m of yearMonths) {
      myHotSum += selectedAgent.performance?.[m] ?? 0;
    }
    const agentSums = agents
      .filter((a: any) => a.code !== RANK_EXCLUDE_CODE)
      .map((a: any) => {
        let s = 0;
        for (const m of yearMonths) s += a.performance?.[m] ?? 0;
        return { code: a.code, sum: s };
      });
    agentSums.sort((a, b) => b.sum - a.sum);
    myHotRank = agentSums.findIndex((a) => a.code === selectedAgent.code) + 1;
    if (myHotRank === 0) myHotRank = 999;
    myHotIsChamp = myHotRank === 1;
    myHotNextTier = MY_HOT_TIERS.find((t) => t > myHotSum) ?? null;
    myHotProgress = myHotNextTier ? Math.min(100, Math.round((myHotSum / myHotNextTier) * 100)) : (myHotIsChamp ? 100 : 100);
    myHotLabel = myHotIsChamp ? "CHAMP" : myHotNextTier ? `meritz ${myHotNextTier / 10000}` : "CHAMP (1위)";
  }

  // 당월실적 순위 (상단 타이틀 섹션 TOP30/TOP3 스타일용, 테스터 제외)
  const rankInMonth = sortedByMonth.findIndex((a: any) => a.code === selectedAgent?.code) + 1;
  const isTop30 = rankInMonth >= 1 && rankInMonth <= 30;
  const isTop3 = rankInMonth >= 1 && rankInMonth <= 3;
  const profileImageSrc =
    rankInMonth >= 1 && rankInMonth <= 30 ? "/top30.png" : rankInMonth >= 31 && rankInMonth <= 100 ? "/top100.png" : "/etc.png";

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
  // 해당월 기준 "더 채우세요" 배너: 구간 남은 금액 vs (해당월 모든 구간 채운 경우) 랭크 한 단계 올리기/2위와의 격차
  const currentMonthPerfForBanner = selectedAgent?.performance?.[rankKeyMonth] ?? 0;
  const allTiersFilledThisMonth = remainingMonthly === 0;
  let remainToShow = 0;
  let remainLabel: "more" | "gap" = "more"; // "more" = N만원 더 채우세요, "gap" = 2위와의 격차
  if (selectedViewMonth === 2) {
    if (allTiersFilledThisMonth) {
      // 해당월 모든 구간 채움 → 랭크 1단계 올리기 또는 1위면 2위와의 격차
      if (rankInMonth === 1 && sortedByMonth.length >= 2) {
        const secondPerf = sortedByMonth[1]?.performance?.[rankKeyMonth] ?? 0;
        const gap = Math.max(0, currentMonthPerfForBanner - secondPerf);
        if (gap > 0) {
          remainToShow = gap;
          remainLabel = "gap";
        }
      } else if (rankInMonth >= 2) {
        const nextRankPerf = sortedByMonth[rankInMonth - 2]?.performance?.[rankKeyMonth] ?? 0;
        const gapToNext = Math.max(0, nextRankPerf - currentMonthPerfForBanner);
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
  }

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
            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-3 md:py-0 md:h-16 flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-0">
              {/* 1줄(모바일) / 좌측(데스크톱): 로고 + 우측 유저/로그아웃 */}
              <div className="flex items-center justify-between w-full md:w-auto">
                <div className="flex items-center shrink-0">
                  <img src="/ci.png" alt="CI" className="h-[1.6rem] md:h-[1.8rem] object-contain" />
                </div>
                <div className="flex items-center gap-2 md:gap-4 md:pl-4 md:border-l border-gray-200 dark:border-gray-700">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-full bg-meritz-gold flex items-center justify-center text-white font-bold text-xs shadow-md">
                      {user?.name?.charAt(0) || 'U'}
                    </div>
                    <div className="hidden lg:block text-sm text-right">
                      <p className="font-bold text-gray-800 dark:text-gray-100">
                        {user?.name}{user?.role === 'admin' ? ' 관리자' : user?.role === 'manager' ? ' 매니저' : '님'}
                      </p>
                    </div>
                  </div>
                  <button onClick={handleLogout} className="text-xs text-gray-500 hover:text-primary underline">
                    로그아웃
                  </button>
                  <button
                    type="button"
                    onClick={handleExportPng}
                    disabled={exportLoading}
                    className="flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <span className="material-symbols-outlined text-base">download</span>
                    {exportLoading ? "내보내는 중..." : "내보내기"}
                  </button>
                </div>
              </div>
              {/* 2줄(모바일) / 우측(데스크톱): 검색+리스트 (admin/manager만) */}
              {(user?.role === 'admin' || user?.role === 'manager') && (
                <div className="relative w-full md:w-auto flex items-center gap-1">
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
                        const sorted = [...agents].filter((a: any) => a.code !== RANK_EXCLUDE_CODE).sort((a, b) => (b.performance?.[perfKey] || 0) - (a.performance?.[perfKey] || 0));
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
                    className="form-input text-sm border border-gray-300 dark:border-gray-600 rounded-md py-1.5 pl-3 pr-4 flex-1 min-w-0 md:w-64 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setAgentSearchQuery("");
                      setAgentSearchOpen(!agentSearchOpen);
                    }}
                    className="p-1.5 rounded-md border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 shrink-0"
                    title="리스트 보기"
                  >
                    <span className="material-symbols-outlined text-lg text-gray-600 dark:text-gray-400">format_list_bulleted</span>
                  </button>
                  {agentSearchOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setAgentSearchOpen(false)} />
                      <div className="absolute top-full left-0 right-0 md:right-auto mt-1 w-full md:w-80 max-h-64 overflow-y-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg z-50">
                          {(() => {
                            const perfKey = "2026-02";
                            const sorted = [...agents].filter((a: any) => a.code !== RANK_EXCLUDE_CODE).sort((a, b) => (b.performance?.[perfKey] || 0) - (a.performance?.[perfKey] || 0));
                            const filtered = agentSearchQuery.trim()
                              ? sorted.filter((a) => a.name?.toLowerCase().includes(agentSearchQuery.toLowerCase()))
                              : sorted;
                            const toShow = filtered.slice(0, 80);
                            return toShow.length > 0 ? (
                              <>
                                {toShow.map((agent) => (
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
                              ))}
                                {filtered.length > 80 && (
                                  <div className="px-3 py-2 text-xs text-gray-500 border-t border-gray-200 dark:border-gray-600">
                                    상위 80명만 표시. 이름 검색으로 찾아주세요.
                                  </div>
                                )}
                              </>
                            ) : (
                              <div className="px-3 py-4 text-sm text-gray-500 text-center">검색 결과 없음</div>
                            );
                          })()}
                        </div>
                      </>
                    )}
                </div>
              )}
            </div>
          </header>
          <main className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-14">
            <div ref={exportAreaRef} className="space-y-0">
            <div
              className={`rounded-2xl shadow-lg p-4 md:p-6 mb-6 md:mb-8 relative overflow-hidden ${
                isTop3
                  ? "bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 dark:from-black dark:via-gray-900 dark:to-black border-2 border-meritz-gold/50"
                  : isTop30
                    ? "bg-gradient-to-br from-gray-800/95 to-gray-900/95 dark:from-gray-900 dark:to-black border border-meritz-gold/30 bg-surface-light dark:bg-surface-dark"
                    : "bg-surface-light dark:bg-surface-dark border border-gray-100 dark:border-gray-700"
              }`}
            >
              {isTop30 && (
                <>
                  <div className="absolute top-0 right-0 w-72 h-72 bg-meritz-gold/10 rounded-full -mr-24 -mt-24 z-0" />
                  <div className="absolute bottom-0 left-0 w-56 h-56 bg-primary/10 rounded-full -ml-20 -mb-20 z-0" />
                </>
              )}
              {!isTop30 && (
                <>
                  <div className="absolute top-0 right-0 w-64 h-64 bg-meritz-gold/10 rounded-full -mr-16 -mt-16 z-0" />
                  <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/5 rounded-full -ml-12 -mb-12 z-0" />
                </>
              )}
              <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start justify-between gap-6">
                <div className="flex items-center gap-6 w-full md:w-auto">
                  <div className="relative">
                    <div
                      className={`w-24 h-24 rounded-full border-4 shadow-lg flex items-center justify-center overflow-hidden bg-gray-200 dark:bg-gray-700 ${
                        isTop3
                          ? "border-meritz-gold"
                          : isTop30
                            ? "border-meritz-gold/80"
                            : "border-meritz-gold"
                      }`}
                    >
                      <img src={profileImageSrc} alt="" className="w-[77%] h-[77%] object-contain" />
                    </div>
                    {isTop3 ? (
                      <div className="absolute -top-4 -right-1 bg-gradient-to-br from-meritz-gold to-amber-700 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-lg border border-amber-200/50 flex items-center gap-0.5 scale-[0.8] origin-top-right whitespace-nowrap">
                        <svg viewBox="0 0 24 24" className="w-3 h-3 flex-shrink-0 fill-current" aria-hidden><path d="M12 2l2.4 7.4h7.6l-6 4.6 2.3 7-6.3-4.6L5.7 21l2.3-7-6-4.6h7.6L12 2z"/></svg>
                        TOP {rankInMonth}
                      </div>
                    ) : isTop30 ? (
                      <div className="absolute -bottom-4 -right-2 bg-meritz-gold text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow border-2 border-white dark:border-surface-dark flex items-center scale-[0.8] origin-bottom-right whitespace-nowrap">
                        <svg viewBox="0 0 24 24" className="w-3 h-3 flex-shrink-0 mr-0.5 fill-current" aria-hidden><path d="M17 11V3H7v8H3v12h8v-4h2v4h8V11h-4zM7 19H5v-2h2v2zm0-4H5v-2h2v2zm0-4H5V9h2v2zm4 4H9v-2h2v2zm0-4H9V9h2v2zm0-4H9V5h2v2zm4 8v-2h2v2h-2zm0-4V9h2v2h-2zm0-4V5h2v2h-2zm4 12v-2h2v2h-2zm0-4v-2h2v2h-2z"/></svg>
                        TOP {rankInMonth}
                      </div>
                    ) : (
                      <div className="absolute -bottom-2 -right-2 bg-meritz-gold text-white text-xs font-bold px-3 py-1 rounded-full shadow border-2 border-white dark:border-surface-dark flex items-center whitespace-nowrap">
                        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 flex-shrink-0 mr-1 fill-current" aria-hidden><path d="M17 11V3H7v8H3v12h8v-4h2v4h8V11h-4zM7 19H5v-2h2v2zm0-4H5v-2h2v2zm0-4H5V9h2v2zm4 4H9v-2h2v2zm0-4H9V9h2v2zm0-4H9V5h2v2zm4 8v-2h2v2h-2zm0-4V9h2v2h-2zm0-4V5h2v2h-2zm4 12v-2h2v2h-2zm0-4v-2h2v2h-2z"/></svg>
                        VIP
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h2
                        className={`text-2xl md:text-3xl font-bold ${
                          isTop3 || isTop30 ? "text-white" : "text-gray-900 dark:text-white"
                        }`}
                      >
                        {selectedAgent.name}{" "}
                        <span className={`text-base md:text-lg font-normal ${isTop3 ? "text-meritz-gold/90" : isTop30 ? "text-meritz-gold dark:text-meritz-gold/90" : "text-gray-500 dark:text-gray-400"}`}>
                          님
                        </span>
                      </h2>
                      {isTop30 && (
                        <span className={`text-xs font-bold px-2 py-0.5 rounded whitespace-nowrap ${isTop3 ? "bg-meritz-gold/20 text-meritz-gold border border-meritz-gold/40" : "bg-primary/10 text-primary border border-primary/30"}`}>
                          당월실적 {rankInMonth}위
                        </span>
                      )}
                    </div>
                    <p className={`mb-2 ${isTop3 ? "text-gray-400" : isTop30 ? "text-gray-500 dark:text-gray-400" : "text-gray-600 dark:text-gray-300"}`}>
                      {selectedAgent.branch}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {totalEstimatedPrize > 0 && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-meritz-gold/10 text-meritz-gold border border-meritz-gold/30 whitespace-nowrap">
                          2월 시상 달성
                        </span>
                      )}
                      {prevMonthPerf >= 200000 && currentMonthPerf >= 200000 && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 whitespace-nowrap">
                          연속가동 달성
                        </span>
                      )}
                    </div>
                    {remainToShow > 0 && (
                      <div className="mt-3 inline-flex items-center px-3 py-1.5 rounded-md bg-primary/10 border border-primary/30 animate-sway whitespace-nowrap">
                        <span className="text-sm font-bold text-primary">
                          {remainLabel === "gap"
                            ? `2위와의 격차 ${Math.round(remainToShow / 10000).toLocaleString()}만원`
                            : `${Math.round(remainToShow / 10000).toLocaleString()}만원 더 채우세요 !`}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto mt-4 md:mt-0 items-end">
                  <div
                    className={`rounded-xl p-4 md:p-5 text-white shadow-lg min-w-0 md:min-w-[200px] flex-1 ${
                      isTop3 ? "bg-gradient-to-br from-primary via-red-600 to-red-700 border border-meritz-gold/30" : isTop30 ? "bg-gradient-to-br from-primary to-red-600 border border-meritz-gold/20" : "bg-gradient-to-br from-primary to-red-600"
                    }`}
                  >
                    <p className="text-sm opacity-90 mb-1">이번달 총 예상 시상금</p>
                    <div className="flex items-baseline gap-1">
                      <h3 className="text-2xl md:text-3xl font-extrabold">
                        {Math.round(totalEstimatedPrize / 10000).toLocaleString()}
                        <span className="text-lg font-medium">만원</span>
                      </h3>
                    </div>
                    {selectedViewMonth === 2 && (
                      <div className="mt-2 text-xs bg-white/20 inline-block px-2 py-1 rounded whitespace-nowrap">
                        전월 대비{" "}
                        <span className="font-bold">
                          {prizeDiff > 0 ? "+" : ""}
                          {Math.round(prizeDiff / 10000).toLocaleString()}만원
                        </span>{" "}
                        {prizeDiff >= 0 ? "▲" : "▼"}
                      </div>
                    )}
                  </div>
                  <div
                    className={`rounded-xl px-2.5 md:px-3.5 py-2 md:py-2.5 shadow-sm min-w-0 md:min-w-[140px] flex-[0.54] border shrink-0 ${
                      isTop3 ? "bg-gray-800/80 dark:bg-gray-800 border-meritz-gold/30" : isTop30 ? "bg-surface-light dark:bg-gray-800 border-meritz-gold/20" : "bg-surface-light dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                    }`}
                  >
                    <p className={`text-xs mb-0.5 ${isTop3 ? "text-gray-400" : "text-gray-500 dark:text-gray-400"}`}>
                      현재 인보험 누적 실적
                    </p>
                    <div className="flex items-baseline gap-1">
                      <h3 className={`text-xl md:text-2xl font-bold ${isTop3 ? "text-white" : "text-gray-900 dark:text-white"}`}>
                        {Math.round(currentMonthPerf / 10000).toLocaleString()}
                        <span className={isTop3 ? "text-base font-medium text-meritz-gold/90" : "text-base font-medium text-gray-500"}>
                          만원
                        </span>
                      </h3>
                    </div>
                    <div className={`w-full rounded-full h-1 mt-1.5 ${isTop3 ? "bg-gray-700" : "bg-gray-200 dark:bg-gray-700"}`}>
                      <div
                        className={isTop3 ? "bg-gradient-to-r from-meritz-gold to-primary h-1 rounded-full" : "bg-primary h-1 rounded-full"}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-right mt-0.5 text-gray-400 whitespace-nowrap">
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
                  MY MERITZ PRIZE
                </h2>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setPrizeMonthDropdownOpen((v) => !v)}
                    className="inline-flex items-center gap-1 text-sm font-medium text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600 rounded-md bg-surface-light dark:bg-surface-dark px-3 py-1.5 whitespace-nowrap hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    {selectedViewMonth}월
                    <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0 fill-current text-gray-500" aria-hidden><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg>
                  </button>
                  {prizeMonthDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setPrizeMonthDropdownOpen(false)} aria-hidden />
                      <div className="absolute top-full right-0 mt-1 z-50 min-w-[4rem] py-1 rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-surface-dark shadow-lg">
                        {([1, 2] as const).map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => {
                              setSelectedViewMonth(m);
                              setPrizeMonthDropdownOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 text-sm font-medium transition-colors ${
                              selectedViewMonth === m
                                ? "text-primary bg-primary/10 dark:bg-primary/20"
                                : "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                            }`}
                          >
                            {m}월
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
              <div className={`grid grid-cols-1 gap-4 md:gap-5 mb-6 ${selectedViewMonth === 1 ? "md:grid-cols-4" : "md:grid-cols-3"}`}>
                {/* 1줄: 1주차, 2주차, (3주차 1월만), 월간 */}
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

                {/* 2줄: 2배 메리츠클럽, 메리츠클럽+ */}
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
                      <div className="bg-meritz-gold h-1.5 rounded-full" style={{ width: `${Math.min(100, plusProgress)}%` }}></div>
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
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 md:gap-5 mb-6 lg:items-stretch">
              {/* 2026 MY HOT - 연도시상 (1~10월 합산), 실적 추이와 같은 라인/높이 */}
              <div className="rounded-xl shadow-lg border border-gray-700/50 overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 dark:from-black dark:via-gray-900 dark:to-black relative max-w-[320px] lg:max-w-none mx-auto lg:mx-0 lg:h-full flex flex-col">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-meritz-gold/10 via-transparent to-transparent pointer-events-none" />
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-12 -mt-12 pointer-events-none" />
                <div className="relative z-10 p-4 md:p-5 flex flex-col items-center flex-1">
                  <div className="w-full flex items-center gap-2 mb-2">
                    <svg viewBox="0 0 24 24" className="w-5 h-5 flex-shrink-0 text-meritz-gold fill-current" aria-hidden><path d="M17 11V3H7v8H3v12h8v-4h2v4h8V11h-4zM7 19H5v-2h2v2zm0-4H5v-2h2v2zm0-4H5V9h2v2zm4 4H9v-2h2v2zm0-4H9V9h2v2zm0-4H9V5h2v2zm4 8v-2h2v2h-2zm0-4V9h2v2h-2zm0-4V5h2v2h-2zm4 12v-2h2v2h-2zm0-4v-2h2v2h-2z"/></svg>
                    <h3 className="text-lg font-bold text-white tracking-tight">2026 MY HOT</h3>
                  </div>
                  <p className="text-[10px] text-gray-400 mb-3 w-full text-left lg:text-center">1월~{selectedViewMonth}월 누적 · 연도시상</p>
                  <div className="relative w-32 h-32 mb-3">
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
                          <span className="text-2xl font-black bg-gradient-to-r from-meritz-gold to-amber-200 bg-clip-text text-transparent">CHAMP</span>
                          <span className="text-xs text-gray-400 mt-0.5">합산 RANK 1위</span>
                        </>
                      ) : (
                        <>
                          <span className="text-3xl font-black text-white">
                            {myHotProgress}
                            <span className="text-lg font-normal text-gray-400">%</span>
                          </span>
                          <span className="text-xs text-gray-400 mt-0.5">{myHotLabel} 목표</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="w-full rounded-lg bg-gray-800/50 border border-gray-700/50 p-2 text-center">
                    <p className="text-[10px] text-gray-500 mb-0.5">현재 합산 실적</p>
                    <p className="text-base font-bold text-white">{Math.round(myHotSum / 10000).toLocaleString()}만원</p>
                    {!myHotIsChamp && myHotRank > 0 && (
                      <p className="text-[10px] text-gray-400 mt-0.5">합산 순위 {myHotRank}위</p>
                    )}
                  </div>
                  <p className="mt-2 w-full text-center text-[10px] text-gray-400 whitespace-nowrap">
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
              <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-4 md:p-6 lg:h-full flex flex-col min-h-0">
                <div className="flex justify-between items-center mb-4 shrink-0">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center">
                      <svg viewBox="0 0 24 24" className="w-5 h-5 flex-shrink-0 text-meritz-gray fill-current mr-2" aria-hidden><path d="M3.5 18.49l6-6.01 4 4L22 6.92l-1.41-1.41-7.09 7.07-4-4L2 16.99z"/></svg>
                      최근 7개월 실적 추이
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">1월·2월 클릭 시 시상 현황 전환</p>
                  </div>
                </div>
                <div className="flex-1 min-h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={performanceData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} />
                      <YAxis
                        yAxisId="left"
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(val) => `${Math.round(val / 10000)}만`}
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(val) => `${Math.round(val / 10000)}만`}
                      />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            const value = payload.find((p) => p.dataKey === "value")?.value as number | undefined;
                            const prize = payload.find((p) => p.dataKey === "prize")?.value as number | undefined;
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
                            if (value != null && monthKey && globalRanks[monthKey]) {
                              const rankIndex = globalRanks[monthKey].indexOf(value);
                              if (rankIndex !== -1) {
                                rank = (rankIndex + 1).toString();
                              }
                            }
                            return (
                              <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded shadow-md">
                                {value != null && (
                                  <p className="text-sm font-bold text-primary mb-1">
                                    실적 {Math.round(value / 10000).toLocaleString()}만원
                                  </p>
                                )}
                                {prize != null && prize > 0 && (
                                  <p className="text-sm font-bold text-amber-600 dark:text-amber-400 mb-1">
                                    시상금 {Math.round(prize / 10000).toLocaleString()}만원
                                  </p>
                                )}
                                {value != null && (
                                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                                    RANK : {rank}위
                                  </p>
                                )}
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar yAxisId="right" dataKey="prize" fill="#D4A574" radius={[4, 4, 0, 0]} />
                      <Line
                        yAxisId="left"
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
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
            </div>

            {/* 고정 하단 바: 면책문구(왼쪽) + 업데이트 날짜(오른쪽). 모바일에서만 2줄·작은 폰트 */}
            <div className="fixed bottom-0 left-0 right-0 z-50 flex flex-col gap-0.5 md:flex-row md:items-center md:justify-between px-3 py-2 md:px-4 md:py-2.5 bg-white/95 dark:bg-gray-900/95 border-t border-gray-200 dark:border-gray-700 text-[10px] md:text-xs text-gray-500 dark:text-gray-400 backdrop-blur-sm">
              <span className="text-left md:max-w-[60%]">*상기 시상내용은 예상값이며, 참고용으로만 활용하시기 바랍니다.</span>
              {updateDate && (
                <span className="text-right shrink-0 md:ml-4">업데이트 날짜 : {updateDate.slice(0, 2)}.{updateDate.slice(2, 4)}</span>
              )}
            </div>
          </main>
        </>
      )}
    </>
  );
}
