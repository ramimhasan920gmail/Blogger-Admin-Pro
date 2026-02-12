
import React, { useState, useEffect, useCallback } from 'react';
import { AuthState, AppSettings } from './types';
import { APP_CONFIG } from './constants';
import { BloggerService } from './services/bloggerService';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import PostEditor from './components/PostEditor';
import { LogIn, Loader2, Settings, ShieldAlert, Key, Save, AlertCircle, Bot, Zap, Film, Database } from 'lucide-react';

const App: React.FC = () => {
  const [auth, setAuth] = useState<AuthState>({
    accessToken: localStorage.getItem('blogger_access_token'),
    expiresAt: Number(localStorage.getItem('blogger_expires_at')) || null,
    user: JSON.parse(localStorage.getItem('blogger_user') || 'null'),
  });

  const [settings, setSettings] = useState<AppSettings>({
    openAiApiKey: localStorage.getItem('app_openai_api_key') || '',
    grokApiKey: localStorage.getItem('app_grok_api_key') || '',
    tmdbApiKey: localStorage.getItem('app_tmdb_api_key') || '',
    omdbApiKey: localStorage.getItem('app_omdb_api_key') || '',
  });

  const [view, setView] = useState<'DASHBOARD' | 'EDITOR' | 'SETTINGS'>('DASHBOARD');
  const [activePostId, setActivePostId] = useState<string | null>(null);
  const [tokenClient, setTokenClient] = useState<any>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [loginError, setLoginError] = useState<{title: string, msg: string} | null>(null);
  const [settingsStatus, setSettingsStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const completeLogin = useCallback(async (accessToken: string, expiresIn: number) => {
    setIsVerifying(true);
    setLoginError(null);
    try {
      const service = new BloggerService(accessToken, APP_CONFIG.blogId);
      const userInfo = await service.getUserInfo();
      await service.verifyBlogAccess();

      const expiresAt = Date.now() + expiresIn * 1000;
      const user = {
        name: userInfo.name || userInfo.given_name || 'Blogger User',
        email: userInfo.email,
        picture: userInfo.picture || 'https://www.gravatar.com/avatar/0?d=mp'
      };

      const newAuth: AuthState = { accessToken, expiresAt, user };
      setAuth(newAuth);
      localStorage.setItem('blogger_access_token', accessToken);
      localStorage.setItem('blogger_expires_at', expiresAt.toString());
      localStorage.setItem('blogger_user', JSON.stringify(user));
    } catch (err: any) {
      setLoginError({ title: "API Error", msg: err.message || "Blogger Connection Failed." });
      localStorage.removeItem('blogger_access_token');
    } finally {
      setIsVerifying(false);
    }
  }, []);

  useEffect(() => {
    const initGsi = () => {
      // @ts-ignore
      if (window.google?.accounts?.oauth2) {
        try {
          // @ts-ignore
          const client = window.google.accounts.oauth2.initTokenClient({
            client_id: APP_CONFIG.clientId,
            scope: APP_CONFIG.scopes,
            callback: (tokenResponse: any) => {
              if (tokenResponse.access_token) {
                completeLogin(tokenResponse.access_token, tokenResponse.expires_in);
              }
            }
          });
          setTokenClient(client);
        } catch (e: any) { console.error(e); }
      }
    };
    const timer = setInterval(() => {
      // @ts-ignore
      if (window.google?.accounts?.oauth2) { initGsi(); clearInterval(timer); }
    }, 500);
    return () => clearInterval(timer);
  }, [completeLogin]);

  const handleLogin = () => tokenClient?.requestAccessToken({ prompt: 'consent' });
  const handleLogout = () => { setAuth({ accessToken: null, expiresAt: null, user: null }); localStorage.clear(); window.location.reload(); };

  const handleSaveSettings = () => {
    localStorage.setItem('app_openai_api_key', settings.openAiApiKey?.trim() || '');
    localStorage.setItem('app_grok_api_key', settings.grokApiKey?.trim() || '');
    localStorage.setItem('app_tmdb_api_key', settings.tmdbApiKey?.trim() || '');
    localStorage.setItem('app_omdb_api_key', settings.omdbApiKey?.trim() || '');
    setSettingsStatus('success');
    setTimeout(() => { setSettingsStatus('idle'); setView('DASHBOARD'); }, 1500);
  };

  const isTokenExpired = auth.expiresAt ? Date.now() > auth.expiresAt : true;

  if (!auth.accessToken || isTokenExpired || isVerifying) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4">
        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
          <div className="w-16 h-16 bg-orange-600 rounded-2xl flex items-center justify-center text-white font-bold text-4xl shadow-xl mx-auto">B</div>
          <h2 className="mt-6 text-3xl font-extrabold text-slate-900">Blogger Admin Pro</h2>
          <p className="mt-2 text-sm text-slate-500 tracking-wide">AI-Powered Movie Blog Manager</p>
          <div className="mt-8 bg-white py-8 px-10 shadow-xl rounded-2xl border border-slate-100">
            {isVerifying ? <Loader2 className="w-10 h-10 text-orange-600 animate-spin mx-auto" /> : (
              <div className="space-y-6">
                {loginError && <div className="bg-red-50 p-4 rounded-xl text-left flex items-start text-red-700 text-sm"><ShieldAlert className="w-5 h-5 mr-2 flex-shrink-0" /> {loginError.msg}</div>}
                <button onClick={handleLogin} className="w-full py-3 px-4 rounded-xl shadow-lg text-white bg-orange-600 hover:bg-orange-700 font-bold transition-all active:scale-95">Sign in with Google</button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  const bloggerService = new BloggerService(auth.accessToken!, APP_CONFIG.blogId);

  return (
    <Layout auth={auth} onLogout={handleLogout} onOpenSettings={() => setView('SETTINGS')} onGoHome={() => setView('DASHBOARD')}>
      {view === 'DASHBOARD' && <Dashboard bloggerService={bloggerService} onEdit={(id) => { setActivePostId(id); setView('EDITOR'); }} onCreate={() => { setActivePostId(null); setView('EDITOR'); }} />}
      {view === 'EDITOR' && <PostEditor bloggerService={bloggerService} postId={activePostId} settings={settings} onBack={() => { setView('DASHBOARD'); setActivePostId(null); }} />}
      {view === 'SETTINGS' && (
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
            <div className="p-8 bg-slate-900 text-white">
              <h2 className="text-2xl font-bold flex items-center"><Settings className="w-6 h-6 mr-3 text-orange-400" /> API Settings</h2>
              <p className="text-slate-400 text-sm mt-2">Configure Movie Database and AI Fallbacks.</p>
            </div>
            <div className="p-8 space-y-6">
              <div className="p-4 bg-orange-50 border border-orange-100 rounded-xl flex items-start">
                <Key className="w-5 h-5 text-orange-500 mr-3 mt-0.5" />
                <p className="text-sm text-orange-800 font-medium">Gemini (Primary) is managed by the system. No key required.</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* TMDB API Key */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center">
                    <Film className="w-4 h-4 mr-2 text-blue-500" /> 
                    TMDB API Key
                  </label>
                  <input 
                    type="text" 
                    value={settings.tmdbApiKey} 
                    onChange={(e) => setSettings({...settings, tmdbApiKey: e.target.value})} 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-mono text-xs focus:ring-2 focus:ring-blue-500 transition-all" 
                    placeholder="TMDB Key..." 
                  />
                </div>

                {/* OMDB/IMDb API Key */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center">
                    <Database className="w-4 h-4 mr-2 text-yellow-500" /> 
                    OMDB (IMDb) Key
                  </label>
                  <input 
                    type="text" 
                    value={settings.omdbApiKey} 
                    onChange={(e) => setSettings({...settings, omdbApiKey: e.target.value})} 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-mono text-xs focus:ring-2 focus:ring-yellow-500 transition-all" 
                    placeholder="OMDB Key..." 
                  />
                  <p className="text-[10px] text-slate-400 mt-1 italic">Get one at omdbapi.com/apikey.aspx</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center"><Bot className="w-4 h-4 mr-2 text-green-500" /> OpenAI API Key (Fallback)</label>
                <input type="text" value={settings.openAiApiKey} onChange={(e) => setSettings({...settings, openAiApiKey: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-mono text-xs" placeholder="sk-..." />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center"><Zap className="w-4 h-4 mr-2 text-slate-900" /> Grok API Key (Fallback)</label>
                <input type="text" value={settings.grokApiKey} onChange={(e) => setSettings({...settings, grokApiKey: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-mono text-xs" placeholder="xai-..." />
              </div>
              <div className="pt-4 flex gap-3">
                <button onClick={handleSaveSettings} className="flex-1 py-3 bg-orange-600 text-white rounded-xl font-bold shadow-lg hover:bg-orange-700 transition-all">{settingsStatus === 'success' ? 'Settings Saved!' : <span className="flex items-center justify-center"><Save className="w-5 h-5 mr-2" /> Save All Settings</span>}</button>
                <button onClick={() => setView('DASHBOARD')} className="px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold">Back</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default App;
