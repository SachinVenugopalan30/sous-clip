import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

export function useExtractRecipe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ url, userId }: { url: string; userId: string }) =>
      api.extract.submit(url, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["queue"] });
    },
  });
}
