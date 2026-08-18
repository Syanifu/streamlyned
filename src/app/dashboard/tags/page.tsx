"use client";

import React, { useState, useEffect } from "react";
import { getTagsSettingsData } from "@/app/actions/tags";
import TagsClassification from "@/components/tags-classification";
import { Loader2 } from "lucide-react";
import { toast } from "react-hot-toast";

export default function TagsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await getTagsSettingsData();
      if (res.success) {
        setData(res);
      } else {
        setErrorMsg(res.error || "Failed to load tags registry.");
        toast.error(res.error || "Failed to load tags registry.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred.");
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  if (errorMsg) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-20 text-center space-y-4">
        <div className="text-red-500 font-bold text-sm">Error Loading Tags Manager</div>
        <p className="text-xs text-neutral-400 max-w-md">{errorMsg}</p>
        <button
          onClick={loadData}
          className="px-4 py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-bold rounded-xl"
        >
          Retry
        </button>
      </div>
    );
  }

  if (loading || !data) {
    return (
      <div className="flex-1 flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
      </div>
    );
  }

  return (
    <TagsClassification
      initialData={data}
      onRefresh={loadData}
    />
  );
}
