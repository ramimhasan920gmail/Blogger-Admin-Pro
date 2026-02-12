
import React, { useState, useEffect, useCallback } from 'react';
import { AuthState } from './types';
import { APP_CONFIG } from './constants';
import { BloggerService } from './services/bloggerService';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import PostEditor from './components/PostEditor';
import { LogIn, Info, HelpCircle, ChevronDown, ChevronUp, ShieldCheck, AlertTriangle, Loader2, Copy, Check, ExternalLink, Settings } from 'lucide-react';

const App: React.FC = () => {
  const [auth, setAuth] = useState<AuthState>({
    accessToken: localStorage.getItem('blogger_access_token'),
    expiresAt: Number(localStorage.getItem('blogger_expires_at')) || null,
    user: JSON.parse(localStorage.getItem('blogger_user') || 'null'),
  });

  const [view, setView] = useState<'DASHBOARD' | 'EDITOR'>('DASHBOARD');
  const [activePostId, setActivePostId] = useState<string | null>(null);
  const [tokenClient, setTokenClient] = useState<any>(null);
  const [showSetup, setShowSetup] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const isNetlify = window.location.hostname.includes('netlify.app');

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
      
      // Verify Blogger access
      try {
        await service.verifyBlogAccess();
      } catch (e: any) {
        throw new Error("Blogger API access denied. Ensure Blogger API v3 is enabled in Google Cloud Console.");
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
      console.error("Auth verification failed", err);
      let msg = err.message || "Failed to verify access.";
      if (msg.includes("insufficient authentication scopes")) {
        msg = "Scope error: কোডে দেওয়া Scope এবং Google Console-এ সেট করা Scope মিলছে না। অনুগ্রহ করে Blogger API এনাবল করুন।";
      }
      setLoginError(msg);
      localStorage.removeItem('blogger_access_token');
    } finally {
      setIsVerifying(false);
    }
  }, []);

  useEffect(() => {
    const initGsi = () => {
      // @ts-ignore
      if (window.google) {
        // @ts-ignore
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: APP_CONFIG.clientId,
          scope: APP_CONFIG.scopes,
          callback: (tokenResponse: any) => {
            if (tokenResponse && tokenResponse.access_token) {
              completeLogin(tokenResponse.access_token, tokenResponse.expires_in);
            }
          },
        });
        setTokenClient(client);
      }
    };

    const checkGsi = setInterval(() => {
      // @ts-ignore
      if (window.google) {
        initGsi();
        clearInterval(checkGsi);
      }
    }, 100);

    return () => clearInterval(checkGsi);
  }, [completeLogin]);

  const handleLogin = () => {
    if (tokenClient) {
      tokenClient.requestAccessToken();
    }
  };

  const handleLogout = () => {
    setAuth({ accessToken: null, expiresAt: null, user: null });
    localStorage.removeItem('blogger_access_token');
    localStorage.removeItem('blogger_expires_at');
    localStorage.removeItem('blogger_user');
  };

  const isTokenExpired = auth.expiresAt ? Date.now() > auth.expiresAt : true;

  if (!auth.accessToken || isTokenExpired || isVerifying) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-orange-600 rounded-xl flex items-center justify-center text-white font-bold text-4xl shadow-lg">B</div>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Blogger Admin Pro
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Professional Blogger Dashboard
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow-xl sm:rounded-lg sm:px-10 border border-gray-100">
            {isVerifying ? (
              <div className="flex flex-col items-center justify-center space-y-4 py-8">
                <Loader2 className="w-12 h-12 text-orange-600 animate-spin" />
                <p className="text-gray-500 font-medium">Connecting to Blogger...</p>
              </div>
            ) : (
              <div className="space-y-6">
                {loginError && (
                  <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-md flex items-start">
                    <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 mr-3 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="font-bold text-red-800">লগইন সমস্যা (Auth Error)</p>
                      <p className="text-red-700 mt-1">{loginError}</p>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleLogin}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none transition-all active:scale-95"
                >
                  <LogIn className="w-5 h-5 mr-2" />
                  Sign in with Google
                </button>
                
                <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-md">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <Settings className="h-5 w-5 text-blue-400" />
                    </div>
                    <div className="ml-3">
                      <p className="text-xs text-blue-800 leading-relaxed font-medium">
                        এটি সমাধান করতে আপনার Google Cloud Console-এ গিয়ে "Blogger API v3" এনাবল (Enable) করুন।
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-4">
                  <button 
                    onClick={() => setShowSetup(!showSetup)}
                    className="w-full flex items-center justify-between text-sm text-gray-500 hover:text-orange-600 transition-colors"
                  >
                    <span className="flex items-center">
                      <HelpCircle className="w-4 h-4 mr-2" />
                      Netlify/GitHub Deployment Guide
                    </span>
                    {showSetup ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  
                  {showSetup && (
                    <div className="mt-4 space-y-4 text-[11px] text-gray-600 bg-gray-50 p-3 rounded-md border border-gray-100">
                      <div className="space-y-2">
                        <p className="font-semibold text-gray-700">১. গুগল ক্লাউড কনফিগারেশন:</p>
                        <p><b>Authorized JavaScript origins</b>-এ এই লিঙ্কটি অ্যাড করুন:</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <code className="flex-1 p-2 bg-white rounded border border-gray-200 text-orange-600 font-mono overflow-hidden text-ellipsis whitespace-nowrap">
                            {window.location.origin}
                          </code>
                          <button 
                            onClick={copyOrigin}
                            className="p-2 bg-orange-100 text-orange-600 rounded hover:bg-orange-200 transition-colors"
                          >
                            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <p className="font-semibold text-gray-700">২. এপিআই এনাবল:</p>
                        <p>গুগল কনসোলে গিয়ে অবশ্যই <b>Blogger API v3</b> এনাবল করতে হবে। না হলে লগইন হবে না।</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  const bloggerService = new BloggerService(auth.accessToken, APP_CONFIG.blogId);

  return (
    <Layout auth={auth} onLogout={handleLogout}>
      {view === 'DASHBOARD' ? (
        <Dashboard 
          bloggerService={bloggerService} 
          onEdit={(id) => { setActivePostId(id); setView('EDITOR'); }}
          onCreate={() => { setActivePostId(null); setView('EDITOR'); }}
        />
      ) : (
        <PostEditor 
          bloggerService={bloggerService}
          postId={activePostId}
          onBack={() => { setView('DASHBOARD'); setActivePostId(null); }}
        />
      )}
    </Layout>
  );
};

export default App;
