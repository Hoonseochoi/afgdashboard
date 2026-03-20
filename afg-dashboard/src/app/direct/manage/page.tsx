"use client";

import { Suspense, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import LoadingLines from "@/app/_components/shared/LoadingLines";
import { Header } from "@/app/_components/shared/Header";
import { useDashboardData } from "@/hooks/useDashboardData";
import { buildAdminStats } from "@/lib/engines/adminStatsEngine";
import { formatMan, displayBranch } from "@/app/_components/dashboard/utils";

function DirectManageContent() {
  const router = useRouter();
  const exportAreaRef = useRef<HTMLDivElement | null>(null);

  const {
    user,
    agents,
    loading,
    error,
    selectedViewMonth,
    setSelectedViewMonth,
    globalRanks,
    updateDate,
    // Header props
    selectedAgent,
    setSelectedAgent,
    isStandalone,
    isMobile,
    isCaptureMode,
    exportLoading,
    agentSearchOpen,
    setAgentSearchOpen,
    agentSearchQuery,
    setAgentSearchQuery,
    showInstallHint,
    setShowInstallHint,
    setShowPrizeGuide,
    handleLogout,
    handleExportPng,
    handlePWAInstallClick,
  } = useDashboardData({ mode: "all", initialCode: null, exportAreaRef });

  const stats = useMemo(
    () => {
      if (loading || error || !user) {
        return {
          monthKey: `2026-${String(selectedViewMonth).padStart(2, "0")}`,
          overallTop: [],
          prizeTop: [],
          branchStats: [],
        };
      }
      return buildAdminStats({ agents, month: selectedViewMonth, globalRanks, updateDate });
    },
    [agents, selectedViewMonth, globalRanks, updateDate, loading, error, user],
  );

  useEffect(() => {
    if (!user) return;
    const role = user.role;
    const isAdminLike = role === "admin" || role === "manager" || role === "m_agent_manager";
    if (!isAdminLike) {
      router.replace("/direct");
    }
  }, [user, router]);

  if (loading) return <LoadingLines />;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;
  if (!user) return null;

  const rankKeyMonth = stats.monthKey;
  const currentMonthLabel = `${selectedViewMonth}월`;
  const prevMonthNum = selectedViewMonth === 1 ? 12 : selectedViewMonth - 1;
  const prevMonthLabel = `${prevMonthNum}월`;
  const prevMonthKey = selectedViewMonth === 1 ? "2025-12" : `2026-${String(prevMonthNum).padStart(2, "0")}`;

  return (
    <>
      <Header
        user={user}
        selectedAgent={selectedAgent}
        isStandalone={isStandalone}
        isMobile={isMobile}
        isCaptureMode={isCaptureMode}
        exportLoading={exportLoading}
        agentSearchOpen={agentSearchOpen}
        agentSearchQuery={agentSearchQuery}
        agents={agents}
        rankKeyMonth={rankKeyMonth}
        prevMonthLabel={prevMonthLabel}
        prevMonthKey={prevMonthKey}
        currentMonthLabel={currentMonthLabel}
        showInstallHint={showInstallHint}
        setAgentSearchOpen={setAgentSearchOpen}
        setAgentSearchQuery={setAgentSearchQuery}
        setSelectedAgent={setSelectedAgent}
        setShowPrizeGuide={setShowPrizeGuide}
        setShowInstallHint={setShowInstallHint}
        handleLogout={handleLogout}
        handleExportPng={handleExportPng}
        handlePWAInstallClick={handlePWAInstallClick}
        pushEnabled={false}
        onTogglePush={() => {}}
        onOpenPushSend={() => {}}
      />

      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-14">
        <header className="mb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">관리자 통계 대시보드</h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              현재 접속 계정이 접근 가능한 설계사들만 기준으로 집계됩니다.
            </p>
            {updateDate && (
              <p className="mt-1 text-xs text-gray-500">데이터 기준일: {updateDate}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-500">집계 월</span>
            <div className="inline-flex rounded-md border border-gray-200 dark:border-gray-600 bg-surface-light dark:bg-surface-dark shadow-sm">
              {[1, 2, 3].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setSelectedViewMonth(m as 1 | 2 | 3)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    selectedViewMonth === m
                      ? "bg-primary text-white"
                      : "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                >
                  {m}월
                </button>
              ))}
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <section className="bg-surface-light dark:bg-surface-dark rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                전체 실적 랭킹 Top 20
              </h2>
              <span className="text-xs text-gray-500">{currentMonthLabel} 인정실적 기준</span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 text-left text-[11px] sm:text-xs text-gray-500 uppercase">
                    <th className="py-2 pr-2">순위</th>
                    <th className="py-2 pr-2">설계사</th>
                    <th className="py-2 pr-2">지점/지사</th>
                    <th className="py-2 text-right">인정실적</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.overallTop.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-gray-500">
                        집계할 데이터가 없습니다.
                      </td>
                    </tr>
                  ) : (
                    stats.overallTop.map((item) => (
                      <tr
                        key={item.code}
                        className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50/60 dark:hover:bg-gray-800/60"
                      >
                        <td className="py-1.5 pr-2 font-semibold text-gray-800 dark:text-gray-100">{item.rank}</td>
                        <td className="py-1.5 pr-2">
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-900 dark:text-white">{item.name}</span>
                            <span className="text-[11px] text-gray-500">{item.code}</span>
                          </div>
                        </td>
                        <td className="py-1.5 pr-2 text-[11px] sm:text-xs text-gray-700 dark:text-gray-300">
                          {displayBranch({ branch: item.branch } as any)}
                        </td>
                        <td className="py-1.5 text-right font-semibold text-gray-900 dark:text-white">
                          {formatMan(item.performance)}만
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="bg-surface-light dark:bg-surface-dark rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                시상 랭킹 Top 20
              </h2>
              <span className="text-xs text-gray-500">{currentMonthLabel} 예상 시상금 기준</span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 text-left text-[11px] sm:text-xs text-gray-500 uppercase">
                    <th className="py-2 pr-2">순위</th>
                    <th className="py-2 pr-2">설계사</th>
                    <th className="py-2 pr-2">지점/지사</th>
                    <th className="py-2 text-right">예상 시상금</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.prizeTop.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-gray-500">
                        집계할 데이터가 없습니다.
                      </td>
                    </tr>
                  ) : (
                    stats.prizeTop.map((item) => (
                      <tr
                        key={item.code}
                        className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50/60 dark:hover:bg-gray-800/60"
                      >
                        <td className="py-1.5 pr-2 font-semibold text-gray-800 dark:text-gray-100">{item.rank}</td>
                        <td className="py-1.5 pr-2">
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-900 dark:text-white">{item.name}</span>
                            <span className="text-[11px] text-gray-500">{item.code}</span>
                          </div>
                        </td>
                        <td className="py-1.5 pr-2 text-[11px] sm:text-xs text-gray-700 dark:text-gray-300">
                          {displayBranch({ branch: item.branch } as any)}
                        </td>
                        <td className="py-1.5 text-right font-semibold text-gray-900 dark:text-white">
                          {item.totalPrize.toLocaleString()}원
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <section className="bg-surface-light dark:bg-surface-dark rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
              지점/지사별 실적 요약
            </h2>
            <span className="text-xs text-gray-500">
              {currentMonthLabel} 인정실적 합계 기준 상위 지점/지사
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 text-left text-[11px] sm:text-xs text-gray-500 uppercase">
                  <th className="py-2 pr-2">지점/지사</th>
                  <th className="py-2 pr-2 text-right">총 인정실적</th>
                  <th className="py-2 pr-2 text-right">설계사 수</th>
                  <th className="py-2 text-right">평균 인정실적</th>
                </tr>
              </thead>
              <tbody>
                {stats.branchStats.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-gray-500">
                      집계할 데이터가 없습니다.
                    </td>
                  </tr>
                ) : (
                  stats.branchStats.slice(0, 30).map((item) => (
                    <tr
                      key={item.branch}
                      className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50/60 dark:hover:bg-gray-800/60"
                    >
                      <td className="py-1.5 pr-2 text-[11px] sm:text-xs text-gray-900 dark:text-white">
                        {item.branch}
                      </td>
                      <td className="py-1.5 pr-2 text-right font-semibold text-gray-900 dark:text-white">
                        {formatMan(item.totalPerformance)}만
                      </td>
                      <td className="py-1.5 pr-2 text-right text-gray-800 dark:text-gray-100">
                        {item.agentCount.toLocaleString()}명
                      </td>
                      <td className="py-1.5 text-right text-gray-800 dark:text-gray-100">
                        {formatMan(item.averagePerformance)}만
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={() => router.push("/direct")}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <span className="material-symbols-outlined text-sm">dashboard</span>
            대시보드로 돌아가기
          </button>
        </div>
      </main>
    </>
  );
}

export default function DirectManagePage() {
  return (
    <Suspense fallback={<LoadingLines />}>
      <DirectManageContent />
    </Suspense>
  );
}

