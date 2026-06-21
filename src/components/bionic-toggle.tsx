"use client";

import { useBionicReading } from "@/hooks/use-bionic-reading";

export default function BionicToggle() {
  const { enabled, toggle } = useBionicReading();

  return (
    <button
      onClick={toggle}
      title={enabled ? "Disable bionic reading" : "Enable bionic reading"}
      className={`w-[30px] h-[30px] rounded-lg border transition-all hover:scale-110 active:scale-95 flex items-center justify-center select-none ${
        enabled
          ? "bg-neutral-900 dark:bg-white border-neutral-900 dark:border-white"
          : "bg-surface border-border-custom hover:border-neutral-400 dark:hover:border-neutral-500"
      }`}
    >
      <span
        className={`text-[13px] leading-none font-black tracking-tight ${
          enabled ? "text-white dark:text-neutral-900" : "text-neutral-500 dark:text-neutral-400"
        }`}
        aria-hidden
      >
        <span className="font-black">B</span>
      </span>
    </button>
  );
}
