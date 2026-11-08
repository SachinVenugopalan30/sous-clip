import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

export function useSettings() {
  return useQuery({ queryKey: ["settings"], queryFn: api.settings.get });
}

// Server caches GitHub for an hour; one fetch per page load is plenty
export function useUpdateStatus() {
  return useQuery({ queryKey: ["update"], queryFn: api.update.status, staleTime: Infinity, retry: false });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.settings.update,
    // Returned so the mutation stays pending until the refetch lands (callers clear their edits then)
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ["settings"] }),
        queryClient.invalidateQueries({ queryKey: ["update"] }), // update_check may have changed
      ]),
  });
}
