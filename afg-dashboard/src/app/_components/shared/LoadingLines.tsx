"use client";

import React from "react";
import { motion } from "framer-motion";

const LoadingLines: React.FC = () => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur-sm">
      <div className="relative w-20 h-10" style={{ filter: "url(#goo)" }}>
        <motion.div
          animate={{ x: [0, 28, 0], scale: [1, 0.6, 1] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1 left-0 w-6 h-6 rounded-full bg-meritz-red dark:bg-red-500"
        />
        <motion.div
          animate={{ scale: [1, 1.4, 1] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1 left-7 w-6 h-6 rounded-full bg-meritz-red dark:bg-red-500"
        />
        <motion.div
          animate={{ x: [0, -28, 0], scale: [1, 0.6, 1] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1 left-14 w-6 h-6 rounded-full bg-meritz-red dark:bg-red-500"
        />
      </div>

      <svg width="0" height="0" className="absolute hidden">
        <defs>
          <filter id="goo">
            <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 21 -7"
            />
            <feBlend in="SourceGraphic" in2="goo" />
          </filter>
        </defs>
      </svg>
    </div>
  );
};

export default LoadingLines;
