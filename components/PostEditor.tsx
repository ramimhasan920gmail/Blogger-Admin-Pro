
import React, { useState, useEffect } from 'react';
import { BloggerPost, AISuggestionType, MovieTemplateData, DownloadLink, AppSettings } from '../types';
import { BloggerService } from '../services/bloggerService';
import { AIService } from '../services/aiService';
import RichTextEditor from './RichTextEditor';
import { 
  ArrowLeft, Save, CheckCircle, AlertCircle, Sparkles, 
  Wand2, FileJson, Languages, Loader2, X, Film, Image, 
  Star, Type, Link, PlusCircle, MinusCircle, Tags,
  Users, User, DollarSign, Globe, Calendar, Languages as LangIcon
} from 'lucide-react';

interface PostEditorProps {
  bloggerService: BloggerService;
  postId: string | null;
  onBack: () => void;
  settings: AppSettings;
}

const PostEditor: React.FC<PostEditorProps> = ({ bloggerService, postId, onBack, settings }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [labels, setLabels] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(!!postId);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const [movieData, setMovieData] = useState<MovieTemplateData>({
    posterUrl: '',
    genre: '',
    imdb: '',
    plot: '',
    director: '',
    cast: '',
    budget: '',
    releaseDate: '',
    language: '',
    downloadLinks: [{ label: 'Download', url: '' }]
  });

  const [isAiSidebarOpen, setIsAiSidebarOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [sources, setSources] = useState<any[]>([]);

  // Pass user API key to AIService
  const aiService = new AIService(settings.geminiApiKey);

  useEffect(() => {
    if (postId) {
      const fetchPost = async () => {
        try {
          const post = await bloggerService.getPost(postId);
          setTitle(post.title);
          setContent(post.content);
          setLabels(post.labels?.join(', ') || '');
          
          if (post.content.includes('movie-card-vertical')) {
            const parser = new DOMParser();
            const doc = parser.parseFromString(post.content, 'text/html');
            const poster = doc.querySelector('.poster img')?.getAttribute('src') || '';
            const imdb = doc.querySelector('.imdb-rating')?.textContent?.replace('⭐ ', '') || '';
            const genre = doc.querySelector('.movie-genre')?.textContent || '';
            const plot = doc.querySelector('.movie-plot')?.textContent || '';
            const director = doc.querySelector('.movie-director')?.textContent || '';
            const cast = doc.querySelector('.movie-cast')?.textContent || '';
            const budget = doc.querySelector('.movie-budget')?.textContent || '';
            const releaseDate = doc.querySelector('.movie-release')?.textContent || '';
            const language = doc.querySelector('.movie-language')?.textContent || '';
            
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
              posterUrl: poster, genre, imdb, plot, director, cast, budget, releaseDate, language,
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

  const handleAutoFill = async () => {
    if (!title) {
      setError("Please enter a movie name first.");
      return;
    }
    setAiLoading(true);
    setError(null);
    try {
      const result = await aiService.getSuggestion('FETCH_MOVIE_DETAILS', { title, content: '' });
      const data = JSON.parse(result.text);
      setMovieData(prev => ({
        ...prev,
        genre: data.genre || prev.genre,
        imdb: data.imdb || prev.imdb,
        plot: data.plot || prev.plot,
        director: data.director || prev.director,
        cast: data.cast || prev.cast,
        budget: data.budget || prev.budget,
        releaseDate: data.releaseDate || prev.releaseDate,
        language: data.language || prev.language
      }));
      setSources(result.grounding);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (err: any) {
      setError("AI Auto-fill failed: " + err.message);
    } finally {
      setAiLoading(false);
    }
  };

  const handleAiAction = async (type: AISuggestionType) => {
    setAiLoading(true);
    setAiResult(null);
    setSources([]);
    try {
      const result = await aiService.getSuggestion(type, { title, content: content || movieData.plot });
      setAiResult(typeof result.text === 'string' ? result.text : JSON.stringify(result.text));
      setSources(result.grounding);
    } catch (err: any) {
      setError('AI Assistant error: ' + err.message);
    } finally {
      setAiLoading(false);
    }
  };

  const generateMovieHTML = () => {
    const linksHTML = movieData.downloadLinks
      .filter(l => l.url)
      .map(l => `<li><a href="${l.url}" class="download-btn" target="_blank">${l.label}</a></li>`)
      .join('\n');

    return `
<div class="movie-card-vertical">
  <h2>${title}</h2>
  <div class="poster">
    <img src="${movieData.posterUrl || 'https://via.placeholder.com/300x450?text=No+Poster'}" alt="${title} Poster">
  </div>
  <div class="info-grid">
    <p><b>Genre:</b> <span class="movie-genre">${movieData.genre}</span></p>
    <p><b>IMDb:</b> <span class="imdb-rating">⭐ ${movieData.imdb}</span></p>
    <p><b>Released:</b> <span class="movie-release">${movieData.releaseDate}</span></p>
    <p><b>Language:</b> <span class="movie-language">${movieData.language}</span></p>
    <p><b>Director:</b> <span class="movie-director">${movieData.director}</span></p>
    <p><b>Budget:</b> <span class="movie-budget">${movieData.budget}</span></p>
  </div>
  <p><b>Cast:</b> <span class="movie-cast">${movieData.cast}</span></p>
  <p><b>Plot:</b> <span class="movie-plot">${movieData.plot}</span></p>
  <h3>Download Links</h3>
  <ul class="seasons">
    ${linksHTML}
  </ul>
</div>

<style>
  .movie-card-vertical { max-width: 500px; margin: 30px auto; padding: 25px; border-radius: 20px; background: #fff; font-family: 'Inter', sans-serif; box-shadow: 0 15px 35px rgba(0,0,0,0.1); text-align: center; border: 1px solid #eee; }
  .movie-card-vertical h2 { color: #1a202c; font-size: 24px; margin-bottom: 15px; }
  .movie-card-vertical .poster img { width: 100%; max-width: 280px; border-radius: 12px; margin-bottom: 20px; box-shadow: 0 8px 16px rgba(0,0,0,0.15); }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; text-align: left; margin-bottom: 15px; background: #f8fafc; padding: 15px; border-radius: 12px; }
  .movie-card-vertical p { font-size: 14px; color: #4a5568; line-height: 1.6; margin: 8px 0; text-align: left; }
  .movie-card-vertical h3 { margin-top: 25px; border-top: 1px solid #edf2f7; padding-top: 15px; color: #2d3748; }
  .seasons { list-style: none; padding: 0; display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; margin-top: 15px; }
  .download-btn { display: inline-block; padding: 10px 20px; background: #f97316; color: #fff !important; text-decoration: none !important; border-radius: 8px; font-weight: bold; transition: 0.2s; }
  .download-btn:hover { background: #ea580c; transform: translateY(-2px); }
</style>
    `.trim();
  };

  const handleSave = async (isPublish: boolean = false) => {
    if (!title.trim()) { setError('Title is required'); return; }
    setLoading(true); setError(null); setSuccess(false);
    const finalContent = movieData.posterUrl ? generateMovieHTML() : content;
    try {
      if (postId) { await bloggerService.updatePost(postId, title, finalContent); } 
      else { const saved = await bloggerService.createPost(title, finalContent); if (isPublish) await bloggerService.publishPost(saved.id); }
      setSuccess(true); setTimeout(() => setSuccess(false), 3000); if (!postId) setTimeout(onBack, 1500);
    } catch (err: any) { setError('Failed to save: ' + err.message); } finally { setLoading(false); }
  };

  return (
    <div className="flex h-[calc(100vh-140px)] gap-6 px-4 pb-4 relative overflow-hidden">
      <div className={`flex-1 overflow-y-auto pr-2 transition-all duration-300 ${isAiSidebarOpen ? 'mr-80' : ''}`}>
        <div className="flex flex-col space-y-6">
          <div className="flex items-center justify-between sticky top-0 bg-slate-50 py-2 z-10">
            <button onClick={onBack} className="flex items-center text-sm font-bold text-slate-500 hover:text-slate-800"><ArrowLeft className="w-4 h-4 mr-1" /> Back</button>
            <div className="flex space-x-2">
              <button 
                onClick={handleAutoFill} 
                disabled={aiLoading}
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold flex items-center shadow-md hover:bg-indigo-700 disabled:opacity-50 transition-all active:scale-95"
              >
                {aiLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Wand2 className="w-4 h-4 mr-2" />}
                Auto-Fill Details (AI)
              </button>
              <button onClick={() => setIsAiSidebarOpen(!isAiSidebarOpen)} className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-bold flex items-center shadow-sm hover:bg-slate-50 transition-all"><Sparkles className="w-4 h-4 mr-2 text-orange-400" /> AI Helper</button>
              <button onClick={() => handleSave(false)} className="px-5 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold shadow-sm hover:bg-slate-50 transition-all flex items-center"><Save className="w-4 h-4 mr-2" /> Save Draft</button>
              <button onClick={() => handleSave(true)} className="px-5 py-2 bg-orange-600 text-white rounded-xl font-bold shadow-lg shadow-orange-100 hover:bg-orange-700 transition-all flex items-center"><CheckCircle className="w-4 h-4 mr-2" /> Publish</button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Movie/Series Title</label>
                  <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-4 py-2 bg-slate-50 border-0 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none font-bold text-lg" placeholder="e.g., Inception (2010)"/>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1 flex items-center"><Star className="w-3 h-3 mr-1" /> IMDb Rating</label>
                    <input type="text" value={movieData.imdb} onChange={(e) => setMovieData({...movieData, imdb: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border-0 rounded-xl outline-none" placeholder="8.8"/>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1 flex items-center"><Calendar className="w-3 h-3 mr-1" /> Release Date</label>
                    <input type="text" value={movieData.releaseDate} onChange={(e) => setMovieData({...movieData, releaseDate: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border-0 rounded-xl outline-none" placeholder="July 16, 2010"/>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Genre</label>
                    <input type="text" value={movieData.genre} onChange={(e) => setMovieData({...movieData, genre: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border-0 rounded-xl outline-none" placeholder="Sci-Fi, Action"/>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1 flex items-center"><LangIcon className="w-3 h-3 mr-1" /> Language</label>
                    <input type="text" value={movieData.language} onChange={(e) => setMovieData({...movieData, language: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border-0 rounded-xl outline-none" placeholder="English"/>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1 flex items-center"><User className="w-3 h-3 mr-1" /> Director</label>
                    <input type="text" value={movieData.director} onChange={(e) => setMovieData({...movieData, director: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border-0 rounded-xl outline-none" placeholder="Christopher Nolan"/>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1 flex items-center"><DollarSign className="w-3 h-3 mr-1" /> Budget</label>
                    <input type="text" value={movieData.budget} onChange={(e) => setMovieData({...movieData, budget: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border-0 rounded-xl outline-none" placeholder="$160 Million"/>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 flex items-center"><Users className="w-3 h-3 mr-1" /> Cast</label>
                  <input type="text" value={movieData.cast} onChange={(e) => setMovieData({...movieData, cast: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border-0 rounded-xl outline-none" placeholder="Leonardo DiCaprio, Joseph Gordon-Levitt..."/>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Poster URL</label>
                  <input type="text" value={movieData.posterUrl} onChange={(e) => setMovieData({...movieData, posterUrl: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border-0 rounded-xl outline-none" placeholder="https://..."/>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Plot Summary</label>
                  <textarea value={movieData.plot} onChange={(e) => setMovieData({...movieData, plot: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border-0 rounded-xl outline-none resize-none h-24 text-sm" placeholder="A thief who steals corporate secrets..."></textarea>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col h-full">
                <div className="flex items-center justify-between mb-4">
                   <div className="flex items-center space-x-2 text-slate-400"><Link className="w-4 h-4" /><span className="text-xs font-bold uppercase tracking-wider">Download Buttons</span></div>
                   <button onClick={() => setMovieData({...movieData, downloadLinks: [...movieData.downloadLinks, { label: 'Download', url: '' }]})} className="text-orange-600 hover:text-orange-700 flex items-center text-xs font-bold"><PlusCircle className="w-4 h-4 mr-1" /> Add Link</button>
                </div>
                <div className="space-y-3 flex-1 overflow-y-auto max-h-[300px] pr-2">
                  {movieData.downloadLinks.map((link, index) => (
                    <div key={index} className="p-3 bg-slate-50 rounded-xl space-y-2 border border-slate-100 relative group">
                      <div className="flex gap-2">
                        <input type="text" value={link.label} onChange={(e) => {const n=[...movieData.downloadLinks]; n[index].label=e.target.value; setMovieData({...movieData, downloadLinks:n})}} className="w-1/3 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold outline-none" placeholder="Button Label"/>
                        <input type="text" value={link.url} onChange={(e) => {const n=[...movieData.downloadLinks]; n[index].url=e.target.value; setMovieData({...movieData, downloadLinks:n})}} className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none" placeholder="Direct Link URL"/>
                      </div>
                      <button onClick={() => setMovieData({...movieData, downloadLinks: movieData.downloadLinks.filter((_,i)=>i!==index)})} className="absolute -right-2 -top-2 bg-white text-red-500 shadow-sm rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"><MinusCircle className="w-4 h-4" /></button>
                    </div>
                  ))}
                </div>
                {sources.length > 0 && (
                  <div className="mt-6 pt-4 border-t border-slate-50">
                    <p className="text-[10px] text-slate-400 uppercase font-bold mb-2 flex items-center"><Globe className="w-3 h-3 mr-1" /> Data Sources (Grounding)</p>
                    <div className="flex flex-col gap-1">
                      {sources.map((src, i) => src.web && (
                        <a key={i} href={src.web.uri} target="_blank" className="text-[10px] text-blue-500 hover:underline truncate">{src.web.title || src.web.uri}</a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
             <RichTextEditor value={content} onChange={setContent} />
          </div>

          {error && <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-r-xl text-red-700 text-sm font-medium flex items-center"><AlertCircle className="w-4 h-4 mr-2" /> {error}</div>}
          {success && <div className="p-4 bg-green-50 border-l-4 border-green-500 rounded-r-xl text-green-700 text-sm font-medium flex items-center"><CheckCircle className="w-4 h-4 mr-2" /> Action Successful!</div>}
        </div>
      </div>

      <aside className={`fixed right-0 top-[80px] h-[calc(100vh-100px)] w-80 bg-white border-l border-slate-200 shadow-2xl transition-transform duration-300 transform z-20 ${isAiSidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex flex-col h-full p-6">
          <div className="flex items-center justify-between mb-8"><h3 className="text-lg font-bold text-slate-800 flex items-center"><Sparkles className="w-5 h-5 text-orange-500 mr-2" /> AI Assistant</h3><button onClick={() => setIsAiSidebarOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button></div>
          <div className="space-y-3 mb-8">
            <button onClick={() => handleAiAction('OPTIMIZE_TITLE')} className="w-full flex items-center p-3 text-sm font-bold text-slate-600 bg-slate-50 hover:bg-orange-50 rounded-xl transition-all"><Wand2 className="w-4 h-4 mr-3 text-orange-400" /> Optimize Title</button>
            <button onClick={() => handleAiAction('FIX_GRAMMAR')} className="w-full flex items-center p-3 text-sm font-bold text-slate-600 bg-slate-50 hover:bg-orange-50 rounded-xl transition-all"><Languages className="w-4 h-4 mr-3 text-orange-400" /> Fix Grammar</button>
          </div>
          <div className="flex-1 bg-slate-50 rounded-2xl p-4 overflow-y-auto border border-slate-100 relative">
             {aiLoading ? <div className="absolute inset-0 flex items-center justify-center bg-white/80"><Loader2 className="w-10 h-10 text-orange-500 animate-spin" /></div> : aiResult && <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{aiResult}</div>}
          </div>
        </div>
      </aside>
    </div>
  );
};

export default PostEditor;
