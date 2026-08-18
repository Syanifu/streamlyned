"use client";

import React, { useState } from "react";
import {
  Tag as TagIcon,
  Plus,
  Search,
  X,
  Loader2,
  Check,
  Compass,
  AlertTriangle,
  History,
  Settings,
  Link as LinkIcon,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { toast } from "react-hot-toast";
import {
  createCustomTagTypeAction,
  createTagAction,
  updateTagAction,
  setTagStatusAction,
  addAllowedRelationAction,
  removeAllowedRelationAction,
  addTagRelationshipAction,
  removeTagRelationshipAction,
} from "@/app/actions/tags";

interface TagsClassificationProps {
  initialData: {
    types: any[];
    tags: any[];
    relations: any[];
    allowedRelations: any[];
    auditLogs: any[];
    role: string;
  };
  onRefresh: () => void;
}

export default function TagsClassification({ initialData, onRefresh }: TagsClassificationProps) {
  const [activeTab, setActiveTab] = useState<"tags" | "types" | "relations" | "audit">("tags");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTypeFilter, setSelectedTypeFilter] = useState("");

  const isWriter =
    initialData.role === "OWNER" ||
    initialData.role === "ADMIN" ||
    initialData.role === "MANAGER";

  // Create Tag Type form state
  const [newTypeName, setNewTypeName] = useState("");
  const [newTypeDesc, setNewTypeDesc] = useState("");
  const [creatingType, setCreatingType] = useState(false);

  // Create Tag form state
  const [tagTypeSel, setTagTypeSel] = useState("");
  const [tagCode, setTagCode] = useState("");
  const [tagName, setTagName] = useState("");
  const [tagDesc, setTagDesc] = useState("");
  const [tagParentSel, setTagParentSel] = useState("");
  const [creatingTag, setCreatingTag] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState("");

  // Allowed Relation config form state
  const [sourceTypeSel, setSourceTypeSel] = useState("");
  const [targetTypeSel, setTargetTypeSel] = useState("");
  const [relTypeInput, setRelTypeInput] = useState("HAS_ASSOCIATION");
  const [creatingAllowedRel, setCreatingAllowedRel] = useState(false);

  // Tag Relationship link form state
  const [sourceTagSel, setSourceTagSel] = useState("");
  const [targetTagSel, setTargetTagSel] = useState("");
  const [relTypeSel, setRelTypeSel] = useState("");
  const [creatingRelLink, setCreatingRelLink] = useState(false);

  // Edit Tag modal state
  const [editingTag, setEditingTag] = useState<any>(null);
  const [editTagName, setEditTagName] = useState("");
  const [editTagDesc, setEditTagDesc] = useState("");
  const [editTagParent, setEditTagParent] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // Actions
  const handleCreateType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTypeName) return;
    setCreatingType(true);
    const res = await createCustomTagTypeAction(newTypeName, newTypeDesc);
    if (res.success) {
      toast.success(`Tag Type "${newTypeName}" created!`);
      setNewTypeName("");
      setNewTypeDesc("");
      onRefresh();
    } else {
      toast.error(res.error || "Failed to create Tag Type.");
    }
    setCreatingType(false);
  };

  const handleCreateTag = async (e: React.FormEvent, force = false) => {
    e.preventDefault();
    if (!tagTypeSel || !tagCode || !tagName) {
      toast.error("Please fill in required fields.");
      return;
    }
    setCreatingTag(true);
    const res = await createTagAction(
      tagTypeSel,
      tagCode,
      tagName,
      tagDesc,
      tagParentSel || undefined
    );

    if (res.success) {
      toast.success(`Tag "${tagCode}" registered successfully!`);
      setTagCode("");
      setTagName("");
      setTagDesc("");
      setTagParentSel("");
      setDuplicateWarning("");
      onRefresh();
    } else if (res.isWarning) {
      setDuplicateWarning(res.warningMessage || "Possible duplicate detected.");
    } else {
      toast.error(res.error || "Failed to create tag.");
    }
    setCreatingTag(false);
  };

  const handleEditTagSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTag || !editTagName) return;
    setSavingEdit(true);
    const res = await updateTagAction(
      editingTag.id,
      editTagName,
      editTagDesc,
      editTagParent || undefined
    );
    if (res.success) {
      toast.success("Tag updated successfully!");
      setEditingTag(null);
      onRefresh();
    } else {
      toast.error(res.error || "Failed to update tag.");
    }
    setSavingEdit(false);
  };

  const handleToggleStatus = async (tagId: string, currentStatus: string) => {
    const targetStatus = currentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    const res = await setTagStatusAction(tagId, targetStatus);
    if (res.success) {
      toast.success(`Tag status set to ${targetStatus.toLowerCase()}.`);
      onRefresh();
    } else {
      toast.error(res.error || "Failed to change tag status.");
    }
  };

  const handleCreateAllowedRel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceTypeSel || !targetTypeSel || !relTypeInput) return;
    setCreatingAllowedRel(true);
    const res = await addAllowedRelationAction(sourceTypeSel, targetTypeSel, relTypeInput);
    if (res.success) {
      toast.success("Allowed relationship mapping configured!");
      onRefresh();
    } else {
      toast.error(res.error || "Failed to configure relation mapping.");
    }
    setCreatingAllowedRel(false);
  };

  const handleRemoveAllowedRel = async (id: string) => {
    const res = await removeAllowedRelationAction(id);
    if (res.success) {
      toast.success("Allowed relationship mapping removed.");
      onRefresh();
    } else {
      toast.error(res.error || "Failed to delete configuration.");
    }
  };

  const handleCreateRelLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceTagSel || !targetTagSel || !relTypeSel) return;
    setCreatingRelLink(true);
    const res = await addTagRelationshipAction(sourceTagSel, targetTagSel, relTypeSel);
    if (res.success) {
      toast.success("Tag relationship link created!");
      setSourceTagSel("");
      setTargetTagSel("");
      onRefresh();
    } else {
      toast.error(res.error || "Failed to map relationship link.");
    }
    setCreatingRelLink(false);
  };

  const handleRemoveRelLink = async (id: string) => {
    const res = await removeTagRelationshipAction(id);
    if (res.success) {
      toast.success("Tag relationship link removed.");
      onRefresh();
    } else {
      toast.error(res.error || "Failed to delete link.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="border-b border-border-custom pb-4 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white flex items-center gap-2">
            <TagIcon size={20} className="text-brand-accent" />
            Tags &amp; Classifications
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Build custom hierarchies, map company roles, link cost codes, and manage operating locations workspace-wide.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border-custom flex gap-1">
        <button
          onClick={() => setActiveTab("tags")}
          className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
            activeTab === "tags"
              ? "border-neutral-900 text-neutral-900 dark:border-white dark:text-white"
              : "border-transparent text-neutral-400 hover:text-neutral-600"
          }`}
        >
          Tag Register
        </button>
        <button
          onClick={() => setActiveTab("types")}
          className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
            activeTab === "types"
              ? "border-neutral-900 text-neutral-900 dark:border-white dark:text-white"
              : "border-transparent text-neutral-400 hover:text-neutral-600"
          }`}
        >
          Tag Types
        </button>
        <button
          onClick={() => setActiveTab("relations")}
          className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
            activeTab === "relations"
              ? "border-neutral-900 text-neutral-900 dark:border-white dark:text-white"
              : "border-transparent text-neutral-400 hover:text-neutral-600"
          }`}
        >
          Relationship Graph
        </button>
        <button
          onClick={() => setActiveTab("audit")}
          className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
            activeTab === "audit"
              ? "border-neutral-900 text-neutral-900 dark:border-white dark:text-white"
              : "border-transparent text-neutral-400 hover:text-neutral-600"
          }`}
        >
          Audit History
        </button>
      </div>

      {/* TAB 1: TAGS REGISTER */}
      {activeTab === "tags" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Main List */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <span className="absolute inset-y-0 left-3 flex items-center text-neutral-400">
                  <Search size={14} />
                </span>
                <input
                  type="text"
                  placeholder="Search tags by code or name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs pl-9 pr-4 py-2 border border-border-custom bg-surface rounded-xl focus:outline-none focus:border-neutral-400"
                />
              </div>

              <select
                value={selectedTypeFilter}
                onChange={(e) => setSelectedTypeFilter(e.target.value)}
                className="text-xs px-3 py-2 border border-border-custom bg-surface rounded-xl focus:outline-none"
              >
                <option value="">All Classification Types</option>
                {initialData.types.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="bg-surface border border-border-custom rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-neutral-50 dark:bg-neutral-900/30 border-b border-border-custom text-neutral-400 font-bold uppercase tracking-wider">
                      <th className="p-3">Classification Node</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">Parent Link</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {initialData.tags
                      .filter((t) => {
                        const mQuery =
                          t.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          t.name.toLowerCase().includes(searchQuery.toLowerCase());
                        const mType = selectedTypeFilter ? t.tagTypeId === selectedTypeFilter : true;
                        return mQuery && mType;
                      })
                      .map((t) => (
                        <tr key={t.id} className="border-b border-border-custom hover:bg-neutral-50/50 dark:hover:bg-neutral-900/20">
                          <td className="p-3">
                            <div className="font-extrabold text-neutral-800 dark:text-neutral-100 flex items-center gap-1.5">
                              {t.code}
                              {t.entityType && (
                                <span className="inline-flex items-center px-1.5 py-0.2 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-400 text-[8px] font-extrabold uppercase">
                                  Synced {t.entityType}
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-neutral-400 mt-0.5">{t.name}</div>
                          </td>
                          <td className="p-3 font-semibold text-neutral-600 dark:text-neutral-300">
                            {t.tagType.name}
                          </td>
                          <td className="p-3 font-mono text-[10px] text-neutral-400">
                            {t.parentTag ? `${t.parentTag.code} (${t.parentTag.name})` : "—"}
                          </td>
                          <td className="p-3">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                t.status === "ACTIVE"
                                  ? "bg-green-500/10 text-green-500"
                                  : "bg-neutral-100 text-neutral-400"
                              }`}
                            >
                              {t.status}
                            </span>
                          </td>
                          <td className="p-3 text-right space-x-1.5">
                            {isWriter && (
                              <>
                                <button
                                  onClick={() => {
                                    setEditingTag(t);
                                    setEditTagName(t.name);
                                    setEditTagDesc(t.description || "");
                                    setEditTagParent(t.parentTagId || "");
                                  }}
                                  className="text-blue-500 hover:underline font-bold text-[10px]"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleToggleStatus(t.id, t.status)}
                                  className="text-neutral-400 hover:text-neutral-600 font-bold text-[10px]"
                                >
                                  {t.status === "ACTIVE" ? "Deactivate" : "Activate"}
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="bg-surface border border-border-custom rounded-2xl p-5 space-y-4">
            <h3 className="text-xs font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider flex items-center gap-1.5">
              <Plus size={14} className="text-brand-accent" />
              Register Tag Node
            </h3>

            {isWriter ? (
              <form onSubmit={(e) => handleCreateTag(e)} className="space-y-3">
                {duplicateWarning && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-1 text-[10px] text-amber-600">
                    <div className="font-bold flex items-center gap-1">
                      <AlertTriangle size={12} />
                      Fuzzy Duplicate Match
                    </div>
                    <p>{duplicateWarning}</p>
                    <button
                      type="button"
                      onClick={(e) => handleCreateTag(e, true)}
                      className="mt-1 font-bold underline block"
                    >
                      Ignore and create anyway
                    </button>
                  </div>
                )}

                <div>
                  <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                    Tag Type Category
                  </label>
                  <select
                    required
                    value={tagTypeSel}
                    onChange={(e) => {
                      setTagTypeSel(e.target.value);
                      setTagParentSel("");
                    }}
                    className="w-full text-xs px-3 py-2 border border-border-custom bg-transparent dark:bg-neutral-900 rounded-lg focus:outline-none"
                  >
                    <option value="">Select Type</option>
                    {initialData.types.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                    Short Code (Stable ID)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CIV-001"
                    value={tagCode}
                    onChange={(e) => setTagCode(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-border-custom bg-transparent rounded-lg focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                    Human Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Civil Labour"
                    value={tagName}
                    onChange={(e) => setTagName(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-border-custom bg-transparent rounded-lg focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                    Parent Tag Node (Optional Hierarchy)
                  </label>
                  <select
                    value={tagParentSel}
                    onChange={(e) => setTagParentSel(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-border-custom bg-transparent dark:bg-neutral-900 rounded-lg focus:outline-none"
                  >
                    <option value="">No Parent (Root Node)</option>
                    {initialData.tags
                      .filter((t) => t.tagTypeId === tagTypeSel && t.status === "ACTIVE")
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.code} — {t.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                    Description
                  </label>
                  <textarea
                    placeholder="Optional details..."
                    value={tagDesc}
                    onChange={(e) => setTagDesc(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-border-custom bg-transparent rounded-lg focus:outline-none"
                    rows={2}
                  />
                </div>

                <button
                  type="submit"
                  disabled={creatingTag}
                  className="w-full py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-bold uppercase tracking-wider rounded-xl hover:scale-[1.02] transition-all flex items-center justify-center gap-1"
                >
                  {creatingTag ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                  Add Tag Node
                </button>
              </form>
            ) : (
              <p className="text-xs text-neutral-400">
                You do not have write access to register new tags. Only managers and owners can configure metadata.
              </p>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: TAG TYPES */}
      {activeTab === "types" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Tag Types List */}
          <div className="lg:col-span-2 bg-surface border border-border-custom rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-neutral-50 dark:bg-neutral-900/30 border-b border-border-custom text-neutral-400 font-bold uppercase tracking-wider">
                    <th className="p-3">Tag Type Classification</th>
                    <th className="p-3">System Managed</th>
                    <th className="p-3">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {initialData.types.map((type) => (
                    <tr key={type.id} className="border-b border-border-custom hover:bg-neutral-50/50 dark:hover:bg-neutral-900/20">
                      <td className="p-3 font-bold text-neutral-800 dark:text-neutral-100">{type.name}</td>
                      <td className="p-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            type.isSystem
                              ? "bg-blue-500/10 text-blue-500"
                              : "bg-purple-500/10 text-purple-500"
                          }`}
                        >
                          {type.isSystem ? "System" : "Custom"}
                        </span>
                      </td>
                      <td className="p-3 text-neutral-500">{type.description || "No description."}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Form */}
          <div className="bg-surface border border-border-custom rounded-2xl p-5 space-y-4">
            <h3 className="text-xs font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider flex items-center gap-1.5">
              <Plus size={14} className="text-brand-accent" />
              Create Custom Tag Type
            </h3>

            {isWriter ? (
              <form onSubmit={handleCreateType} className="space-y-3">
                <div>
                  <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                    Tag Type Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Region or Phase"
                    value={newTypeName}
                    onChange={(e) => setNewTypeName(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-border-custom bg-transparent rounded-lg focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                    Description
                  </label>
                  <textarea
                    placeholder="Describe what this category classifies..."
                    value={newTypeDesc}
                    onChange={(e) => setNewTypeDesc(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-border-custom bg-transparent rounded-lg focus:outline-none"
                    rows={3}
                  />
                </div>

                <button
                  type="submit"
                  disabled={creatingType}
                  className="w-full py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-bold uppercase tracking-wider rounded-xl hover:scale-[1.02] transition-all flex items-center justify-center gap-1"
                >
                  {creatingType ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                  Add Custom Type
                </button>
              </form>
            ) : (
              <p className="text-xs text-neutral-400">
                You do not have write access to create new metadata tag types.
              </p>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: RELATIONSHIPS */}
      {activeTab === "relations" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Allowed configurations */}
          <div className="space-y-4 bg-surface border border-border-custom rounded-2xl p-5">
            <div>
              <h3 className="text-xs font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider flex items-center gap-1.5">
                <Settings size={14} />
                Permitted Type Mappings Configuration
              </h3>
              <p className="text-[10px] text-neutral-400 mt-1">
                Configure which categories are allowed to establish relationship links (e.g. WBS can relate to Cost Codes).
              </p>
            </div>

            {isWriter && (
              <form onSubmit={handleCreateAllowedRel} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end p-3 border border-border-custom rounded-xl bg-neutral-50/50 dark:bg-neutral-900/10">
                <div>
                  <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Source Type</label>
                  <select
                    required
                    value={sourceTypeSel}
                    onChange={(e) => setSourceTypeSel(e.target.value)}
                    className="w-full text-xs px-2 py-1.5 border border-border-custom bg-transparent dark:bg-neutral-900 rounded-lg"
                  >
                    <option value="">Select</option>
                    {initialData.types.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Target Type</label>
                  <select
                    required
                    value={targetTypeSel}
                    onChange={(e) => setTargetTypeSel(e.target.value)}
                    className="w-full text-xs px-2 py-1.5 border border-border-custom bg-transparent dark:bg-neutral-900 rounded-lg"
                  >
                    <option value="">Select</option>
                    {initialData.types.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={creatingAllowedRel}
                  className="py-1.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-bold uppercase rounded-lg hover:scale-[1.02] flex items-center justify-center gap-1"
                >
                  {creatingAllowedRel ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                  Configure Map
                </button>
              </form>
            )}

            <div className="space-y-2">
              {initialData.allowedRelations.map((ar) => (
                <div key={ar.id} className="flex justify-between items-center p-2 rounded-lg border border-border-custom bg-surface hover:bg-neutral-50/50">
                  <span className="text-xs font-semibold text-neutral-850 dark:text-neutral-100 flex items-center gap-2">
                    {ar.sourceType.name}
                    <LinkIcon size={12} className="text-neutral-400" />
                    {ar.targetType.name}
                  </span>
                  {isWriter && (
                    <button
                      onClick={() => handleRemoveAllowedRel(ar.id)}
                      className="p-1 text-red-500 hover:bg-red-500/10 rounded"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Active Tag relationships Links */}
          <div className="space-y-4 bg-surface border border-border-custom rounded-2xl p-5">
            <div>
              <h3 className="text-xs font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider flex items-center gap-1.5">
                <Compass size={14} />
                Establish Tag Relationship Link
              </h3>
              <p className="text-[10px] text-neutral-400 mt-1">
                Link specific tag instances together to construct the classification relational graph.
              </p>
            </div>

            {isWriter && (
              <form onSubmit={handleCreateRelLink} className="space-y-3 p-3 border border-border-custom rounded-xl bg-neutral-50/50 dark:bg-neutral-900/10">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Source Tag (Tag A)</label>
                    <select
                      required
                      value={sourceTagSel}
                      onChange={(e) => setSourceTagSel(e.target.value)}
                      className="w-full text-xs px-2 py-1.5 border border-border-custom bg-transparent dark:bg-neutral-900 rounded-lg"
                    >
                      <option value="">Select</option>
                      {initialData.tags.map((t) => (
                        <option key={t.id} value={t.id}>{t.code} ({t.tagType.name})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Target Tag (Tag B)</label>
                    <select
                      required
                      value={targetTagSel}
                      onChange={(e) => setTargetTagSel(e.target.value)}
                      className="w-full text-xs px-2 py-1.5 border border-border-custom bg-transparent dark:bg-neutral-900 rounded-lg"
                    >
                      <option value="">Select</option>
                      {initialData.tags.map((t) => (
                        <option key={t.id} value={t.id}>{t.code} ({t.tagType.name})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                    Select Configured Relationship Type
                  </label>
                  <select
                    required
                    value={relTypeSel}
                    onChange={(e) => setRelTypeSel(e.target.value)}
                    className="w-full text-xs px-2 py-1.5 border border-border-custom bg-transparent dark:bg-neutral-900 rounded-lg"
                  >
                    <option value="">Select Type</option>
                    <option value="HAS_WBS">has WBS</option>
                    <option value="USES_COST_CODE">uses Cost Code</option>
                    <option value="LOCATED_AT">located at Location</option>
                    <option value="HAS_ASSOCIATION">has generic association</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={creatingRelLink}
                  className="w-full py-1.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-bold uppercase rounded-lg hover:scale-[1.02] flex items-center justify-center gap-1"
                >
                  {creatingRelLink ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                  Link Tag Nodes
                </button>
              </form>
            )}

            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 no-scrollbar">
              {initialData.relations.map((rel) => (
                <div key={rel.id} className="flex justify-between items-center p-2 rounded-lg border border-border-custom bg-surface hover:bg-neutral-50/50">
                  <span className="text-xs font-semibold text-neutral-850 dark:text-neutral-100 flex items-center gap-2">
                    {rel.sourceTag.code}
                    <span className="text-[9px] font-bold uppercase text-neutral-400">
                      {rel.relationshipType.replace(/_/g, " ")}
                    </span>
                    {rel.targetTag.code}
                  </span>
                  {isWriter && (
                    <button
                      onClick={() => handleRemoveRelLink(rel.id)}
                      className="p-1 text-red-500 hover:bg-red-500/10 rounded"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: AUDIT LOG */}
      {activeTab === "audit" && (
        <div className="bg-surface border border-border-custom rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-850 dark:text-neutral-200 border-b border-border-custom pb-3 mb-4">
            <History size={14} className="text-brand-accent" />
            <span>Tag Modification Audit Log Stream</span>
          </div>

          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1 no-scrollbar text-xs">
            {initialData.auditLogs.map((log) => (
              <div key={log.id} className="p-3 border border-border-custom bg-surface/50 dark:bg-neutral-900/30 rounded-xl space-y-2 hover:shadow-sm transition-shadow">
                <div className="flex justify-between items-center">
                  <span className="font-extrabold text-[10px] text-brand-accent uppercase tracking-wider">
                    {log.action.replace(/_/g, " ")}
                  </span>
                  <span className="text-[9px] text-neutral-400 font-mono">
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
                </div>
                <div className="text-[10px] leading-normal font-medium text-neutral-700 dark:text-neutral-350">
                  Actor: <span className="font-bold">{log.userName}</span> ({log.email}) • Target Entity: {log.entityType} ({log.entityId.slice(-6)})
                </div>
                {(log.oldValue || log.newValue) && (
                  <div className="grid grid-cols-2 gap-3 p-2 bg-neutral-100/50 dark:bg-neutral-900/50 rounded-lg text-[9px] font-mono leading-relaxed overflow-x-auto text-neutral-500">
                    <div>
                      <div className="font-bold text-[8px] uppercase text-neutral-400 mb-0.5">Old Value</div>
                      <pre className="max-w-full overflow-x-auto">{log.oldValue ? JSON.stringify(log.oldValue, null, 2) : "Null"}</pre>
                    </div>
                    <div>
                      <div className="font-bold text-[8px] uppercase text-neutral-400 mb-0.5">New Value</div>
                      <pre className="max-w-full overflow-x-auto">{log.newValue ? JSON.stringify(log.newValue, null, 2) : "Null"}</pre>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit Tag Popup Modal */}
      {editingTag && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border-custom rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-2xl">
            <div>
              <h3 className="text-xs font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider">
                Edit Tag Node: {editingTag.code}
              </h3>
            </div>

            <form onSubmit={handleEditTagSubmit} className="space-y-3">
              <div>
                <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                  Tag Name
                </label>
                <input
                  type="text"
                  required
                  value={editTagName}
                  onChange={(e) => setEditTagName(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-border-custom bg-transparent rounded-lg focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                  Parent Tag Node
                </label>
                <select
                  value={editTagParent}
                  onChange={(e) => setEditTagParent(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-border-custom bg-transparent dark:bg-neutral-900 rounded-lg focus:outline-none"
                >
                  <option value="">No Parent (Root Node)</option>
                  {initialData.tags
                    .filter((t) => t.tagTypeId === editingTag.tagTypeId && t.id !== editingTag.id && t.status === "ACTIVE")
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.code} — {t.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                  Description
                </label>
                <textarea
                  value={editTagDesc}
                  onChange={(e) => setEditTagDesc(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-border-custom bg-transparent rounded-lg focus:outline-none"
                  rows={2}
                />
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setEditingTag(null)}
                  className="px-3 py-1.5 border border-border-custom hover:bg-neutral-50 dark:hover:bg-neutral-900 rounded-lg text-xs font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-3 py-1.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-lg text-xs font-bold hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-1"
                >
                  {savingEdit ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
