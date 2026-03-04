"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Dashboard } from "@/app/_components/Dashboard";
import LoadingLines from "@/app/LoadingLines";

function PartnerContent() {
  const searchParams = useSearchParams();
  const code = searchParams.get("code");
  return <Dashboard mode="partner" initialCode={code} />;
}

export default function PartnerPage() {
  return (
    <Suspense fallback={<LoadingLines />}>
      <PartnerContent />
    </Suspense>
  );
}
