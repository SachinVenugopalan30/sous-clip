import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { Search, BookOpen, Trash2, X, CheckSquare, Send } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { RecipeCard } from "../components/RecipeCard";
import { useRecipes, useBulkDeleteRecipes, useDeleteRecipe } from "../hooks/useRecipes";
import { useSettings } from "../hooks/useSettings";
import { api } from "../lib/api";
import { Input } from "../components/ui/input";
import { Skeleton } from "../components/ui/skeleton";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [bulkSendingToMealie, setBulkSendingToMealie] = useState(false);
  const { data, isLoading } = useRecipes(debouncedSearch || undefined);
  const { data: settings } = useSettings();
  const mealieConfigured = !!(settings?.mealie_url && settings?.mealie_api_key);
  const bulkDelete = useBulkDeleteRecipes();
  const singleDelete = useDeleteRecipe();
  const [gridRef] = useAutoAnimate();

  // Collect all unique tags from loaded recipes
  const allTags = Array.from(
    new Set(data?.recipes.flatMap((r) => r.tags) ?? [])
  ).sort();

  // Filter recipes by selected tags
  const filteredRecipes = data?.recipes.filter(
    (r) => selectedTags.size === 0 || r.tags.some((t) => selectedTags.has(t))
  );

  // Simple debounce
  const handleSearch = (value: string) => {
    setSearch(value);
    clearTimeout((window as any).__searchTimeout);
    (window as any).__searchTimeout = setTimeout(
      () => setDebouncedSearch(value),
      300
    );
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (filteredRecipes) {
      setSelectedIds(new Set(filteredRecipes.map((r) => r.id)));
    }
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setConfirmingDelete(false);
  };

  const handleBulkDelete = () => {
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    bulkDelete.mutate(Array.from(selectedIds), {
      onSuccess: () => {
        clearSelection();
      },
    });
  };

  const handleShare = async (id: number) => {
    try {
      const { share_url } = await api.recipes.share(id);
      const fullUrl = `${window.location.origin}${share_url}`;
      await navigator.clipboard.writeText(fullUrl);
      toast.success("Share link copied to clipboard");
    } catch {
      toast.error("Failed to share recipe");
    }
  };

  const handleSendToMealie = async (id: number) => {
    try {
      const result = await api.recipes.sendToMealie(id);
      if (result.ok) toast.success("Recipe sent to Mealie");
      else toast.error(result.error || "Failed to send to Mealie");
    } catch {
      toast.error("Failed to send to Mealie");
    }
  };

  const handleBulkSendToMealie = async () => {
    setBulkSendingToMealie(true);
    try {
      const ids = Array.from(selectedIds);
      const results = await Promise.allSettled(ids.map((id) => api.recipes.sendToMealie(id)));
      const succeeded = results.filter((r) => r.status === "fulfilled" && (r as PromiseFulfilledResult<any>).value.ok).length;
      const failed = results.length - succeeded;
      if (succeeded > 0) toast.success(`${succeeded} recipe${succeeded !== 1 ? "s" : ""} sent to Mealie`);
      if (failed > 0) toast.error(`${failed} recipe${failed !== 1 ? "s" : ""} failed to send`);
    } finally {
      setBulkSendingToMealie(false);
    }
  };

  const handleSingleDelete = (id: number) => {
    if (!confirm("Delete this recipe?")) return;
    singleDelete.mutate(id, {
      onSuccess: () => toast.success("Recipe deleted"),
    });
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Your Recipes</h1>
      </div>

      <div className="relative mt-6">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search recipes by name or ingredient..."
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {allTags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {allTags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => toggleTag(tag)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                selectedTags.has(tag)
                  ? "bg-primary text-primary-foreground"
                  : "bg-bg text-muted-foreground hover:bg-border"
              }`}
            >
              {tag}
            </button>
          ))}
          {selectedTags.size > 0 && (
            <button
              type="button"
              onClick={() => setSelectedTags(new Set())}
              className="flex items-center gap-1 rounded-full px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
              Clear filters
            </button>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton
              key={i}
              className="h-40 animate-pulse rounded-xl bg-surface"
            />
          ))}
        </div>
      ) : filteredRecipes?.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="mt-16 flex flex-col items-center text-center"
        >
          <BookOpen className="h-12 w-12 text-border" />
          <p className="mt-4 text-lg font-medium text-muted-foreground">
            {selectedTags.size > 0 ? "No recipes match these tags" : "No recipes yet"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {selectedTags.size > 0
              ? "Try removing some filters."
              : "Extract your first recipe from a cooking video."}
          </p>
        </motion.div>
      ) : (
        <div
          ref={gridRef}
          className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {filteredRecipes?.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              selected={selectedIds.has(recipe.id)}
              onToggle={toggleSelect}
              onShare={handleShare}
              onDelete={handleSingleDelete}
              mealieConfigured={mealieConfigured}
              onSendToMealie={handleSendToMealie}
            />
          ))}
        </div>
      )}

      {/* Floating selection toolbar */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-xl border border-border bg-surface px-5 py-3 shadow-lg"
          >
            <span className="text-sm font-medium">
              {selectedIds.size} selected
            </span>
            <button
              type="button"
              onClick={selectAll}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:bg-bg"
            >
              <CheckSquare className="h-4 w-4" />
              Select all
            </button>
            <button
              type="button"
              onClick={clearSelection}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:bg-bg"
            >
              <X className="h-4 w-4" />
              Deselect
            </button>
            {mealieConfigured && (
              <button
                type="button"
                onClick={handleBulkSendToMealie}
                disabled={bulkSendingToMealie}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:bg-bg"
              >
                <Send className="h-4 w-4" />
                {bulkSendingToMealie ? "Sending..." : "Send to Mealie"}
              </button>
            )}
            <button
              type="button"
              onClick={handleBulkDelete}
              disabled={bulkDelete.isPending}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                confirmingDelete
                  ? "bg-red-600 text-white hover:bg-red-700"
                  : "text-red-500 hover:bg-red-500/10"
              }`}
            >
              <Trash2 className="h-4 w-4" />
              {bulkDelete.isPending
                ? "Deleting..."
                : confirmingDelete
                  ? "Confirm delete?"
                  : "Delete selected"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
