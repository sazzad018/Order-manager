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
  
  // We now store the Basic Auth header string instead of a simple API key
  const [authHeader, setAuthHeader] = useState<string | null>(() => localStorage.getItem('authHeader'));
  
  const [showConnectionWizard, setShowConnectionWizard] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);

  const loadOrders = useCallback(async () => {
    if (!isConnected || !siteUrl || !authHeader) return;
    try {
      setIsLoading(true);
      setError(null);
      const fetchedOrders = await fetchOrders(siteUrl, authHeader);
      setOrders(fetchedOrders);
    } catch (err) {
      // Display the specific error message from the service
      const message = err instanceof Error ? err.message : 'Failed to fetch orders.';
      setError(message);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, siteUrl, authHeader]);

  useEffect(() => {
    if (isLoggedIn && isConnected) {
      loadOrders();
    } else if(isLoggedIn && !isConnected) {
      setIsLoading(false);
    } else {
      setIsLoading(false);
    }
  }, [isLoggedIn, isConnected, loadOrders]);
  
  const handleLogin = () => {
    setIsLoggedIn(true);
    localStorage.setItem('isLoggedIn', 'true');
  };
  
  const handleLogout = () => {
    setIsLoggedIn(false);
    setIsConnected(false);
    setSiteUrl(null);
    setAuthHeader(null);
    setOrders([]);
    localStorage.clear();
  };

  const handleConnect = (newSiteUrl: string, newAuthHeader: string) => {
    setSiteUrl(newSiteUrl);
    setAuthHeader(newAuthHeader);
    setIsConnected(true);
    localStorage.setItem('siteUrl', newSiteUrl);
    localStorage.setItem('authHeader', newAuthHeader);
    setShowConnectionWizard(false);
  };

  const handleSelectOrder = (order: Order) => {
    setSelectedOrder(order);
  };

  const handleCloseModal = () => {
    setSelectedOrder(null);
  };

  const handleUpdateStatus = async (orderId: string, status: OrderStatus) => {
    if (!siteUrl || !authHeader) return;
    try {
      setOrders(prevOrders =>
        prevOrders.map(order =>
          order.id === orderId ? { ...order, status } : order
        )
      );
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(prev => prev ? {...prev, status} : null);
      }
      
      await updateOrderStatus(orderId, status, siteUrl, authHeader);
    } catch (err) {
      // Revert optimistic update if failed
      loadOrders();
      const msg = err instanceof Error ? err.message : 'Failed to update order status.';
      alert(msg);
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
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Incoming Orders</h2>
                <p className="mt-1 text-gray-500 dark:text-gray-400">Manage and track all customer orders.</p>
              </div>
              <button 
                onClick={loadOrders} 
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title="Refresh Orders"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
            
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-indigo-500"></div>
              </div>
            ) : error ? (
              <div className="text-center py-12 px-6">
                <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-6 rounded-lg inline-block max-w-2xl mx-auto border border-red-100 dark:border-red-800">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <h3 className="text-lg font-bold mb-2 text-red-700 dark:text-red-300">Connection Failed</h3>
                    <p className="text-base mb-4 whitespace-pre-wrap">{error}</p>
                    
                    <div className="text-sm text-left bg-white dark:bg-gray-800 p-4 rounded border border-red-100 dark:border-red-800/50 shadow-sm">
                        <p className="font-bold text-gray-700 dark:text-gray-300 mb-2">Troubleshooting Checklist:</p>
                        <ul className="list-disc pl-5 space-y-1 text-gray-600 dark:text-gray-400">
                            <li><strong>Credentials:</strong> Double check your WordPress Username and Application Password.</li>
                            <li><strong>Permalinks:</strong> Go to WordPress Dashboard {'>'} Settings {'>'} Permalinks and click "Save Changes".</li>
                            <li><strong>CORS:</strong> Since you aren't using the helper plugin, you might need to install a "WP CORS" plugin on your site to allow this app to connect.</li>
                            <li><strong>SSL/HTTPS:</strong> Your site must be HTTPS.</li>
                        </ul>
                    </div>
                    
                    <div className="mt-6 flex gap-4 justify-center">
                        <button 
                            onClick={loadOrders}
                            className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-md transition-colors shadow-sm"
                        >
                            Retry Connection
                        </button>
                        <button 
                            onClick={() => setShowConnectionWizard(true)}
                            className="px-6 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 font-medium rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors shadow-sm"
                        >
                            Re-enter Credentials
                        </button>
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