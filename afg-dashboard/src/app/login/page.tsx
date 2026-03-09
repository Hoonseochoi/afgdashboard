"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "로그인에 실패했습니다.");
        setLoading(false);
        return;
      }

      const branch = data.user?.branch ?? "";
      const isPartner = typeof branch === "string" && branch.includes("파트너");
      router.push(isPartner ? "/partner" : "/direct");
    } catch (err) {
      setError("서버와 통신할 수 없습니다.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <img src="/ci.png" alt="CI" className="h-12 mx-auto object-contain" />
        <h2 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
          대시보드 로그인
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md overflow-visible">
        <div className="bg-white dark:bg-surface-dark py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-gray-200 dark:border-gray-700 overflow-visible">
          <form className="space-y-6 overflow-visible" onSubmit={handleLogin}>
            <div>
              <label
                htmlFor="code"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                사번 (ID)
              </label>
              <div className="mt-1">
                <input
                  id="code"
                  name="code"
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  placeholder="사번을 입력하세요"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                비밀번호
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  placeholder="비밀번호를 입력하세요 (초기 비밀번호: 사번)"
                />
              </div>
            </div>

            {error && (
              <div className="text-red-500 text-sm font-medium text-center">
                {error}
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors disabled:opacity-50"
              >
                {loading ? "로그인 중..." : "로그인"}
              </button>

              <div
                className={`mt-4 flex justify-center ${showHelp ? "pb-52" : ""}`}
                onMouseEnter={() => setShowHelp(true)}
                onMouseLeave={() => setShowHelp(false)}
              >
                <div className="relative inline-flex">
                  <span
                    className="inline-flex p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 dark:hover:text-gray-300 transition-colors cursor-default"
                    title="로그인 방법 안내"
                    aria-label="로그인 방법 안내"
                  >
                    <span className="material-symbols-outlined text-2xl">help</span>
                  </span>
                  {showHelp && (
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-0.5 w-80 min-w-[280px] p-4 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 shadow-lg text-left text-sm text-gray-700 dark:text-gray-300 z-50 whitespace-normal">
                    <p className="font-semibold text-gray-900 dark:text-white mb-2">로그인 방법</p>
                    <ul className="space-y-1.5">
                      <li>
                        <span className="font-medium">설계사 로그인</span>: ID 787654321 / PW 787654321
                        <span className="block text-gray-500 dark:text-gray-400 text-xs mt-0.5">(설계사 본인 메리츠 코드)</span>
                      </li>
                      <li>
                        <span className="font-medium">매니저 로그인</span>: ID 387654321 / PW 387654321
                      </li>
                      <li>
                        <span className="font-medium">내근직 로그인</span>: ID GA9-1 / PW GA9-1
                      </li>
                    </ul>
                    <p className="mt-3 pt-2 border-t border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400">
                      초기 로그인 후 비밀번호를 변경해주세요.
                    </p>
                  </div>
                  )}
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
