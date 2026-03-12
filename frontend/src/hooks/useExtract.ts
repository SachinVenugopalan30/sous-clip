import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

export function useExtractRecipe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ url, userId, forwardToMealie = false }: { url: string; userId: string; forwardToMealie?: boolean }) =>
      api.extract.submit(url, userId, forwardToMealie),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["queue"] });
    },
  });
}
