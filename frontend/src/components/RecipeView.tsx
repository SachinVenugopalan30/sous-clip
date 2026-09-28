import { useState } from "react";
import { Clock, Users, Tag, ExternalLink, Minus, Plus } from "lucide-react";
import { motion } from "motion/react";
import { Badge } from "./ui/badge";
import type { Recipe } from "../lib/api";
import { scaleQuantity } from "../lib/scale";

interface RecipeViewProps {
  recipe: Recipe;
}

export function RecipeView({ recipe }: RecipeViewProps) {
  const totalTime =
    (recipe.prep_time_minutes ?? 0) + (recipe.cook_time_minutes ?? 0);
  // View-only: scaled values never reach the edit form
  const [servings, setServings] = useState(recipe.servings);
  const factor = recipe.servings && servings ? servings / recipe.servings : 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      {recipe.thumbnail_url && (
        <img src={recipe.thumbnail_url} alt="" className="mb-6 max-h-80 w-full rounded-xl object-cover" />
      )}
      <h1 className="font-display text-2xl font-bold sm:text-3xl">{recipe.title}</h1>

      <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
        {totalTime > 0 && (
          <span className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            {recipe.prep_time_minutes && `${recipe.prep_time_minutes}m prep`}
            {recipe.prep_time_minutes && recipe.cook_time_minutes && " · "}
            {recipe.cook_time_minutes && `${recipe.cook_time_minutes}m cook`}
          </span>
        )}
        {recipe.servings && (
          <span className="flex items-center gap-1.5">
            <Users className="h-4 w-4" />
            {recipe.servings} servings
          </span>
        )}
        <a
          href={recipe.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-accent hover:underline"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Source video
        </a>
      </div>

      {recipe.tags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {recipe.tags.map((tag) => (
            <Badge key={tag} variant="secondary">
              <Tag className="mr-1 h-3 w-3" />
              {tag}
            </Badge>
          ))}
        </div>
      )}

      <div className="mt-8 grid gap-8 md:grid-cols-[1fr_2fr]">
        {/* Ingredients */}
        <div>
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-xl font-bold">Ingredients</h2>
            {servings && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <button type="button" aria-label="Fewer servings" disabled={servings <= 1} onClick={() => setServings(servings - 1)} className="rounded-md p-1.5 hover:bg-bg disabled:opacity-40">
                  <Minus className="h-4 w-4" />
                </button>
                <span aria-live="polite" className="min-w-16 text-center">{servings} servings</span>
                <button type="button" aria-label="More servings" onClick={() => setServings(servings + 1)} className="rounded-md p-1.5 hover:bg-bg">
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
          <ul className="mt-4 space-y-2">
            {recipe.ingredients.map((ing, i) => (
              <li key={i} className="flex items-baseline gap-2 text-sm">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                <span>
                  {ing.quantity && <strong>{scaleQuantity(ing.quantity, factor)}</strong>}
                  {ing.unit && ` ${ing.unit}`}
                  {(ing.quantity || ing.unit) && " "}
                  {ing.name}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Instructions */}
        <div>
          <h2 className="font-display text-xl font-bold">Instructions</h2>
          <ol className="mt-4 space-y-4">
            {recipe.instructions.map((step, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-white">
                  {i + 1}
                </span>
                <p className="pt-0.5">{step}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {recipe.notes && (
        <div className="mt-8 rounded-lg border border-border bg-surface p-4">
          <p className="text-sm font-medium">Notes</p>
          <p className="mt-1 text-sm text-muted-foreground">{recipe.notes}</p>
        </div>
      )}
    </motion.div>
  );
}
