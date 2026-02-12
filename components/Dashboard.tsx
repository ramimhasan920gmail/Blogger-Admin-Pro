
import React, { useState, useEffect } from 'react';
import { BloggerPost } from '../types';
import { BloggerService } from '../services/bloggerService';
import { Plus, Edit3, Trash2, ExternalLink, RefreshCw, FileText } from 'lucide-react';

interface DashboardProps {
  bloggerService: BloggerService;
  onEdit: (postId: string) => void;
  onCreate: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ bloggerService, onEdit, onCreate }) => {
  const [posts, setPosts] = useState<BloggerPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const data = await bloggerService.getPosts();
      setPosts(data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDelete = async (postId: string) => {
    if (window.confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
      try {
        await bloggerService.deletePost(postId);
        setPosts(posts.filter(p => p.id !== postId));
      } catch (err: any) {
        alert('Failed to delete: ' + err.message);
      }
    }
  };

  const handlePublishToggle = async (post: BloggerPost) => {
    try {
      if (post.status === 'DRAFT') {
        await bloggerService.publishPost(post.id);
      } else {
        await bloggerService.revertToDraft(post.id);
      }
      fetchPosts();
    } catch (err: any) {
      alert('Failed to change status: ' + err.message);
    }
  };

  if (loading && posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <RefreshCw className="w-10 h-10 text-orange-600 animate-spin mb-4" />
        <p className="text-gray-500 font-medium">Fetching your blog posts...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-4 sm:px-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Your Posts</h1>
          <p className="text-sm text-gray-500">Manage, edit, and publish your content.</p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={fetchPosts}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
          <button
            onClick={onCreate}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Post
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white shadow overflow-hidden sm:rounded-md border border-gray-200">
        <ul className="divide-y divide-gray-200">
          {posts.length === 0 ? (
            <li className="px-6 py-12 text-center">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No posts found. Start by creating a new one!</p>
            </li>
          ) : (
            posts.map((post) => (
              <li key={post.id} className="hover:bg-gray-50 transition-colors">
                <div className="px-4 py-4 sm:px-6 flex items-center">
                  <div className="flex-1 min-w-0 mr-4">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        post.status === 'LIVE' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {post.status}
                      </span>
                      <span className="text-xs text-gray-400">
                        Updated {new Date(post.updated).toLocaleDateString()}
                      </span>
                    </div>
                    <h2 className="text-lg font-bold text-orange-600 truncate">
                      {post.title || '(No Title)'}
                    </h2>
                    <div className="mt-1 flex items-center text-sm text-gray-500">
                      <p className="truncate" dangerouslySetInnerHTML={{ __html: post.content.substring(0, 100).replace(/<[^>]*>/g, '') + '...' }} />
                    </div>
                  </div>
                  <div className="flex-shrink-0 flex space-x-2">
                    <button
                      onClick={() => onEdit(post.id)}
                      className="p-2 text-gray-400 hover:text-blue-600 rounded-full hover:bg-blue-50 transition-colors"
                      title="Edit"
                    >
                      <Edit3 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handlePublishToggle(post)}
                      className={`p-2 rounded-full transition-colors ${
                        post.status === 'LIVE' 
                          ? 'text-yellow-600 hover:bg-yellow-50' 
                          : 'text-green-600 hover:bg-green-50'
                      }`}
                      title={post.status === 'LIVE' ? 'Revert to Draft' : 'Publish'}
                    >
                      {post.status === 'LIVE' ? <RefreshCw className="w-5 h-5" /> : <ExternalLink className="w-5 h-5" />}
                    </button>
                    <button
                      onClick={() => handleDelete(post.id)}
                      className="p-2 text-gray-400 hover:text-red-600 rounded-full hover:bg-red-50 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                    {post.status === 'LIVE' && (
                      <a
                        href={post.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-gray-400 hover:text-orange-600 rounded-full hover:bg-orange-50 transition-colors"
                        title="View Live"
                      >
                        <ExternalLink className="w-5 h-5" />
                      </a>
                    )}
                  </div>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
};

export default Dashboard;
