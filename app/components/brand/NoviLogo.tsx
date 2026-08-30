"use client";

import { useId } from "react";

type NoviLogoProps = {
  variant?: "horizontal" | "stacked" | "mark";
  theme?: "dark" | "light" | "gradient";
  label?: string;
  className?: string;
};

const palettes = {
  dark: ["#F7F1FF", "#B69EFF", "#7B47F2"],
  light: ["#A78BFA", "#8B5CF6", "#6D28D9"],
  gradient: ["#FBF8FF", "#C8B5FF", "#8C5CFF"],
} as const;

export function NoviLogo({
  variant = "horizontal",
  theme = "dark",
  label = "NOVI logo",
  className = "",
}: NoviLogoProps) {
  const gradientId = useId().replaceAll(":", "");
  const [start, middle, end] = palettes[theme];

  return (
    <span
      className={`novi-lockup ${variant === "stacked" ? "stacked" : ""} ${variant === "mark" ? "mark-only" : ""} ${className}`.trim()}
      role="img"
      aria-label={label}
    >
      <svg className="novi-mark" viewBox="0 0 64 64" fill="none" aria-hidden="true">
        <path
          className="novi-mark-piece novi-mark-left"
          d="M14 46V18c10.7 1.9 16.1 10.8 18.1 18.1C28 41.8 22.8 45.3 14 46Z"
          fill={`url(#${gradientId}-left)`}
        />
        <path
          className="novi-mark-piece novi-mark-flow"
          d="M18.6 16.4c8.8 1 15.2 6.6 21.7 15.4 4.8 6.5 9 10.1 10.7 10.8V48c-10.9-1.2-17.3-6.4-24-15.5-4.5-6.1-7.2-9.2-8.4-9.9v-6.2Z"
          fill={`url(#${gradientId}-flow)`}
        />
        <path
          className="novi-mark-piece novi-mark-right"
          d="M50 18v28c-10.7-1.9-16.1-10.8-18.1-18.1C36 22.2 41.2 18.7 50 18Z"
          fill={`url(#${gradientId}-right)`}
        />
        <defs>
          <linearGradient id={`${gradientId}-left`} x1="14" x2="32" y1="18" y2="46" gradientUnits="userSpaceOnUse">
            <stop stopColor={start} />
            <stop offset=".55" stopColor={middle} />
            <stop offset="1" stopColor={end} />
          </linearGradient>
          <linearGradient id={`${gradientId}-flow`} x1="18.6" x2="51" y1="16.4" y2="48" gradientUnits="userSpaceOnUse">
            <stop stopColor={start} />
            <stop offset=".4" stopColor={middle} />
            <stop offset="1" stopColor={end} />
          </linearGradient>
          <linearGradient id={`${gradientId}-right`} x1="31.9" x2="50" y1="18" y2="46" gradientUnits="userSpaceOnUse">
            <stop stopColor={start} />
            <stop offset=".5" stopColor={middle} />
            <stop offset="1" stopColor={end} />
          </linearGradient>
        </defs>
      </svg>
      {variant !== "mark" && <span className="novi-word">NOVI</span>}
    </span>
  );
}
