
import React, { useState, useEffect } from 'react';
import { BloggerPost, AISuggestionType } from '../types';
import { BloggerService } from '../services/bloggerService';
import { AIService } from '../services/aiService';
import RichTextEditor from './RichTextEditor';
import { 
  ArrowLeft, Save, CheckCircle, AlertCircle, Sparkles, 
  Wand2, LayoutPanelLeft, FileJson, Languages, Loader2, X
} from 'lucide-react';

interface PostEditorProps {
  bloggerService: BloggerService;
  postId: string | null;
  onBack: () => void;
}

const PostEditor: React.FC<PostEditorProps> = ({ bloggerService, postId, onBack }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(!!postId);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  // AI State
  const [isAiSidebarOpen, setIsAiSidebarOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);

  const aiService = new AIService();

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
        setTimeout(onBack, 1000);
      }
    } catch (err: any) {
      setError('Failed to save: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAiAction = async (type: AISuggestionType) => {
    setAiLoading(true);
    setAiResult(null);
    try {
      const result = await aiService.getSuggestion(type, { title, content });
      setAiResult(result);
      setIsAiSidebarOpen(true);
    } catch (err: any) {
      setError("AI Error: " + err.message);
    } finally {
      setAiLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-10 h-10 text-orange-600 animate-spin mb-4" />
        <p className="text-gray-500">Loading editor...</p>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-120px)] gap-6 px-4 sm:px-0 relative overflow-hidden">
      <div className={`flex-1 transition-all duration-300 ease-in-out ${isAiSidebarOpen ? 'mr-80' : 'mr-0'}`}>
        <div className="flex flex-col h-full space-y-4">
          <div className="flex items-center justify-between">
            <button
              onClick={onBack}
              className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to list
            </button>
            <div className="flex space-x-2">
              <button
                onClick={() => setIsAiSidebarOpen(!isAiSidebarOpen)}
                className={`inline-flex items-center px-4 py-2 border rounded-md shadow-sm text-sm font-medium transition-colors ${
                  isAiSidebarOpen ? 'bg-orange-100 border-orange-200 text-orange-700' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                AI Assistant
              </button>
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

          <div className="bg-white shadow rounded-lg p-6 border border-gray-200 flex-1 flex flex-col space-y-4 overflow-hidden">
            <div className="flex-shrink-0">
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 border-b border-gray-100 focus:border-orange-500 outline-none text-2xl font-bold placeholder-gray-300"
                placeholder="Blog Post Title"
              />
            </div>

            <div className="flex-1 overflow-auto">
              <RichTextEditor value={content} onChange={setContent} />
            </div>
            
            <div className="flex-shrink-0 pt-4 flex items-center justify-between text-xs text-gray-400 border-t border-gray-50">
              <div className="flex space-x-4">
                <span>{content.replace(/<[^>]*>/g, '').length} characters</span>
                <span>{content.split(/\s+/).filter(x => x).length} words</span>
              </div>
              {error && <span className="text-red-500 font-medium flex items-center"><AlertCircle className="w-3 h-3 mr-1"/> {error}</span>}
              {success && <span className="text-green-500 font-medium flex items-center"><CheckCircle className="w-3 h-3 mr-1"/> Saved!</span>}
            </div>
          </div>
        </div>
      </div>

      {/* AI SIDEBAR */}
      <aside className={`fixed right-0 top-[104px] h-[calc(100vh-120px)] w-80 bg-white border-l border-gray-200 shadow-xl transition-transform duration-300 transform z-20 ${isAiSidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex flex-col h-full p-4 overflow-hidden">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-900 flex items-center">
              <Sparkles className="w-5 h-5 text-orange-600 mr-2" />
              Gemini AI
            </h3>
            <button onClick={() => setIsAiSidebarOpen(false)} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-3 mb-6">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Quick Actions</p>
            <button 
              onClick={() => handleAiAction('OPTIMIZE_TITLE')}
              className="w-full flex items-center p-3 text-sm text-gray-700 bg-gray-50 hover:bg-orange-50 hover:text-orange-700 rounded-lg transition-colors border border-gray-100"
            >
              <Wand2 className="w-4 h-4 mr-3 text-orange-500" />
              Optimize Title
            </button>
            <button 
              onClick={() => handleAiAction('SUMMARIZE')}
              className="w-full flex items-center p-3 text-sm text-gray-700 bg-gray-50 hover:bg-orange-50 hover:text-orange-700 rounded-lg transition-colors border border-gray-100"
            >
              <FileJson className="w-4 h-4 mr-3 text-orange-500" />
              Generate Summary
            </button>
            <button 
              onClick={() => handleAiAction('EXPAND')}
              className="w-full flex items-center p-3 text-sm text-gray-700 bg-gray-50 hover:bg-orange-50 hover:text-orange-700 rounded-lg transition-colors border border-gray-100"
            >
              <LayoutPanelLeft className="w-4 h-4 mr-3 text-orange-500" />
              Expand Bullet Points
            </button>
            <button 
              onClick={() => handleAiAction('FIX_GRAMMAR')}
              className="w-full flex items-center p-3 text-sm text-gray-700 bg-gray-50 hover:bg-orange-50 hover:text-orange-700 rounded-lg transition-colors border border-gray-100"
            >
              <Languages className="w-4 h-4 mr-3 text-orange-500" />
              Improve Grammar
            </button>
          </div>

          <div className="flex-1 overflow-hidden flex flex-col">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Result</p>
            <div className="flex-1 bg-gray-50 rounded-lg p-4 overflow-auto border border-gray-100 relative">
              {aiLoading ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 bg-opacity-80">
                  <Loader2 className="w-8 h-8 text-orange-600 animate-spin mb-2" />
                  <p className="text-xs text-gray-500">Gemini is thinking...</p>
                </div>
              ) : aiResult ? (
                <div className="space-y-3">
                  <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{aiResult}</div>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(aiResult);
                      setSuccess(true);
                      setTimeout(() => setSuccess(false), 2000);
                    }}
                    className="text-xs text-orange-600 font-bold hover:underline"
                  >
                    Copy to Clipboard
                  </button>
                </div>
              ) : (
                <p className="text-sm text-gray-400 italic">Select an action above to generate content ideas.</p>
              )}
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
};

export default PostEditor;
