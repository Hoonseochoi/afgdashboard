"use client";

import React, { useState, useEffect, useRef, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import februaryClosedData from "@/data/february_closed.json";
import type { PartnerPrizeData } from "@/lib/supabase-server";
import { MarchCards } from "./MarchCards";
import { NonPartnerCards } from "./NonPartnerCards";
import LoadingLines from "./LoadingLines";

const januaryClosed = januaryClosedData as Record<
  string,
  {
    code: string;
    performance: Record<string, number>;
    weekly: { week1: number; week2: number; week3?: number };
  }
>;
const februaryClosed = februaryClosedData as Record<
  string,
  {
    code: string;
    performance: Record<string, number>;
    weekly: { week1: number; week2: number; week3: number; week4: number };
  }
>;
const RANK_EXCLUDE_CODE = "712345678"; // 테스트용 노연지 계정 — 랭킹·실적 순위에서 제외

const PARTNER_TIERS = [100000, 200000, 300000, 500000]; // 10만, 20만, 30만, 50만 (시상 구간)

function PartnerPrizeCard({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 bg-white/5 dark:bg-gray-800/50">
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{title}</p>
      <p className="text-base font-bold text-primary">{Math.round(value / 10000).toLocaleString()}만원</p>
    </div>
  );
}

type PartnerCardVariant = "green" | "sky" | "purple" | "yellow";

function PartnerPrizeCardFull({
  index,
  title,
  badges,
  subtext,
  showTierButtons,
  tierPerf,
  tierPerfB,
  expectedPrize,
  variant,
  emphasizePrize,
  prizeBadge,
  isMCPlus,
  mcPlusCurrent,
  mcPlusTarget,
  mcPlusProgress,
}: {
  index: number;
  title: string;
  /** 타이틀 오른쪽 라인 배지: [익월], [13회차], [#%], [최대#%] 등 */
  badges?: string[];
  /** 타이틀 아래 해당 기간 달성 실적 서브텍스트 */
  subtext?: string;
  showTierButtons: boolean;
  tierPerf: number;
  tierPerfB?: number;
  expectedPrize: number;
  variant: PartnerCardVariant;
  /** 1번 시상 등 시상금 강조(큰 글자) */
  emphasizePrize?: boolean;
  /** 시상금 라인 오른쪽 배지 (예: 3월 8일까지 10만 달성시 완성) */
  prizeBadge?: string;
  isMCPlus?: boolean;
  mcPlusCurrent?: number;
  mcPlusTarget?: number;
  mcPlusProgress?: number;
}) {
  const variantBg = {
    green:
      "bg-gradient-to-br from-emerald-50 to-emerald-100/80 dark:from-emerald-950/40 dark:to-emerald-900/30 border border-emerald-200/80 dark:border-emerald-700/60 shadow-lg shadow-emerald-200/20 dark:shadow-emerald-900/20",
    sky:
      "bg-gradient-to-br from-sky-50 to-sky-100/80 dark:from-sky-950/40 dark:to-sky-900/30 border border-sky-200/80 dark:border-sky-700/60 shadow-lg shadow-sky-200/20 dark:shadow-sky-900/20",
    purple:
      "bg-gradient-to-br from-violet-50 to-violet-100/80 dark:from-violet-950/40 dark:to-violet-900/30 border border-violet-200/80 dark:border-violet-700/60 shadow-lg shadow-violet-200/20 dark:shadow-violet-900/20",
    yellow:
      "bg-gradient-to-br from-amber-50 to-amber-100/80 dark:from-amber-950/40 dark:to-amber-900/30 border border-amber-200/80 dark:border-amber-700/60 shadow-lg shadow-amber-200/20 dark:shadow-amber-900/20",
  };
  const variantAccent = {
    green: "bg-emerald-500 dark:bg-emerald-500 text-white shadow-sm",
    sky: "bg-sky-500 dark:bg-sky-500 text-white shadow-sm",
    purple: "bg-violet-500 dark:bg-violet-500 text-white shadow-sm",
    yellow: "bg-amber-500 dark:bg-amber-500 text-white shadow-sm",
  };
  const badgeStyle = {
    green: "bg-emerald-100 dark:bg-emerald-800/50 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 shadow-sm",
    sky: "bg-sky-100 dark:bg-sky-800/50 text-sky-800 dark:text-sky-200 border border-sky-300 dark:border-sky-700 shadow-sm",
    purple: "bg-violet-100 dark:bg-violet-800/50 text-violet-800 dark:text-violet-200 border border-violet-300 dark:border-violet-700 shadow-sm",
    yellow: "bg-amber-100 dark:bg-amber-800/50 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700 shadow-sm",
  };
  const achieved = showTierButtons
    ? PARTNER_TIERS.filter((t) => (tierPerfB != null ? tierPerf >= t && tierPerfB >= t : tierPerf >= t))
    : [];
  const tierAreaHeight = "min-h-[52px] flex items-center";

  return (
    <div
      className={`relative rounded-2xl border p-5 flex flex-col overflow-hidden transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5 ${variantBg[variant]}`}
    >
      {/* 상단 입체감 하이라이트 */}
      <div
        className={`absolute top-0 left-0 right-0 h-px opacity-60 ${
          variant === "green"
            ? "bg-gradient-to-r from-transparent via-emerald-300 to-transparent dark:via-emerald-600"
            : variant === "sky"
              ? "bg-gradient-to-r from-transparent via-sky-300 to-transparent dark:via-sky-600"
              : variant === "purple"
                ? "bg-gradient-to-r from-transparent via-violet-300 to-transparent dark:via-violet-600"
                : "bg-gradient-to-r from-transparent via-amber-300 to-transparent dark:via-amber-600"
            }`}
        />
      {/* 배지: 카드 최상단 한 줄 고정(11번 등 긴 타이틀 잘림 방지), 모든 카드 동일 세로 위치 */}
      <div className="flex flex-wrap gap-1 justify-end min-h-[22px] mb-1">
        {badges?.map((b) => (
          <span key={b} className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold border ${badgeStyle[variant]}`}>
            {b}
          </span>
        ))}
      </div>
      <div className="flex items-center gap-2.5 relative min-w-0">
        <span
          className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold ${variantAccent[variant]}`}
        >
          {index}
        </span>
        <p className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white tracking-tight break-words min-w-0">
          {title}
        </p>
      </div>
      {subtext && (
        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1.5 mb-2 pl-9 relative">{subtext}</p>
      )}
      {/* 시상 구간 게이지바 영역 — 높이 통일로 카드 정렬 */}
      <div className={tierAreaHeight}>
        {showTierButtons && (
          <div className="grid grid-cols-4 gap-1.5 w-full">
            {PARTNER_TIERS.map((t) => {
              const isAchieved = achieved.includes(t);
              return (
                <span
                  key={t}
                  className={`flex items-center justify-center py-2 rounded-lg text-xs font-semibold transition-all ${
                    isAchieved
                      ? "bg-primary text-white dark:bg-primary dark:text-gray-900 shadow-md"
                      : "bg-white/60 dark:bg-gray-700/60 text-gray-500 dark:text-gray-400 border border-gray-200/80 dark:border-gray-600"
                  }`}
                >
                  {t / 10000}만
                </span>
              );
            })}
          </div>
        )}
        {isMCPlus && mcPlusTarget != null && (
          <div className="w-full">
            <div className="h-2.5 bg-white/60 dark:bg-gray-700 rounded-full overflow-hidden border border-gray-200/80 dark:border-gray-600">
              <div
                className="h-full bg-primary dark:bg-meritz-gold rounded-full transition-all shadow-sm"
                style={{ width: `${Math.min(100, mcPlusProgress ?? 0)}%` }}
              />
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1.5">
              {Math.round((mcPlusCurrent ?? 0) / 10000)}만 / 목표 {Math.round((mcPlusTarget ?? 0) / 10000)}만
            </p>
          </div>
        )}
      </div>
      <div className="mt-auto pt-3 flex items-center justify-between gap-2 flex-wrap border-t border-gray-200/60 dark:border-gray-600/50">
        <p className={`font-bold text-primary ${emphasizePrize ? "text-xl sm:text-2xl" : "text-base"} drop-shadow-sm`}>
          {Math.round(expectedPrize / 10000).toLocaleString()}만원
        </p>
        {prizeBadge && (
          <span className={`inline-flex items-center px-2 py-1 rounded-md text-[10px] font-semibold whitespace-nowrap ${badgeStyle[variant]}`}>
            {prizeBadge}
          </span>
        )}
      </div>
    </div>
  );
}

function Dashboard() {
  const [agents, setAgents] = useState<any[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [globalRanks, setGlobalRanks] = useState<Record<string, number[]>>({});
  const [updateDate, setUpdateDate] = useState<string>("");
  const [selectedViewMonth, setSelectedViewMonth] = useState<1 | 2 | 3>(3); // 1월 | 2월 | 3월 (디폴트 3월)
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
  const [showPrizeGuide, setShowPrizeGuide] = useState(false);
  const exportAreaRef = useRef<HTMLDivElement>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showInstallHint, setShowInstallHint] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showPWAInstallPrompt, setShowPWAInstallPrompt] = useState(false);
  const deferredPromptRef = useRef<{ prompt: () => void; userChoice: Promise<{ outcome: string }> } | null>(null);

  const router = useRouter();
  const searchParams = useSearchParams();
  const isCaptureMode = searchParams.get("capture") === "1";

  // App 처음 열릴 때 백엔드 Appwrite 연결 확인 (브라우저 SDK 직접 호출 시 404 등 오류 방지)
  useEffect(() => {
    fetch("/api/appwrite-health")
      .then((res) => res.json())
      .then((data) => {
        if (data.ok) console.log("[Appwrite] 연결 OK");
      })
      .catch(() => {});
  }, []);

  // PWA: standalone 모드 여부 감지
  useEffect(() => {
    if (typeof window === "undefined") return;

    const updateStandalone = () => {
      const isStandaloneDisplayMode = window.matchMedia?.("(display-mode: standalone)")?.matches;
      const isIOSStandalone = (window.navigator as any).standalone === true;
      setIsStandalone(!!(isStandaloneDisplayMode || isIOSStandalone));
    };

    updateStandalone();

    const mql = window.matchMedia?.("(display-mode: standalone)");
    mql?.addEventListener?.("change", updateStandalone);

    return () => {
      mql?.removeEventListener?.("change", updateStandalone);
    };
  }, []);

  // 모바일 여부 (스마트폰에서만 앱 설치 버튼 노출용)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const check = () => setIsMobile(window.matchMedia?.("(max-width: 768px)")?.matches ?? false);
    check();
    const mq = window.matchMedia?.("(max-width: 768px)");
    mq?.addEventListener?.("change", check);
    return () => mq?.removeEventListener?.("change", check);
  }, []);

  // PWA: beforeinstallprompt → 우리 버튼 클릭 시 크롬 "홈 화면에 추가" 띄우기
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      deferredPromptRef.current = e as unknown as { prompt: () => void; userChoice: Promise<{ outcome: string }> };
      setShowPWAInstallPrompt(true);
    };
    const onInstalled = () => {
      deferredPromptRef.current = null;
      setShowPWAInstallPrompt(false);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const handlePWAInstallClick = async () => {
    const ev = deferredPromptRef.current;
    if (ev) {
      ev.prompt();
      const { outcome } = await ev.userChoice;
      if (outcome === "accepted") setShowPWAInstallPrompt(false);
      deferredPromptRef.current = null;
    } else {
      setShowInstallHint((v) => !v);
    }
  };

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
      const pad = 4; // PNG 내보낼 때 네 방향 여백(px)
      const origStyle = { width: el.style.width, minWidth: el.style.minWidth, maxWidth: el.style.maxWidth, boxSizing: el.style.boxSizing, padding: el.style.padding };
      try {
        el.style.boxSizing = "border-box";
        el.style.padding = `${pad}px`;
        el.style.width = `${w + pad * 2}px`;
        el.style.minWidth = `${w + pad * 2}px`;
        el.style.maxWidth = `${w + pad * 2}px`;
        const dataUrl = await toPng(el, {
          width: w + pad * 2,
          height: h + pad * 2,
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
    const fetchData = async () => {
      try {
        setAgentsError(null);
        if (isCaptureMode) {
          // 캡처 모드: 로그인 없이 로컬 JSON만 사용
          const res = await fetch("/api/capture-data");
          const data = await res.json();
          if (!res.ok) {
            setAgentsError(data.error || "캡처 데이터를 불러올 수 없습니다.");
            setLoading(false);
            return;
          }
          setAgents(data.agents || []);
          setUpdateDate(data.updateDate || "");
          const excludeTest = (data.agents || []).filter((a: any) => a.code !== RANK_EXCLUDE_CODE);
          if (excludeTest.length > 0) {
            const rankKey = new Date().getMonth() + 1 >= 3 ? "2026-03" : "2026-02";
            const sorted = [...excludeTest].sort((a, b) => (b.performance?.[rankKey] || 0) - (a.performance?.[rankKey] || 0));
            setSelectedAgent(sorted[0]);
          }
          if (data.ranks) setGlobalRanks(data.ranks);
        } else {
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
            const rankKey = new Date().getMonth() + 1 >= 3 ? "2026-03" : "2026-02";
            const sorted = [...excludeTest].sort((a, b) => (b.performance?.[rankKey] || 0) - (a.performance?.[rankKey] || 0));
            setSelectedAgent(sorted[0]);
          }
          if (data.ranks) setGlobalRanks(data.ranks);
        }
      } catch (err) {
        console.error("데이터 로드 실패", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router, retryKey, isCaptureMode]);

  // 캡처 모드: Puppeteer에서 호출할 전역 함수 노출
  useEffect(() => {
    if (!isCaptureMode || !agents.length || !exportAreaRef.current) return;
    const el = exportAreaRef.current;
    (window as any).__CAPTURE_SELECT = (index: number) => {
      const list = agents.filter((a: any) => a.code !== RANK_EXCLUDE_CODE);
      const i = Math.max(0, Math.min(index, list.length - 1));
      setSelectedAgent(list[i]);
    };
    (window as any).__CAPTURE_GET_PNG = async (): Promise<string> => {
      const target = exportAreaRef.current;
      if (!target) return "";
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const removed: { link: HTMLLinkElement; parent: Node; next: Node | null }[] = [];
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
      const w = target.offsetWidth;
      const h = target.offsetHeight;
      const pad = 4;
      const origStyle = {
        width: target.style.width,
        minWidth: target.style.minWidth,
        maxWidth: target.style.maxWidth,
        boxSizing: target.style.boxSizing,
        padding: target.style.padding,
      };
      try {
        target.style.boxSizing = "border-box";
        target.style.padding = `${pad}px`;
        target.style.width = `${w + pad * 2}px`;
        target.style.minWidth = `${w + pad * 2}px`;
        target.style.maxWidth = `${w + pad * 2}px`;
        const dataUrl = await toPng(target, {
          width: w + pad * 2,
          height: h + pad * 2,
          pixelRatio: 3,
          backgroundColor: document.documentElement.classList.contains("dark") ? "#111827" : "#f3f4f6",
          cacheBust: true,
          skipFonts: false,
        });
        return dataUrl;
      } finally {
        target.style.width = origStyle.width;
        target.style.minWidth = origStyle.minWidth;
        target.style.maxWidth = origStyle.maxWidth;
        target.style.boxSizing = origStyle.boxSizing;
        target.style.padding = origStyle.padding;
        removed.forEach(({ link, parent, next }) => parent.insertBefore(link, next));
      }
    };
    return () => {
      delete (window as any).__CAPTURE_SELECT;
      delete (window as any).__CAPTURE_GET_PNG;
    };
  }, [isCaptureMode, agents]);

  const rankKeyMonth = selectedViewMonth === 1 ? "2026-01" : selectedViewMonth === 2 ? "2026-02" : "2026-03";
  const dailyDiffKey = `${rankKeyMonth}-diff`;
  const dailyDiff = (selectedAgent?.performance?.[dailyDiffKey] ?? 0) as number;
  const isPartnerBranch = (selectedAgent?.branch || "").includes("파트너");
  const sortedByMonth = useMemo(
    () => {
      const list = [...(agents || [])].filter((a: any) => a.code !== RANK_EXCLUDE_CODE);
      const partnerOnly = isPartnerBranch ? list.filter((a: any) => (a.branch || "").includes("파트너")) : list;
      return partnerOnly.sort((a: any, b: any) => (b.performance?.[rankKeyMonth] ?? 0) - (a.performance?.[rankKeyMonth] ?? 0));
    },
    [agents, rankKeyMonth, isPartnerBranch]
  );
  // 파트너일 때 월별 파트너 내 순위 (실적 추이 툴팁 RANK용)
  const partnerRanksByMonth = useMemo(() => {
    const o: Record<string, number> = {};
    if (!selectedAgent || !(selectedAgent.branch || "").includes("파트너")) return o;
    const list = (agents || []).filter((a: any) => a.code !== RANK_EXCLUDE_CODE && (a.branch || "").includes("파트너"));
    for (const monthKey of ["2026-01", "2026-02", "2026-03"]) {
      const sorted = [...list].sort((a: any, b: any) => (b.performance?.[monthKey] ?? 0) - (a.performance?.[monthKey] ?? 0));
      const idx = sorted.findIndex((a: any) => a.code === selectedAgent.code);
      if (idx !== -1) o[monthKey] = idx + 1;
    }
    return o;
  }, [agents, selectedAgent]);

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

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-surface-light dark:bg-surface-dark">
        <LoadingLines />
      </div>
    );
  }

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

  if (!selectedAgent && !loading && (isCaptureMode ? true : !user?.isFirstLogin)) {
    return (
      <div className="flex flex-col h-screen items-center justify-center">
        <p>{isCaptureMode ? "캡처 데이터가 없습니다. data/capture/dashboard.json을 준비하세요." : "조회 가능한 데이터가 없습니다."}</p>
        {!isCaptureMode && <button onClick={handleLogout} className="mt-4 text-primary underline">로그아웃</button>}
      </div>
    );
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
  let nonPartnerCardsEl: React.ReactNode = null;

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
  let plusTargetMinPerf = 0; // 3월 메리츠클럽+ 달성목표 표기용 min(1월,2월) 실적
  let plusNext = "";
  let plusProgress = 0;
  let currentMonthNum = new Date().getMonth() + 1;
  let febPerf = 0;
  let marchPerf = 0;
  let viewW1 = 0;
  let viewW2 = 0;
  let viewW3 = 0;
  let viewW3Feb = 0; // 2월 3주차 실적 (3주차 인보험용)
  let week1Past = false;
  let week2Past = false;
  let week1SpecialPrizeMarch = 0;
  let week1PatayaPrizeMarch = 0;
  // 주차 종료 여부는 '지금 시점'(오늘 날짜) 기준. 진행중/달성 실패 배지가 실제와 맞도록
  const todayDay = new Date().getDate();
  const currentWeekNum = Math.min(4, Math.max(1, Math.ceil((todayDay || 1) / 7)));
  const dayFromUpdate = (updateDate && updateDate.length >= 4) ? parseInt(updateDate.slice(2, 4), 10) : todayDay;

  const p = selectedAgent?.partner as PartnerPrizeData | undefined;
  const getPartnerTierPrize = (perf: number) => { if (perf >= 500000) return 500000; if (perf >= 300000) return 300000; if (perf >= 200000) return 200000; if (perf >= 100000) return 100000; return 0; };
  /** 연속가동 시상금: 선행 구간 10→20만, 20→60만, 30→80만, 50→180만 (3월 10만 달성 시) */
  const getPartnerContinuousPrize = (perf: number) => { if (perf >= 500000) return 1800000; if (perf >= 300000) return 800000; if (perf >= 200000) return 600000; if (perf >= 100000) return 200000; return 0; };

  if (selectedAgent && selectedAgent.performance) {
    performanceData = [
      { name: "8월", value: selectedAgent.performance["2025-08"] || 0, prize: 0 },
      { name: "9월", value: selectedAgent.performance["2025-09"] || 0, prize: 0 },
      { name: "10월", value: selectedAgent.performance["2025-10"] || 0, prize: 0 },
      { name: "11월", value: selectedAgent.performance["2025-11"] || 0, prize: 0 },
      { name: "12월", value: selectedAgent.performance["2025-12"] || 0, prize: 0 },
      { name: "1월", value: selectedAgent.performance["2026-01"] || 0, prize: 0 },
      { name: "2월", value: selectedAgent.performance["2026-02"] || 0, prize: 0 },
      { name: "3월", value: selectedAgent.performance["2026-03"] || 0, prize: 0 },
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
    const marW1 = selectedAgent.weekly?.week1 || 0;
    const marCur = selectedAgent.performance["2026-03"] ?? 0;
    const marPrev = selectedAgent.performance["2026-02"] ?? 0;
    const MAR_W1_SPECIAL: [number, number][] = [[1200000, 6000000], [1000000, 4000000], [800000, 2400000], [500000, 1000000], [300000, 300000], [200000, 200000]];
    const MAR_W1_PATAYA: [number, number][] = [[1000000, 5000000], [700000, 2100000], [500000, 1000000], [300000, 300000], [200000, 200000]];
    const getWP = (p: number, tiers: [number, number][]) => { for (const [t, prize] of tiers) { if (p >= t) return prize; } return 0; };
    let prizeMar = getWP(marW1, MAR_W1_SPECIAL) + getWP(marW1, MAR_W1_PATAYA);
    let marMonthly = 0;
    if (marCur >= 2500000) marMonthly = 5000000; else if (marCur >= 2000000) marMonthly = 4000000; else if (marCur >= 1800000) marMonthly = 3600000; else if (marCur >= 1500000) marMonthly = 3000000; else if (marCur >= 1200000) marMonthly = 2000000; else if (marCur >= 1000000) marMonthly = 1500000;
    let marDouble = 0;
    if (marPrev >= 200000 && marCur >= 200000) { let bt = Math.floor(marCur / 100000) * 100000; if (bt > 1000000) bt = 1000000; marDouble = bt * 2; }
    const marMin = Math.min(marPrev, marCur);
    let marPlus = 0;
    if (marMin >= 1000000) marPlus = 3000000; else if (marMin >= 800000) marPlus = 2400000; else if (marMin >= 600000) marPlus = 1800000; else if (marMin >= 400000) marPlus = 1200000; else if (marMin >= 200000) marPlus = 600000;
    prizeMar += marMonthly + marDouble + marPlus + marCur;
    const nameToPrize: Record<string, number> = { "1월": prizeJan, "2월": prizeFeb, "3월": prizeMar };
    performanceData = performanceData.map((d) => ({ ...d, prize: nameToPrize[d.name] ?? 0 }));

    // 선택 월에 따른 데이터 소스 (1월=마감데이터, 2월/3월=현재)
    const isJanuaryView = selectedViewMonth === 1;
    const isMarchView = selectedViewMonth === 3;

    currentMonthPerf = isJanuaryView
      ? (janData?.performance["2026-01"] ?? selectedAgent.performance["2026-01"] ?? 0)
      : isMarchView
        ? (selectedAgent.performance["2026-03"] ?? 0)
        : (selectedAgent.performance["2026-02"] ?? 0);
    prevMonthPerf = isJanuaryView
      ? (janData?.performance["2025-12"] ?? selectedAgent.performance["2025-12"] ?? 0)
      : isMarchView
        ? (selectedAgent.performance["2026-02"] ?? 0)
        : (janData?.performance["2026-01"] ?? selectedAgent.performance["2026-01"] ?? 0);
    diff = currentMonthPerf - prevMonthPerf;

    // 누적실적 목표 계산: 기본 40만, 40만 초과 시 다음구간, 전구간 초과 시 RANK-1 실적. 파트너는 파트너 내 RANK만 사용
    const rankKey = isJanuaryView ? "2026-01" : isMarchView ? "2026-03" : "2026-02";
    const monthRanks = isPartnerBranch
      ? sortedByMonth.map((a: any) => a.performance?.[rankKey] ?? 0)
      : (globalRanks[rankKey] || []);
    const rankIndex = isPartnerBranch
      ? sortedByMonth.findIndex((a: any) => a.code === selectedAgent?.code)
      : monthRanks.indexOf(currentMonthPerf); // -1이면 순위 미확인

    if (rankIndex === 0) {
      isRank1 = true;
      goalLabel = isPartnerBranch ? "파트너 TOP" : "전국TOP";
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
    const febData = februaryClosed[code];
    viewW1 = isJanuaryView ? (janData?.weekly?.week1 ?? 0) : isMarchView ? (selectedAgent.weekly?.week1 || 0) : (febData?.weekly?.week1 ?? selectedAgent.weekly?.week1 ?? 0);
    viewW2 = isJanuaryView ? (janData?.weekly?.week2 ?? 0) : isMarchView ? (selectedAgent.weekly?.week2 || 0) : (febData?.weekly?.week2 ?? selectedAgent.weekly?.week2 ?? 0);
    viewW3 = isJanuaryView ? (janData?.weekly?.week3 ?? 0) : 0;
    viewW3Feb = isJanuaryView ? 0 : isMarchView ? (selectedAgent.weekly?.week3 ?? 0) : (febData?.weekly?.week3 ?? selectedAgent.weekly?.week3 ?? 0);
    const w1 = viewW1;
    const w2 = viewW2;
    const w3 = viewW3;
    
    const getWeekPrize = (perf: number, tiers: [number, number][]) => {
      for (const [thresh, prize] of tiers) {
        if (perf >= thresh) return prize;
      }
      return 0;
    };
    
    const MAR_W1_SPECIAL_PRIZES: [number, number][] = [[1200000, 6000000], [1000000, 4000000], [800000, 2400000], [500000, 1000000], [300000, 300000], [200000, 200000]];
    const MAR_W1_PATAYA_PRIZES: [number, number][] = [[1000000, 5000000], [700000, 2100000], [500000, 1000000], [300000, 300000], [200000, 200000]];
    
    // 1주차 시상 (1월/2월/3월 티어 다름)
    if (isMarchView) {
      week1SpecialPrizeMarch = getWeekPrize(w1, MAR_W1_SPECIAL_PRIZES);
      week1PatayaPrizeMarch = getWeekPrize(w1, MAR_W1_PATAYA_PRIZES);
      week1Prize = week1SpecialPrizeMarch + week1PatayaPrizeMarch;
    } else {
      week1Prize = isJanuaryView ? getWeekPrize(w1, JAN_W1_PRIZES) : getWeekPrize(w1, FEB_W1_PRIZES);
    }
    
    // 2주차 시상 (3월 탭에서는 1주차만 시상 카드 사용)
    week2Prize = isJanuaryView ? getWeekPrize(w2, JAN_W2_PRIZES) : isMarchView ? 0 : getWeekPrize(w2, FEB_W2_PRIZES);
    
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
    
    // 정규시상: 비파트너 = 실적 100%, 파트너 지사 = 실적 정률 450%
    regularPrize = isPartnerBranch ? Math.round(currentMonthPerf * 4.5) : currentMonthPerf;
    
    // 총 예상 시상금 (MY MERITZ PRIZE 카드에 보이는 예상시상금들의 합)
    if (isMarchView && !isPartnerBranch) {
      // 3월 탭: 1주차 특별 + 1주차 파타야 + 2배 메리츠클럽 + 메리츠클럽+ + 3월 정규시상
      totalEstimatedPrize = week1Prize + doubleMeritzPrize + meritzClubPlusPrize + regularPrize;
    } else {
      totalEstimatedPrize = week1Prize + week2Prize + week3Prize + monthlyPrize + doubleMeritzPrize + meritzClubPlusPrize + regularPrize;
    }
    if (isPartnerBranch && p) {
      if (isJanuaryView) {
        totalEstimatedPrize = (p.productWeek1PrizeJan ?? 0) + (p.productWeek2PrizeJan ?? 0) + (p.continuous121Prize ?? 0) + (p.week3PrizeJan ?? 0) + (p.week4PrizeJan ?? 0) + (p.continuous12Prize ?? 0) + (p.continuous12ExtraPrize ?? 0) + meritzClubPlusPrize + regularPrize;
      } else {
        const pw1 = p.productWeek1Prize ?? 0;
        const pw2 = getPartnerTierPrize(viewW2);
        const w3 = p?.week3Prize ?? getPartnerTierPrize(viewW3Feb);
        const w34 = p?.week34Prize ?? getPartnerTierPrize(p?.week34Sum ?? 0);
        const c23Feb = p?.continuous23Feb ?? 0;
        const c23ExtraFeb = p?.continuous23ExtraFeb ?? c23Feb;
        const w23 = p?.continuous23Prize ?? getPartnerContinuousPrize(c23Feb);
        const w23Extra = p?.continuous23ExtraPrize ?? getPartnerContinuousPrize(c23ExtraFeb);
        totalEstimatedPrize = pw1 + pw2 + (p.continuous12Prize ?? 0) + (p.continuous12ExtraPrize ?? 0) + w3 + w34 + w23 + w23Extra + meritzClubPlusPrize + regularPrize;
      }
    }

    // 2월/3월 시: 전월 시상금 계산 → 시상금 차이 (전월 대비). 3월은 2월 대비
    if (!isJanuaryView) {
      const jData = janData ?? { performance: { "2026-01": selectedAgent.performance["2026-01"] ?? 0, "2025-12": selectedAgent.performance["2025-12"] ?? 0 }, weekly: { week1: 0, week2: 0, week3: 0 } };
      const jW1 = jData.weekly?.week1 ?? 0;
      const jW2 = jData.weekly?.week2 ?? 0;
      const jW3 = jData.weekly?.week3 ?? 0;
      const jCur = jData.performance["2026-01"] ?? 0;
      const jPrev = jData.performance["2025-12"] ?? 0;
      let prevMonthTotalPrize: number;
      if (isMarchView) {
        const febCur = selectedAgent.performance["2026-02"] ?? 0;
        let jMonthly = 0;
        if (febCur >= 2500000) jMonthly = 5000000;
        else if (febCur >= 2000000) jMonthly = 4000000;
        else if (febCur >= 1800000) jMonthly = 3600000;
        else if (febCur >= 1500000) jMonthly = 3000000;
        else if (febCur >= 1200000) jMonthly = 2000000;
        else if (febCur >= 1000000) jMonthly = 1500000;
        let jDouble = 0;
        if (jCur >= 200000 && febCur >= 200000) {
          let bt = Math.floor(febCur / 100000) * 100000;
          if (bt > 1000000) bt = 1000000;
          jDouble = bt * 2;
        }
        const jMin = Math.min(jCur, febCur);
        let jPlus = 0;
        if (jMin >= 1000000) jPlus = 3000000;
        else if (jMin >= 800000) jPlus = 2400000;
        else if (jMin >= 600000) jPlus = 1800000;
        else if (jMin >= 400000) jPlus = 1200000;
        else if (jMin >= 200000) jPlus = 600000;
        prevMonthTotalPrize = jMonthly + jDouble + jPlus + febCur;
      } else {
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
      prevMonthTotalPrize = jWeek1 + jWeek2 + jWeek3 + jMonthly + jDouble + jPlus + jCur;
      }
      prizeDiff = totalEstimatedPrize - prevMonthTotalPrize;
    }
    
    // 1주차: 지난 주차면 "다음 구간" 대신 "달성 실패" 또는 "달성 OO만원" (1월 선택 시 모두 마감, 3월은 3월 1주차 기준)
    week1Past = isJanuaryView || (isMarchView ? currentMonthNum >= 3 && currentWeekNum >= 2 : currentWeekNum >= 2);
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
      plusTargetMinPerf = Math.min(janPerf, febPerf);
      plusTarget = getAchievedTier(plusTargetMinPerf);
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
    const curM = (selectedAgent.performance[rankKeyMonth] ?? 0) || 0;
    const nextM = MONTHLY_TIERS.find(t => t > curM);
    remainingMonthly = nextM ? Math.max(0, nextM - curM) : 0;
    const jan = selectedAgent.performance["2026-01"] ?? 0;
    const feb = selectedAgent.performance["2026-02"] ?? 0;
    const mar = selectedAgent.performance["2026-03"] ?? 0;
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
  if (selectedViewMonth === 2 || selectedViewMonth === 3) {
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
  // 비파트너 시상 카드: 1·2월 NonPartnerCards, 3월 MarchCards
  if (!isPartnerBranch) {
    if (selectedViewMonth === 3) {
      nonPartnerCardsEl = (
        <MarchCards
          viewW1={viewW1}
          week1SpecialPrize={week1SpecialPrizeMarch}
          week1PatayaPrize={week1PatayaPrizeMarch}
          currentMonthPerf={currentMonthPerf}
          prevMonthPerf={prevMonthPerf}
          doubleMeritzPrize={doubleMeritzPrize}
          meritzClubPlusPrize={meritzClubPlusPrize}
          plusTarget={plusTarget}
          plusTargetMinPerf={plusTargetMinPerf}
          plusNext={plusNext}
          plusProgress={plusProgress}
          janPerf={selectedAgent?.performance?.["2026-01"] ?? 0}
          febPerf={febPerf}
          marchPerf={marchPerf}
          currentMonthNum={currentMonthNum}
        />
      );
    } else {
    nonPartnerCardsEl = (
      <NonPartnerCards
        week1Prize={week1Prize}
        week1Next={week1Next}
        week1Past={week1Past}
        week1Progress={week1Progress}
        viewW1={viewW1}
        week2Prize={week2Prize}
        week2Next={week2Next}
        week2Past={week2Past}
        week2Progress={week2Progress}
        viewW2={viewW2}
        week3Prize={week3Prize}
        week3Next={week3Next}
        week3Progress={week3Progress}
        viewW3={viewW3}
        selectedViewMonth={selectedViewMonth}
        monthlyPrize={monthlyPrize}
        monthlyNext={monthlyNext}
        monthlyProgress={monthlyProgress}
        currentMonthPerf={currentMonthPerf}
        doubleMeritzPrize={doubleMeritzPrize}
        prevMonthPerf={prevMonthPerf}
        meritzClubPlusPrize={meritzClubPlusPrize}
        currentMonthNum={currentMonthNum}
        plusTarget={plusTarget}
        febPerf={febPerf}
        marchPerf={marchPerf}
        plusNext={plusNext}
        plusProgress={plusProgress}
        regularPrize={regularPrize}
        dailyDiff={dailyDiff}
      />
    );
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

      {/* 시상안 보기 모달 */}
      {showPrizeGuide && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="relative bg-white dark:bg-surface-dark rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-sm md:text-base font-semibold text-gray-900 dark:text-white">1주차 시상안 보기</h3>
              <button
                type="button"
                onClick={() => setShowPrizeGuide(false)}
                className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>
            <div className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900/60 flex items-center justify-center p-3 md:p-4">
              <img
                src="/26031w_prize.jpg"
                alt="1주차 시상안"
                className="max-h-[80vh] w-auto rounded-lg shadow-md"
              />
            </div>
          </div>
        </div>
      )}

      {selectedAgent && (
        <div>
          <header
            className={`bg-surface-light dark:bg-surface-dark border-b border-gray-200 dark:border-gray-700 sticky top-0 z-30 shadow-sm ${
              isCaptureMode ? "hidden" : ""
            }`}
          >
            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-3 md:py-0 md:h-16 flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-0">
              {/* 1줄(모바일) / 좌측(데스크톱): 로고 + 우측 유저/로그아웃 */}
              <div className="flex items-center justify-between w-full md:w-auto">
                <div className="flex items-center shrink-0">
                  <img src="/ci.png" alt="CI" className="h-[1.6rem] md:h-[1.8rem] object-contain" />
                </div>
                <div className="flex items-center gap-1.5 md:gap-4 md:pl-4 md:border-l border-gray-200 dark:border-gray-700">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-full bg-meritz-gold flex items-center justify-center text-white font-bold text-xs shadow-md">
                      {user?.name?.charAt(0) || "U"}
                    </div>
                    <div className="hidden lg:block text-sm text-right">
                      <p className="font-bold text-gray-800 dark:text-gray-100">
                        {user?.name}
                        {user?.role === "admin" ? " 관리자" : user?.role === "manager" ? " 매니저" : "님"}
                      </p>
                    </div>
                  </div>

                  <button onClick={handleLogout} className="text-xs text-gray-500 hover:text-primary underline">
                    로그아웃
                  </button>

                  {/* 웹(데스크톱): 내보내기만. 스마트폰: 앱 설치만(버튼 클릭 시 beforeinstallprompt 또는 안내) */}
                  {!isCaptureMode && !isStandalone && isMobile && (
                    <div className="flex items-center gap-1 relative">
                      <button
                        type="button"
                        onClick={handlePWAInstallClick}
                        className="flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-1.5 rounded-md text-[11px] sm:text-xs font-medium bg-white dark:bg-gray-800 text-primary border border-primary/60 dark:border-primary shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        title="앱 설치"
                      >
                        <span className="material-symbols-outlined text-sm sm:text-base">get_app</span>
                        앱 설치
                      </button>
                      {showInstallHint && (
                        <div className="absolute top-full right-0 mt-1 z-50 w-64 sm:w-72 p-2.5 rounded-lg bg-gray-900 text-white text-[11px] shadow-lg border border-gray-700">
                          <p className="font-medium mb-1">앱 설치 방법</p>
                          <p className="text-gray-300">
                            <strong>우측 상단 ⋮ 메뉴</strong> → <strong>홈 화면에 추가</strong> 또는 <strong>앱 설치</strong>를 눌러 홈 화면에 추가해 주세요.
                          </p>
                          <button
                            type="button"
                            onClick={() => setShowInstallHint(false)}
                            className="mt-2 text-primary text-right w-full"
                          >
                            닫기
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                  {!isCaptureMode && !isStandalone && !isMobile && (
                    <button
                      type="button"
                      onClick={handleExportPng}
                      disabled={exportLoading}
                      className="flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-1.5 rounded-md text-[11px] sm:text-xs font-medium bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <span className="material-symbols-outlined text-sm sm:text-base">download</span>
                      {exportLoading ? "내보내는 중..." : "내보내기"}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setShowPrizeGuide(true)}
                    className="inline-flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-1.5 rounded-md text-[11px] sm:text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm sm:text-base">visibility</span>
                    시상안보기
                  </button>
                </div>
              </div>

              {/* 2줄(모바일) / 우측(데스크톱): 검색+리스트 (admin/manager만) */}
              {(user?.role === "admin" || user?.role === "manager") && (
                <div className="relative w-full md:w-auto flex items-center gap-1">
                  <input
                    type="text"
                    placeholder="이름 또는 지사명 검색..."
                    value={
                      agentSearchOpen
                        ? agentSearchQuery
                        : selectedAgent
                        ? `${selectedAgent.name} (${selectedAgent.branch})`
                        : ""
                    }
                    onChange={(e) => {
                      setAgentSearchQuery(e.target.value);
                      setAgentSearchOpen(true);
                    }}
                    onFocus={() => setAgentSearchOpen(true)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const searchMonthKey = "2026-03";
                        const sorted = [...(agents || [])]
                          .filter((a: any) => a.code !== RANK_EXCLUDE_CODE)
                          .sort(
                            (a, b) =>
                              (b.performance?.[searchMonthKey] || 0) -
                              (a.performance?.[searchMonthKey] || 0),
                          );
                        const q = agentSearchQuery.trim().toLowerCase();
                        const filtered = q
                          ? sorted.filter(
                              (a) =>
                                a.name?.toLowerCase().includes(q) ||
                                (a.branch && String(a.branch).toLowerCase().includes(q)),
                            )
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
                    <span className="material-symbols-outlined text-lg text-gray-600 dark:text-gray-400">
                      format_list_bulleted
                    </span>
                  </button>
                  {agentSearchOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setAgentSearchOpen(false)} />
                      <div className="absolute top-full left-0 right-0 md:right-auto mt-1 w-full md:w-80 max-h-64 overflow-y-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg z-50">
                        {(() => {
                          const searchMonthKey = "2026-03";
                          const sorted = [...(agents || [])]
                            .filter((a: any) => a.code !== RANK_EXCLUDE_CODE)
                            .sort(
                              (a, b) =>
                                (b.performance?.[searchMonthKey] || 0) -
                                (a.performance?.[searchMonthKey] || 0),
                            );
                          const q = agentSearchQuery.trim().toLowerCase();
                          const filtered = q
                            ? sorted.filter(
                                (a) =>
                                  a.name?.toLowerCase().includes(q) ||
                                  (a.branch && String(a.branch).toLowerCase().includes(q)),
                              )
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
                                    selectedAgent?.code === agent.code
                                      ? "bg-primary/10 text-primary"
                                      : "text-gray-900 dark:text-white"
                                  }`}
                                >
                                  <span>
                                    {agent.name} ({agent.branch})
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    3월 {Math.round((agent.performance?.[searchMonthKey] || 0) / 10000)}만
                                  </span>
                                </button>
                              ))}
                              {filtered.length > 80 && (
                                <div className="px-3 py-2 text-xs text-gray-500 border-t border-gray-200 dark:border-gray-600">
                                  상위 80명만 표시. 이름 또는 지사명 검색으로 찾아주세요.
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="px-3 py-4 text-sm text-gray-500 text-center">
                              검색 결과 없음
                            </div>
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
            <div ref={exportAreaRef} className="space-y-0" data-capture-area>
            <div
              className={`rounded-2xl shadow-lg p-4 md:p-6 mb-6 md:mb-8 relative overflow-hidden ${
                selectedViewMonth === 3
                  ? isTop3
                    ? "bg-white dark:bg-gray-800 border border-gray-200 dark:border-meritz-gold/40 shadow-[0_4px_24px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.25)]"
                    : isTop30
                      ? "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 shadow-[0_4px_24px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.25)]"
                      : "bg-gradient-to-br from-white to-gray-50/60 dark:from-gray-800 dark:to-gray-800/90 border border-gray-200 dark:border-gray-600 shadow-[0_4px_24px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.2)]"
                  : isTop3
                    ? "bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 dark:from-black dark:via-gray-900 dark:to-black border-2 border-meritz-gold/50"
                    : isTop30
                      ? "bg-gradient-to-br from-gray-800/95 to-gray-900/95 dark:from-gray-900 dark:to-black border border-meritz-gold/30 bg-surface-light dark:bg-surface-dark"
                      : "bg-surface-light dark:bg-surface-dark border border-gray-100 dark:border-gray-700"
              }`}
            >
              {selectedViewMonth === 3 ? (
                isTop30 ? (
                  <>
                    <div className="absolute top-0 right-0 w-72 h-72 bg-gray-100/80 dark:bg-gray-700/30 rounded-full -mr-24 -mt-24 z-0" />
                    <div className="absolute bottom-0 left-0 w-56 h-56 bg-gray-100/60 dark:bg-gray-700/20 rounded-full -ml-20 -mb-20 z-0" />
                  </>
                ) : (
                  <>
                    <div className="absolute top-0 right-0 w-64 h-64 bg-gray-100/70 dark:bg-gray-700/25 rounded-full -mr-16 -mt-16 z-0" />
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-gray-100/50 dark:bg-gray-700/20 rounded-full -ml-12 -mb-12 z-0" />
                  </>
                )
              ) : isTop30 ? (
                <>
                  <div className="absolute top-0 right-0 w-72 h-72 bg-meritz-gold/10 rounded-full -mr-24 -mt-24 z-0" />
                  <div className="absolute bottom-0 left-0 w-56 h-56 bg-primary/10 rounded-full -ml-20 -mb-20 z-0" />
                </>
              ) : (
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
                          selectedViewMonth === 3 ? "text-gray-900 dark:text-white" : isTop3 || isTop30 ? "text-white" : "text-gray-900 dark:text-white"
                        }`}
                      >
                        {selectedAgent.name}{" "}
                        <span className={`text-base md:text-lg font-normal ${
                          selectedViewMonth === 3 ? "text-gray-500 dark:text-gray-400" : isTop3 ? "text-meritz-gold/90" : isTop30 ? "text-meritz-gold dark:text-meritz-gold/90" : "text-gray-500 dark:text-gray-400"
                        }`}>
                          님
                        </span>
                      </h2>
                      {isTop30 && (
                        <span className={`text-xs font-bold px-2 py-0.5 rounded whitespace-nowrap ${isTop3 ? "bg-meritz-gold/20 text-meritz-gold border border-meritz-gold/40" : "bg-primary/10 text-primary border border-primary/30"}`}>
                          당월실적 {rankInMonth}위
                        </span>
                      )}
                    </div>
                    <p className={`mb-2 ${
                      selectedViewMonth === 3 ? "text-gray-600 dark:text-gray-300" : isTop3 ? "text-gray-400" : isTop30 ? "text-gray-500 dark:text-gray-400" : "text-gray-600 dark:text-gray-300"
                    }`}>
                      {selectedAgent.branch}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {totalEstimatedPrize > 0 && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-meritz-gold/10 text-meritz-gold border border-meritz-gold/30 whitespace-nowrap">
                          {selectedViewMonth}월 시상 달성
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
                <div className="flex flex-row flex-wrap gap-2 sm:gap-4 w-full md:w-auto mt-4 md:mt-0 items-stretch md:items-end">
                  <div
                    className={`rounded-xl p-2.5 sm:p-4 md:p-5 text-white shadow-lg min-w-0 flex-1 md:min-w-[200px] ${
                      isTop3 ? "bg-gradient-to-br from-primary via-red-600 to-red-700 border border-meritz-gold/30" : isTop30 ? "bg-gradient-to-br from-primary to-red-600 border border-meritz-gold/20" : "bg-gradient-to-br from-primary to-red-600"
                    }`}
                  >
                    <p className="text-xs sm:text-sm opacity-90 mb-0.5 sm:mb-1">이번달 총 예상 시상금</p>
                    <div className="flex items-baseline gap-1">
                      <h3 className="text-xl sm:text-2xl md:text-3xl font-extrabold">
                        {Math.round(totalEstimatedPrize / 10000).toLocaleString()}
                        <span className="text-lg font-medium">만원</span>
                      </h3>
                    </div>
                    {selectedViewMonth === 2 && (
                      <div className="mt-1.5 sm:mt-2 text-[10px] sm:text-xs bg-white/20 inline-block px-1.5 sm:px-2 py-0.5 sm:py-1 rounded whitespace-nowrap">
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
                    className={`rounded-xl px-2 md:px-3.5 py-1.5 md:py-2.5 shadow-sm min-w-0 flex-[0.54] md:min-w-[140px] border shrink-0 ${
                      isTop3 ? "bg-gray-800/80 dark:bg-gray-800 border-meritz-gold/30" : isTop30 ? "bg-surface-light dark:bg-gray-800 border-meritz-gold/20" : "bg-surface-light dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                    }`}
                  >
                    <p className={`text-[10px] sm:text-xs mb-0.5 ${isTop3 ? "text-gray-400" : "text-gray-500 dark:text-gray-400"}`}>
                      현재 인보험 누적 실적
                    </p>
                    <div className="flex items-baseline gap-1">
                      <h3 className={`text-base sm:text-xl md:text-2xl font-bold ${isTop3 ? "text-white" : "text-gray-900 dark:text-white"}`}>
                        {Math.round(currentMonthPerf / 10000).toLocaleString()}
                        <span className={isTop3 ? "text-sm sm:text-base font-medium text-meritz-gold/90" : "text-sm sm:text-base font-medium text-gray-500"}>
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
                    <p className="text-[10px] sm:text-[11px] text-right mt-0.5 text-gray-400 whitespace-normal break-keep">
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
                        {([1, 2, 3] as const).map((m) => (
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
              {/* 파트너 시상: 4열 그리드 (1월 11장, 2월 12장) — 비파트너와 완전 분리 */}
              {isPartnerBranch && (
                <div className="grid grid-cols-1 gap-4 md:gap-5 mb-6 md:grid-cols-4">
                  {selectedViewMonth === 1 && (
                    <>
                      <PartnerPrizeCardFull index={1} title="정규+파트너 추가" badges={["익월", "450%"]} subtext={`1월 실적 ${Math.round(currentMonthPerf / 10000)}만`} showTierButtons={false} tierPerf={0} expectedPrize={regularPrize} variant="green" emphasizePrize />
                      <PartnerPrizeCardFull index={2} title="1주차 인보험" badges={["13회차", "100%"]} subtext={`1주차 실적 ${Math.round(viewW1 / 10000)}만`} showTierButtons tierPerf={viewW1} expectedPrize={p?.productWeek1PrizeJan ?? 0} variant="sky" />
                      <PartnerPrizeCardFull index={3} title="1주차 상품" badges={["13회차", "100%"]} subtext={`1주차 실적 ${Math.round(viewW1 / 10000)}만`} showTierButtons tierPerf={viewW1} expectedPrize={p?.productWeek1PrizeJan ?? 0} variant="green" />
                      <PartnerPrizeCardFull index={4} title="2주차 인보험" badges={["13회차", "100%"]} subtext={`2주차 실적 ${Math.round(viewW2 / 10000)}만`} showTierButtons tierPerf={viewW2} expectedPrize={p?.productWeek2PrizeJan ?? 0} variant="sky" />
                      <PartnerPrizeCardFull index={5} title="2주차 상품" badges={["13회차", "100%"]} subtext={`2주차 실적 ${Math.round(viewW2 / 10000)}만`} showTierButtons tierPerf={viewW2} expectedPrize={p?.productWeek2PrizeJan ?? 0} variant="green" />
                      <PartnerPrizeCardFull index={6} title="12~1월 연속가동" badges={["13회차", "최대300%"]} subtext={`12월 구간 ${Math.round((p?.continuous121Dec ?? 0) / 10000)}만 · 1월 구간 ${Math.round((p?.continuous121Jan ?? 0) / 10000)}만`} showTierButtons tierPerf={p?.continuous121Dec ?? 0} tierPerfB={p?.continuous121Jan ?? 0} expectedPrize={p?.continuous121Prize ?? 0} variant="purple" />
                      <PartnerPrizeCardFull index={7} title="3주차 인보험" badges={["13회차", "100%"]} subtext={`3주차 실적 ${Math.round(viewW3 / 10000)}만`} showTierButtons tierPerf={viewW3} expectedPrize={p?.week3PrizeJan ?? 0} variant="sky" />
                      <PartnerPrizeCardFull index={8} title="4주차 인보험" badges={["13회차", "100%"]} subtext={`4주차 실적 ${Math.round((p?.week4Jan ?? 0) / 10000)}만`} showTierButtons tierPerf={p?.week4Jan ?? 0} expectedPrize={p?.week4PrizeJan ?? 0} variant="green" />
                      <PartnerPrizeCardFull index={9} title="1~2월 연속가동" badges={["13회차", "최대300%"]} subtext={`1월 구간 실적 ${Math.round((p?.continuous12Jan ?? 0) / 10000)}만`} showTierButtons tierPerf={p?.continuous12Jan ?? 0} expectedPrize={p?.continuous12Prize ?? 0} variant="purple" />
                      <PartnerPrizeCardFull index={10} title="1~2월 추가 연속가동" badges={["13회차", "최대300%"]} subtext={`1월 구간 실적 ${Math.round((p?.continuous12ExtraJan ?? 0) / 10000)}만`} showTierButtons tierPerf={p?.continuous12ExtraJan ?? 0} expectedPrize={p?.continuous12ExtraPrize ?? 0} variant="purple" />
                      <PartnerPrizeCardFull index={11} title="메리츠클럽 플러스" badges={["13회차"]} subtext={`1월 실적 ${Math.round(febPerf / 10000)}만 / 목표 ${Math.round((plusTarget || 200000) / 10000)}만`} showTierButtons={false} tierPerf={0} expectedPrize={meritzClubPlusPrize} variant="yellow" isMCPlus mcPlusCurrent={febPerf} mcPlusTarget={plusTarget || 200000} mcPlusProgress={plusProgress} />
                    </>
                  )}
                  {selectedViewMonth === 2 && (
                    <>
                      <PartnerPrizeCardFull index={1} title="정규+파트너 추가" badges={["익월", "450%"]} subtext={`2월 실적 ${Math.round(currentMonthPerf / 10000)}만`} showTierButtons={false} tierPerf={0} expectedPrize={regularPrize} variant="green" emphasizePrize />
                      <PartnerPrizeCardFull index={2} title="1주차 인보험" badges={["13회차", "200%"]} subtext={`1주차 실적 ${Math.round(viewW1 / 10000)}만`} showTierButtons tierPerf={viewW1} expectedPrize={p?.productWeek1InsPrize ?? p?.productWeek1Prize ?? 0} variant="sky" />
                      <PartnerPrizeCardFull index={3} title="1주차 상품" badges={["13회차", "100%"]} subtext={`1주차 실적 ${Math.round(viewW1 / 10000)}만`} showTierButtons tierPerf={viewW1} expectedPrize={p?.productWeek1Prize ?? 0} variant="green" />
                      <PartnerPrizeCardFull index={4} title="2주차 인보험" badges={["13회차", "100%"]} subtext={`2주차 실적 ${Math.round(viewW2 / 10000)}만`} showTierButtons tierPerf={viewW2} expectedPrize={p?.productWeek2InsPrize ?? getPartnerTierPrize(viewW2)} variant="sky" />
                      <PartnerPrizeCardFull index={5} title="2주차 상품" badges={["13회차", "100%"]} subtext={`2주차 실적 ${Math.round(viewW2 / 10000)}만`} showTierButtons tierPerf={viewW2} expectedPrize={p?.productWeek2Prize ?? getPartnerTierPrize(viewW2)} variant="green" />
                      <PartnerPrizeCardFull index={6} title="1~2월 연속가동" badges={["13회차", "최대300%"]} subtext={`1월 구간 실적 ${Math.round((p?.continuous12Jan ?? 0) / 10000)}만`} showTierButtons tierPerf={p?.continuous12Jan ?? 0} expectedPrize={p?.continuous12Prize ?? 0} variant="purple" />
                      <PartnerPrizeCardFull index={7} title="1~2월 추가 연속가동" badges={["13회차", "최대300%"]} subtext={`1월 구간 실적 ${Math.round((p?.continuous12ExtraJan ?? 0) / 10000)}만`} showTierButtons tierPerf={p?.continuous12ExtraJan ?? 0} expectedPrize={p?.continuous12ExtraPrize ?? 0} variant="purple" />
                      <PartnerPrizeCardFull index={8} title="3주차 인보험" badges={["13회차", "100%"]} subtext={`3주차 실적 ${Math.round(viewW3Feb / 10000)}만`} showTierButtons tierPerf={viewW3Feb} expectedPrize={p?.week3Prize ?? getPartnerTierPrize(viewW3Feb)} variant="sky" />
                      <PartnerPrizeCardFull index={9} title="3~4주 인보험" badges={["13회차", "100%"]} subtext={`3~4주 실적 ${Math.round((p?.week34Sum ?? 0) / 10000)}만`} showTierButtons tierPerf={p?.week34Sum ?? 0} expectedPrize={p?.week34Prize ?? getPartnerTierPrize(p?.week34Sum ?? 0)} variant="sky" />
                    <PartnerPrizeCardFull index={10} title="2~3월 연속가동" badges={["13회차", "300%"]} subtext={`2월 구간 실적 ${Math.round((p?.continuous23Feb ?? 0) / 10000)}만`} showTierButtons tierPerf={p?.continuous23Feb ?? 0} expectedPrize={p?.continuous23Prize ?? getPartnerContinuousPrize(p?.continuous23Feb ?? 0)} variant="purple" prizeBadge="3월 15일까지 10만 달성시 완성" />
                    <PartnerPrizeCardFull index={11} title="2~3월 추가 연속가동" badges={["13회차", "최대300%"]} subtext={`2월 구간 실적 ${Math.round((p?.continuous23ExtraFeb ?? p?.continuous23Feb ?? 0) / 10000)}만`} showTierButtons tierPerf={p?.continuous23ExtraFeb ?? p?.continuous23Feb ?? 0} expectedPrize={p?.continuous23ExtraPrize ?? getPartnerContinuousPrize(p?.continuous23ExtraFeb ?? p?.continuous23Feb ?? 0)} variant="purple" prizeBadge="3월 8일까지 10만 달성시 완성" />
                      <PartnerPrizeCardFull index={12} title="메리츠클럽 플러스" badges={["13회차"]} subtext={`2월 실적 ${Math.round(currentMonthPerf / 10000)}만 / 목표 ${Math.round((plusTarget || 200000) / 10000)}만`} showTierButtons={false} tierPerf={0} expectedPrize={meritzClubPlusPrize} variant="yellow" isMCPlus mcPlusCurrent={currentMonthPerf} mcPlusTarget={plusTarget || 200000} mcPlusProgress={plusProgress} />
                    </>
                  )}
                </div>
              )}
              {/* 비파트너 시상: 3x2 그리드 (1월 7장·2월 6장) — 파트너 코드와 완전 분리, 그리드는 NonPartnerCards 내부 */}
              {!isPartnerBranch && nonPartnerCardsEl}
            </div>

            <div className={`grid gap-3 md:gap-5 mb-6 lg:items-stretch ${
              isPartnerBranch ? "grid-cols-1" : selectedViewMonth === 3 ? "grid-cols-2 lg:grid-cols-[200px_280px_1fr]" : "grid-cols-1 lg:grid-cols-[280px_1fr]"
            }`}>
              {/* 3월 탭: 3월 정규시상 · MY HOT · 7개월 추이 (모바일: 정규시상+MY HOT 한 줄, 7개월 추이 아래) */}
              {!isPartnerBranch && selectedViewMonth === 3 && (
                <div className="rounded-xl shadow-lg border border-gray-700/50 overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 dark:from-black dark:via-gray-900 dark:to-black relative min-w-0 lg:max-w-none w-full lg:h-full flex flex-col">
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-meritz-gold/10 via-transparent to-transparent pointer-events-none" />
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-12 -mt-12 pointer-events-none" />
                  <div className="relative z-10 p-2.5 md:p-5 flex flex-col items-center flex-1">
                    <div className="w-full flex items-center gap-1.5 md:gap-2 mb-1 md:mb-2">
                      <svg viewBox="0 0 24 24" className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0 text-meritz-gold fill-current" aria-hidden><path d="M17 11V3H7v8H3v12h8v-4h2v4h8V11h-4zM7 19H5v-2h2v2zm0-4H5v-2h2v2zm0-4H5V9h2v2zm4 4H9v-2h2v2zm0-4H9V9h2v2zm0-4H9V5h2v2zm4 8v-2h2v2h-2zm0-4V9h2v2h-2zm0-4V5h2v2h-2zm4 12v-2h2v2h-2zm0-4v-2h2v2h-2z"/></svg>
                      <h3 className="text-sm md:text-lg font-bold text-white tracking-tight">3월 정규시상</h3>
                    </div>
                    <p className="text-[9px] md:text-[10px] text-gray-400 mb-2 md:mb-4 w-full text-left lg:text-center">실적의 100% · 1:1 비율</p>
                    <div className="flex-1 flex flex-col items-center justify-center w-full">
                      <p className="text-xs md:text-lg font-medium text-gray-400 dark:text-gray-500 mb-1 md:mb-2">인정실적</p>
                      <p className="text-3xl md:text-6xl font-black text-white tracking-tight">
                        {Math.round(marchPerf / 10000).toLocaleString()}
                        <span className="text-lg md:text-3xl font-normal text-gray-400 ml-1 md:ml-1.5">만원</span>
                      </p>
                    </div>
                  </div>
                </div>
              )}
              {/* 2026 MY HOT - 비파트너만 표시 (파트너는 MY HOT 없음) */}
              {!isPartnerBranch && (
                <div className="rounded-xl shadow-lg border border-gray-700/50 overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 dark:from-black dark:via-gray-900 dark:to-black relative min-w-0 lg:max-w-none w-full lg:h-full flex flex-col">
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-meritz-gold/10 via-transparent to-transparent pointer-events-none" />
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-12 -mt-12 pointer-events-none" />
                  <div className="relative z-10 p-2.5 md:p-5 flex flex-col items-center flex-1">
                    <div className="w-full flex items-center gap-1.5 md:gap-2 mb-1 md:mb-2">
                      <svg viewBox="0 0 24 24" className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0 text-meritz-gold fill-current" aria-hidden><path d="M17 11V3H7v8H3v12h8v-4h2v4h8V11h-4zM7 19H5v-2h2v2zm0-4H5v-2h2v2zm0-4H5V9h2v2zm4 4H9v-2h2v2zm0-4H9V9h2v2zm0-4H9V5h2v2zm4 8v-2h2v2h-2zm0-4V9h2v2h-2zm0-4V5h2v2h-2zm4 12v-2h2v2h-2zm0-4v-2h2v2h-2z"/></svg>
                      <h3 className="text-sm md:text-lg font-bold text-white tracking-tight">2026 MY HOT</h3>
                    </div>
                    <p className="text-[9px] md:text-[10px] text-gray-400 mb-2 md:mb-3 w-full text-left lg:text-center">1월~{selectedViewMonth}월 누적 · 연도시상</p>
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
                      <p className="text-sm md:text-base font-bold text-white">{Math.round(myHotSum / 10000).toLocaleString()}만원</p>
                      {!myHotIsChamp && myHotRank > 0 && (
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
              )}
              <div className={`bg-surface-light dark:bg-surface-dark rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-4 md:p-6 lg:h-full flex flex-col min-h-0 ${!isPartnerBranch && selectedViewMonth === 3 ? "col-span-2 lg:col-span-1" : ""}`}>
                <div className="flex justify-between items-center mb-4 shrink-0">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center">
                      <svg viewBox="0 0 24 24" className="w-5 h-5 flex-shrink-0 text-meritz-gray fill-current mr-2" aria-hidden><path d="M3.5 18.49l6-6.01 4 4L22 6.92l-1.41-1.41-7.09 7.07-4-4L2 16.99z"/></svg>
                      최근 7개월 실적 추이
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">1월·2월·3월 클릭 시 시상 현황 전환</p>
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
                              "3월": "2026-03",
                            };
                            const monthKey = label != null ? monthMap[label] : undefined;
                            if (value != null && monthKey) {
                              if (isPartnerBranch && partnerRanksByMonth[monthKey] != null) {
                                rank = String(partnerRanksByMonth[monthKey]);
                              } else if (globalRanks[monthKey]) {
                                const rankIndex = globalRanks[monthKey].indexOf(value);
                                if (rankIndex !== -1) rank = (rankIndex + 1).toString();
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
                          const isClickable = payload?.name === "1월" || payload?.name === "2월" || payload?.name === "3월";
                          const monthNum = payload?.name === "1월" ? 1 : payload?.name === "2월" ? 2 : payload?.name === "3월" ? 3 : null;
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
        </div>
      )}
    </>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<LoadingLines />}>
      <Dashboard />
    </Suspense>
  );
}
