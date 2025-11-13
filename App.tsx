
import React, { useState, useEffect, useCallback } from 'react';
import { Order, OrderStatus } from './types';
import { fetchOrders, updateOrderStatus } from './services/orderService';
import Header from './components/Header';
import OrderList from './components/OrderList';
import OrderDetailModal from './components/OrderDetailModal';
import Login from './components/Login';
import ConnectionWizard from './components/ConnectionWizard';

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

  const loadOrders = useCallback(async () => {
    if (!isConnected || !siteUrl || !apiKey) return;
    try {
      setIsLoading(true);
      setError(null);
      const fetchedOrders = await fetchOrders(siteUrl, apiKey);
      setOrders(fetchedOrders);
    } catch (err) {
      setError('Failed to fetch orders. Please check your connection settings.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, siteUrl, apiKey]);

  useEffect(() => {
    if (isLoggedIn && isConnected) {
      loadOrders();
    } else if(isLoggedIn && !isConnected) {
      setShowConnectionWizard(true);
      setIsLoading(false);
    } else {
      setIsLoading(false);
    }
  }, [isLoggedIn, isConnected, loadOrders]);
  
  const handleLogin = () => {
    setIsLoggedIn(true);
    localStorage.setItem('isLoggedIn', 'true');
    if (!isConnected) {
        setShowConnectionWizard(true);
    }
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

  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 font-sans">
      <Header 
        isLoggedIn={isLoggedIn}
        onLogout={handleLogout}
        connectedSiteUrl={siteUrl}
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
              <div className="text-center py-12 px-6 text-red-500 bg-red-50 dark:bg-red-900/20">
                <p className="text-lg font-semibold">{error}</p>
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
           <div className="text-center mt-20">
            <h2 className="text-2xl font-semibold text-gray-700 dark:text-gray-300">Welcome!</h2>
            <p className="mt-2 text-gray-500 dark:text-gray-400">Please connect your WordPress site to get started.</p>
            <button 
              onClick={() => setShowConnectionWizard(true)}
              className="mt-6 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
              Connect Site
            </button>
           </div>
        )}
      </main>
      
      {showConnectionWizard && <ConnectionWizard onConnect={handleConnect} onClose={() => setShowConnectionWizard(false)} />}

      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          onClose={handleCloseModal}
          onUpdateStatus={handleUpdateStatus}
        />
      )}
    </div>
  );
};

export default App;
