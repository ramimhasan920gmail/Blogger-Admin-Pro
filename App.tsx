
import React, { useState, useEffect, useCallback } from 'react';
import { AuthState, AppSettings } from './types';
import { APP_CONFIG } from './constants';
import { BloggerService } from './services/bloggerService';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import PostEditor from './components/PostEditor';
import { LogIn, AlertTriangle, Loader2, Copy, Check, Settings, ShieldAlert, Info, Key, Save, AlertCircle } from 'lucide-react';

const App: React.FC = () => {
  const [auth, setAuth] = useState<AuthState>({
    accessToken: localStorage.getItem('blogger_access_token'),
    expiresAt: Number(localStorage.getItem('blogger_expires_at')) || null,
    user: JSON.parse(localStorage.getItem('blogger_user') || 'null'),
  });

  const [settings, setSettings] = useState<AppSettings>({
    geminiApiKey: localStorage.getItem('app_gemini_api_key') || '',
  });

  const [view, setView] = useState<'DASHBOARD' | 'EDITOR' | 'SETTINGS'>('DASHBOARD');
  const [activePostId, setActivePostId] = useState<string | null>(null);
  const [tokenClient, setTokenClient] = useState<any>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [loginError, setLoginError] = useState<{title: string, msg: string} | null>(null);
  const [settingsStatus, setSettingsStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [copied, setCopied] = useState(false);

  const copyOrigin = () => {
    navigator.clipboard.writeText(window.location.origin);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const completeLogin = useCallback(async (accessToken: string, expiresIn: number) => {
    setIsVerifying(true);
    setLoginError(null);
    try {
      const service = new BloggerService(accessToken, APP_CONFIG.blogId);
      const userInfo = await service.getUserInfo();
      
      try {
        await service.verifyBlogAccess();
      } catch (e: any) {
        throw new Error(`Blogger API verify failed: ${e.message}`);
      }

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
      setLoginError({
        title: "API Error",
        msg: err.message || "Failed to finalize connection with Blogger."
      });
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
              if (tokenResponse.error) {
                setLoginError({
                  title: `Google Auth Error`,
                  msg: tokenResponse.error_description || "Authentication failed."
                });
                return;
              }
              if (tokenResponse.access_token) {
                completeLogin(tokenResponse.access_token, tokenResponse.expires_in);
              }
            }
          });
          setTokenClient(client);
        } catch (e: any) {
          console.error("GSI Init error:", e);
        }
      }
    };

    const timer = setInterval(() => {
      // @ts-ignore
      if (window.google?.accounts?.oauth2) {
        initGsi();
        clearInterval(timer);
      }
    }, 500);

    return () => clearInterval(timer);
  }, [completeLogin]);

  const handleLogin = () => {
    setLoginError(null);
    if (tokenClient) {
      tokenClient.requestAccessToken({ prompt: 'consent' });
    }
  };

  const handleLogout = () => {
    setAuth({ accessToken: null, expiresAt: null, user: null });
    localStorage.clear();
    window.location.reload();
  };

  const handleSaveSettings = () => {
    const trimmedKey = settings.geminiApiKey.trim();
    if (!trimmedKey) {
      setSettingsStatus('error');
      return;
    }
    
    localStorage.setItem('app_gemini_api_key', trimmedKey);
    setSettings({ ...settings, geminiApiKey: trimmedKey });
    setSettingsStatus('success');
    
    setTimeout(() => {
      setSettingsStatus('idle');
      setView('DASHBOARD');
    }, 1500);
  };

  const isTokenExpired = auth.expiresAt ? Date.now() > auth.expiresAt : true;

  if (!auth.accessToken || isTokenExpired || isVerifying) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-orange-600 rounded-2xl flex items-center justify-center text-white font-bold text-4xl shadow-xl">B</div>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900 tracking-tight">Blogger Admin Pro</h2>
          <p className="mt-2 text-center text-sm text-slate-500">Manage your movie blog with AI power</p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
          <div className="bg-white py-8 px-4 shadow-xl rounded-2xl sm:px-10 border border-slate-100">
            {isVerifying ? (
              <div className="flex flex-col items-center py-8">
                <Loader2 className="w-12 h-12 text-orange-600 animate-spin mb-4" />
                <p className="text-slate-500 font-medium tracking-wide">Connecting to Google...</p>
              </div>
            ) : (
              <div className="space-y-6">
                {loginError && (
                  <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-xl text-sm flex items-start">
                    <ShieldAlert className="w-5 h-5 text-red-500 mr-3 flex-shrink-0" />
                    <div>
                      <p className="font-bold text-red-800">{loginError.title}</p>
                      <p className="text-red-700 mt-1">{loginError.msg}</p>
                    </div>
                  </div>
                )}
                <button
                  onClick={handleLogin}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-lg shadow-orange-100 text-sm font-bold text-white bg-orange-600 hover:bg-orange-700 focus:ring-2 focus:ring-orange-500 transition-all active:scale-95"
                >
                  <LogIn className="w-5 h-5 mr-2" />
                  Sign in with Google
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  const bloggerService = new BloggerService(auth.accessToken!, APP_CONFIG.blogId);

  return (
    <Layout 
      auth={auth} 
      onLogout={handleLogout} 
      onOpenSettings={() => setView('SETTINGS')}
      onGoHome={() => setView('DASHBOARD')}
    >
      {view === 'DASHBOARD' && (
        <Dashboard 
          bloggerService={bloggerService} 
          onEdit={(id) => { setActivePostId(id); setView('EDITOR'); }}
          onCreate={() => { setActivePostId(null); setView('EDITOR'); }}
        />
      )}
      
      {view === 'EDITOR' && (
        <PostEditor 
          bloggerService={bloggerService}
          postId={activePostId}
          settings={settings}
          onBack={() => { setView('DASHBOARD'); setActivePostId(null); }}
        />
      )}

      {view === 'SETTINGS' && (
        <div className="max-w-2xl mx-auto px-4 animate-in slide-in-from-bottom-4 duration-300">
          <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
            <div className="p-8 bg-slate-900 text-white">
              <h2 className="text-2xl font-bold flex items-center"><Settings className="w-6 h-6 mr-3 text-orange-400" /> App Settings</h2>
              <p className="text-slate-400 text-sm mt-2">Manage your AI API keys and application preferences.</p>
            </div>
            <div className="p-8 space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center">
                  <Key className="w-4 h-4 mr-2 text-orange-500" /> 
                  Gemini AI API Key
                </label>
                <div className="relative">
                   <input 
                    type="text"
                    value={settings.geminiApiKey}
                    onChange={(e) => {
                      setSettings({...settings, geminiApiKey: e.target.value});
                      setSettingsStatus('idle');
                    }}
                    className={`w-full px-4 py-3 bg-slate-50 border rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all font-mono text-sm ${
                      settingsStatus === 'error' ? 'border-red-500 bg-red-50' : 'border-slate-200'
                    }`}
                    placeholder="Enter your Gemini API Key..."
                  />
                  {settingsStatus === 'success' && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500">
                      <Check className="w-5 h-5" />
                    </div>
                  )}
                </div>
                <div className="mt-4 p-4 bg-orange-50 rounded-xl border border-orange-100">
                  <p className="text-xs text-orange-800 leading-relaxed">
                    <span className="font-bold">How to get a key?</span> Go to <a href="https://aistudio.google.com/app/apikey" target="_blank" className="underline font-bold">Google AI Studio</a>, create a free API key, and paste it here. This key is used for movie data fetching and SEO optimization.
                  </p>
                </div>
              </div>
              
              <div className="pt-4 flex gap-3">
                <button
                  onClick={handleSaveSettings}
                  disabled={settingsStatus === 'success'}
                  className="flex-1 flex items-center justify-center py-3 px-6 bg-orange-600 text-white rounded-xl font-bold shadow-lg shadow-orange-100 hover:bg-orange-700 transition-all active:scale-95 disabled:opacity-50"
                >
                  {settingsStatus === 'success' ? 'Saved!' : <><Save className="w-5 h-5 mr-2" /> Save Changes</>}
                </button>
                <button
                  onClick={() => setView('DASHBOARD')}
                  className="px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all"
                >
                  Back
                </button>
              </div>
              
              {settingsStatus === 'error' && (
                <p className="text-red-500 text-xs font-bold flex items-center justify-center">
                  <AlertCircle className="w-4 h-4 mr-1" /> API Key cannot be empty!
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default App;
