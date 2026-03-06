import React from "react";
import { Component as ThreeDotsLoader } from "@/components/ui/3-dots-loader";

const LoadingLines: React.FC = () => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur-sm">
      <ThreeDotsLoader />
    </div>
  );
};

export default LoadingLines;
