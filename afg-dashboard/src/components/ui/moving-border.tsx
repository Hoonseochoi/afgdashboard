"use client";

import React, { useRef } from "react";
import {
  motion,
  useAnimationFrame,
  useMotionTemplate,
  useMotionValue,
  useTransform,
} from "framer-motion";

export const MovingBorder = ({
  children,
  duration = 3000,
  rx,
  ry,
  ...otherProps
}: {
  children: React.ReactNode;
  duration?: number;
  rx?: string;
  ry?: string;
  [key: string]: unknown;
}) => {
  const pathRef = useRef<SVGRectElement | null>(null);
  const progress = useMotionValue<number>(0);

  useAnimationFrame((time) => {
    const length = pathRef.current?.getTotalLength();
    if (length) {
      const pxPerMillisecond = length / duration;
      progress.set((time * pxPerMillisecond) % length);
    }
  });

  const x = useTransform(
    progress,
    (val) => pathRef.current?.getPointAtLength(val).x ?? 0
  );
  const y = useTransform(
    progress,
    (val) => pathRef.current?.getPointAtLength(val).y ?? 0
  );

  const transform = useMotionTemplate`translateX(${x}px) translateY(${y}px) translateX(-50%) translateY(-50%)`;

  return (
    <>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
        className="absolute h-full w-full"
        width="100%"
        height="100%"
        {...otherProps}
      >
        <rect
          fill="none"
          width="100%"
          height="100%"
          rx={rx}
          ry={ry}
          ref={pathRef}
        />
      </svg>
      <motion.div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          display: "inline-block",
          transform,
        }}
      >
        {children}
      </motion.div>
    </>
  );
};

type MovingBorderCardProps = {
  children: React.ReactNode;
  duration?: number;
  borderRadius?: string;
  borderClassName?: string;
  innerClassName?: string;
};

/**
 * 카드 등 임의 콘텐츠를 빙글빙글 도는 컬러 테두리로 감쌉니다.
 */
export function MovingBorderCard({
  children,
  duration = 3000,
  borderRadius = "1rem",
  borderClassName,
  innerClassName,
}: MovingBorderCardProps) {
  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ padding: "3px", borderRadius }}
    >
      <div
        className="absolute inset-0"
        style={{ borderRadius: `calc(${borderRadius} - 2px)` }}
      >
        <MovingBorder duration={duration} rx="30%" ry="30%">
          <div
            className={
              borderClassName ??
              "h-20 w-20 opacity-[0.85] bg-[radial-gradient(#0ea5e9_40%,transparent_60%)] dark:bg-[radial-gradient(#22d3ee_40%,transparent_60%)]"
            }
          />
        </MovingBorder>
      </div>
      <div
        className={innerClassName ?? "relative z-10 h-full w-full overflow-hidden rounded-2xl"}
        style={{ borderRadius: `calc(${borderRadius} - 3px)` }}
      >
        {children}
      </div>
    </div>
  );
}
