"use client";

import React, { useState, useEffect } from "react";
import { getWorkspaceTagsData, addTagAction, removeTagAction, TaggedEntity } from "@/app/actions/tags";
import { Tag, Plus, Search, X, Loader2, Link as LinkIcon, Check } from "lucide-react";
import Link from "next/link";
import { toast } from "react-hot-toast";

export default function TagsManagerPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [tagFilter, setTagFilter] = useState("");

  // Tag creation modal/inline states
  const [selectedEntity, setSelectedEntity] = useState<TaggedEntity | null>(null);
  const [newTagLabel, setNewTagLabel] = useState("");
  const [savingTag, setSavingTag] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const res = await getWorkspaceTagsData();
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

  const handleAddTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEntity || !newTagLabel.trim()) {
      return;
    }
    setSavingTag(true);
    const res = await addTagAction(
      selectedEntity.entityType,
      selectedEntity.id,
      selectedEntity.code,
      newTagLabel.trim()
    );

    if (res.success) {
      toast.success(`Tag #${newTagLabel.trim()} added!`);
      setNewTagLabel("");
      setSelectedEntity(null);
      loadData();
    } else {
      toast.error(res.error || "Failed to add tag.");
    }
    setSavingTag(false);
  };

  const handleRemoveTag = async (tagId: string, label: string) => {
    try {
      const res = await removeTagAction(tagId);
      if (res.success) {
        toast.success(`Tag #${label} removed.`);
        loadData();
      } else {
        toast.error(res.error || "Failed to remove tag.");
      }
    } catch (err: any) {
      toast.error(err.message || "An error occurred.");
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
      </div>
    );
  }

  const entities: TaggedEntity[] = data?.entities || [];
  const allTagsList: string[] = data?.allTagsList || [];

  // Filter entities by search query and tag filter
  const filteredEntities = entities.filter((ent) => {
    const matchesSearch =
      ent.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ent.entityType.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesTag = tagFilter
      ? ent.tags.some((t) => t.label.toLowerCase() === tagFilter.toLowerCase())
      : true;

    return matchesSearch && matchesTag;
  });

  return (
    <div className="space-y-6">
      {/* Title Block */}
      <div className="border-b border-border-custom pb-4 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white flex items-center gap-2">
            <Tag size={20} className="text-brand-accent" />
            Tags &amp; Code Manager
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Central tagging system mapping Account Codes, Item Codes, Employee Emails, Project Codes, and Transaction References.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-surface border border-border-custom rounded-2xl p-4">
          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Total Registered Identifiers</span>
          <div className="text-2xl font-black text-neutral-800 dark:text-white mt-1">
            {entities.length}
          </div>
        </div>
        <div className="bg-surface border border-border-custom rounded-2xl p-4">
          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Distinct Active Tags</span>
          <div className="text-2xl font-black text-neutral-800 dark:text-white mt-1">
            {allTagsList.length}
          </div>
        </div>
      </div>

      {/* Filters & Actions Panel */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:max-w-md">
          <span className="absolute inset-y-0 left-3 flex items-center text-neutral-400">
            <Search size={14} />
          </span>
          <input
            type="text"
            placeholder="Search code index (e.g. CEMENT, PRJ-101)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-9 pr-4 py-2 border border-border-custom bg-surface rounded-xl focus:outline-none focus:border-neutral-400"
          />
        </div>

        {/* Tag filter pills list */}
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 no-scrollbar">
          <button
            onClick={() => setTagFilter("")}
            className={`px-3 py-1 rounded-xl text-[10px] font-bold uppercase transition-all ${
              !tagFilter
                ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hover:text-neutral-700"
            }`}
          >
            All Tags
          </button>
          {allTagsList.map((tag) => (
            <button
              key={tag}
              onClick={() => setTagFilter(tag)}
              className={`px-3 py-1 rounded-xl text-[10px] font-bold uppercase transition-all ${
                tagFilter === tag
                  ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                  : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hover:text-neutral-700"
              }`}
            >
              #{tag}
            </button>
          ))}
        </div>
      </div>

      {/* Master Codes Mapping Table */}
      <div className="bg-surface border border-border-custom rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-neutral-50 dark:bg-neutral-900/30 border-b border-border-custom text-neutral-400 font-bold uppercase tracking-wider">
                <th className="p-3">Entity Type</th>
                <th className="p-3">Identifier Code</th>
                <th className="p-3">Name / Detail</th>
                <th className="p-3">Associated Tags</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEntities.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-neutral-400">
                    No matching identifier codes or tags found in the system registry.
                  </td>
                </tr>
              ) : (
                filteredEntities.map((ent) => (
                  <tr key={`${ent.entityType}_${ent.id}`} className="border-b border-border-custom hover:bg-neutral-50/50 dark:hover:bg-neutral-900/20">
                    <td className="p-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${
                          ent.entityType === "PROJECT"
                            ? "bg-blue-500/10 text-blue-500"
                            : ent.entityType === "ITEM"
                            ? "bg-green-500/10 text-green-500"
                            : ent.entityType === "EMPLOYEE"
                            ? "bg-purple-500/10 text-purple-500"
                            : ent.entityType === "SUPPLIER"
                            ? "bg-orange-500/10 text-orange-500"
                            : ent.entityType === "COA"
                            ? "bg-teal-500/10 text-teal-500"
                            : "bg-pink-500/10 text-pink-500"
                        }`}
                      >
                        {ent.entityType}
                      </span>
                    </td>
                    <td className="p-3">
                      <Link
                        href={ent.route}
                        className="font-bold text-neutral-800 dark:text-neutral-100 hover:text-blue-500 transition-colors flex items-center gap-1 group"
                      >
                        {ent.code}
                        <LinkIcon size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Link>
                    </td>
                    <td className="p-3 text-neutral-500 max-w-xs truncate">{ent.name}</td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1 items-center">
                        {ent.tags.map((t) => (
                          <span
                            key={t.id}
                            className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded bg-brand-accent/10 text-brand-accent text-[9px] font-bold"
                          >
                            #{t.label}
                            <button
                              onClick={() => handleRemoveTag(t.id, t.label)}
                              className="hover:bg-brand-accent/20 rounded p-0.2"
                              title="Delete tag"
                            >
                              <X size={8} />
                            </button>
                          </span>
                        ))}
                        {ent.tags.length === 0 && (
                          <span className="text-[10px] text-neutral-400 italic">Untagged</span>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => setSelectedEntity(ent)}
                        className="px-2 py-1 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 rounded-lg font-bold text-[10px] flex items-center gap-0.5 ml-auto transition-colors"
                      >
                        <Plus size={10} />
                        Add Tag
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Tag Modal-like Popup */}
      {selectedEntity && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border-custom rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-2xl">
            <div>
              <h3 className="text-xs font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider">
                Add Tag to {selectedEntity.code}
              </h3>
              <p className="text-[10px] text-neutral-400 mt-1">
                Assign a custom category tag label to index this master entity.
              </p>
            </div>

            <form onSubmit={handleAddTag} className="space-y-3">
              <div>
                <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                  Tag Label
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Critical, Phase-1, Civil"
                  value={newTagLabel}
                  onChange={(e) => setNewTagLabel(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-border-custom bg-transparent rounded-lg focus:outline-none"
                  autoFocus
                />
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedEntity(null)}
                  className="px-3 py-1.5 border border-border-custom hover:bg-neutral-50 dark:hover:bg-neutral-900 rounded-lg text-xs font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingTag}
                  className="px-3 py-1.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-lg text-xs font-bold hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-1"
                >
                  {savingTag ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                  Save Tag
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
