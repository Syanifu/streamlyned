"use client";

import React, { useState, useEffect } from "react";
import { Sun, Moon } from "lucide-react";
import { saveThemeAction } from "@/app/actions/theme";

interface ThemeToggleProps {
  initialTheme: "light" | "dark";
}

export default function ThemeToggle({ initialTheme }: ThemeToggleProps) {
  const [theme, setTheme] = useState<"light" | "dark">(initialTheme);

  // Synchronize state with HTML element
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [theme]);

  const handleToggle = async () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    await saveThemeAction(nextTheme);
  };

  return (
    <button
      onClick={handleToggle}
      className="p-2 rounded-lg border border-border-custom hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors"
      title={theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
    >
      {theme === "light" ? <Moon size={15} /> : <Sun size={15} />}
    </button>
  );
}
