
import React, { useState, useEffect, useCallback } from 'react';
import { AuthState } from './types';
import { APP_CONFIG } from './constants';
import { BloggerService } from './services/bloggerService';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import PostEditor from './components/PostEditor';
import { LogIn, AlertTriangle, Loader2, Copy, Check, Settings, ShieldAlert, Info } from 'lucide-react';

const App: React.FC = () => {
  const [auth, setAuth] = useState<AuthState>({
    accessToken: localStorage.getItem('blogger_access_token'),
    expiresAt: Number(localStorage.getItem('blogger_expires_at')) || null,
    user: JSON.parse(localStorage.getItem('blogger_user') || 'null'),
  });

  const [view, setView] = useState<'DASHBOARD' | 'EDITOR'>('DASHBOARD');
  const [activePostId, setActivePostId] = useState<string | null>(null);
  const [tokenClient, setTokenClient] = useState<any>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [loginError, setLoginError] = useState<{title: string, msg: string} | null>(null);
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
      
      // Verify blog access to catch permission issues early
      try {
        await service.verifyBlogAccess();
      } catch (e: any) {
        throw new Error(`Blogger API verify failed: ${e.message}. Is the Blogger API enabled in Google Console?`);
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
                  title: `Google Auth Error: ${tokenResponse.error}`,
                  msg: tokenResponse.error_description || "Check your Authorized JavaScript origins in Google Cloud Console."
                });
                return;
              }
              if (tokenResponse.access_token) {
                completeLogin(tokenResponse.access_token, tokenResponse.expires_in);
              }
            },
            error_callback: (err: any) => {
              setLoginError({
                title: "GSI Client Error",
                msg: err.message || "Could not initialize Google Login."
              });
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
      try {
        tokenClient.requestAccessToken({ prompt: 'consent' });
      } catch (e) {
        setLoginError({
          title: "Popup Blocked",
          msg: "Please allow popups for this site to sign in."
        });
      }
    } else {
      setLoginError({
        title: "Loading...",
        msg: "Google library is still loading. Please wait 2 seconds and try again."
      });
    }
  };

  const handleLogout = () => {
    setAuth({ accessToken: null, expiresAt: null, user: null });
    localStorage.clear();
  };

  const isTokenExpired = auth.expiresAt ? Date.now() > auth.expiresAt : true;

  if (!auth.accessToken || isTokenExpired || isVerifying) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-orange-600 rounded-xl flex items-center justify-center text-white font-bold text-4xl shadow-lg">B</div>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">Blogger Admin Pro</h2>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
          <div className="bg-white py-8 px-4 shadow-xl rounded-lg sm:px-10 border border-gray-100">
            {isVerifying ? (
              <div className="flex flex-col items-center py-8">
                <Loader2 className="w-12 h-12 text-orange-600 animate-spin mb-4" />
                <p className="text-gray-500 font-medium">Verifying Blog Access...</p>
              </div>
            ) : (
              <div className="space-y-6">
                {loginError && (
                  <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded text-sm flex items-start">
                    <ShieldAlert className="w-5 h-5 text-red-500 mr-3 flex-shrink-0" />
                    <div>
                      <p className="font-bold text-red-800">{loginError.title}</p>
                      <p className="text-red-700 mt-1">{loginError.msg}</p>
                    </div>
                  </div>
                )}

                <div className="bg-blue-50 p-4 rounded-md border border-blue-100 mb-4">
                  <div className="flex items-start">
                    <Info className="w-4 h-4 text-blue-500 mt-0.5 mr-2 flex-shrink-0" />
                    <div className="text-[11px] text-blue-800">
                      <p className="font-bold">গুগল কনসোল চেক লিস্ট:</p>
                      <ul className="list-disc ml-4 mt-1 space-y-1">
                        <li>Blogger API v3 এনাবল করেছেন কি?</li>
                        <li>অরিজিনাল ডোমেইন (Origin) কি নিচেরটা দিয়েছেন?</li>
                      </ul>
                      <div className="mt-2 flex items-center bg-white p-1 rounded border border-blue-200">
                        <code className="flex-1 truncate font-mono text-[10px]">{window.location.origin}</code>
                        <button onClick={copyOrigin} className="ml-1 p-1 hover:bg-blue-50 rounded">
                          {copied ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3 text-blue-400" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleLogin}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:ring-2 focus:ring-orange-500 transition-all active:scale-95"
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
