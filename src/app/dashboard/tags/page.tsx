"use client";

import React, { useState, useEffect } from "react";
import { getTagsSettingsData } from "@/app/actions/tags";
import TagsClassification from "@/components/tags-classification";
import { Loader2 } from "lucide-react";
import { toast } from "react-hot-toast";

export default function TagsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  const loadData = async () => {
    setLoading(true);
    const res = await getTagsSettingsData();
    if (res.success) {
      setData(res);
    } else {
      toast.error(res.error || "Failed to load tags registry.");
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

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
