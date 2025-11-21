import React, { useState, useEffect } from 'react';

interface ConnectionWizardProps {
  onConnect: (siteUrl: string, authHeader: string) => void;
  onClose: () => void;
}

const ConnectionWizard: React.FC<ConnectionWizardProps> = ({ onConnect, onClose }) => {
  const [siteUrl, setSiteUrl] = useState('');
  const [username, setUsername] = useState('');
  const [appPassword, setAppPassword] = useState('');
  const [error, setError] = useState('');
  const [isMixedContentWarning, setIsMixedContentWarning] = useState(false);
  
  useEffect(() => {
     if (siteUrl && siteUrl.startsWith('http:') && window.location.protocol === 'https:') {
         setIsMixedContentWarning(true);
     } else {
         setIsMixedContentWarning(false);
     }
  }, [siteUrl]);

  const handleConnect = () => {
    let url = siteUrl.trim();
    const user = username.trim();
    const pass = appPassword.trim();

    if (!url || !user || !pass) {
      setError('All fields are required.');
      return;
    }
    
    // Prepend https:// if no protocol is present
    if (!/^https?:\/\//i.test(url)) {
      url = 'https://' + url;
    }
    
    try {
      new URL(url);
    } catch (_) {
      setError('Please enter a valid Site URL (e.g., https://example.com).');
      return;
    }

    if (url.startsWith('http:') && window.location.protocol === 'https:') {
        setError('Security Error: You cannot connect an HTTP site to this HTTPS app. Browsers block "Mixed Content". Please enable SSL on your website.');
        return;
    }
    
    // Generate Basic Auth Header
    const authString = btoa(`${user}:${pass}`);
    const authHeader = `Basic ${authString}`;

    setError('');
    onConnect(url, authHeader);
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-60 z-30 flex justify-center items-center p-4"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Connect via Application Password</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800"
              aria-label="Close connection wizard"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        
        <div className="p-6 space-y-6">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg text-sm text-blue-800 dark:text-blue-300 border border-blue-100 dark:border-blue-800">
                <p className="font-bold mb-1">How to get credentials:</p>
                <ol className="list-decimal pl-4 space-y-1">
                    <li>Go to <strong>WordPress Admin > Users > Profile</strong>.</li>
                    <li>Scroll down to "Application Passwords".</li>
                    <li>Type a name (e.g., "App") and click "Add New Application Password".</li>
                    <li>Copy the password generated.</li>
                </ol>
            </div>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="siteUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Site URL</label>
                <input
                  type="text"
                  id="siteUrl"
                  value={siteUrl}
                  onChange={(e) => setSiteUrl(e.target.value)}
                  placeholder="https://your-wordpress-site.com"
                  className={`mt-1 block w-full rounded-md shadow-sm focus:ring-indigo-500 sm:text-sm dark:bg-gray-700 dark:placeholder-gray-400 dark:text-white ${isMixedContentWarning ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-indigo-500 dark:border-gray-600'}`}
                />
                 {isMixedContentWarning && (
                     <p className="mt-1 text-xs text-red-600 dark:text-red-400 font-medium">
                         Warning: Your URL starts with 'http'. This app requires 'https' (SSL).
                     </p>
                 )}
              </div>
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300">WordPress Username</label>
                <input
                  type="text"
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g., admin"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                />
              </div>
              <div>
                <label htmlFor="appPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Application Password</label>
                <input
                  type="text"
                  id="appPassword"
                  value={appPassword}
                  onChange={(e) => setAppPassword(e.target.value)}
                  placeholder="xxxx xxxx xxxx xxxx"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                />
                <p className="text-xs text-gray-500 mt-1">Do not use your normal login password. Use a generated Application Password.</p>
              </div>
              
              {error && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 p-2 rounded">{error}</p>}
            </div>
        </div>

        <div className="p-6 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <p className="text-xs text-gray-500 dark:text-gray-400 w-2/3">
            Note: If connection fails, ensure you have a <strong>CORS plugin</strong> installed on WordPress.
          </p>
          <button
            onClick={handleConnect}
            className="px-6 py-2.5 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
          >
            Connect
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConnectionWizard;