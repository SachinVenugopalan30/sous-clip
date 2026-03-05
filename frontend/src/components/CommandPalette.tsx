import { useEffect } from "react";
import { Command } from "cmdk";
import { useNavigate } from "@tanstack/react-router";
import { BookOpen, Search, Plus, Settings } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useRecipes } from "../hooks/useRecipes";
import { useUIStore } from "../stores/ui";

export function CommandPalette() {
  const navigate = useNavigate();
  const { commandPaletteOpen, setCommandPaletteOpen } = useUIStore();
  const { data } = useRecipes();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCommandPaletteOpen(!commandPaletteOpen);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [commandPaletteOpen, setCommandPaletteOpen]);

  const go = (to: string) => {
    setCommandPaletteOpen(false);
    navigate({ to });
  };

  return (
    <AnimatePresence>
      {commandPaletteOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40"
            onClick={() => setCommandPaletteOpen(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", duration: 0.3, bounce: 0.1 }}
            className="fixed left-1/2 top-[20%] z-50 w-full max-w-lg -translate-x-1/2 px-4 sm:px-0"
          >
            <Command className="rounded-xl border border-border bg-bg shadow-2xl">
              <div className="flex items-center gap-2 border-b border-border px-4">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Command.Input
                  placeholder="Search recipes or jump to..."
                  className="flex-1 border-0 bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
                />
              </div>
              <Command.List className="max-h-80 overflow-y-auto p-2">
                <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
                  No results found.
                </Command.Empty>

                <Command.Group heading="Navigation" className="text-xs text-muted-foreground">
                  <Command.Item
                    onSelect={() => go("/")}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm aria-selected:bg-surface"
                  >
                    <BookOpen className="h-4 w-4" />
                    Recipe Library
                  </Command.Item>
                  <Command.Item
                    onSelect={() => go("/submit")}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm aria-selected:bg-surface"
                  >
                    <Plus className="h-4 w-4" />
                    Extract Recipe
                  </Command.Item>
                  <Command.Item
                    onSelect={() => go("/settings")}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm aria-selected:bg-surface"
                  >
                    <Settings className="h-4 w-4" />
                    Settings
                  </Command.Item>
                </Command.Group>

                {data && data.recipes.length > 0 && (
                  <Command.Group heading="Recipes" className="text-xs text-muted-foreground">
                    {data.recipes.map((recipe) => (
                      <Command.Item
                        key={recipe.id}
                        onSelect={() => go(`/recipe/${recipe.id}`)}
                        className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm aria-selected:bg-surface"
                      >
                        {recipe.title}
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}
              </Command.List>

              <div className="border-t border-border px-4 py-2 text-xs text-muted-foreground">
                <kbd className="rounded bg-surface px-1.5 py-0.5 font-mono">
                  esc
                </kbd>{" "}
                to close
              </div>
            </Command>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
