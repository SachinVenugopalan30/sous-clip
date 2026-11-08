import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Search, Trash2, X, CheckSquare, Send, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { RecipeCard } from "../components/RecipeCard";
import { useRecipes, useBulkDeleteRecipes, useDeleteRecipe } from "../hooks/useRecipes";
import { useMealieConfigured, useUpdateStatus } from "../hooks/useSettings";
import { api } from "../lib/api";
import { copyShareLink, sendToMealie } from "../lib/recipeActions";
import { applyLibraryFilters, buildShelves, CAP_NAME, formatAdded, FROM_LIBRARY, nameClicked, opened, photoName, recipeNo, splitTitle, totalMinutes, type LibraryFilters, type SortKey } from "../lib/library";
import type { Recipe } from "../lib/api";
import { Input } from "../components/ui/input";

export const Route = createFileRoute("/")({
  component: HomePage,
});

const DISMISSED_KEY = "dismissedUpdate";
const NO_FILTERS: LibraryFilters = { maxMinutes: null, addedWithinDays: null, sort: "newest" };
const TIME_CHIPS = [15, 30, 60];
const ADDED_CHIPS: [number, string][] = [[7, "This week"], [30, "This month"]];

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-pressed={active} onClick={onClick} className="lchip press">
      {children}
    </button>
  );
}

function Hero({ recipe, collapsed, ownsName }: { recipe: Recipe; collapsed: boolean; ownsName: boolean }) {
  const { main, suffix } = splitTitle(recipe.title);
  const words = main.split(" ");
  const last = words.pop() ?? "";
  const time = totalMinutes(recipe);
  return (
    <section className={`feat${collapsed ? " collapsed" : ""}`}>
      <div className="feat-photo" style={ownsName ? { viewTransitionName: photoName(recipe.id) } : undefined}>
        {recipe.thumbnail_url ? <img src={recipe.thumbnail_url} alt="" fetchPriority="high" /> : <div className="plate-fb" aria-hidden="true" />}
      </div>
      <div className="fx" aria-hidden={collapsed || undefined} inert={collapsed} style={ownsName ? { viewTransitionName: CAP_NAME } : undefined}>
        <div className="lib-wrap fx-wrap">
          <div>
            <h1 className="in" style={{ "--i": 1 } as React.CSSProperties}>
              {words.join(" ")}{words.length > 0 && " "}<em>{last}</em>
              {suffix && <small>{suffix}</small>}
            </h1>
            <p className="mono in" style={{ "--i": 2 } as React.CSSProperties}>
              {recipeNo(recipe.id)}{time ? ` / ${time} min` : ""} / added {formatAdded(recipe.created_at)}
            </p>
          </div>
          <Link
            to="/recipe/$recipeId"
            params={{ recipeId: String(recipe.id) }}
            state={FROM_LIBRARY}
            onClick={(e) => nameClicked(e, ".feat-photo", ".fx", recipe.id)}
            className="fx-btn press in"
            style={{ "--i": 3 } as React.CSSProperties}
          >
            Open recipe <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

// Shows a new-release notice once per version; dismissing it (or opening Settings) hides it until the next one
function useNewReleaseToast() {
  const { data: update } = useUpdateStatus();
  const navigate = useNavigate();

  useEffect(() => {
    const latest = update?.latest;
    if (!update?.update_available || !latest) return;
    const dismiss = () => {
      try {
        localStorage.setItem(DISMISSED_KEY, latest);
      } catch {
        // storage blocked: the toast just comes back next visit
      }
    };
    try {
      if (localStorage.getItem(DISMISSED_KEY) === latest) return;
    } catch {
      // storage blocked: show it anyway
    }
    toast(`Sous Clip ${latest} is available`, {
      id: "new-release",
      description: `You're on ${update.current}.`,
      duration: Infinity,
      closeButton: true,
      onDismiss: dismiss,
      action: {
        label: "View",
        onClick: () => {
          dismiss();
          navigate({ to: "/settings" });
        },
      },
    });
  }, [update, navigate]);
}

function HomePage() {
  useNewReleaseToast();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<LibraryFilters>(NO_FILTERS);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [bulkSendingToMealie, setBulkSendingToMealie] = useState(false);
  const { data, isLoading } = useRecipes(debouncedSearch || undefined);
  const mealieConfigured = useMealieConfigured();
  const bulkDelete = useBulkDeleteRecipes();
  const singleDelete = useDeleteRecipe();
  // Same cache entry as the layout's: the hero is the newest of the whole library, whatever the search
  const { data: all } = useRecipes();
  const [showAll, setShowAll] = useState(false);

  // Collect all unique tags from loaded recipes
  const allTags = Array.from(
    new Set(data?.recipes.flatMap((r) => r.tags) ?? [])
  ).sort();

  // Filter by tags, cooking time and date added; then sort
  const filteredRecipes = data && applyLibraryFilters(
    data.recipes.filter((r) => selectedTags.size === 0 || r.tags.some((t) => selectedTags.has(t))),
    filters
  );
  const filtering = selectedTags.size > 0 || filters.maxMinutes !== null || filters.addedWithinDays !== null;
  const toggleFilter = (key: "maxMinutes" | "addedWithinDays", value: number) =>
    setFilters({ ...filters, [key]: filters[key] === value ? null : value });

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    // Only what is on screen: the union of the rendered shelves, or the whole grid
    const shown = shelves ? shelves.flatMap((sh) => sh.recipes) : filteredRecipes;
    if (shown) setSelectedIds(new Set(shown.map((r) => r.id)));
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

  const handleBulkSendToMealie = async () => {
    setBulkSendingToMealie(true);
    try {
      const ids = Array.from(selectedIds);
      const results = await Promise.allSettled(ids.map((id) => api.recipes.sendToMealie(id)));
      const succeeded = results.filter((r) => r.status === "fulfilled" && (r as PromiseFulfilledResult<{ ok: boolean }>).value.ok).length;
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

  // Layout follows the debounced query, the same one `data` was fetched with, so there is no flash of the wrong layout
  const searching = debouncedSearch !== "";
  const collapsed = filtering || searching;
  const hero = all && all.recipes.length > 0
    ? all.recipes.reduce((a, r) => (Date.parse(r.created_at) > Date.parse(a.created_at) ? r : a))
    : null;
  const shelves = filteredRecipes && !collapsed && !showAll && filters.sort === "newest" ? buildShelves(filteredRecipes) : null;
  const latestShown = shelves?.find((sh) => sh.key === "latest")?.recipes.length ?? 0;
  const canSeeAll = !!shelves && (filteredRecipes?.length ?? 0) > latestShown;
  // Picks which element could carry the opened recipe's names: the expanded hero if it shows that recipe, else its first tile.
  // Only the recipe in `opened` is actually named (see transitionName below), so a recipe on several shelves never has the name twice.
  const nameOwner = new Map<number, string>();
  if (hero && !collapsed) nameOwner.set(hero.id, "hero");
  for (const sh of shelves ?? [{ key: "grid", recipes: filteredRecipes ?? [] }])
    for (const r of sh.recipes) if (!nameOwner.has(r.id)) nameOwner.set(r.id, sh.key);
  const cardFor = (recipe: Recipe, i: number, shelfKey: string) => (
    <RecipeCard
      key={recipe.id}
      recipe={recipe}
      index={i}
      transitionName={nameOwner.get(recipe.id) === shelfKey && recipe.id === opened.id}
      selected={selectedIds.has(recipe.id)}
      onToggle={toggleSelect}
      onShare={copyShareLink}
      onDelete={handleSingleDelete}
      mealieConfigured={mealieConfigured}
      onSendToMealie={sendToMealie}
    />
  );
  const clearFilters = () => {
    setSelectedTags(new Set());
    setFilters({ ...NO_FILTERS, sort: filters.sort });
  };
  const resetAll = () => {
    clearFilters();
    setSearch("");
    setDebouncedSearch("");
  };
  const empty = filteredRecipes?.length === 0;

  return (
    <div className="lib">
      {hero ? <Hero recipe={hero} collapsed={collapsed} ownsName={!collapsed && hero.id === opened.id} /> : <div style={{ height: "var(--bar-h)" }} />}
      {(!hero || collapsed) && <h1 className="sr-only">Your recipes</h1>}

      <div className="lib-wrap">
        <div className={`sbar in${hero ? " over-hero" : " mt-6"}`}>
          <div className="relative">
            <Search className="absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search recipes by name or ingredient..."
              aria-label="Search recipes by name or ingredient"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="min-h-12"
            />
          </div>
        </div>

        <div className="lib-filters chip-row">
          <label className="lsort">
            Sort
            <select value={filters.sort} onChange={(e) => setFilters({ ...filters, sort: e.target.value as SortKey })}>
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="quickest">Quickest</option>
            </select>
          </label>
          {TIME_CHIPS.map((m) => (
            <FilterChip key={m} active={filters.maxMinutes === m} onClick={() => toggleFilter("maxMinutes", m)}>
              ≤ {m} min
            </FilterChip>
          ))}
          {ADDED_CHIPS.map(([days, label]) => (
            <FilterChip key={days} active={filters.addedWithinDays === days} onClick={() => toggleFilter("addedWithinDays", days)}>
              {label}
            </FilterChip>
          ))}
        </div>

        {(allTags.length > 0 || filtering) && (
          <div className="lib-filters chip-row !pt-2">
            {/* First, so it stays reachable when the row scrolls sideways on phones */}
            {filtering && (
              <button type="button" onClick={clearFilters} className="lchip press !border-transparent text-muted-foreground">
                <X className="h-3 w-3" />
                Clear filters
              </button>
            )}
            {allTags.map((tag) => (
              <FilterChip key={tag} active={selectedTags.has(tag)} onClick={() => toggleTag(tag)}>
                {tag}
              </FilterChip>
            ))}
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="lib-wrap" aria-busy="true" aria-label="Loading recipes">
          <div className="lgrid">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="sk" style={{ aspectRatio: "9 / 16", animationDelay: `${i * 80}ms` }} />
            ))}
          </div>
        </div>
      ) : empty ? (
        <div className="lib-wrap">
          <div className="none in">
            {filtering || searching ? (
              <>
                <h2>No recipes <em>match</em></h2>
                <p>Try removing some filters or a different search.</p>
                <button type="button" onClick={resetAll} className="none-btn press">Clear filters</button>
              </>
            ) : (
              <>
                <h2>Nothing on the <em>pass</em> yet</h2>
                <p>Extract your first recipe from a cooking video.</p>
                <Link to="/submit" className="none-btn press">Extract a recipe</Link>
              </>
            )}
          </div>
        </div>
      ) : shelves ? (
        shelves.map((shelf) => (
          <section key={shelf.key} className="shf" aria-labelledby={`shelf-${shelf.key}`}>
            <header>
              <h2 id={`shelf-${shelf.key}`}>{shelf.title}</h2>
              {shelf.key === "latest" && canSeeAll ? (
                <button type="button" onClick={() => setShowAll(true)} className="mono press min-h-11 underline">
                  See all {filteredRecipes?.length}
                </button>
              ) : (
                <span className="mono">{shelf.recipes.length} {shelf.recipes.length === 1 ? "recipe" : "recipes"}</span>
              )}
            </header>

            <div className="row">{shelf.recipes.map((r, i) => cardFor(r, i, shelf.key))}</div>
          </section>
        ))
      ) : (
        <div className="lib-wrap">
          {showAll && !collapsed && (
            <button type="button" onClick={() => setShowAll(false)} className="mono press mt-6 min-h-11 underline">
              Back to shelves
            </button>
          )}
          <div className="lgrid">{filteredRecipes?.map((r, i) => cardFor(r, i, "grid"))}</div>
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
            className="fixed bottom-[calc(92px+env(safe-area-inset-bottom))] left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-xl border border-border bg-surface px-5 py-3 shadow-lg"
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
                  ? "bg-destructive text-white hover:bg-destructive/90"
                  : "text-destructive hover:bg-destructive/10"
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
    </div>
  );
}
