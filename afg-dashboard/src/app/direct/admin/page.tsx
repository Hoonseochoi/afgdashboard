"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import LoadingLines from "@/app/_components/shared/LoadingLines";
import { Header } from "@/app/_components/shared/Header";
import { useDashboardData } from "@/hooks/useDashboardData";
import { stripNoticeHtml } from "@/lib/notice-html";

type Notice = {
  id: string;
  title: string;
  body: string;
  enabled: boolean;
  target_audience: string;
  created_at: string;
  updated_at: string;
};

const TARGET_OPTIONS = [
  { value: "all", label: "전체" },
  { value: "direct", label: "다이렉트" },
  { value: "partner", label: "파트너" },
];

function AdminContent() {
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

  const [notices, setNotices] = useState<Notice[]>([]);
  const [noticesLoading, setNoticesLoading] = useState(false);
  const [profileImages, setProfileImages] = useState<Record<string, string>>({});
  const [profileImagesLoading, setProfileImagesLoading] = useState(false);
  const [uploadLogs, setUploadLogs] = useState<{
    configApp: { updateDate?: string } | null;
    configAll: unknown[];
    uploadLog: unknown[];
    uploadHistory: unknown[];
  } | null>(null);
  const [uploadLogsLoading, setUploadLogsLoading] = useState(false);

  const [newNoticeTarget, setNewNoticeTarget] = useState("all");
  const [savingNotice, setSavingNotice] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const noticeEditorRef = useRef<HTMLDivElement>(null);
  const [noticeColor, setNoticeColor] = useState("#000000");

  const [selectedProfileCode, setSelectedProfileCode] = useState("");
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [profilePreview, setProfilePreview] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  const rankKeyMonth = `2026-${String(selectedViewMonth).padStart(2, "0")}`;
  const currentMonthLabel = `${selectedViewMonth}월`;
  const prevMonthNum = selectedViewMonth === 1 ? 12 : selectedViewMonth - 1;
  const prevMonthLabel = `${prevMonthNum}월`;
  const prevMonthKey = selectedViewMonth === 1 ? "2025-12" : `2026-${String(prevMonthNum).padStart(2, "0")}`;

  const isDevelope = user?.code === "develope";

  useEffect(() => {
    if (!user) return;
    if (!isDevelope) {
      router.replace("/direct");
      return;
    }
  }, [user, isDevelope, router]);

  const fetchNotices = async () => {
    setNoticesLoading(true);
    try {
      const res = await fetch("/api/admin/notices");
      const data = await res.json();
      if (res.ok) setNotices(data.notices ?? []);
    } finally {
      setNoticesLoading(false);
    }
  };

  const fetchProfileImages = async () => {
    setProfileImagesLoading(true);
    try {
      const res = await fetch("/api/admin/profile-image");
      const data = await res.json();
      if (res.ok) setProfileImages(data.images ?? {});
    } finally {
      setProfileImagesLoading(false);
    }
  };

  const fetchUploadLogs = async () => {
    setUploadLogsLoading(true);
    try {
      const res = await fetch("/api/admin/upload-logs");
      const data = await res.json();
      if (res.ok) setUploadLogs(data);
    } finally {
      setUploadLogsLoading(false);
    }
  };

  useEffect(() => {
    if (!isDevelope) return;
    fetchNotices();
    fetchProfileImages();
    fetchUploadLogs();
  }, [isDevelope]);

  const handleToggleNotice = async (id: string, enabled: boolean) => {
    try {
      const res = await fetch(`/api/admin/notices/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      if (res.ok) await fetchNotices();
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateNoticeTarget = async (id: string, target_audience: string) => {
    try {
      const res = await fetch(`/api/admin/notices/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target_audience }),
      });
      if (res.ok) await fetchNotices();
    } catch (e) {
      console.error(e);
    }
  };

  const getNoticeEditorHtml = (): string => {
    const el = noticeEditorRef.current;
    if (!el) return "";
    return el.innerHTML.trim();
  };

  const setNoticeEditorHtml = (html: string) => {
    const el = noticeEditorRef.current;
    if (el) el.innerHTML = html || "";
  };

  const handleNoticeBold = () => {
    document.execCommand("bold", false);
    noticeEditorRef.current?.focus();
  };

  const handleNoticeColor = () => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    if (range.collapsed) return;
    const span = document.createElement("span");
    span.style.color = noticeColor;
    try {
      range.surroundContents(span);
    } catch {
      const frag = range.extractContents();
      span.appendChild(frag);
      range.insertNode(span);
    }
    noticeEditorRef.current?.focus();
  };

  const handleAddNotice = async () => {
    const content = getNoticeEditorHtml();
    if (!content) return;
    setSavingNotice(true);
    try {
      const res = await fetch("/api/admin/notices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: content,
          target_audience: newNoticeTarget,
          enabled: true,
        }),
      });
      if (res.ok) {
        setNoticeEditorHtml("");
        setEditingId(null);
        await fetchNotices();
      }
    } finally {
      setSavingNotice(false);
    }
  };

  const handleStartEditNotice = (n: Notice) => {
    setEditingId(n.id);
    setNoticeEditorHtml(n.body || "");
  };

  const handleSaveEditNotice = async () => {
    if (!editingId) return;
    const content = getNoticeEditorHtml();
    setSavingNotice(true);
    try {
      const res = await fetch(`/api/admin/notices/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: content }),
      });
      if (res.ok) {
        setEditingId(null);
        setNoticeEditorHtml("");
        await fetchNotices();
      }
    } finally {
      setSavingNotice(false);
    }
  };

  const handleProfileFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProfileImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setProfilePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSaveProfileImage = async () => {
    if (!selectedProfileCode || !profilePreview) return;
    setSavingProfile(true);
    try {
      const res = await fetch("/api/admin/profile-image", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: selectedProfileCode, imageUrl: profilePreview }),
      });
      if (res.ok) {
        setProfileImages((prev) => ({ ...prev, [selectedProfileCode]: profilePreview }));
        setProfileImageFile(null);
        setProfilePreview(null);
      }
    } finally {
      setSavingProfile(false);
    }
  };

  if (loading) return <LoadingLines />;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;
  if (!user) return null;
  if (!isDevelope) return null;

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

      <main className="max-w-[1000px] mx-auto px-4 sm:px-6 py-8 pb-14">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white tracking-tight">
            관리자 설정
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            develope 계정 전용. 공지·프로필·업로드 로그를 관리합니다.
          </p>
        </header>

        {/* 1. 공지사항 */}
        <section className="mb-10 rounded-2xl bg-white dark:bg-gray-900/80 border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">공지사항</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              한 줄 입력. 드래그한 영역만 굵게/색상 적용. 수정 시 대시보드 상단에 바로 반영됩니다.
            </p>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                공지사항
              </label>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <button
                  type="button"
                  onClick={handleNoticeBold}
                  className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  title="선택 영역 굵게"
                >
                  <span className="font-bold text-sm">B</span>
                </button>
                <div className="inline-flex items-center gap-1.5">
                  <input
                    type="color"
                    value={noticeColor}
                    onChange={(e) => setNoticeColor(e.target.value)}
                    className="w-8 h-8 rounded border border-gray-200 dark:border-gray-600 cursor-pointer p-0"
                    title="선택 영역 색상"
                  />
                  <button
                    type="button"
                    onClick={handleNoticeColor}
                    className="text-xs text-gray-600 dark:text-gray-300 hover:underline"
                  >
                    선택 영역에 색 적용
                  </button>
                </div>
              </div>
              <div
                ref={noticeEditorRef}
                contentEditable
                suppressContentEditableWarning
                data-placeholder="공지 내용을 입력하세요. 텍스트를 드래그한 뒤 위 B 또는 색상을 적용할 수 있습니다."
                className="min-h-[52px] w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 [&:empty::before]:content-[attr(data-placeholder)] [&:empty::before]:text-gray-400"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={newNoticeTarget}
                onChange={(e) => setNewNoticeTarget(e.target.value)}
                className="rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-4 py-2 text-sm"
              >
                {TARGET_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              {editingId ? (
                <>
                  <button
                    type="button"
                    onClick={handleSaveEditNotice}
                    disabled={savingNotice}
                    className="rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 text-sm font-medium"
                  >
                    {savingNotice ? "저장 중…" : "수정 저장"}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setEditingId(null); setNoticeEditorHtml(""); }}
                    className="rounded-xl border border-gray-200 dark:border-gray-600 px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    취소
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleAddNotice}
                  disabled={savingNotice}
                  className="rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 text-sm font-medium"
                >
                  {savingNotice ? "저장 중…" : "공지 추가"}
                </button>
              )}
            </div>

            {noticesLoading ? (
              <p className="text-sm text-gray-500">로딩 중…</p>
            ) : (
              <ul className="space-y-3">
                {notices.map((n) => (
                  <li
                    key={n.id}
                    className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-600 p-3 bg-gray-50/50 dark:bg-gray-800/50"
                  >
                    <span className="flex-1 min-w-0 text-sm text-gray-900 dark:text-white truncate">
                      {stripNoticeHtml(n.body) || "(빈 공지)"}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleStartEditNotice(n)}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      수정
                    </button>
                    <label className="inline-flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300">
                      <input
                        type="checkbox"
                        checked={n.enabled}
                        onChange={() => handleToggleNotice(n.id, !n.enabled)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      표시
                    </label>
                    <select
                      value={n.target_audience}
                      onChange={(e) => handleUpdateNoticeTarget(n.id, e.target.value)}
                      className="rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-2 py-1 text-xs"
                    >
                      {TARGET_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </li>
                ))}
                {notices.length === 0 && !noticesLoading && (
                  <li className="text-sm text-gray-500">등록된 공지가 없습니다.</li>
                )}
              </ul>
            )}
          </div>
        </section>

        {/* 2. 개인별 프로필 이미지 */}
        <section className="mb-10 rounded-2xl bg-white dark:bg-gray-900/80 border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">개인별 프로필 이미지</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              설계사 선택 후 이미지를 첨부하면 해당 사용자만 커스텀 프로필로 표시됩니다.
            </p>
          </div>
          <div className="p-5 space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
              <select
                value={selectedProfileCode}
                onChange={(e) => setSelectedProfileCode(e.target.value)}
                className="rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-4 py-2.5 text-sm min-w-[200px]"
              >
                <option value="">설계사 선택</option>
                {agents.map((a) => (
                  <option key={a.code} value={a.code}>
                    {a.name} ({a.code})
                  </option>
                ))}
              </select>
              <label className="rounded-xl border border-gray-200 dark:border-gray-600 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <span className="material-symbols-outlined align-middle text-lg mr-1">image</span>
                이미지 선택
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleProfileFileChange}
                />
              </label>
              {profilePreview && (
                <button
                  type="button"
                  onClick={handleSaveProfileImage}
                  disabled={savingProfile}
                  className="rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 text-sm font-medium"
                >
                  {savingProfile ? "저장 중…" : "적용"}
                </button>
              )}
            </div>
            {selectedProfileCode && (profileImages[selectedProfileCode] || profilePreview) && (
              <div className="flex items-center gap-4">
                <span className="text-xs text-gray-500">미리보기</span>
                <img
                  src={profilePreview || profileImages[selectedProfileCode] || ""}
                  alt="프로필 미리보기"
                  className="w-16 h-16 rounded-full object-cover border border-gray-200 dark:border-gray-600"
                />
              </div>
            )}
            {profileImagesLoading && <p className="text-sm text-gray-500">로딩 중…</p>}
          </div>
        </section>

        {/* 3. 업로드 기록 */}
        <section className="mb-10 rounded-2xl bg-white dark:bg-gray-900/80 border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">업로드 기록</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              config, upload_log, upload_history에서 최근 데이터를 확인합니다.
            </p>
          </div>
          <div className="p-5">
            {uploadLogsLoading ? (
              <p className="text-sm text-gray-500">로딩 중…</p>
            ) : uploadLogs ? (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Config (app)</h3>
                  <pre className="rounded-xl bg-gray-100 dark:bg-gray-800 p-3 text-xs text-gray-800 dark:text-gray-200 overflow-auto max-h-32">
                    {JSON.stringify(uploadLogs.configApp, null, 2)}
                  </pre>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Config 전체</h3>
                  <pre className="rounded-xl bg-gray-100 dark:bg-gray-800 p-3 text-xs text-gray-800 dark:text-gray-200 overflow-auto max-h-40">
                    {JSON.stringify(uploadLogs.configAll, null, 2)}
                  </pre>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Upload Log (최근 100건)</h3>
                  <pre className="rounded-xl bg-gray-100 dark:bg-gray-800 p-3 text-xs text-gray-800 dark:text-gray-200 overflow-auto max-h-60">
                    {uploadLogs.uploadLog.length === 0
                      ? "데이터 없음 (upload_log 테이블이 없거나 비어 있음)"
                      : JSON.stringify(uploadLogs.uploadLog, null, 2)}
                  </pre>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Upload History (최근 100건)</h3>
                  <pre className="rounded-xl bg-gray-100 dark:bg-gray-800 p-3 text-xs text-gray-800 dark:text-gray-200 overflow-auto max-h-60">
                    {uploadLogs.uploadHistory.length === 0
                      ? "데이터 없음 (upload_history 테이블이 없거나 비어 있음)"
                      : JSON.stringify(uploadLogs.uploadHistory, null, 2)}
                  </pre>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">데이터를 불러오지 못했습니다.</p>
            )}
          </div>
        </section>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => router.push("/direct")}
            className="rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 px-4 py-2 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            대시보드로 돌아가기
          </button>
        </div>
      </main>
    </>
  );
}

export default function DirectAdminPage() {
  return (
    <Suspense fallback={<LoadingLines />}>
      <AdminContent />
    </Suspense>
  );
}
