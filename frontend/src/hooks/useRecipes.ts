import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type Recipe } from "../lib/api";

export function useRecipes(search?: string) {
  return useQuery({
    queryKey: ["recipes", search],
    queryFn: () => api.recipes.list(search),
  });
}

export function useRecipe(id: number) {
  return useQuery({
    queryKey: ["recipe", id],
    queryFn: () => api.recipes.get(id),
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
