import type { QueryClient } from "@tanstack/react-query";
import { getListProjectsQueryKey } from "@workspace/api-client-react";

export function invalidateProjectOverviews(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
  void queryClient.invalidateQueries({ queryKey: ["portfolio-heatmap"] });
}