import type { Recipe } from "./api";

function formatIngredient(ing: { name: string; quantity: string | null; unit: string | null }): string {
  const parts: string[] = [];
  if (ing.quantity) parts.push(ing.quantity);
  if (ing.unit) parts.push(ing.unit);
  parts.push(ing.name);
  return parts.join(" ");
}

export function formatAsMarkdown(recipe: Recipe): string {
  const lines: string[] = [`# ${recipe.title}`, ""];

  const meta: string[] = [];
  if (recipe.prep_time_minutes) meta.push(`**Prep:** ${recipe.prep_time_minutes} min`);
  if (recipe.cook_time_minutes) meta.push(`**Cook:** ${recipe.cook_time_minutes} min`);
  if (recipe.servings) meta.push(`**Servings:** ${recipe.servings}`);
  if (meta.length) {
    lines.push(meta.join(" | "), "");
  }

  lines.push("## Ingredients", "");
  for (const ing of recipe.ingredients) {
    lines.push(`- ${formatIngredient(ing)}`);
  }
  lines.push("");

  lines.push("## Instructions", "");
  recipe.instructions.forEach((step, i) => {
    lines.push(`${i + 1}. ${step}`);
  });
  lines.push("");

  if (recipe.notes) {
    lines.push("## Notes", "", recipe.notes, "");
  }

  lines.push("---", `*Extracted from [source](${recipe.source_url}) by Sous Clip*`, "");

  return lines.join("\n");
}

export function formatAsText(recipe: Recipe): string {
  const lines: string[] = [recipe.title, "=".repeat(recipe.title.length), ""];

  const meta: string[] = [];
  if (recipe.prep_time_minutes) meta.push(`Prep: ${recipe.prep_time_minutes} min`);
  if (recipe.cook_time_minutes) meta.push(`Cook: ${recipe.cook_time_minutes} min`);
  if (recipe.servings) meta.push(`Servings: ${recipe.servings}`);
  if (meta.length) {
    lines.push(meta.join(" | "), "");
  }

  lines.push("INGREDIENTS", "");
  for (const ing of recipe.ingredients) {
    lines.push(`  - ${formatIngredient(ing)}`);
  }
  lines.push("");

  lines.push("INSTRUCTIONS", "");
  recipe.instructions.forEach((step, i) => {
    lines.push(`  ${i + 1}. ${step}`);
  });
  lines.push("");

  if (recipe.notes) {
    lines.push("NOTES", "", `  ${recipe.notes}`, "");
  }

  lines.push(`Source: ${recipe.source_url}`, "");

  return lines.join("\n");
}

export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
