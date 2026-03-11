'use client';

import React, { Suspense, useRef } from 'react';
import LoadingLines from './shared/LoadingLines';
import { Header } from './shared/Header';
import { AgentBanner } from './shared/cards/AgentBanner';
import { PerformanceChart } from './shared/PerformanceChart';
import { MyHotCard } from './shared/cards/MyHotCard';
import { PasswordModal } from './shared/modals/PasswordModal';
import { PrizeGuideModal } from './shared/modals/PrizeGuideModal';
import { PartnerCards } from '../partner/_components/PartnerCards';
import { DirectCards } from '../direct/_components/cards/DirectCards';
import { useDashboardData } from '@/hooks/useDashboardData';
import { DashboardMode } from '@/types';

interface DashboardProps {
  mode?: DashboardMode;
  initialCode?: string | null;
}

export const Dashboard: React.FC<DashboardProps> = ({
  mode = 'all',
  initialCode = null,
}) => {
  const exportAreaRef = useRef<HTMLDivElement>(null);
  
  const {
    // Data & State
    agents,
    selectedAgent,
    setSelectedAgent,
    user,
    setUser,
    loading,
    error,
    selectedViewMonth,
    setSelectedViewMonth,
    prizeMonthDropdownOpen,
    setPrizeMonthDropdownOpen,
    agentSearchOpen,
    setAgentSearchOpen,
    agentSearchQuery,
    setAgentSearchQuery,
    
    // UI State
    showPasswordModal,
    setShowPasswordModal,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    passwordError,
    passwordLoading,
    exportLoading,
    showPrizeGuide,
    setShowPrizeGuide,
    isStandalone,
    showInstallHint,
    setShowInstallHint,
    isMobile,
    
    // Derived Data (Incentives)
    incentiveData,
    globalRanks,
    directRanks,
    partnerRanks,
    
    // Handlers
    handlePWAInstallClick,
    handleExportPng,
    handleChangePassword,
    handleLogout,
    displayBranch,
    isCaptureMode,
    updateDate,
  } = useDashboardData({ mode, initialCode, exportAreaRef });

  if (loading) return <LoadingLines />;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;
  if (!selectedAgent) return null;

  const rankKeyMonth = `2026-${String(selectedViewMonth).padStart(2, "0")}`;
  const prevMonthNum = selectedViewMonth === 1 ? 12 : selectedViewMonth - 1;
  const prevMonthLabel = `${prevMonthNum}월`;
  const prevMonthKey = selectedViewMonth === 1 ? "2025-12" : `2026-${String(prevMonthNum).padStart(2, "0")}`;
  const currentMonthLabel = `${selectedViewMonth}월`;

  const isPartner = (selectedAgent.branch || "").includes("파트너");
  const rankInMonth = incentiveData.rankInMonth;
  const isTop3 = rankInMonth >= 1 && rankInMonth <= 3;
  const isTop30 = rankInMonth >= 1 && rankInMonth <= 30;
  
  const profileImageSrc = isTop3 
    ? "/top3_profile.png" 
    : isTop30 
      ? "/top30_profile.png" 
      : "/default_profile.png";

  const isPartnerBranch = (selectedAgent?.branch || '').includes('파트너');
  const showPartnerContent = (mode === 'all' || mode === 'partner') && isPartnerBranch;

  return (
    <Suspense fallback={<LoadingLines />}>
      <PasswordModal
        isOpen={showPasswordModal}
        newPassword={newPassword}
        setNewPassword={setNewPassword}
        confirmPassword={confirmPassword}
        setConfirmPassword={setConfirmPassword}
        passwordError={passwordError}
        passwordLoading={passwordLoading}
        onSubmit={handleChangePassword}
      />

      <PrizeGuideModal
        isOpen={showPrizeGuide}
        onClose={() => setShowPrizeGuide(false)}
        imageSrcs={['/26032w%20direct.jpg', '/26031w_prize.jpg']}
      />

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
      />

      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-14">
        <div ref={exportAreaRef} className="space-y-0" data-capture-area>
          <AgentBanner
            selectedAgent={selectedAgent}
            selectedViewMonth={selectedViewMonth}
            rankInMonth={rankInMonth}
            isTop3={isTop3}
            isTop30={isTop30}
            isRank1={incentiveData.goalInfo.isRank1}
            profileImageSrc={profileImageSrc}
            totalEstimatedPrize={incentiveData.totalPrize}
            prizeDiff={0} // To be implemented or handled in incentiveEngine
            currentMonthPerf={incentiveData.currentPerf}
            progress={incentiveData.goalInfo.progress}
            targetRankDisplay={incentiveData.goalInfo.targetRankDisplay}
            goalLabel={incentiveData.goalInfo.goalLabel}
            monthlyGoal={incentiveData.goalInfo.monthlyGoal}
            remainToShow={0} // To be implemented or handled in incentiveEngine
            remainLabel="more"
            currentMonthPerfForBanner={incentiveData.currentPerf}
          />

          <div className="mb-6">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <span className="w-1.5 h-6 bg-meritz-gold rounded-sm mr-3"></span>
                <span>MY MERITZ PRIZE</span>
                <span className="text-[11px] text-gray-500 dark:text-gray-400">
                  Daily Update는 매일 10시에 자동진행됩니다 ({formatUpdateDateShort(updateDate)} update)
                </span>
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
                            ? 'text-primary bg-primary/10 dark:bg-primary/20'
                            : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      >
                        {m}월
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {showPartnerContent ? (
              <PartnerCards
                selectedViewMonth={selectedViewMonth}
                selectedAgent={selectedAgent}
                incentiveData={incentiveData}
              />
            ) : (
              <DirectCards
                selectedViewMonth={selectedViewMonth}
                selectedAgent={selectedAgent}
                incentiveData={incentiveData}
                updateDate={updateDate}
              />
            )}
          </div>

          {showPartnerContent ? (
            <PerformanceChart
              performanceData={incentiveData.performanceData}
              showPartnerContent={true}
              directRanks={directRanks}
              partnerRanks={partnerRanks}
              selectedAgent={selectedAgent}
              agents={agents}
              setSelectedViewMonth={setSelectedViewMonth}
            />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-[min(100%,280px)_1fr] gap-3 md:gap-5 items-stretch">
              <div className="min-h-[200px] lg:min-h-0">
                <MyHotCard
                  myHotData={incentiveData.myHotData ?? {
                    myHotSum: 0,
                    myHotRank: 999,
                    myHotIsChamp: false,
                    myHotNextTier: 5000000,
                    myHotProgress: 0,
                    myHotLabel: "meritz 500",
                  }}
                  selectedViewMonth={selectedViewMonth as 1 | 2 | 3}
                />
              </div>
              <div className="min-h-[400px]">
                <PerformanceChart
                  performanceData={incentiveData.performanceData}
                  showPartnerContent={false}
                  directRanks={directRanks}
                  partnerRanks={partnerRanks}
                  selectedAgent={selectedAgent}
                  agents={agents}
                  setSelectedViewMonth={setSelectedViewMonth}
                />
              </div>
            </div>
          )}
        </div>

        {/* 면책문구 · 푸터 바로 위 */}
        <aside className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-2 border-t border-gray-200/40 dark:border-gray-700/30 flex flex-wrap items-center justify-between gap-3 text-[11px] text-gray-500 dark:text-gray-400">
          <p className="flex-1 min-w-0">
            * 본 자료는 전일 기준으로 작성됩니다. 실제 지급되는 시상금과 상이할 수 있습니다. 참고용으로만 활용하세요.
          </p>
          <p className="flex-shrink-0 whitespace-nowrap">
            최종 업데이트날짜 : {formatUpdateDateLabel(updateDate)}
          </p>
        </aside>
      </main>
    </Suspense>
  );
};

/** API updateDate(MMDD 또는 '0000') → "M월 D일" */
function formatUpdateDateLabel(updateDate: string): string {
  const s = String(updateDate ?? "").trim();
  if (!s || s === "0000") return "-";
  const mm = s.length >= 2 ? parseInt(s.slice(0, 2), 10) : 0;
  const dd = s.length >= 4 ? parseInt(s.slice(2, 4), 10) : 0;
  if (!Number.isFinite(mm) || mm < 1 || mm > 12) return "-";
  const day = Number.isFinite(dd) && dd >= 1 && dd <= 31 ? dd : 0;
  return day ? `${mm}월 ${day}일` : `${mm}월`;
}

/** API updateDate(MMDD 또는 '0000') → "MM.DD" */
function formatUpdateDateShort(updateDate: string): string {
  const s = String(updateDate ?? "").trim();
  if (!s || s === "0000") return "-";
  if (s.length < 4) return "-";
  const mm = s.slice(0, 2);
  const dd = s.slice(2, 4);
  return `${mm}.${dd}`;
}