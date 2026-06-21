"use client";

import { useState, useEffect, useCallback } from "react";

const KEY = "streamlyned_bionic_reading";
const EVENT = "bionicchange";

function broadcast(val: boolean) {
  window.dispatchEvent(new CustomEvent(EVENT, { detail: val }));
}

export function useBionicReading() {
  const [enabled, setEnabledState] = useState(false);

  useEffect(() => {
    setEnabledState(localStorage.getItem(KEY) === "1");

    const handler = (e: Event) => setEnabledState((e as CustomEvent<boolean>).detail);
    window.addEventListener(EVENT, handler);
    return () => window.removeEventListener(EVENT, handler);
  }, []);

  const toggle = useCallback(() => {
    setEnabledState((prev) => {
      const next = !prev;
      localStorage.setItem(KEY, next ? "1" : "0");
      broadcast(next);
      return next;
    });
  }, []);

  const setEnabled = useCallback((val: boolean) => {
    setEnabledState(val);
    localStorage.setItem(KEY, val ? "1" : "0");
    broadcast(val);
  }, []);

  return { enabled, toggle, setEnabled };
}
