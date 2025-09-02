export interface ArticleMetadata {
  title: string;
  date: string;
  tags: string[];
  summary: string;
  author: string;
  slug: string;
}

export interface Article {
  metadata: ArticleMetadata;
  content: string;
  excerpt: string;
  readingTime: number;
  filename: string;
  path: string;
}

export interface ArticleListItem {
  metadata: ArticleMetadata;
  excerpt: string;
  readingTime: number;
  filename: string;
  path: string;
}

export interface BlogConfig {
  articlesPerPage: number;
  excerptLength: number;
  dateFormat: string;
}

export interface ArticleSearchParams {
  query?: string;
  tag?: string;
  page?: number;
  sortBy?: 'date' | 'title';
  sortOrder?: 'asc' | 'desc';
}

export interface ArticleSearchResult {
  articles: ArticleListItem[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface TagCount {
  tag: string;
  count: number;
}

export interface ArticleNavigation {
  previous?: {
    title: string;
    slug: string;
  };
  next?: {
    title: string;
    slug: string;
  };
}

export type OutputFormat = 'html' | 'json' | 'text';

export interface BlogSettings {
  config: BlogConfig;
  allTags: TagCount[];
  recentArticles: ArticleListItem[];
}
