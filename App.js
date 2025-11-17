import React, { useState, useEffect, useCallback } from 'react';
import { OrderStatus, Courier } from './types.js';
import { fetchOrders, updateOrderStatus } from './services/orderService.js';
import Header from './components/Header.js';
import OrderList from './components/OrderList.js';
import OrderDetailModal from './components/OrderDetailModal.js';
import Login from './components/Login.js';
import ConnectionWizard from './components/ConnectionWizard.js';
import InfoPanel from './components/InfoPanel.js';
import SettingsModal from './components/SettingsModal.js';

const App = () => {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isLoggedIn, setIsLoggedIn] = useState(() => !!localStorage.getItem('isLoggedIn'));
  const [isConnected, setIsConnected] = useState(() => !!localStorage.getItem('siteUrl'));
  const [siteUrl, setSiteUrl] = useState(() => localStorage.getItem('siteUrl'));
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('apiKey'));
  const [showConnectionWizard, setShowConnectionWizard] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const loadOrders = useCallback(async () => {
    if (!isConnected || !siteUrl || !apiKey) return;
    try {
      setIsLoading(true);
      setError(null);
      const fetchedOrders = await fetchOrders(siteUrl, apiKey);
      setOrders(fetchedOrders);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
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
    setApiKey(null);
    setOrders([]);
    localStorage.clear();
  };

  const handleConnect = (newSiteUrl, newApiKey) => {
    setSiteUrl(newSiteUrl);
    setApiKey(newApiKey);
    setIsConnected(true);
    localStorage.setItem('siteUrl', newSiteUrl);
    localStorage.setItem('apiKey', newApiKey);
    setShowConnectionWizard(false);
  };

  const handleSelectOrder = (order) => {
    setSelectedOrder(order);
  };

  const handleCloseModal = () => {
    setSelectedOrder(null);
  };

  const handleUpdateStatus = async (orderId, status) => {
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

  const handleOrderBooked = (orderId, courier, trackingId) => {
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
    return React.createElement(Login, { onLogin: handleLogin });
  }

  return React.createElement("div", { className: "min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 font-sans" },
    React.createElement(Header, { 
      isLoggedIn: isLoggedIn,
      onLogout: handleLogout,
      connectedSiteUrl: siteUrl,
      onSettingsClick: () => setShowSettings(true)
    }),
    React.createElement("main", { className: "container mx-auto p-4 md:p-8" },
      isConnected ? (
        React.createElement("div", { className: "mt-8 bg-white dark:bg-gray-800 shadow-lg rounded-xl overflow-hidden" },
          React.createElement("div", { className: "p-6 border-b border-gray-200 dark:border-gray-700" },
            React.createElement("h2", { className: "text-2xl font-bold text-gray-900 dark:text-white" }, "Incoming Orders"),
            React.createElement("p", { className: "mt-1 text-gray-500 dark:text-gray-400" }, "Manage and track all customer orders.")
          ),
          isLoading ? (
            React.createElement("div", { className: "flex justify-center items-center h-64" },
              React.createElement("div", { className: "animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-indigo-500" })
            )
          ) : error ? (
            React.createElement("div", { className: "text-center py-12 px-6" },
              React.createElement("div", { className: "bg-red-50 dark:bg-gray-800 border border-red-200 dark:border-red-900/50 p-6 rounded-lg max-w-lg mx-auto shadow-md" },
                React.createElement("div", { className: "flex flex-col items-center justify-center" },
                  React.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", className: "h-12 w-12 text-red-400", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2 },
                    React.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" })
                  ),
                  React.createElement("h3", { className: "mt-4 text-xl font-bold text-gray-800 dark:text-red-400" }, "Connection Failed"),
                  React.createElement("p", { className: "mt-2 text-gray-600 dark:text-red-300/80 mb-6" }, error),
                  React.createElement("div", { className: "flex justify-center gap-4" },
                    React.createElement("button", {
                      onClick: loadOrders,
                      className: "px-5 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-colors"
                    }, "Retry"),
                    React.createElement("button", {
                      onClick: () => setShowSettings(true),
                      className: "px-5 py-2 bg-white text-gray-800 font-semibold rounded-lg border border-gray-300 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-colors"
                    }, "Check Settings")
                  )
                )
              )
            )
          ) : (
            React.createElement(OrderList, {
              orders: orders,
              onViewDetails: handleSelectOrder,
              onUpdateStatus: handleUpdateStatus
            })
          )
        )
      ) : (
         React.createElement(InfoPanel, { onConnectClick: () => setShowConnectionWizard(true) })
      )
    ),
    showConnectionWizard && React.createElement(ConnectionWizard, { onConnect: handleConnect, onClose: () => setShowConnectionWizard(false) }),
    showSettings && React.createElement(SettingsModal, { onClose: () => setShowSettings(false) }),
    selectedOrder && React.createElement(OrderDetailModal, {
      order: selectedOrder,
      onClose: handleCloseModal,
      onUpdateStatus: handleUpdateStatus,
      onOrderBooked: handleOrderBooked
    })
  );
};

export default App;