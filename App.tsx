
import React, { useState, useEffect, useCallback } from 'react';
import { AuthState } from './types';
import { APP_CONFIG } from './constants';
import { BloggerService } from './services/bloggerService';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import PostEditor from './components/PostEditor';
import { LogIn, Info, HelpCircle, ChevronDown, ChevronUp, ShieldCheck, AlertTriangle, Loader2, Copy, Check, ExternalLink } from 'lucide-react';

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
      console.error("Auth verification failed", err);
      let msg = err.message || "Failed to verify access.";
      if (msg.includes("403")) msg = "Access Denied: Ensure Blogger API is enabled and your email is added as a 'Test User' in Cloud Console.";
      if (msg.includes("404")) msg = "Blog Not Found: Check if the BLOG_ID in constants.ts is correct.";
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
          scope: `${APP_CONFIG.scopes} https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email`,
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
            {isVerifying ? 'Verifying your credentials...' : 'Ready for Netlify deployment'}
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
                    <div>
                      <p className="text-sm font-bold text-red-800">Authorization Error</p>
                      <p className="text-xs text-red-700 mt-1">{loginError}</p>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleLogin}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-all active:scale-95"
                >
                  <LogIn className="w-5 h-5 mr-2" />
                  Sign in with Google
                </button>
                
                <div className="bg-orange-50 border-l-4 border-orange-400 p-4 rounded-r-md">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <ShieldCheck className="h-5 w-5 text-orange-400" />
                    </div>
                    <div className="ml-3">
                      <p className="text-xs text-orange-800 leading-relaxed">
                        {isNetlify ? "Running on Netlify. Make sure this URL is authorized in your Google Cloud Console." : "Authorize this app to manage posts and drafts on your Blogger account."}
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
                      Netlify Deployment Guide
                    </span>
                    {showSetup ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  
                  {showSetup && (
                    <div className="mt-4 space-y-4 text-[11px] text-gray-600 bg-gray-50 p-3 rounded-md border border-gray-100">
                      <div className="space-y-2">
                        <p className="font-semibold text-gray-700 flex items-center">
                          <ExternalLink className="w-3 h-3 mr-1" />
                          1. Google Cloud Console Configuration
                        </p>
                        <p>In <b>Authorized JavaScript origins</b>, you must add this exact URL:</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <code className="flex-1 p-2 bg-white rounded border border-gray-200 text-orange-600 font-mono overflow-hidden text-ellipsis whitespace-nowrap">
                            {window.location.origin}
                          </code>
                          <button 
                            onClick={copyOrigin}
                            className="p-2 bg-orange-100 text-orange-600 rounded hover:bg-orange-200 transition-colors"
                            title="Copy to clipboard"
                          >
                            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <p className="font-semibold text-gray-700">2. Netlify Build Settings</p>
                        <ul className="list-disc pl-4 space-y-1">
                          <li><b>Build Command:</b> (Leave empty or use <code>npm run build</code>)</li>
                          <li><b>Publish directory:</b> <code>.</code> (Root)</li>
                          <li><b>_redirects:</b> Included for SPA support</li>
                        </ul>
                      </div>

                      <div className="p-2 bg-blue-50 text-blue-700 rounded border border-blue-100 flex items-start">
                        <Info className="w-3 h-3 mr-2 mt-0.5 flex-shrink-0" />
                        <p>The <b>Client Secret</b> you provided is not needed here as this is a secure client-side only app.</p>
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
