
export interface BloggerPost {
  id: string;
  blog: { id: string };
  published?: string;
  updated: string;
  url: string;
  title: string;
  content: string;
  author: {
    displayName: string;
    image: { url: string };
  };
  status: 'LIVE' | 'DRAFT' | 'SCHEDULED';
  labels?: string[];
}

export interface BloggerListResponse {
  kind: string;
  items?: BloggerPost[];
  nextPageToken?: string;
  prevPageToken?: string;
}

export interface DownloadLink {
  label: string;
  url: string;
}

export interface MovieTemplateData {
  posterUrl: string;
  genre: string;
  imdb: string;
  plot: string;
  director: string;
  cast: string;
  budget: string;
  releaseDate: string;
  language: string;
  downloadLinks: DownloadLink[];
}

export interface AuthState {
  accessToken: string | null;
  expiresAt: number | null;
  user: {
    name: string;
    email: string;
    picture: string;
  } | null;
}

export interface AppSettings {
  openAiApiKey?: string;
  grokApiKey?: string;
  tmdbApiKey?: string;
}

export type AISuggestionType = 'OPTIMIZE_TITLE' | 'SUMMARIZE' | 'EXPAND' | 'FIX_GRAMMAR' | 'FETCH_MOVIE_DETAILS';
