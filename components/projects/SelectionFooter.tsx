"use client";

import React, { useState } from "react";
import { Trash2, Zap, MoveRight, Loader2, CheckCircle2, AlertCircle, X, ChevronDown } from "lucide-react";

interface SelectionFooterProps {
  count: number;
  selectedIds: string[];
  onDelete: (ids: string[]) => Promise<void>;
  onClearSelection: () => void;
}

type Toast = { type: "success" | "error"; message: string } | null;

const POST_PLATFORMS = [
  { key: "tiktok", label: "TikTok" },
  { key: "instagram", label: "Instagram" },
  { key: "youtube", label: "YouTube" },
];

export default function SelectionFooter({ count, selectedIds, onDelete, onClearSelection }: SelectionFooterProps) {
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [toast, setToast] = useState<Toast>(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(["tiktok"]);
  const [showPlatformPicker, setShowPlatformPicker] = useState(false);

  if (count === 0) return null;

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  };

  const togglePlatform = (key: string) => {
    setSelectedPlatforms(prev =>
      prev.includes(key) ? prev.filter(p => p !== key) : [...prev, key]
    );
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setLoading(true);
    setAction("delete");
    setConfirmDelete(false);
    try {
      await onDelete(selectedIds);
      onClearSelection();
      showToast("success", `${count} clip${count > 1 ? "s" : ""} deleted.`);
    } catch {
      showToast("error", "Failed to delete clips. Please try again.");
    } finally {
      setLoading(false);
      setAction(null);
    }
  };

  const handlePost = async () => {
    // Auto-Posting is coming soon — notify user with guidance to Ready-to-Post Kit
    showToast(
      "error",
      "Direct Auto-Posting is coming soon! Use the 'Post Kit' button on individual clips to download HD and publish natively with maximum reach."
    );
  };

  return (
    <>
      {/* In-app toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl border shadow-xl animate-in slide-in-from-right-5 fade-in duration-300 max-w-md ${
          toast.type === "success"
            ? "bg-brand/10 border-brand/30 text-brand"
            : "bg-red-400/10 border-red-400/30 text-red-400"
        }`}>
          {toast.type === "success"
            ? <CheckCircle2 className="w-4 h-4 shrink-0" />
            : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span className="text-[13px] font-medium leading-relaxed">{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-2 opacity-60 hover:opacity-100 shrink-0">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="w-full py-6 animate-in slide-in-from-bottom-5 fade-in duration-500 border-t border-white/5 bg-[#050505]/40 backdrop-blur-md">
        <div className="relative bg-[#0B100E] border border-white/10 rounded-[32px] px-8 py-4 flex flex-col lg:flex-row items-center justify-between gap-6 w-full shadow-2xl">
          {/* Left: count */}
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-brand flex items-center justify-center text-black font-black text-[16px]">
              {count}
            </div>
            <div className="space-y-0.5">
              <p className="text-[16px] font-extrabold text-white">Clips selected</p>
              <p className="text-[12px] font-medium text-[#5A6F65]">Ready for Post Kit download or deletion</p>
            </div>
          </div>

          {/* Middle: actions */}
          <div className="flex flex-wrap items-center justify-center gap-4 text-[#5A6F65]">
            {confirmDelete ? (
              <div className="flex items-center gap-3">
                <span className="text-[13px] text-red-400 font-medium">Delete {count} clip{count > 1 ? "s" : ""}?</span>
                <button
                  onClick={handleDelete}
                  disabled={loading}
                  className="px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-[13px] font-bold hover:bg-red-500/20 transition-all"
                >
                  Confirm
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="px-4 py-2 rounded-xl border border-white/10 text-[#5A6F65] text-[13px] font-bold hover:text-white transition-all"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={handleDelete}
                disabled={loading}
                className="flex items-center gap-2.5 px-6 py-3 rounded-2xl border border-white/5 bg-white/[0.02] text-[13px] font-bold hover:text-red-400 hover:border-red-400/20 transition-all disabled:opacity-50"
              >
                {loading && action === "delete" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                <span>Delete</span>
              </button>
            )}
          </div>

          {/* Right: platform picker + auto-post */}
          <div className="flex flex-col sm:flex-row items-center gap-4 relative">
            {/* Auto-posting badge indicator */}
            <div className="flex items-center gap-2.5 px-5 py-3 rounded-2xl bg-[#111815] border border-brand/20 text-brand font-black text-[12px] select-none">
              <Zap className="w-4 h-4 fill-brand" />
              <span>AUTO-POSTING</span>
              <span className="px-2 py-0.5 rounded-full bg-brand/15 border border-brand/30 text-brand text-[9px] font-black uppercase tracking-wider">
                Coming Soon
              </span>
            </div>

            {/* Platform selector */}
            <div className="relative">
              <button
                onClick={() => setShowPlatformPicker(v => !v)}
                className="flex items-center gap-2 px-5 py-3 rounded-2xl border border-white/10 text-white font-bold text-[12px] hover:border-brand/30 transition-all"
              >
                <span>
                  {selectedPlatforms.length === 0
                    ? "Select platforms"
                    : selectedPlatforms.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(", ")}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-[#5A6F65]" />
              </button>

              {showPlatformPicker && (
                <div className="absolute bottom-full mb-2 right-0 z-50 bg-[#0B100E] border border-white/10 rounded-2xl p-4 shadow-2xl min-w-[180px] animate-in slide-in-from-bottom-3 fade-in duration-200">
                  <p className="text-[10px] font-black text-[#5A6F65] uppercase tracking-widest mb-3">Post to</p>
                  <div className="flex flex-col gap-2">
                    {POST_PLATFORMS.map(({ key, label }) => (
                      <button
                        key={key}
                        onClick={() => togglePlatform(key)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-bold transition-all ${
                          selectedPlatforms.includes(key)
                            ? "bg-brand/10 border border-brand/30 text-brand"
                            : "border border-white/8 text-[#5A6F65] hover:text-white hover:border-white/20"
                        }`}
                      >
                        <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border ${
                          selectedPlatforms.includes(key) ? "bg-brand border-brand" : "border-white/20"
                        }`}>
                          {selectedPlatforms.includes(key) && (
                            <CheckCircle2 className="w-3 h-3 text-black" />
                          )}
                        </div>
                        {label}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setShowPlatformPicker(false)}
                    className="mt-3 w-full py-2 rounded-xl bg-brand text-black font-black text-[12px] hover:bg-brand-hover transition-all"
                  >
                    Done
                  </button>
                </div>
              )}
            </div>

            {/* Auto-Post CTA Button with Coming Soon badge */}
            <button
              onClick={handlePost}
              disabled={loading}
              className="flex items-center gap-3 px-8 py-4 rounded-3xl bg-brand text-black font-black text-[14px] sm:text-[15px] transition-all hover:scale-[1.02] active:scale-[0.98] shadow-[0_10px_30px_rgba(0,229,143,0.2)]"
            >
              <span>Auto-Post Selected</span>
              <span className="px-2 py-0.5 rounded-full bg-black/20 text-black text-[9px] font-black uppercase tracking-wider">
                Coming Soon
              </span>
              <MoveRight className="w-4 h-4 ml-0.5" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
