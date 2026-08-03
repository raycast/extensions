import { useFetch } from "@raycast/utils";
import { TeardownResponse } from "./types";

export const API_URL = "https://nichefund.app/api/public/teardowns/";

export function useTeardowns(category?: string) {
  return useFetch<TeardownResponse>(
    (options) => {
      const params = new URLSearchParams({
        page: String(options.page + 1),
        limit: "20",
        sort: "newest",
      });
      if (category) params.set("category", category);
      return `${API_URL}?${params.toString()}`;
    },
    {
      mapResult: (result) => ({
        data: result.results,
        hasMore: result.pagination.has_next,
      }),
      initialData: [],
      keepPreviousData: true,
      failureToastOptions: {
        title: "Couldn’t load teardowns",
        message: "Check your connection and try again.",
      },
    },
  );
}
