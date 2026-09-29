import { Link } from "@tanstack/react-router";
import { CalendarDays, CheckSquare, Clock, Link as LinkIcon, Send, Square, Tag, Trash2, Users } from "lucide-react";
import { motion } from "motion/react";
import type { Recipe } from "../lib/api";
import { formatAdded } from "../lib/library";

interface RecipeCardProps {
  recipe: Recipe;
  selected?: boolean;
  onToggle?: (id: number) => void;
  onShare?: (id: number) => void;
  onDelete?: (id: number) => void;
  mealieConfigured?: boolean;
  onSendToMealie?: (id: number) => void;
}

export function RecipeCard({ recipe, selected, onToggle, onShare, onDelete, mealieConfigured, onSendToMealie }: RecipeCardProps) {
  const totalTime =
    (recipe.prep_time_minutes ?? 0) + (recipe.cook_time_minutes ?? 0);

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.15 }}
      className="relative flex flex-col"
    >
      <Link
        to="/recipe/$recipeId"
        params={{ recipeId: String(recipe.id) }}
        className={`block flex-1 rounded-t-xl border border-b-0 bg-surface p-5 shadow-sm transition-shadow hover:shadow-md ${selected ? "border-primary ring-1 ring-primary" : "border-border"}`}
      >
        {recipe.thumbnail_url && (
          <img src={recipe.thumbnail_url} alt="" loading="lazy" className="-mx-5 -mt-5 mb-4 aspect-video w-[calc(100%+2.5rem)] max-w-none rounded-t-xl object-cover" />
        )}
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
          <span className="flex items-center gap-1" title={new Date(recipe.created_at).toLocaleString()}>
            <CalendarDays className="h-3.5 w-3.5" />
            Added {formatAdded(recipe.created_at)}
          </span>
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

      {/* Bottom action bar */}
      <div className={`flex items-center justify-around rounded-b-xl border bg-surface/80 px-1 py-1.5 ${selected ? "border-primary ring-1 ring-primary" : "border-border"}`}>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggle?.(recipe.id);
          }}
          className={`flex items-center gap-1 rounded-lg px-2 py-2.5 text-xs sm:py-1.5 transition-colors ${selected ? "text-primary" : "text-muted-foreground hover:text-foreground hover:bg-bg"}`}
          aria-label={selected ? "Deselect recipe" : "Select recipe"}
        >
          {selected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
          Select
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onShare?.(recipe.id);
          }}
          className="flex items-center gap-1 rounded-lg px-2 py-2.5 text-xs sm:py-1.5 text-muted-foreground transition-colors hover:text-foreground hover:bg-bg"
          aria-label="Share recipe"
        >
          <LinkIcon className="h-4 w-4" />
          Share
        </button>
        {mealieConfigured && (
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onSendToMealie?.(recipe.id); }}
            className="flex items-center gap-1 rounded-lg px-2 py-2.5 text-xs sm:py-1.5 text-muted-foreground transition-colors hover:text-foreground hover:bg-bg"
            aria-label="Send to Mealie"
          >
            <Send className="h-4 w-4" />
            Mealie
          </button>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDelete?.(recipe.id);
          }}
          className="flex items-center gap-1 rounded-lg px-2 py-2.5 text-xs sm:py-1.5 text-destructive transition-colors hover:bg-destructive/10"
          aria-label="Delete recipe"
        >
          <Trash2 className="h-4 w-4" />
          Delete
        </button>
      </div>
    </motion.div>
  );
}
