"use client";

import React, { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { User, Agent } from "@/types";
import { formatMan, displayBranch } from "@/app/_components/dashboard/utils";
import { RANK_EXCLUDE_CODE } from "@/app/_components/dashboard/constants";

interface HeaderProps {
  user: User | null;
  selectedAgent: Agent | null;
  isStandalone: boolean;
  isMobile: boolean;
  isCaptureMode: boolean;
  exportLoading: boolean;
  agentSearchOpen: boolean;
  agentSearchQuery: string;
  agents: Agent[] | null;
  rankKeyMonth: string;
  prevMonthLabel: string;
  prevMonthKey: string;
  currentMonthLabel: string;
  showInstallHint: boolean;
  setAgentSearchOpen: (open: boolean) => void;
  setAgentSearchQuery: (query: string) => void;
  setSelectedAgent: (agent: Agent) => void;
  setShowPrizeGuide: (show: boolean) => void;
  setShowInstallHint: (show: boolean) => void;
  handleLogout: () => void;
  handleExportPng: () => void;
  handlePWAInstallClick: () => void;
}

export function Header({
  user,
  selectedAgent,
  isStandalone,
  isMobile,
  isCaptureMode,
  exportLoading,
  agentSearchOpen,
  agentSearchQuery,
  agents,
  rankKeyMonth,
  prevMonthLabel,
  prevMonthKey,
  currentMonthLabel,
  showInstallHint,
  setAgentSearchOpen,
  setAgentSearchQuery,
  setSelectedAgent,
  setShowPrizeGuide,
  setShowInstallHint,
  handleLogout,
  handleExportPng,
  handlePWAInstallClick,
}: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const isAdminLike = user?.role === "admin" || user?.role === "manager" || user?.role === "m_agent_manager";
  const inAdminManage = pathname?.startsWith("/direct/manage");

  const handleGoToManage = () => {
    router.push("/direct/manage");
    setProfileMenuOpen(false);
  };

  const handleGoToDashboard = () => {
    router.push("/direct");
    setProfileMenuOpen(false);
  };

  return (
    <header
      className={`bg-surface-light dark:bg-surface-dark border-b border-gray-200 dark:border-gray-700 sticky top-0 z-30 shadow-sm ${
        isCaptureMode ? "hidden" : ""
      }`}
    >
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-3 md:py-0 md:h-16 flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-0">
        <div className="flex items-center justify-between w-full md:w-auto">
          <div className="flex items-center shrink-0">
            {isStandalone ? (
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="p-1 -m-1 rounded touch-manipulation"
                title="새로고침 (실적 반영)"
                aria-label="새로고침"
              >
                <img src="/ci.png" alt="CI" className="h-[1.6rem] md:h-[1.8rem] object-contain" />
              </button>
            ) : (
              <img src="/ci.png" alt="CI" className="h-[1.6rem] md:h-[1.8rem] object-contain" />
            )}
          </div>
          <div className="flex items-center gap-1.5 md:gap-4 md:pl-4 md:border-l border-gray-200 dark:border-gray-700">
            <div className="relative flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setProfileMenuOpen((v) => !v)}
                className="flex items-center space-x-2 focus:outline-none"
              >
                <div className="w-8 h-8 rounded-full bg-meritz-gold flex items-center justify-center text-white font-bold text-xs shadow-md">
                  {user?.name?.charAt(0) || "U"}
                </div>
                <div className="hidden lg:block text-sm text-right">
                  <p className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-1">
                    <span>
                      {user?.name}
                      {user?.role === "admin"
                        ? " 관리자"
                        : user?.role === "manager"
                        ? user?.code === "722031500"
                          ? " BM"
                          : " 매니저"
                        : user?.role === "m_agent_manager"
                        ? " 지점"
                        : "님"}
                    </span>
                    {isAdminLike && (
                      <span className="material-symbols-outlined text-[16px] text-gray-500">
                        expand_more
                      </span>
                    )}
                  </p>
                </div>
              </button>
              {isAdminLike && profileMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setProfileMenuOpen(false)}
                  />
                  <div className="absolute top-full right-0 mt-2 z-50 w-52 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl py-1.5 text-sm">
                    <button
                      type="button"
                      onClick={handleGoToManage}
                      className={`w-full flex items-center justify-between px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 ${
                        inAdminManage ? "text-primary" : "text-gray-800 dark:text-gray-100"
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[18px] text-gray-500">
                          leaderboard
                        </span>
                        관리자 모드 열기
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={handleGoToDashboard}
                      className="w-full flex items-center justify-between px-3 py-1.5 text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                      <span className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[18px] text-gray-500">
                          dashboard
                        </span>
                        대시보드로 돌아가기
                      </span>
                    </button>
                  </div>
                </>
              )}
            </div>

            <button onClick={handleLogout} className="text-xs text-gray-500 hover:text-primary underline">
              로그아웃
            </button>

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

        {(user?.role === "admin" || user?.role === "manager" || user?.role === "m_agent_manager") && (
          <div className="relative w-full md:w-auto flex items-center gap-1">
            <input
              type="text"
              placeholder="이름 또는 지사명 검색..."
              value={
                agentSearchOpen
                  ? agentSearchQuery
                  : selectedAgent
                  ? `${selectedAgent.name} (${displayBranch(selectedAgent as any)})`
                  : ""
              }
              onChange={(e) => {
                setAgentSearchQuery(e.target.value);
                setAgentSearchOpen(true);
              }}
              onFocus={() => setAgentSearchOpen(true)}
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
                    const sorted = [...(agents || [])]
                      .filter((a: any) => a.code !== RANK_EXCLUDE_CODE)
                      .sort(
                        (a, b) =>
                          (b.performance?.[rankKeyMonth] || 0) -
                          (a.performance?.[rankKeyMonth] || 0),
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
                            className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between gap-2 ${
                              selectedAgent?.code === agent.code
                                ? "bg-primary/10 text-primary"
                                : "text-gray-900 dark:text-white"
                            }`}
                          >
                            <span className="min-w-0 truncate">
                              {agent.name} ({displayBranch(agent as any)})
                            </span>
                            <span className="text-xs text-gray-500 shrink-0 whitespace-nowrap">
                              {prevMonthLabel} {formatMan(agent.performance?.[prevMonthKey] || 0)}만 / {currentMonthLabel} {formatMan(agent.performance?.[rankKeyMonth] || 0)}만
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
  );
}
