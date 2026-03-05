import { Link } from "@tanstack/react-router";
import { Clock, Users, Tag } from "lucide-react";
import { motion } from "motion/react";
import type { Recipe } from "../lib/api";

interface RecipeCardProps {
  recipe: Recipe;
  selectable?: boolean;
  selected?: boolean;
  onToggle?: (id: number) => void;
}

export function RecipeCard({ recipe, selectable, selected, onToggle }: RecipeCardProps) {
  const totalTime =
    (recipe.prep_time_minutes ?? 0) + (recipe.cook_time_minutes ?? 0);

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.15 }}
      className="relative"
    >
      {selectable && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggle?.(recipe.id);
          }}
          className="absolute left-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-md border-2 border-border bg-surface transition-colors hover:border-primary"
          aria-label={selected ? "Deselect recipe" : "Select recipe"}
        >
          {selected && (
            <svg className="h-4 w-4 text-primary" viewBox="0 0 16 16" fill="currentColor">
              <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z" />
            </svg>
          )}
        </button>
      )}
      <Link
        to="/recipe/$recipeId"
        params={{ recipeId: String(recipe.id) }}
        className={`block rounded-xl border bg-surface p-5 shadow-sm transition-shadow hover:shadow-md ${selectable ? "pl-10" : ""} ${selected ? "border-primary ring-1 ring-primary" : "border-border"}`}
      >
        <h3 className="font-display text-lg font-bold leading-tight">
          {recipe.title}
        </h3>

        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          {totalTime > 0 && (
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {totalTime} min
            </span>
          )}
          {recipe.servings && (
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {recipe.servings} servings
            </span>
          )}
        </div>

        <p className="mt-3 text-sm text-muted-foreground line-clamp-2">
          {recipe.ingredients.map((i) => i.name).join(", ")}
        </p>

        {recipe.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {recipe.tags.map((tag) => (
              <span
                key={tag}
                className="flex items-center gap-1 rounded-full bg-bg px-2.5 py-0.5 text-xs text-muted-foreground"
              >
                <Tag className="h-3 w-3" />
                {tag}
              </span>
            ))}
          </div>
        )}
      </Link>
    </motion.div>
  );
}
