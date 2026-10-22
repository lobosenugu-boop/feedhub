export type Source = 'hackernews' | 'youtube' | 'rss' | 'manual';

export type AppView = 'discover' | 'analyzer' | 'library' | 'creators' | 'topics' | 'customai' | 'engage' | 'think';

export type Category =
  | 'all'
  | 'technology'
  | 'business'
  | 'marketing'
  | 'productivity'
  | 'ai'
  | 'selfimprovement'
  | 'psychology';

export interface Post {
  id: string;
  title: string;
  excerpt?: string;
  author: string;
  source: Source;
  platform: string;
  url: string;
  thumbnail?: string;
  publishedAt: string;
  score?: number;
  views?: number;
  comments?: number;
  tags: string[];
  category: Category;
  videoId?: string;
  trending?: boolean;
}

export interface Board {
  id: string;
  name: string;
  postIds: string[];
  createdAt: string;
}

export interface RSSFeed {
  id: string;
  title: string;
  url: string;
  category: Category;
}

export interface PromptItem {
  id: string;
  title: string;
  sourceUrl?: string;
  thumbnail?: string;
  platform?: string;
  whyItWorked: string;
  formula: string;
  prompt: string;
  tags: string[];
  createdAt: string;
}
