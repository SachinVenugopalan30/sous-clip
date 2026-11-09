import { useState } from "react";
import { ExternalLink, Minus, Plus } from "lucide-react";
import type { Recipe } from "../lib/api";
import { photoName, recipeNo, splitTitle, totalMinutes } from "../lib/library";
import { scaleQuantity } from "../lib/scale";

// Photo frame and title are siblings: the frame is the shared element, the title has its own transition name
export function RecipeHero({ recipe, loading }: { recipe?: Recipe; loading?: boolean }) {
  const { main, suffix } = splitTitle(recipe?.title ?? "Recipe not found");
  const words = main.split(" ");
  const last = words.pop() ?? "";
  const time = recipe && totalMinutes(recipe);
  return (
    <section className="rec-hero">
      <div className="rec-photo" style={recipe ? { viewTransitionName: photoName(recipe.id) } : undefined}>
        {recipe?.thumbnail_url ? <img src={recipe.thumbnail_url} alt="" fetchPriority="high" /> : <div className="plate-fb" aria-hidden="true" />}
      </div>
      <div className="rec-wrap">
        <div className={recipe ? "recipe-title" : undefined}>
          {loading ? (
            <>
              <h1 className="sr-only">Loading recipe</h1>
              <div className="sk h-16 w-[min(28rem,80vw)]" aria-hidden="true" />
            </>
          ) : (
            <h1>
              {words.join(" ")}{words.length > 0 && " "}<em>{last}</em>
              {suffix && <small>{suffix}</small>}
            </h1>
          )}
          {recipe && (
            <p className="mono">
              {[recipeNo(recipe.id), time ? `${time} min` : null, ...recipe.tags].filter(Boolean).join(" / ")}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

export function RecipeView({ recipe }: { recipe: Recipe }) {
  // View-only: scaled values never reach the edit form
  const [servings, setServings] = useState(recipe.servings);
  const factor = recipe.servings && servings ? servings / recipe.servings : 1;
  const { prep_time_minutes: prep, cook_time_minutes: cook } = recipe;

  return (
    <>
      <p className="mono rec-facts">
        {!!prep && <span>{prep} min prep</span>}
        {!!cook && <span>{cook} min cook</span>}
        {recipe.servings && <span>{recipe.servings} servings</span>}
        <span>Added {new Date(recipe.created_at).toLocaleDateString(undefined, { dateStyle: "medium" })}</span>
        <a href={recipe.source_url} target="_blank" rel="noopener noreferrer">
          <ExternalLink className="h-3.5 w-3.5" />
          Source video
        </a>
      </p>

      <div className="rec-two">
        <section>
          <div className="rec-ih">
            <h2>Ingredients</h2>
            {servings && (
              <div className="rec-step">
                <button type="button" className="press" aria-label="Fewer servings" disabled={servings <= 1} onClick={() => setServings(servings - 1)}>
                  <Minus className="h-4 w-4" />
                </button>
                <span aria-live="polite">{servings} servings</span>
                <button type="button" className="press" aria-label="More servings" onClick={() => setServings(servings + 1)}>
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
          <ul className="rec-ing">
            {recipe.ingredients.map((ing, i) => {
              const qty = [ing.quantity && scaleQuantity(ing.quantity, factor), ing.unit].filter(Boolean).join(" ");
              return (
              <li key={i}>
                {qty ? <b>{qty}</b> : null}
                <span className={qty ? undefined : "col-span-2"}>{ing.name}</span>
              </li>
              );
            })}
          </ul>
        </section>

        <section className="rec-mth">
          <h2>Method</h2>
          <ol>
            {recipe.instructions.map((step, i) => (
              <li key={i}>
                <span aria-hidden="true">{i + 1}</span>
                <p>{step}</p>
              </li>
            ))}
          </ol>
          {recipe.notes && (
            <p className="rec-note">
              <strong>Notes.</strong> {recipe.notes}
            </p>
          )}
        </section>
      </div>
    </>
  );
}
