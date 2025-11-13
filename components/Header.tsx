
import React from 'react';

interface HeaderProps {
  isLoggedIn: boolean;
  onLogout: () => void;
  connectedSiteUrl: string | null;
}

const Header: React.FC<HeaderProps> = ({ isLoggedIn, onLogout, connectedSiteUrl }) => {
  return (
    <header className="bg-white dark:bg-gray-800 shadow-md sticky top-0 z-20">
      <div className="container mx-auto px-4 md:px-8 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">E-commerce Order Manager</h1>
        </div>
        {isLoggedIn && (
          <div className="flex items-center space-x-4">
            {connectedSiteUrl && (
              <div className="hidden sm:flex items-center space-x-2">
                <span className="h-2 w-2 rounded-full bg-green-500"></span>
                <span className="text-sm text-gray-500 dark:text-gray-400">{connectedSiteUrl}</span>
              </div>
            )}
            <button
              onClick={onLogout}
              className="px-4 py-2 text-sm font-medium text-indigo-600 border border-indigo-600 rounded-md hover:bg-indigo-50 dark:text-indigo-400 dark:border-indigo-400 dark:hover:bg-gray-700 transition-colors"
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
