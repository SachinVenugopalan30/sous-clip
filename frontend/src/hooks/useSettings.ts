import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

export function useSettings() {
  return useQuery({ queryKey: ["settings"], queryFn: api.settings.get });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.settings.update,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["settings"] }),
  });
}
