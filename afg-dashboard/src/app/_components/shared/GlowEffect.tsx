"use client";

import React from "react";
import { motion } from "framer-motion";

export type GlowTransition = {
  repeat?: number;
  duration?: number;
  ease?: string;
  repeatType?: "reverse" | "loop";
};

export type GlowEffectProps = {
  className?: string;
  style?: React.CSSProperties;
  colors?: string[];
  mode?:
    | "rotate"
    | "pulse"
    | "breathe"
    | "colorShift"
    | "flowHorizontal"
    | "static"
    | "borderGlow";
  blur?:
    | number
    | "softest"
    | "soft"
    | "medium"
    | "strong"
    | "stronger"
    | "strongest"
    | "none";
  transition?: GlowTransition;
  scale?: number;
  duration?: number;
};

export function GlowEffect({
  className,
  style,
  colors = ["#FF5733", "#33FF57", "#3357FF", "#F1C40F"],
  mode = "rotate",
  blur = "medium",
  transition,
  scale = 1,
  duration = 5,
}: GlowEffectProps) {
  const BASE_TRANSITION = {
    repeat: Infinity,
    duration: duration,
    ease: "linear",
  };

  const animations = {
    rotate: {
      background: [
        `conic-gradient(from 0deg at 50% 50%, ${colors.join(", ")})`,
        `conic-gradient(from 360deg at 50% 50%, ${colors.join(", ")})`,
      ],
      transition: transition ?? BASE_TRANSITION,
    },
    pulse: {
      background: colors.map(
        (color) =>
          `radial-gradient(circle at 50% 50%, ${color} 0%, transparent 100%)`
      ),
      scale: [1 * scale, 1.1 * scale, 1 * scale],
      opacity: [0.5, 0.8, 0.5],
      transition: transition ?? { ...BASE_TRANSITION, repeatType: "reverse" },
    },
    breathe: {
      background: colors.map(
        (color) =>
          `radial-gradient(circle at 50% 50%, ${color} 0%, transparent 100%)`
      ),
      scale: [1 * scale, 1.05 * scale, 1 * scale],
      transition: transition ?? { ...BASE_TRANSITION, repeatType: "reverse" },
    },
    colorShift: {
      background: colors.map((color, index) => {
        const nextColor = colors[(index + 1) % colors.length];
        return `conic-gradient(from 0deg at 50% 50%, ${color} 0%, ${nextColor} 50%, ${color} 100%)`;
      }),
      transition: transition ?? { ...BASE_TRANSITION, repeatType: "reverse" },
    },
    flowHorizontal: {
      background: colors.map((color, index) => {
        const nextColor = colors[(index + 1) % colors.length];
        return `linear-gradient(to right, ${color}, ${nextColor})`;
      }),
      transition: transition ?? { ...BASE_TRANSITION, repeatType: "reverse" },
    },
    static: {
      background: `linear-gradient(to right, ${colors.join(", ")})`,
    },
    borderGlow: {
      background: [
        `conic-gradient(from 0deg at 50% 50%, ${colors[0]}, ${colors[1]}, ${colors[2]}, ${colors[3] ?? colors[0]}, ${colors[0]})`,
        `conic-gradient(from 360deg at 50% 50%, ${colors[0]}, ${colors[1]}, ${colors[2]}, ${colors[3] ?? colors[0]}, ${colors[0]})`,
      ],
      transition: transition ?? BASE_TRANSITION,
    },
  };

  const getBlurClass = (b: GlowEffectProps["blur"]) => {
    if (typeof b === "number") return "";
    const presets: Record<string, string> = {
      softest: "blur-sm",
      soft: "blur",
      medium: "blur-md",
      strong: "blur-lg",
      stronger: "blur-xl",
      strongest: "blur-2xl",
      none: "blur-none",
    };
    return presets[b as string] ?? "blur-md";
  };

  const blurStyle =
    typeof blur === "number"
      ? ({ filter: `blur(${blur}px)` } as React.CSSProperties)
      : undefined;

  return (
    <motion.div
      style={
        {
          ...style,
          ...blurStyle,
          ["--scale" as string]: scale,
          willChange: "transform",
          backfaceVisibility: "hidden",
        } as React.CSSProperties
      }
      animate={animations[mode] as React.ComponentProps<typeof motion.div>["animate"]}
      className={[
        "pointer-events-none absolute inset-0 h-full w-full",
        "scale-[var(--scale)] transform-gpu",
        typeof blur !== "number" ? getBlurClass(blur) : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    />
  );
}
