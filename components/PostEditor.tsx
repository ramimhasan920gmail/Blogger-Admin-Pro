
import React, { useState, useEffect } from 'react';
import { BloggerPost } from '../types';
import { BloggerService } from '../services/bloggerService';
import RichTextEditor from './RichTextEditor';
import { ArrowLeft, Save, CheckCircle, AlertCircle } from 'lucide-react';

interface PostEditorProps {
  bloggerService: BloggerService;
  postId: string | null; // null means create new
  onBack: () => void;
}

const PostEditor: React.FC<PostEditorProps> = ({ bloggerService, postId, onBack }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(!!postId);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (postId) {
      const fetchPost = async () => {
        try {
          const post = await bloggerService.getPost(postId);
          setTitle(post.title);
          setContent(post.content);
        } catch (err: any) {
          setError('Failed to load post: ' + err.message);
        } finally {
          setFetching(false);
        }
      };
      fetchPost();
    }
  }, [postId, bloggerService]);

  const handleSave = async (isPublish: boolean = false) => {
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      let savedPost: BloggerPost;
      if (postId) {
        savedPost = await bloggerService.updatePost(postId, title, content);
      } else {
        savedPost = await bloggerService.createPost(title, content);
      }

      if (isPublish && savedPost.status === 'DRAFT') {
        await bloggerService.publishPost(savedPost.id);
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      
      if (!postId) {
        // If it was a new post, go back to list or we could redirect to edit mode of the new ID
        setTimeout(onBack, 1000);
      }
    } catch (err: any) {
      setError('Failed to save: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin mb-4"></div>
        <p className="text-gray-500">Loading editor...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-4 sm:px-0">
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to list
        </button>
        <div className="flex space-x-2">
          {error && (
            <div className="flex items-center text-red-600 text-sm bg-red-50 px-3 py-1 rounded-md border border-red-100">
              <AlertCircle className="w-4 h-4 mr-1" />
              {error}
            </div>
          )}
          {success && (
            <div className="flex items-center text-green-600 text-sm bg-green-50 px-3 py-1 rounded-md border border-green-100">
              <CheckCircle className="w-4 h-4 mr-1" />
              Saved successfully
            </div>
          )}
          <button
            onClick={() => handleSave(false)}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            <Save className="w-4 h-4 mr-2" />
            {loading ? 'Saving...' : 'Save Draft'}
          </button>
          <button
            onClick={() => handleSave(true)}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 disabled:opacity-50"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            {loading ? 'Publishing...' : 'Publish'}
          </button>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6 border border-gray-200 space-y-4">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
            Post Title
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 text-lg font-bold"
            placeholder="Enter title here..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Post Content
          </label>
          <RichTextEditor value={content} onChange={setContent} />
        </div>
      </div>
    </div>
  );
};

export default PostEditor;
