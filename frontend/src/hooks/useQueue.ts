import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

export function useQueue(userId: string) {
  return useQuery({
    queryKey: ["queue", userId],
    queryFn: () => api.queue.list(userId),
    refetchInterval: 3000,
  });
}

export function useCancelQueueItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, itemId }: { userId: string; itemId: string }) =>
      api.queue.cancel(userId, itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["queue"] });
    },
  });
}

export function useRetryQueueItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, itemId }: { userId: string; itemId: string }) =>
      api.queue.retry(userId, itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["queue"] });
    },
  });
}
