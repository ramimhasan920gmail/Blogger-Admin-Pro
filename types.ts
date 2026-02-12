
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

// Added missing interface for Blogger API list responses
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

export type AISuggestionType = 'OPTIMIZE_TITLE' | 'SUMMARIZE' | 'EXPAND' | 'FIX_GRAMMAR';