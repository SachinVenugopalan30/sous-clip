import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type Recipe } from "../lib/api";

export function useRecipes(search?: string) {
  return useQuery({
    queryKey: ["recipes", search],
    queryFn: () => api.recipes.list(search),
  });
}

export function useRecipe(id: number) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: ["recipe", id],
    queryFn: () => api.recipes.get(id),
    // A deleted recipe is a 404: show "not found" now rather than after the retries
    retry: (count, err) => (err as { status?: number }).status !== 404 && count < 3,
    // Render from the library's cached copy at once, so the open transition has a photo to morph into
    placeholderData: () =>
      queryClient.getQueriesData<{ recipes: Recipe[] }>({ queryKey: ["recipes"] }).flatMap(([, d]) => d?.recipes ?? []).find((r) => r.id === id),
  });
}

export function useUpdateRecipe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, changes }: { id: number; changes: Partial<Omit<Recipe, "id">> }) =>
      api.recipes.update(id, changes),
    onSuccess: (recipe) => {
      queryClient.setQueryData(["recipe", recipe.id], recipe);
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
    },
  });
}

export function useDeleteRecipe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.recipes.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
    },
  });
}

export function useBulkDeleteRecipes() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: number[]) => api.recipes.bulkDelete(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
    },
  });
}
