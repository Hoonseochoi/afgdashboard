'use client';

import React, { Suspense, useRef } from 'react';
import LoadingLines from './shared/LoadingLines';
import { Header } from './shared/Header';
import { AgentBanner } from './shared/cards/AgentBanner';
import { PerformanceChart } from './shared/PerformanceChart';
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
    
    // Handlers
    handlePWAInstallClick,
    handleExportPng,
    handleChangePassword,
    handleLogout,
    displayBranch,
    isCaptureMode,
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
        imageSrc="/26031w_prize.jpg"
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
              />
            )}
          </div>

          <PerformanceChart
            performanceData={incentiveData.performanceData}
            showPartnerContent={isPartner}
            partnerRanksByMonth={{}} // To be handled
            globalRanks={{}} // To be handled
            setSelectedViewMonth={setSelectedViewMonth}
          />
        </div>
      </main>
    </Suspense>
  );
};