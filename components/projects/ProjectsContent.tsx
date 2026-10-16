"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { deleteClip } from "@/lib/queries";
import DashboardLayout from "@/components/shared/DashboardLayout";
import ClipGrid from "@/components/projects/ClipGrid";
import SelectionFooter from "@/components/projects/SelectionFooter";

interface Project {
  id: string;
  title: string;
  thumbnail: string | null;
  clipUrl: string | null;
  score: number;
  scoreKey: string;
  duration: string;
  style?: string;
}

interface ProjectsContentProps {
  clips: Project[];
}

export default function ProjectsContent({ clips }: ProjectsContentProps) {
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const handleDeleteClip = async (id: string) => {
    try {
      await deleteClip(id);
      // Invalidate both the scoped and global queries
      queryClient.invalidateQueries({ queryKey: ["projectsData"] });
    } catch (error) {
      console.error("Failed to delete clip:", error);
      throw error;
    }
  };

  const handleBatchDelete = async (ids: string[]) => {
    try {
      await Promise.all(ids.map((id) => deleteClip(id)));
      queryClient.invalidateQueries({ queryKey: ["projectsData"] });
    } catch (error) {
      console.error("Failed to batch delete clips:", error);
      throw error;
    }
  };

  const handleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === clips.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(clips.map((c: Project) => c.id));
    }
  };

  return (
    <DashboardLayout>
      <div className="flex-1 flex flex-col relative z-10 px-4 sm:px-6 lg:px-8 overflow-hidden pt-4 sm:pt-6 w-full">
        <div className="flex-1 flex flex-col overflow-hidden w-full max-w-[1400px] mx-auto">
          {/* Grid Content - scrollable */}
          <div className="flex-1 overflow-y-auto pr-1 sm:pr-2 scrollbar-hide pb-10">
            <ClipGrid
              clips={clips}
              selectedIds={selectedIds}
              onSelect={handleSelect}
              onSelectAll={handleSelectAll}
              onDelete={handleDeleteClip}
            />
          </div>

          {/* Docked Actions Footer */}
          <SelectionFooter
            count={selectedIds.length}
            selectedIds={selectedIds}
            onDelete={handleBatchDelete}
            onClearSelection={() => setSelectedIds([])}
          />
        </div>
      </div>
    </DashboardLayout>
  );
}
