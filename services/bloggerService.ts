
import { BloggerPost, BloggerListResponse } from '../types';

const BASE_URL = 'https://www.googleapis.com/blogger/v3';

export class BloggerService {
  private accessToken: string;
  private blogId: string;

  constructor(accessToken: string, blogId: string) {
    this.accessToken = accessToken;
    this.blogId = blogId;
  }

  private async fetchWithAuth(url: string, options: RequestInit = {}) {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || `Request failed with status ${response.status}`);
    }

    if (response.status === 204) return null;
    return response.json();
  }

  async getUserInfo() {
    return this.fetchWithAuth('https://www.googleapis.com/oauth2/v3/userinfo');
  }

  async verifyBlogAccess() {
    return this.fetchWithAuth(`${BASE_URL}/blogs/${this.blogId}`);
  }

  async getPosts(status?: 'LIVE' | 'DRAFT' | 'SCHEDULED'): Promise<BloggerPost[]> {
    const query = status ? `?status=${status}` : '?status=LIVE&status=DRAFT';
    const data: BloggerListResponse = await this.fetchWithAuth(`${BASE_URL}/blogs/${this.blogId}/posts${query}`);
    return data.items || [];
  }

  async getPost(postId: string): Promise<BloggerPost> {
    return this.fetchWithAuth(`${BASE_URL}/blogs/${this.blogId}/posts/${postId}`);
  }

  async createPost(title: string, content: string, labels: string[] = []): Promise<BloggerPost> {
    return this.fetchWithAuth(`${BASE_URL}/blogs/${this.blogId}/posts`, {
      method: 'POST',
      body: JSON.stringify({
        kind: 'blogger#post',
        title,
        content,
        labels,
      }),
    });
  }

  async updatePost(postId: string, title: string, content: string, labels: string[] = []): Promise<BloggerPost> {
    return this.fetchWithAuth(`${BASE_URL}/blogs/${this.blogId}/posts/${postId}`, {
      method: 'PUT',
      body: JSON.stringify({
        kind: 'blogger#post',
        id: postId,
        title,
        content,
        labels,
      }),
    });
  }

  async deletePost(postId: string): Promise<void> {
    return this.fetchWithAuth(`${BASE_URL}/blogs/${this.blogId}/posts/${postId}`, {
      method: 'DELETE',
    });
  }

  async publishPost(postId: string): Promise<BloggerPost> {
    return this.fetchWithAuth(`${BASE_URL}/blogs/${this.blogId}/posts/${postId}/publish`, {
      method: 'POST',
    });
  }

  async revertToDraft(postId: string): Promise<BloggerPost> {
    return this.fetchWithAuth(`${BASE_URL}/blogs/${this.blogId}/posts/${postId}/revert`, {
      method: 'POST',
    });
  }
}
