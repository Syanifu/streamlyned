"use client";

import { useState, useEffect } from "react";
import { Moon, Sun } from "lucide-react";
import { saveThemeAction, saveColorThemeAction } from "@/app/actions/theme";

// Each step: color = "" means default light, "dark" is the dark mode step
const SEQUENCE = [
  { color: "",         dark: false },
  { color: "#BFD3E8", dark: false },
  { color: "#CBE2D4", dark: false },
  { color: "#F0D0D5", dark: false },
  { color: "#E7E7E9", dark: false },
  { color: "#F6DEB2", dark: false },
  { color: "#DAD0E8", dark: false },
  { color: "",         dark: true  },
];

function applyColor(color: string) {
  const root = document.documentElement;
  if (color) {
    root.setAttribute("data-bg", color);
  } else {
    root.removeAttribute("data-bg");
  }
}

function applyDark(dark: boolean) {
  const root = document.documentElement;
  if (dark) {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

interface ThemeToggleProps {
  initialTheme: "light" | "dark";
  initialColor?: string;
}

export default function ThemeToggle({ initialTheme, initialColor }: ThemeToggleProps) {
  const initDark = initialTheme === "dark";
  const initColor = initialColor || "";

  // Find starting index in sequence
  const findIndex = () => {
    const idx = SEQUENCE.findIndex(
      (s) => s.dark === initDark && s.color === initColor
    );
    return idx === -1 ? 0 : idx;
  };

  const [stepIndex, setStepIndex] = useState(findIndex);

  const step = SEQUENCE[stepIndex];

  useEffect(() => {
    applyColor(step.color);
    applyDark(step.dark);
  }, [step]);

  const handleCycle = async () => {
    const nextIndex = (stepIndex + 1) % SEQUENCE.length;
    const next = SEQUENCE[nextIndex];

    // Apply immediately before state/effect
    applyColor(next.color);
    applyDark(next.dark);
    setStepIndex(nextIndex);

    await saveThemeAction(next.dark ? "dark" : "light");
    await saveColorThemeAction(next.color);
  };

  const buttonStyle: React.CSSProperties = step.dark
    ? { background: "#000000" }
    : step.color
      ? { background: step.color }
      : {
          background:
            "conic-gradient(from 0deg, #F0D0D5, #F6DEB2, #CBE2D4, #BFD3E8, #DAD0E8, #F0D0D5)",
        };

  return (
    <button
      onClick={handleCycle}
      title="Cycle theme"
      className="w-[30px] h-[30px] rounded-lg border border-border-custom transition-all hover:scale-110 active:scale-95 overflow-hidden flex items-center justify-center"
      style={buttonStyle}
    >
      {step.dark && <Sun size={14} className="text-white" />}
      {!step.dark && !step.color && <Moon size={14} className="text-neutral-500" />}
    </button>
  );
}
