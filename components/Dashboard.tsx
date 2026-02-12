
import React, { useState, useEffect } from 'react';
import { BloggerPost } from '../types';
import { BloggerService } from '../services/bloggerService';
import { Plus, Edit3, Trash2, ExternalLink, RefreshCw, FileText, Search, Filter, TrendingUp, Layers, Eye } from 'lucide-react';

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

  if (loading && posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <RefreshCw className="w-12 h-12 text-orange-500 animate-spin mb-4" />
        <p className="text-slate-500 font-medium">Fetching your Movie Library...</p>
      </div>
    );
  }

  const liveCount = posts.filter(p => p.status === 'LIVE').length;
  const draftCount = posts.filter(p => p.status === 'DRAFT').length;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 px-4">
      {/* Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center space-x-4">
          <div className="p-3 bg-orange-100 text-orange-600 rounded-xl">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Total Posts</p>
            <p className="text-2xl font-bold text-slate-800">{posts.length}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center space-x-4">
          <div className="p-3 bg-green-100 text-green-600 rounded-xl">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Live Content</p>
            <p className="text-2xl font-bold text-slate-800">{liveCount}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center space-x-4">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
            <Eye className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Drafts</p>
            <p className="text-2xl font-bold text-slate-800">{draftCount}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex-1 max-w-xl relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search movies, series or posts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none transition-all shadow-sm"
          />
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-white border border-slate-200 rounded-xl px-4 py-3 outline-none text-sm font-medium text-slate-600 shadow-sm"
          >
            <option value="ALL">All Status</option>
            <option value="LIVE">Published</option>
            <option value="DRAFT">Drafts</option>
          </select>
          <button
            onClick={onCreate}
            className="flex items-center px-6 py-3 bg-orange-600 text-white rounded-xl font-bold shadow-lg shadow-orange-200 hover:bg-orange-700 transition-all active:scale-95"
          >
            <Plus className="w-5 h-5 mr-2" />
            Create Post
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Post Content</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPosts.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-slate-400">
                    <FileText className="w-12 h-12 mx-auto mb-2 opacity-20" />
                    No posts matching your search.
                  </td>
                </tr>
              ) : (
                filteredPosts.map((post) => (
                  <tr key={post.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-800 line-clamp-1">{post.title || 'Untitled Movie'}</span>
                        <span className="text-xs text-slate-400 mt-1">Updated {new Date(post.updated).toLocaleDateString()}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded-full ${
                        post.status === 'LIVE' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {post.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end space-x-1">
                        <button onClick={() => onEdit(post.id)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Edit3 className="w-5 h-5" /></button>
                        {post.status === 'LIVE' && <a href={post.url} target="_blank" className="p-2 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg"><ExternalLink className="w-5 h-5" /></a>}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
