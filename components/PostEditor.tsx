
import React, { useState, useEffect } from 'react';
import { BloggerPost, AISuggestionType, MovieTemplateData, DownloadLink } from '../types';
import { BloggerService } from '../services/bloggerService';
import { AIService } from '../services/aiService';
import RichTextEditor from './RichTextEditor';
import { 
  ArrowLeft, Save, CheckCircle, AlertCircle, Sparkles, 
  Wand2, FileJson, Languages, Loader2, X, Film, Image, 
  Star, Type, Link, PlusCircle, MinusCircle, Tags, MagicWand
} from 'lucide-react';

interface PostEditorProps {
  bloggerService: BloggerService;
  postId: string | null;
  onBack: () => void;
}

const PostEditor: React.FC<PostEditorProps> = ({ bloggerService, postId, onBack }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [labels, setLabels] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(!!postId);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  // Movie Template State
  const [movieData, setMovieData] = useState<MovieTemplateData>({
    posterUrl: '',
    genre: '',
    imdb: '',
    plot: '',
    downloadLinks: [{ label: 'Download', url: '' }]
  });

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
          setLabels(post.labels?.join(', ') || '');
          
          // Try to extract movie data if it's already a movie card
          // This is a simple heuristic; a more robust one would involve hidden metadata
          if (post.content.includes('movie-card-vertical')) {
            const parser = new DOMParser();
            const doc = parser.parseFromString(post.content, 'text/html');
            const poster = doc.querySelector('.poster img')?.getAttribute('src') || '';
            const imdb = doc.querySelector('p:nth-of-type(2)')?.textContent?.replace('IMDb Rating: ⭐ ', '') || '';
            const genre = doc.querySelector('p:nth-of-type(1)')?.textContent?.replace('Genre: ', '') || '';
            const plot = doc.querySelector('p:nth-of-type(3)')?.textContent?.replace('Plot: ', '') || '';
            
            const links: DownloadLink[] = [];
            doc.querySelectorAll('.seasons li').forEach(li => {
              const a = li.querySelector('a');
              if (a) {
                links.push({
                  label: a.textContent || 'Download',
                  url: a.getAttribute('href') || ''
                });
              }
            });

            setMovieData({
              posterUrl: poster,
              genre,
              imdb,
              plot,
              downloadLinks: links.length > 0 ? links : [{ label: 'Download', url: '' }]
            });
          }
        } catch (err: any) {
          setError('Failed to load post: ' + err.message);
        } finally {
          setFetching(false);
        }
      };
      fetchPost();
    }
  }, [postId, bloggerService]);

  // handleAiAction: Interacts with Gemini API through AIService
  const handleAiAction = async (type: AISuggestionType) => {
    setAiLoading(true);
    setAiResult(null);
    setError(null);
    try {
      const contextContent = content || movieData.plot || '';
      const result = await aiService.getSuggestion(type, { 
        title, 
        content: contextContent 
      });
      setAiResult(result);
    } catch (err: any) {
      setError('AI Assistant error: ' + err.message);
    } finally {
      setAiLoading(false);
    }
  };

  const generateMovieHTML = () => {
    const linksHTML = movieData.downloadLinks
      .filter(l => l.url)
      .map(l => `<li>${l.label} - <a href="${l.url}" class="download-btn" target="_blank">${l.label}</a></li>`)
      .join('\n');

    return `
<div class="movie-card-vertical">
  <h2>${title}</h2>
  <div class="poster">
    <img src="${movieData.posterUrl || 'https://via.placeholder.com/300x450?text=No+Poster'}" alt="${title} Poster">
  </div>
  <p><b>Genre:</b> ${movieData.genre}</p>
  <p><b>IMDb Rating:</b> ⭐ ${movieData.imdb}</p>
  <p><b>Plot:</b> ${movieData.plot}</p>
  <h3>Download Links</h3>
  <ul class="seasons">
    ${linksHTML}
  </ul>
</div>

<style>
  .movie-card-vertical {
    max-width: 500px;
    margin: 30px auto;
    padding: 20px;
    border: 1px solid #e2e8f0;
    border-radius: 20px;
    background: #ffffff;
    font-family: 'Inter', sans-serif;
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
    text-align: center;
  }
  .movie-card-vertical h2 { margin-top: 0; color: #0f172a; font-weight: 800; }
  .movie-card-vertical .poster img { width: 100%; max-width: 300px; border-radius: 12px; margin: 15px 0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
  .movie-card-vertical p { margin: 12px 0; line-height: 1.6; color: #475569; font-size: 15px; }
  .movie-card-vertical h3 { margin-top: 24px; color: #1e293b; font-weight: 700; border-bottom: 2px solid #f1f5f9; padding-bottom: 8px; }
  .movie-card-vertical .seasons { list-style: none; padding: 0; margin: 16px 0; }
  .movie-card-vertical .seasons li { margin: 12px 0; color: #64748b; font-size: 14px; }
  .download-btn {
    display: inline-block;
    margin-left: 8px;
    padding: 8px 20px;
    background-color: #f97316;
    color: white !important;
    text-decoration: none !important;
    border-radius: 10px;
    font-weight: 700;
    transition: all 0.2s;
  }
  .download-btn:hover { background-color: #ea580c; transform: translateY(-1px); }
</style>
    `.trim();
  };

  const handleSave = async (isPublish: boolean = false) => {
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    
    setLoading(true);
    setError(null);
    setSuccess(false);

    // Prepare final content - either from form or from editor
    const finalContent = movieData.posterUrl ? generateMovieHTML() : content;
    const labelList = labels.split(',').map(s => s.trim()).filter(s => s);

    try {
      if (postId) {
        await bloggerService.updatePost(postId, title, finalContent);
      } else {
        const saved = await bloggerService.createPost(title, finalContent);
        if (isPublish) {
          await bloggerService.publishPost(saved.id);
        }
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      if (!postId) setTimeout(onBack, 1500);
    } catch (err: any) {
      setError('Failed to save: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateDownloadLink = (index: number, field: keyof DownloadLink, value: string) => {
    const newLinks = [...movieData.downloadLinks];
    newLinks[index][field] = value;
    setMovieData({ ...movieData, downloadLinks: newLinks });
  };

  const addDownloadLink = () => {
    setMovieData({
      ...movieData,
      downloadLinks: [...movieData.downloadLinks, { label: 'Download', url: '' }]
    });
  };

  const removeDownloadLink = (index: number) => {
    if (movieData.downloadLinks.length <= 1) return;
    setMovieData({
      ...movieData,
      downloadLinks: movieData.downloadLinks.filter((_, i) => i !== index)
    });
  };

  if (fetching) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 className="w-12 h-12 text-orange-500 animate-spin mb-4" />
        <p className="text-slate-500">Loading editor...</p>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-140px)] gap-6 px-4 pb-4 relative overflow-hidden">
      <div className={`flex-1 overflow-y-auto pr-2 transition-all duration-300 ${isAiSidebarOpen ? 'mr-80' : ''}`}>
        <div className="flex flex-col space-y-6">
          <div className="flex items-center justify-between sticky top-0 bg-slate-50 py-2 z-10">
            <button onClick={onBack} className="flex items-center text-sm font-bold text-slate-500 hover:text-slate-800"><ArrowLeft className="w-4 h-4 mr-1" /> Back</button>
            <div className="flex space-x-2">
              <button 
                onClick={() => setIsAiSidebarOpen(!isAiSidebarOpen)} 
                className={`px-4 py-2 border rounded-xl text-sm font-bold flex items-center transition-all ${isAiSidebarOpen ? 'bg-orange-100 border-orange-200 text-orange-700' : 'bg-white text-slate-700 hover:bg-slate-50 shadow-sm'}`}
              >
                <Sparkles className="w-4 h-4 mr-2" /> AI Helper
              </button>
              <button 
                onClick={() => { setIsAiSidebarOpen(true); handleAiAction('SUMMARIZE'); }} 
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl text-sm font-bold flex items-center shadow-md hover:shadow-lg transition-all active:scale-95"
              >
                <Wand2 className="w-4 h-4 mr-2" /> Generate Plot
              </button>
              <button onClick={() => handleSave(false)} disabled={loading} className="px-5 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold shadow-sm hover:bg-slate-50 disabled:opacity-50 flex items-center"><Save className="w-4 h-4 mr-2" /> Save Draft</button>
              <button onClick={() => handleSave(true)} disabled={loading} className="px-5 py-2 bg-orange-600 text-white rounded-xl font-bold shadow-lg shadow-orange-100 hover:bg-orange-700 disabled:opacity-50 flex items-center"><CheckCircle className="w-4 h-4 mr-2" /> Publish</button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column: Form Info */}
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
                <div className="flex items-center space-x-2 text-slate-400 mb-2">
                   <Film className="w-4 h-4" />
                   <span className="text-xs font-bold uppercase tracking-wider">Movie Details</span>
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Movie Title</label>
                  <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-4 py-2 bg-slate-50 border-0 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none font-bold text-lg" placeholder="e.g., BnG Season 2 (2022)"/>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Genre</label>
                    <input type="text" value={movieData.genre} onChange={(e) => setMovieData({...movieData, genre: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border-0 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none" placeholder="romance, family..."/>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">IMDb Rating</label>
                    <input type="text" value={movieData.imdb} onChange={(e) => setMovieData({...movieData, imdb: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border-0 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none" placeholder="7.7"/>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Poster URL</label>
                  <div className="flex space-x-2">
                    <input type="text" value={movieData.posterUrl} onChange={(e) => setMovieData({...movieData, posterUrl: e.target.value})} className="flex-1 px-4 py-2 bg-slate-50 border-0 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none" placeholder="https://..."/>
                    {movieData.posterUrl && <img src={movieData.posterUrl} className="w-10 h-14 object-cover rounded shadow-sm border border-slate-200" />}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Plot Summary</label>
                  <textarea value={movieData.plot} onChange={(e) => setMovieData({...movieData, plot: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border-0 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none resize-none h-24 text-sm" placeholder="Write a short summary..."></textarea>
                </div>

                <div>
                   <label className="block text-xs font-bold text-slate-500 mb-1 flex items-center">
                     <Tags className="w-3 h-3 mr-1" /> Blogger Labels (comma separated)
                   </label>
                   <input type="text" value={labels} onChange={(e) => setLabels(e.target.value)} className="w-full px-4 py-2 bg-slate-50 border-0 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-sm" placeholder="Movie, Romance, Season 2..."/>
                </div>
              </div>
            </div>

            {/* Right Column: Download Links */}
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col h-full">
                <div className="flex items-center justify-between mb-4">
                   <div className="flex items-center space-x-2 text-slate-400">
                      <Link className="w-4 h-4" />
                      <span className="text-xs font-bold uppercase tracking-wider">Download Links</span>
                   </div>
                   <button onClick={addDownloadLink} className="text-orange-600 hover:text-orange-700 flex items-center text-xs font-bold">
                     <PlusCircle className="w-4 h-4 mr-1" /> Add Link
                   </button>
                </div>

                <div className="space-y-3 flex-1 overflow-y-auto max-h-[350px] pr-2">
                  {movieData.downloadLinks.map((link, index) => (
                    <div key={index} className="p-3 bg-slate-50 rounded-xl space-y-2 border border-slate-100 relative group">
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          value={link.label} 
                          onChange={(e) => updateDownloadLink(index, 'label', e.target.value)} 
                          className="w-1/3 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold outline-none" 
                          placeholder="Button Label"
                        />
                        <input 
                          type="text" 
                          value={link.url} 
                          onChange={(e) => updateDownloadLink(index, 'url', e.target.value)} 
                          className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none" 
                          placeholder="Link URL"
                        />
                      </div>
                      <button onClick={() => removeDownloadLink(index)} className="absolute -right-2 -top-2 bg-white text-red-500 shadow-sm rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                         <MinusCircle className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                
                <div className="mt-6 pt-4 border-t border-slate-50">
                   <p className="text-[10px] text-slate-400 uppercase font-bold mb-2">Preview</p>
                   <div className="flex flex-wrap gap-2">
                     {movieData.downloadLinks.map((l, i) => l.url && (
                       <span key={i} className="px-3 py-1.5 bg-orange-600 text-white text-[10px] font-bold rounded-lg shadow-sm">{l.label}</span>
                     ))}
                   </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
             <div className="flex items-center space-x-2 text-slate-400 mb-4">
                <Type className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Rich Text Editor (Optional)</span>
             </div>
             <RichTextEditor value={content} onChange={setContent} />
          </div>

          {error && <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-r-xl text-red-700 text-sm font-medium flex items-center"><AlertCircle className="w-4 h-4 mr-2" /> {error}</div>}
          {success && <div className="p-4 bg-green-50 border-l-4 border-green-500 rounded-r-xl text-green-700 text-sm font-medium flex items-center"><CheckCircle className="w-4 h-4 mr-2" /> Action Successful!</div>}
        </div>
      </div>

      {/* AI SIDEBAR */}
      <aside className={`fixed right-0 top-[80px] h-[calc(100vh-100px)] w-80 bg-white border-l border-slate-200 shadow-2xl transition-transform duration-300 transform z-20 ${isAiSidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex flex-col h-full p-6">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-bold text-slate-800 flex items-center">
              <Sparkles className="w-5 h-5 text-orange-500 mr-2" /> AI Assistant
            </h3>
            <button onClick={() => setIsAiSidebarOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
          </div>

          <div className="space-y-3 mb-8">
            <button onClick={() => handleAiAction('OPTIMIZE_TITLE')} className="w-full flex items-center p-3 text-sm font-bold text-slate-600 bg-slate-50 hover:bg-orange-50 hover:text-orange-600 rounded-xl border border-slate-100 transition-all"><Wand2 className="w-4 h-4 mr-3 text-orange-400" /> SEO titles</button>
            <button onClick={() => handleAiAction('SUMMARIZE')} className="w-full flex items-center p-3 text-sm font-bold text-slate-600 bg-slate-50 hover:bg-orange-50 hover:text-orange-600 rounded-xl border border-slate-100 transition-all"><FileJson className="w-4 h-4 mr-3 text-orange-400" /> Plot Summary</button>
            <button onClick={() => handleAiAction('FIX_GRAMMAR')} className="w-full flex items-center p-3 text-sm font-bold text-slate-600 bg-slate-50 hover:bg-orange-50 hover:text-orange-600 rounded-xl border border-slate-100 transition-all"><Languages className="w-4 h-4 mr-3 text-orange-400" /> Fix Grammar</button>
          </div>

          <div className="flex-1 flex flex-col min-h-0">
             <div className="flex-1 bg-slate-50 rounded-2xl p-4 overflow-y-auto border border-slate-100 relative">
               {aiLoading ? (
                 <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80">
                   <Loader2 className="w-10 h-10 text-orange-500 animate-spin mb-2" />
                   <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Thinking...</span>
                 </div>
               ) : aiResult ? (
                 <div className="space-y-4">
                   <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{aiResult}</div>
                   <button onClick={() => { navigator.clipboard.writeText(aiResult); setSuccess(true); setTimeout(() => setSuccess(false), 2000); }} className="w-full py-2 bg-white border border-slate-200 text-xs font-bold text-slate-500 rounded-lg shadow-sm hover:bg-slate-50 transition-colors uppercase">Copy Results</button>
                 </div>
               ) : (
                 <div className="h-full flex flex-col items-center justify-center text-center opacity-30">
                   <Sparkles className="w-12 h-12 mb-2" />
                   <p className="text-xs font-bold uppercase tracking-wider">Select an action</p>
                 </div>
               )}
             </div>
          </div>
        </div>
      </aside>
    </div>
  );
};

export default PostEditor;
