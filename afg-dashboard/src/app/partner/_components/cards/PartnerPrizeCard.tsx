import React from "react";
import { formatMan } from "@/app/_components/dashboard/utils";

interface PartnerPrizeCardProps {
  title: string;
  value: number;
}

export function PartnerPrizeCard({ title, value }: PartnerPrizeCardProps) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 bg-white/5 dark:bg-gray-800/50">
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{title}</p>
      <p className="text-base font-bold text-primary">{formatMan(value)}만원</p>
    </div>
  );
}
