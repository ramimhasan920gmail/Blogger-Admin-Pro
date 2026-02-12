
export interface BloggerPost {
  id: string;
  blog: {
    id: string;
  };
  published?: string;
  updated: string;
  url: string;
  selfLink: string;
  title: string;
  content: string;
  author: {
    id: string;
    displayName: string;
    image: {
      url: string;
    };
  };
  status: 'LIVE' | 'DRAFT' | 'SCHEDULED';
  labels?: string[];
}

export interface BloggerListResponse {
  kind: string;
  items?: BloggerPost[];
  nextPageToken?: string;
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

export interface Config {
  clientId: string;
  blogId: string;
}
