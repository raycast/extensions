export interface Preferences {
  supportCenter: string;
  locale: string;
}

export interface ZendeskArticle {
  author_id?: number;
  body?: string;
  comments_disabled?: boolean;
  content_tag_ids?: string[];
  created_at?: string;
  draft?: boolean;
  edited_at?: string;
  html_url?: string;
  id?: number;
  label_names?: string[];
  locale: string;
  outdated?: boolean;
  outdated_locales?: string[];
  permission_group_id: number;
  position?: number;
  promoted?: boolean;
  section_id?: number;
  source_locale?: string;
  title: string;
  updated_at?: string;
  url?: string;
  user_segment_id: number;
  vote_count?: number;
  vote_sum?: number;
}

export interface ArticleFetchRes {
  isLoading?: boolean;
  data?: { results: ZendeskArticle[] };
  error?: Error;
}

export interface FilteredArticle {
  id?: number;
  url?: string;
  section?: number;
  title: string;
  body?: string;
}

export interface ZendeskLocale {
  createdAt: string;
  id: number;
  locale: string;
  name: string;
  updated_at: string;
  url: string;
}

export interface LocaleFetchRes {
  data: { locales: ZendeskLocale[] };
}

export interface FilteredLocale {
  name: string;
  locale: string;
}
