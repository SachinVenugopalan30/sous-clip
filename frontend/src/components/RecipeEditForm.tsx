import { useState } from "react";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import { useUpdateRecipe } from "../hooks/useRecipes";
import type { Ingredient, Recipe } from "../lib/api";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

const textareaClass = "mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm";
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
      <label className="block text-sm font-medium">
        Title
        <Input value={title} onChange={(e) => setTitle(e.target.value)} required className="mt-1" />
      </label>

      <div className="grid grid-cols-3 gap-3">
        {([["Prep (min)", prep, setPrep], ["Cook (min)", cook, setCook], ["Servings", servings, setServings]] as const).map(
          ([label, value, set]) => (
            <label key={label} className="block text-sm font-medium">
              {label}
              <Input type="number" min={0} value={value} onChange={(e) => set(e.target.value)} className="mt-1" />
            </label>
          )
        )}
      </div>

      <fieldset>
        <legend className="text-sm font-medium">Ingredients</legend>
        <div className="mt-1 space-y-2">
          {ingredients.map((ing, i) => (
            <div key={i} className="flex gap-2">
              <Input aria-label="Quantity" placeholder="Qty" value={ing.quantity ?? ""} onChange={(e) => setIngredient(i, "quantity", e.target.value)} className="w-16 sm:w-20" />
              <Input aria-label="Unit" placeholder="Unit" value={ing.unit ?? ""} onChange={(e) => setIngredient(i, "unit", e.target.value)} className="w-20 sm:w-24" />
              <Input aria-label="Ingredient" placeholder="Ingredient" value={ing.name} onChange={(e) => setIngredient(i, "name", e.target.value)} className="min-w-0 flex-1" />
              <Button type="button" variant="ghost" size="sm" className="size-10 shrink-0 sm:size-8" aria-label="Remove ingredient" onClick={() => setIngredients(ingredients.filter((_, j) => j !== i))}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
        <Button type="button" variant="ghost" size="sm" className="mt-2" onClick={() => setIngredients([...ingredients, { name: "", quantity: null, unit: null }])}>
          <Plus className="mr-1 h-4 w-4" />
          Add ingredient
        </Button>
      </fieldset>

      <label className="block text-sm font-medium">
        Steps (one per line)
        <textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={6} className={textareaClass} />
      </label>

      <label className="block text-sm font-medium">
        Tags (comma separated)
        <Input value={tags} onChange={(e) => setTags(e.target.value)} className="mt-1" />
      </label>

      <label className="block text-sm font-medium">
        Notes
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className={textareaClass} />
      </label>

      <div className="flex gap-2">
        <Button type="submit" disabled={update.isPending}>Save</Button>
        <Button type="button" variant="ghost" onClick={onDone}>Cancel</Button>
      </div>
    </form>
  );
}
