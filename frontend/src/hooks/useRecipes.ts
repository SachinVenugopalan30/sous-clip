import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

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
