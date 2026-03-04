"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Dashboard } from "@/app/_components/Dashboard";
import LoadingLines from "@/app/LoadingLines";

function DirectContent() {
  const searchParams = useSearchParams();
  const code = searchParams.get("code");
  return <Dashboard mode="direct" initialCode={code} />;
}

export default function DirectPage() {
  return (
    <Suspense fallback={<LoadingLines />}>
      <DirectContent />
    </Suspense>
  );
}
