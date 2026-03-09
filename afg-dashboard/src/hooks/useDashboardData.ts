import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toPng } from "html-to-image";
import { Agent, User, ViewMonth, DashboardMode } from "@/types";
import { RANK_EXCLUDE_CODE } from "@/app/_components/dashboard/constants";
import { 
  calculateIncentiveData, 
  preparePerformanceChartData 
} from "@/lib/engines/incentiveEngine";
import { displayBranch } from "@/app/_components/dashboard/utils";

interface UseDashboardDataProps {
  mode: DashboardMode;
  initialCode: string | null;
  exportAreaRef: React.RefObject<HTMLDivElement | null>;
}

export function useDashboardData({ mode = "all", initialCode = null, exportAreaRef }: UseDashboardDataProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isCaptureMode = searchParams.get("capture") === "1";

  // --- State ---
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [globalRanks, setGlobalRanks] = useState<Record<string, number[]>>({});
  const [directRanks, setDirectRanks] = useState<Record<string, number[]>>({});
  const [partnerRanks, setPartnerRanks] = useState<Record<string, number[]>>({});
  const [updateDate, setUpdateDate] = useState<string>("");
  const [selectedViewMonth, setSelectedViewMonth] = useState<ViewMonth>(3);
  const [prizeMonthDropdownOpen, setPrizeMonthDropdownOpen] = useState(false);
  const [agentSearchOpen, setAgentSearchOpen] = useState(false);
  const [agentSearchQuery, setAgentSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  // UI States
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [showPrizeGuide, setShowPrizeGuide] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showInstallHint, setShowInstallHint] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showPWAInstallPrompt, setShowPWAInstallPrompt] = useState(false);
  const [currentMonthNum, setCurrentMonthNum] = useState(1);

  // Refs
  const deferredPromptRef = useRef<any>(null);

  // --- Effects ---

  useEffect(() => {
    setCurrentMonthNum(new Date().getMonth() + 1);
  }, []);

  // App Health Check
  useEffect(() => {
    fetch("/api/appwrite-health")
      .then((res) => res.json())
      .catch(() => {});
  }, []);

  // standalone 모드 감지
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
    return () => mql?.removeEventListener?.("change", updateStandalone);
  }, []);

  // 모바일 여부 감지
  useEffect(() => {
    if (typeof window === "undefined") return;
    const check = () => setIsMobile(window.matchMedia?.("(max-width: 768px)")?.matches ?? false);
    check();
    const mq = window.matchMedia?.("(max-width: 768px)");
    mq?.addEventListener?.("change", check);
    return () => mq?.removeEventListener?.("change", check);
  }, []);

  // PWA 설치 프롬프트
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      deferredPromptRef.current = e;
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

  // 데이터 페칭
  useEffect(() => {
    const fetchData = async () => {
      try {
        setError(null);
        const endpoint = isCaptureMode ? "/api/capture-data" : "/api/dashboard";
        const res = await fetch(endpoint);
        const data = await res.json();

        if (!res.ok) {
          if (res.status === 401 && !isCaptureMode) {
            router.push("/login");
            return;
          }
          setError(data.error || "데이터를 불러올 수 없습니다.");
          return;
        }

        if (!isCaptureMode && !data.user) {
          router.push("/login");
          return;
        }

        if (data.user) {
          setUser(data.user);
          if (data.user.isFirstLogin) setShowPasswordModal(true);
        }

        const allAgents = data.agents || [];
        setAgents(allAgents);
        setUpdateDate(data.updateDate || "");
        if (data.ranks) setGlobalRanks(data.ranks);
        if (data.directRanks) setDirectRanks(data.directRanks);
        if (data.partnerRanks) setPartnerRanks(data.partnerRanks);

        const excludeTest = allAgents.filter((a: any) => a.code !== RANK_EXCLUDE_CODE);
        if (excludeTest.length > 0) {
          const rankKey = new Date().getMonth() + 1 >= 3 ? "2026-03" : "2026-02";
          const sorted = [...excludeTest].sort((a, b) => (b.performance?.[rankKey] || 0) - (a.performance?.[rankKey] || 0));
          
          if (initialCode) {
            const byCode = excludeTest.find((a: any) => String(a.code) === String(initialCode));
            setSelectedAgent(byCode || sorted[0]);
          } else {
            setSelectedAgent(sorted[0]);
          }
        }
      } catch (err) {
        console.error("데이터 로드 실패", err);
        setError("서버와 통신할 수 없습니다.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router, retryKey, isCaptureMode, initialCode]);

  // GA 리다이렉트
  useEffect(() => {
    if (mode === "all" || !selectedAgent) return;
    const isPartner = (selectedAgent.branch || "").includes("파트너");
    if (mode === "direct" && isPartner) {
      router.replace(`/partner?code=${encodeURIComponent(selectedAgent.code)}`);
    } else if (mode === "partner" && !isPartner) {
      router.replace(`/direct?code=${encodeURIComponent(selectedAgent.code)}`);
    }
  }, [mode, selectedAgent, router]);

  // Capture Mode Global Functions
  useEffect(() => {
    if (!isCaptureMode || !agents.length || !exportAreaRef.current) return;
    
    (window as any).__CAPTURE_SELECT = (index: number) => {
      const list = agents.filter((a: any) => a.code !== RANK_EXCLUDE_CODE);
      const i = Math.max(0, Math.min(index, list.length - 1));
      setSelectedAgent(list[i]);
    };
    
    (window as any).__CAPTURE_GET_PNG = async () => {
      const el = exportAreaRef.current;
      if (!el) return "";
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const removed: { link: HTMLLinkElement; parent: Node; next: Node | null }[] = [];
      try {
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
        const w = el.offsetWidth;
        const h = el.offsetHeight;
        const pad = 4;
        const origStyle = { width: el.style.width, minWidth: el.style.minWidth, maxWidth: el.style.maxWidth, boxSizing: el.style.boxSizing, padding: el.style.padding };
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
        });
        el.style.width = origStyle.width;
        el.style.minWidth = origStyle.minWidth;
        el.style.maxWidth = origStyle.maxWidth;
        el.style.boxSizing = origStyle.boxSizing;
        el.style.padding = origStyle.padding;
        removed.forEach(({ link, parent, next }) => parent.insertBefore(link, next));
        return dataUrl || "";
      } catch (e) {
        removed.forEach(({ link, parent, next }) => parent.insertBefore(link, next));
        console.error("캡처 PNG 실패:", e);
        return "";
      }
    };
    
    return () => {
      delete (window as any).__CAPTURE_SELECT;
      delete (window as any).__CAPTURE_GET_PNG;
    };
  }, [isCaptureMode, agents, exportAreaRef]);

  // --- Handlers ---

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
    const removed: any[] = [];
    try {
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

      const w = el.offsetWidth;
      const h = el.offsetHeight;
      const pad = 4;
      const origStyle = { width: el.style.width, minWidth: el.style.minWidth, maxWidth: el.style.maxWidth, boxSizing: el.style.boxSizing, padding: el.style.padding };
      
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
      });

      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `대시보드_${selectedAgent?.name ?? "내보내기"}_${new Date().toISOString().slice(0, 10)}.png`;
      a.click();

      el.style.width = origStyle.width;
      el.style.minWidth = origStyle.minWidth;
      el.style.maxWidth = origStyle.maxWidth;
      el.style.boxSizing = origStyle.boxSizing;
      el.style.padding = origStyle.padding;
    } catch (e) {
      console.error("PNG 내보내기 실패:", e);
    } finally {
      removed.forEach(({ link, parent, next }) => parent.insertBefore(link, next));
      setExportLoading(false);
    }
  };

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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        setPasswordError(data.error || "비밀번호 변경에 실패했습니다.");
        return;
      }

      setShowPasswordModal(false);
      setUser(user ? { ...user, isFirstLogin: false } : null);
      alert("비밀번호가 성공적으로 변경되었습니다.");
    } catch (err) {
      setPasswordError("서버와 통신할 수 없습니다.");
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleLogout = () => {
    document.cookie = "auth_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    router.push("/login");
  };

  // --- Derived Data ---

  const incentiveData = useMemo(() => {
    if (!selectedAgent) return null;
    const ranksForMode = mode === "direct" ? directRanks : mode === "partner" ? partnerRanks : globalRanks;
    const data = calculateIncentiveData(selectedAgent, agents, selectedViewMonth, ranksForMode, updateDate);
    const performanceData = preparePerformanceChartData(selectedAgent);
    return { ...data, performanceData };
  }, [selectedAgent, agents, selectedViewMonth, globalRanks, directRanks, partnerRanks, mode, updateDate]);

  return {
    agents,
    selectedAgent,
    setSelectedAgent,
    user,
    setUser,
    loading,
    error,
    globalRanks,
    directRanks,
    partnerRanks,
    selectedViewMonth,
    setSelectedViewMonth,
    prizeMonthDropdownOpen,
    setPrizeMonthDropdownOpen,
    agentSearchOpen,
    setAgentSearchOpen,
    agentSearchQuery,
    setAgentSearchQuery,
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
    incentiveData: incentiveData || ({} as any),
    handlePWAInstallClick,
    handleExportPng,
    handleChangePassword,
    handleLogout,
    displayBranch,
    isCaptureMode,
    retryKey,
    setRetryKey,
    updateDate,
  };
}
