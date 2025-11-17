import React, { useState, useEffect, useCallback } from 'react';
import { Order, OrderStatus, Courier } from './types';
import { fetchOrders, updateOrderStatus } from './services/orderService';
import Header from './components/Header';
import OrderList from './components/OrderList';
import OrderDetailModal from './components/OrderDetailModal';
import Login from './components/Login';
import ConnectionWizard from './components/ConnectionWizard';
import InfoPanel from './components/InfoPanel';
import SettingsModal from './components/SettingsModal';

const App: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // New state for auth and connection
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => !!localStorage.getItem('isLoggedIn'));
  const [isConnected, setIsConnected] = useState<boolean>(() => !!localStorage.getItem('siteUrl'));
  const [siteUrl, setSiteUrl] = useState<string | null>(() => localStorage.getItem('siteUrl'));
  const [apiKey, setApiKey] = useState<string | null>(() => localStorage.getItem('apiKey'));
  const [showConnectionWizard, setShowConnectionWizard] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);

  const loadOrders = useCallback(async () => {
    if (!isConnected || !siteUrl || !apiKey) return;
    try {
      setIsLoading(true);
      setError(null);
      const fetchedOrders = await fetchOrders(siteUrl, apiKey);
      setOrders(fetchedOrders);
    } catch (err) {
      if (err instanceof Error) {
        if (err.message.toLowerCase().includes('failed to fetch')) {
           setError("Could not connect to your site. This is often due to a CORS policy on your server. Please ensure the provided plugin is active and your server allows requests from this domain. Also, verify the Site URL is correct (e.g., starts with https://).");
        } else {
           setError(err.message);
        }
      } else {
        setError('An unknown error occurred while fetching orders.');
      }
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, siteUrl, apiKey]);

  useEffect(() => {
    if (isLoggedIn && isConnected) {
      loadOrders();
    } else if(isLoggedIn && !isConnected) {
      // No need to set showConnectionWizard here, let the user decide
      setIsLoading(false);
    } else {
      setIsLoading(false);
    }
  }, [isLoggedIn, isConnected, loadOrders]);
  
  const handleLogin = () => {
    setIsLoggedIn(true);
    localStorage.setItem('isLoggedIn', 'true');
    // Don't automatically show the wizard, let the InfoPanel handle the CTA
  };
  
  const handleLogout = () => {
    setIsLoggedIn(false);
    setIsConnected(false);
    setSiteUrl(null);
    setApiKey(null);
    setOrders([]);
    localStorage.clear();
  };

  const handleConnect = (newSiteUrl: string, newApiKey: string) => {
    setSiteUrl(newSiteUrl);
    setApiKey(newApiKey);
    setIsConnected(true);
    localStorage.setItem('siteUrl', newSiteUrl);
    localStorage.setItem('apiKey', newApiKey);
    setShowConnectionWizard(false);
  };

  const handleSelectOrder = (order: Order) => {
    setSelectedOrder(order);
  };

  const handleCloseModal = () => {
    setSelectedOrder(null);
  };

  const handleUpdateStatus = async (orderId: string, status: OrderStatus) => {
    if (!siteUrl || !apiKey) return;
    try {
      setOrders(prevOrders =>
        prevOrders.map(order =>
          order.id === orderId ? { ...order, status } : order
        )
      );
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(prev => prev ? {...prev, status} : null);
      }
      
      await updateOrderStatus(orderId, status, siteUrl, apiKey);
    } catch (err) {
      setError('Failed to update order status.');
      loadOrders(); // Revert on failure
    }
  };

  const handleOrderBooked = (orderId: string, courier: Courier, trackingId: string) => {
    setOrders(prevOrders =>
      prevOrders.map(order =>
        order.id === orderId ? { ...order, courier, trackingId } : order
      )
    );
    if (selectedOrder && selectedOrder.id === orderId) {
      setSelectedOrder(prev => prev ? {...prev, courier, trackingId } : null);
    }
  };

  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 font-sans">
      <Header 
        isLoggedIn={isLoggedIn}
        onLogout={handleLogout}
        connectedSiteUrl={siteUrl}
        onSettingsClick={() => setShowSettings(true)}
      />
      <main className="container mx-auto p-4 md:p-8">
        
        {isConnected ? (
          <div className="mt-8 bg-white dark:bg-gray-800 shadow-lg rounded-xl overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Incoming Orders</h2>
              <p className="mt-1 text-gray-500 dark:text-gray-400">Manage and track all customer orders.</p>
            </div>
            
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-indigo-500"></div>
              </div>
            ) : error ? (
              <div className="text-center py-12 px-6">
                <div className="bg-red-50 dark:bg-gray-800 border border-red-200 dark:border-red-900/50 p-6 rounded-lg max-w-lg mx-auto shadow-md">
                  <div className="flex flex-col items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <h3 className="mt-4 text-xl font-bold text-gray-800 dark:text-red-400">Connection Failed</h3>
                    <p className="mt-2 text-gray-600 dark:text-red-300/80 mb-6">{error}</p>
                    <div className="flex justify-center gap-4">
                      <button
                        onClick={loadOrders}
                        className="px-5 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-colors"
                      >
                        Retry
                      </button>
                      <button
                        onClick={() => setShowSettings(true)}
                        className="px-5 py-2 bg-white text-gray-800 font-semibold rounded-lg border border-gray-300 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-colors"
                      >
                        Check Settings
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <OrderList
                orders={orders}
                onViewDetails={handleSelectOrder}
                onUpdateStatus={handleUpdateStatus}
              />
            )}
          </div>
        ) : (
           <InfoPanel onConnectClick={() => setShowConnectionWizard(true)} />
        )}
      </main>
      
      {showConnectionWizard && <ConnectionWizard onConnect={handleConnect} onClose={() => setShowConnectionWizard(false)} />}
      
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}

      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          onClose={handleCloseModal}
          onUpdateStatus={handleUpdateStatus}
          onOrderBooked={handleOrderBooked}
        />
      )}
    </div>
  );
};

export default App;