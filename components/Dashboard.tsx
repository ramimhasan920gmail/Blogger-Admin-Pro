
import React, { useState, useEffect } from 'react';
import { BloggerPost } from '../types';
import { BloggerService } from '../services/bloggerService';
import { Plus, Edit3, Trash2, ExternalLink, RefreshCw, FileText, Search, Filter } from 'lucide-react';

interface DashboardProps {
  bloggerService: BloggerService;
  onEdit: (postId: string) => void;
  onCreate: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ bloggerService, onEdit, onCreate }) => {
  const [posts, setPosts] = useState<BloggerPost[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<BloggerPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'LIVE' | 'DRAFT'>('ALL');

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const data = await bloggerService.getPosts();
      setPosts(data);
      setFilteredPosts(data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  useEffect(() => {
    let result = posts;
    if (searchQuery) {
      result = result.filter(p => p.title.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    if (statusFilter !== 'ALL') {
      result = result.filter(p => p.status === statusFilter);
    }
    setFilteredPosts(result);
  }, [searchQuery, statusFilter, posts]);

  const handleDelete = async (postId: string) => {
    if (window.confirm('Are you sure you want to delete this post?')) {
      try {
        await bloggerService.deletePost(postId);
        setPosts(posts.filter(p => p.id !== postId));
      } catch (err: any) {
        alert('Failed to delete: ' + err.message);
      }
    }
  };

  if (loading && posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <RefreshCw className="w-10 h-10 text-orange-600 animate-spin mb-4" />
        <p className="text-gray-500 font-medium">Loading your blog...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-4 sm:px-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Your Posts</h1>
          <p className="text-sm text-gray-500">Manage your Blogger content with ease.</p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={fetchPosts}
            className="p-2 border border-gray-300 rounded-md bg-white text-gray-500 hover:text-orange-600 transition-colors"
          >
            <RefreshCw className="w-5 h-5" />
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

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search posts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
          />
        </div>
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="border border-gray-200 rounded-lg px-3 py-2 outline-none text-sm bg-white"
          >
            <option value="ALL">All Status</option>
            <option value="LIVE">Live</option>
            <option value="DRAFT">Draft</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-md">
          <p className="text-sm text-red-700 font-medium">{error}</p>
        </div>
      )}

      <div className="bg-white shadow rounded-xl overflow-hidden border border-gray-200">
        <ul className="divide-y divide-gray-100">
          {filteredPosts.length === 0 ? (
            <li className="px-6 py-12 text-center">
              <FileText className="w-12 h-12 text-gray-200 mx-auto mb-4" />
              <p className="text-gray-500">No posts found.</p>
            </li>
          ) : (
            filteredPosts.map((post) => (
              <li key={post.id} className="group hover:bg-orange-50 transition-colors duration-200">
                <div className="px-4 py-4 sm:px-6 flex items-center">
                  <div className="flex-1 min-w-0 mr-4">
                    <div className="flex items-center space-x-3 mb-1">
                      <span className={`px-2 py-0.5 inline-flex text-[10px] leading-5 font-bold tracking-wider uppercase rounded-full ${
                        post.status === 'LIVE' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-orange-100 text-orange-700'
                      }`}>
                        {post.status}
                      </span>
                      <span className="text-[11px] text-gray-400">
                        {new Date(post.updated).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                    <h2 className="text-base font-bold text-gray-900 group-hover:text-orange-600 transition-colors truncate">
                      {post.title || '(Untitled Post)'}
                    </h2>
                    <p className="mt-0.5 text-xs text-gray-500 truncate opacity-70">
                      {post.content.replace(/<[^>]*>/g, '').substring(0, 120)}...
                    </p>
                  </div>
                  <div className="flex-shrink-0 flex items-center space-x-1 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => onEdit(post.id)}
                      className="p-2 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50"
                      title="Edit"
                    >
                      <Edit3 className="w-5 h-5" />
                    </button>
                    {post.status === 'LIVE' && (
                      <a
                        href={post.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-gray-400 hover:text-orange-600 rounded-lg hover:bg-orange-50"
                        title="View Live"
                      >
                        <ExternalLink className="w-5 h-5" />
                      </a>
                    )}
                    <button
                      onClick={() => handleDelete(post.id)}
                      className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                      title="Delete"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
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
