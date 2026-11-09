import { useEffect } from "react";
import { Command } from "cmdk";
import { useNavigate } from "@tanstack/react-router";
import { BookOpen, Search, Plus, Settings } from "lucide-react";
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

  const item = "pal-i";

  return (
    <Command.Dialog
      open={commandPaletteOpen}
      onOpenChange={setCommandPaletteOpen}
      label="Command palette"
      overlayClassName="pal-back"
      contentClassName="pal"
    >
      <div className="pal-in">
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <Command.Input placeholder="Search recipes or jump to..." aria-label="Search recipes or jump to" />
      </div>
      <Command.List>
        <Command.Empty>No results found.</Command.Empty>

        <Command.Group heading="Navigation">
          <Command.Item onSelect={() => go("/")} className={item}>
            <BookOpen className="h-4 w-4" />
            Recipe Library
          </Command.Item>
          <Command.Item onSelect={() => go("/submit")} className={item}>
            <Plus className="h-4 w-4" />
            Extract Recipe
          </Command.Item>
          <Command.Item onSelect={() => go("/settings")} className={item}>
            <Settings className="h-4 w-4" />
            Settings
          </Command.Item>
        </Command.Group>

        {data && data.recipes.length > 0 && (
          <Command.Group heading="Recipes">
            {data.recipes.map((recipe) => (
              <Command.Item key={recipe.id} value={`${recipe.title} ${recipe.id}`} onSelect={() => go(`/recipe/${recipe.id}`)} className={item}>
                {recipe.title}
              </Command.Item>
            ))}
          </Command.Group>
        )}
      </Command.List>

      <p className="pal-foot mono">
        <kbd>esc</kbd> to close
      </p>
    </Command.Dialog>
  );
}
