import { Link } from "@tanstack/react-router";
import { Check, Link as LinkIcon, MoreHorizontal, Send, Trash2 } from "lucide-react";
import type { Recipe } from "../lib/api";
import { CAP_NAME, FROM_LIBRARY, nameClicked, photoName, recipeNo, totalMinutes } from "../lib/library";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

interface RecipeCardProps {
  recipe: Recipe;
  selected?: boolean;
  onToggle?: (id: number) => void;
  onShare?: (id: number) => void;
  onDelete?: (id: number) => void;
  mealieConfigured?: boolean;
  onSendToMealie?: (id: number) => void;
  /** Carry the shared-element name; only one element per recipe on the page may */
  transitionName?: boolean;
  /** Position for the `.in` stagger */
  index?: number;
}

export function RecipeCard({ recipe, selected, onToggle, onShare, onDelete, mealieConfigured, onSendToMealie, transitionName, index = 0 }: RecipeCardProps) {
  const totalTime = totalMinutes(recipe);
  const hasPhoto = !!recipe.thumbnail_url;

  return (
    <div className={`reel in${selected ? " selected" : ""}`} style={{ "--i": Math.min(index, 12) } as React.CSSProperties}>
      <Link to="/recipe/$recipeId" params={{ recipeId: String(recipe.id) }} state={FROM_LIBRARY} onClick={(e) => nameClicked(e, ".plate", ".reel-meta", recipe.id)}>
        <div className="plate" style={transitionName ? { viewTransitionName: photoName(recipe.id) } : undefined}>
          {hasPhoto ? (
            <img src={recipe.thumbnail_url ?? undefined} alt="" loading="lazy" />
          ) : (
            <div className="plate-fb"><span>{recipe.title}</span></div>
          )}
        </div>
        {/* Outside the photo frame so the photo's snapshot doesn't scale it; named separately so it fades */}
        <div className="reel-meta" style={transitionName ? { viewTransitionName: CAP_NAME } : undefined}>
          <span className="tab">{recipeNo(recipe.id)}</span>
          <div className="cap">
            {hasPhoto && <h3>{recipe.title}</h3>}
            {!!totalTime && <span className="mono">{totalTime} min</span>}
          </div>
        </div>
      </Link>

      <button
        type="button"
        className="pick"
        aria-pressed={!!selected}
        aria-label={`Select ${recipe.title}`}
        onClick={() => onToggle?.(recipe.id)}
      >
        <Check className="h-4 w-4" />
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger className="more" aria-label={`More actions for ${recipe.title}`}>
          <MoreHorizontal className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onSelect={() => onShare?.(recipe.id)}>
            <LinkIcon /> Share
          </DropdownMenuItem>
          {mealieConfigured && (
            <DropdownMenuItem onSelect={() => onSendToMealie?.(recipe.id)}>
              <Send /> Send to Mealie
            </DropdownMenuItem>
          )}
          <DropdownMenuItem variant="destructive" onSelect={() => onDelete?.(recipe.id)}>
            <Trash2 /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
