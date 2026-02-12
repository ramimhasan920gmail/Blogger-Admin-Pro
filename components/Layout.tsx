
import React from 'react';
import { AuthState } from '../types';
import { Settings, LogOut } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  auth: AuthState;
  onLogout: () => void;
  onOpenSettings: () => void;
  onGoHome: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, auth, onLogout, onOpenSettings, onGoHome }) => {
  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center cursor-pointer" onClick={onGoHome}>
              <div className="flex-shrink-0 flex items-center">
                <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center text-white font-bold text-xl mr-2">B</div>
                <span className="text-xl font-extrabold text-slate-900 tracking-tight hidden md:block">Blogger Admin Pro</span>
              </div>
            </div>
            <div className="flex items-center space-x-2 md:space-x-4">
              {auth.user && (
                <>
                  <button
                    onClick={onOpenSettings}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all"
                    title="Settings"
                  >
                    <Settings className="w-5 h-5" />
                  </button>
                  <div className="h-8 w-px bg-slate-200 mx-2 hidden sm:block"></div>
                  <div className="flex items-center space-x-3 pr-2">
                    <div className="text-right hidden sm:block">
                      <p className="text-sm font-bold text-slate-800">{auth.user.name}</p>
                      <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">{auth.user.email}</p>
                    </div>
                    <img 
                      className="h-8 w-8 rounded-full border-2 border-slate-100 shadow-sm" 
                      src={auth.user.picture} 
                      alt={auth.user.name} 
                    />
                  </div>
                  <button
                    onClick={onLogout}
                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all"
                    title="Logout"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6">
        {children}
      </main>
    </div>
  );
};

export default Layout;
