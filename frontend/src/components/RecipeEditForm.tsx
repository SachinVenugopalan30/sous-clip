import { useState } from "react";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import { useUpdateRecipe } from "../hooks/useRecipes";
import type { Ingredient, Recipe } from "../lib/api";
import { Input } from "./ui/input";

const toNumber = (v: string) => (v.trim() === "" ? null : Number(v));

// Initialised from the stored recipe, never from scaled values
export function RecipeEditForm({ recipe, onDone }: { recipe: Recipe; onDone: () => void }) {
  const update = useUpdateRecipe();
  const [title, setTitle] = useState(recipe.title);
  const [ingredients, setIngredients] = useState<Ingredient[]>(recipe.ingredients);
  const [instructions, setInstructions] = useState(recipe.instructions.join("\n"));
  const [tags, setTags] = useState(recipe.tags.join(", "));
  const [prep, setPrep] = useState(String(recipe.prep_time_minutes ?? ""));
  const [cook, setCook] = useState(String(recipe.cook_time_minutes ?? ""));
  const [servings, setServings] = useState(String(recipe.servings ?? ""));
  const [notes, setNotes] = useState(recipe.notes ?? "");

  const setIngredient = (i: number, field: keyof Ingredient, value: string) =>
    setIngredients(ingredients.map((ing, j) => (j === i ? { ...ing, [field]: value || null } : ing)));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    update.mutate(
      {
        id: recipe.id,
        changes: {
          title: title.trim(),
          ingredients: ingredients.filter((ing) => ing.name.trim()),
          instructions: instructions.split("\n").map((s) => s.trim()).filter(Boolean),
          tags: tags.split(",").map((s) => s.trim()).filter(Boolean),
          prep_time_minutes: toNumber(prep),
          cook_time_minutes: toNumber(cook),
          servings: toNumber(servings),
          notes: notes.trim() || null,
        },
      },
      {
        onSuccess: () => {
          toast.success("Recipe updated");
          onDone();
        },
        onError: (err) => toast.error(err.message),
      }
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <label className="rec-field">
        Title
        <Input value={title} onChange={(e) => setTitle(e.target.value)} required className="mt-1 h-11 sm:h-9" />
      </label>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(96px,1fr))] gap-3">
        {([["Prep (min)", prep, setPrep], ["Cook (min)", cook, setCook], ["Servings", servings, setServings]] as const).map(
          ([label, value, set]) => (
            <label key={label} className="rec-field">
              {label}
              <Input type="number" min={0} value={value} onChange={(e) => set(e.target.value)} className="mt-1 h-11 sm:h-9" />
            </label>
          )
        )}
      </div>

      <fieldset>
        <legend className="rec-field">Ingredients</legend>
        <div className="mt-1 space-y-2">
          {ingredients.map((ing, i) => (
            <div key={i} className="grid grid-cols-[4.5rem_minmax(0,1fr)_44px] gap-2 sm:grid-cols-[5rem_6rem_minmax(0,1fr)_2.5rem]">
              <Input aria-label="Quantity" placeholder="Qty" value={ing.quantity ?? ""} onChange={(e) => setIngredient(i, "quantity", e.target.value)} className="h-11 sm:h-9" />
              <Input aria-label="Unit" placeholder="Unit" value={ing.unit ?? ""} onChange={(e) => setIngredient(i, "unit", e.target.value)} className="h-11 sm:h-9" />
              <Input aria-label="Ingredient" placeholder="Ingredient" value={ing.name} onChange={(e) => setIngredient(i, "name", e.target.value)} className="order-last col-span-full h-11 sm:order-none sm:col-span-1 sm:h-9" />
              <button type="button" className="rec-btn press justify-center !px-0" aria-label="Remove ingredient" onClick={() => setIngredients(ingredients.filter((_, j) => j !== i))}>
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
        <button type="button" className="rec-btn press mt-2" onClick={() => setIngredients([...ingredients, { name: "", quantity: null, unit: null }])}>
          <Plus className="h-4 w-4" />
          Add ingredient
        </button>
      </fieldset>

      <label className="rec-field">
        Steps (one per line)
        <textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={6} />
      </label>

      <label className="rec-field">
        Tags (comma separated)
        <Input value={tags} onChange={(e) => setTags(e.target.value)} className="mt-1 h-11 sm:h-9" />
      </label>

      <label className="rec-field">
        Notes
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
      </label>

      <div className="flex gap-2">
        <button type="submit" className="rec-btn hot press" disabled={update.isPending}>Save</button>
        <button type="button" className="rec-btn press" onClick={onDone}>Cancel</button>
      </div>
    </form>
  );
}
