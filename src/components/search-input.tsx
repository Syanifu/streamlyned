"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";

export default function SearchInput() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");

  // Keep search input in sync with URL queries
  useEffect(() => {
    const q = searchParams.get("q");
    if (q) setQuery(q);
    else setQuery("");
  }, [searchParams]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/dashboard/search?q=${encodeURIComponent(query.trim())}`);
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative w-full">
      <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
        <Search size={15} className="text-neutral-400" />
      </div>
      <input
        type="text"
        placeholder="Smart search (e.g. wireframes copy)..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full text-xs pl-10 pr-4 py-2 border border-border-custom bg-neutral-50/50 focus:bg-white rounded-lg focus:outline-none focus:border-brand-accent placeholder-neutral-400 dark:bg-neutral-800/20 dark:focus:bg-neutral-900"
      />
    </form>
  );
}
