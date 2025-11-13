import React, { useState, useEffect } from 'react';

interface SettingsModalProps {
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const [steadfastApiKey, setSteadfastApiKey] = useState('');
  const [steadfastSecretKey, setSteadfastSecretKey] = useState('');
  const [pathaoApiKey, setPathaoApiKey] = useState('');
  const [pathaoStoreId, setPathaoStoreId] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle');

  useEffect(() => {
    setSteadfastApiKey(localStorage.getItem('steadfastApiKey') || '');
    setSteadfastSecretKey(localStorage.getItem('steadfastSecretKey') || '');
    setPathaoApiKey(localStorage.getItem('pathaoApiKey') || '');
    setPathaoStoreId(localStorage.getItem('pathaoStoreId') || '');
  }, []);

  const handleSave = () => {
    localStorage.setItem('steadfastApiKey', steadfastApiKey.trim());
    localStorage.setItem('steadfastSecretKey', steadfastSecretKey.trim());
    localStorage.setItem('pathaoApiKey', pathaoApiKey.trim());
    localStorage.setItem('pathaoStoreId', pathaoStoreId.trim());
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 2000); // Hide message after 2 seconds
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-60 z-30 flex justify-center items-center p-4"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800"
              aria-label="Close settings"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Enter the API details provided by your courier services to enable order booking directly from this application.
            </p>

            <div className="space-y-4 border-t border-gray-200 dark:border-gray-700 pt-4">
              <h4 className="font-semibold text-gray-800 dark:text-gray-200">Steadfast Courier</h4>
              <div>
                <label htmlFor="steadfastApiKey" className="block text-sm font-medium text-gray-700 dark:text-gray-300">API Key</label>
                <input
                  type="text"
                  id="steadfastApiKey"
                  value={steadfastApiKey}
                  onChange={(e) => setSteadfastApiKey(e.target.value)}
                  placeholder="Enter Steadfast API Key"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                />
              </div>
              <div>
                <label htmlFor="steadfastSecretKey" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Secret Key</label>
                <input
                  type="text"
                  id="steadfastSecretKey"
                  value={steadfastSecretKey}
                  onChange={(e) => setSteadfastSecretKey(e.target.value)}
                  placeholder="Enter Steadfast Secret Key"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                />
              </div>
            </div>

            <div className="space-y-4 border-t border-gray-200 dark:border-gray-700 pt-4">
               <h4 className="font-semibold text-gray-800 dark:text-gray-200">Pathao Courier</h4>
              <div>
                <label htmlFor="pathaoApiKey" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Access Token (API Key)</label>
                <input
                  type="text"
                  id="pathaoApiKey"
                  value={pathaoApiKey}
                  onChange={(e) => setPathaoApiKey(e.target.value)}
                  placeholder="Enter Pathao Access Token"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                />
              </div>
               <div>
                <label htmlFor="pathaoStoreId" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Store ID</label>
                <input
                  type="text"
                  id="pathaoStoreId"
                  value={pathaoStoreId}
                  onChange={(e) => setPathaoStoreId(e.target.value)}
                  placeholder="Enter your Pathao Store ID"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                />
              </div>
            </div>
        </div>

        <div className="p-6 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 flex justify-end items-center gap-4">
          {saveStatus === 'saved' && (
              <p className="text-sm text-green-600 dark:text-green-400 animate-pulse">Settings saved!</p>
          )}
          <button
            onClick={handleSave}
            className="px-6 py-2.5 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
