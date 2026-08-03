export type Teardown = {
  slug: string;
  title: string;
  category: string;
  score: number;
  excerpt: string;
  published_at: string;
  url: string;
};

export type TeardownResponse = {
  results: Teardown[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
    has_next: boolean;
  };
};
