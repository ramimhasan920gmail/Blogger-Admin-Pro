
import React from 'react';
import { AuthState } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  auth: AuthState;
  onLogout: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, auth, onLogout }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
                <div className="w-8 h-8 bg-orange-600 rounded-md flex items-center justify-center text-white font-bold text-xl mr-2">B</div>
                <span className="text-xl font-bold text-gray-900 hidden md:block">Blogger Admin Pro</span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {auth.user && (
                <div className="flex items-center space-x-3">
                  <div className="text-right hidden sm:block">
                    <p className="text-sm font-medium text-gray-900">{auth.user.name}</p>
                    <p className="text-xs text-gray-500">{auth.user.email}</p>
                  </div>
                  <img 
                    className="h-8 w-8 rounded-full border border-gray-200" 
                    src={auth.user.picture} 
                    alt={auth.user.name} 
                  />
                  <button
                    onClick={onLogout}
                    className="text-sm font-medium text-red-600 hover:text-red-500 transition-colors"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
};

export default Layout;
