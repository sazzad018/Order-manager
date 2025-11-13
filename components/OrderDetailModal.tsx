import React, { useState } from 'react';
import { Order, OrderStatus, CustomerHistory } from '../types';
import { fetchCustomerHistory } from '../services/orderService';

interface OrderDetailModalProps {
  order: Order;
  onClose: () => void;
  onUpdateStatus: (orderId: string, status: OrderStatus) => void;
}

const statusColors: { [key in OrderStatus]: string } = {
  [OrderStatus.Pending]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
  [OrderStatus.Processing]: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
  [OrderStatus.Shipped]: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300',
  [OrderStatus.Delivered]: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
  [OrderStatus.Cancelled]: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
};

const OrderDetailModal: React.FC<OrderDetailModalProps> = ({ order, onClose, onUpdateStatus }) => {
  const [history, setHistory] = useState<CustomerHistory | null>(null);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const siteUrl = localStorage.getItem('siteUrl');
  const apiKey = localStorage.getItem('apiKey');
  
  const handleViewHistory = async () => {
    if (!siteUrl || !apiKey) return;
    setIsHistoryLoading(true);
    setHistoryError(null);
    try {
      const historyData = await fetchCustomerHistory(order.customerEmail, siteUrl, apiKey);
      setHistory(historyData);
    } catch (error) {
      setHistoryError('Could not load customer history.');
      console.error(error);
    } finally {
      setIsHistoryLoading(false);
    }
  };
  
  const canShip = order.status === OrderStatus.Pending || order.status === OrderStatus.Processing;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-60 z-30 flex justify-center items-center p-4"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Order #{order.id}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Placed on {new Date(order.orderDate).toLocaleDateString()}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800"
              aria-label="Close order details"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-lg mb-2 text-gray-800 dark:text-gray-200">Customer Details</h3>
              <div className="flex items-center gap-4">
                 <p><strong>Name:</strong> {order.customerName}</p>
                 <button onClick={handleViewHistory} className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">View History</button>
              </div>
              <p><strong>Email:</strong> {order.customerEmail}</p>
              <p><strong>Phone:</strong> {order.customerPhone}</p>
              
              {isHistoryLoading && <p className="text-sm mt-2">Loading history...</p>}
              {historyError && <p className="text-sm text-red-500 mt-2">{historyError}</p>}
              {history && (
                <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-md text-sm">
                  <h4 className="font-semibold mb-1">Lifetime Order History:</h4>
                  <p>Delivered Orders: <span className="font-bold">{history.delivered}</span></p>
                  <p>Returned/Cancelled: <span className="font-bold">{history.returned}</span></p>
                </div>
              )}

            </div>
            <div>
              <h3 className="font-semibold text-lg mb-2 text-gray-800 dark:text-gray-200">Shipping Address</h3>
              <p>{order.shippingAddress}</p>
            </div>
          </div>
          
          <div>
            <h3 className="font-semibold text-lg mb-2 text-gray-800 dark:text-gray-200">Order Items</h3>
            <ul className="divide-y divide-gray-200 dark:divide-gray-700 border-t border-b dark:border-gray-700">
              {order.items.map(item => (
                <li key={item.id} className="py-4 flex items-center">
                  <img src={item.imageUrl} alt={item.name} className="w-16 h-16 rounded-md object-cover mr-4"/>
                  <div className="flex-grow">
                    <p className="font-semibold">{item.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Qty: {item.quantity}</p>
                  </div>
                  <p className="font-semibold">${(item.price * item.quantity).toFixed(2)}</p>
                </li>
              ))}
            </ul>
            <div className="text-right mt-4 font-bold text-xl">
              Total: ${order.total.toFixed(2)}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            <div>
              <h3 className="font-semibold text-lg mb-2 text-gray-800 dark:text-gray-200">Order Status</h3>
              <div className="flex items-center gap-4">
                <span className={`px-3 py-1 text-sm font-medium rounded-full ${statusColors[order.status]}`}>
                  {order.status}
                </span>
                <select
                  value={order.status}
                  onChange={(e) => onUpdateStatus(order.id, e.target.value as OrderStatus)}
                  className="block w-full max-w-xs rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-indigo-500 dark:focus:border-indigo-500"
                >
                  {Object.values(OrderStatus).map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>
            </div>
             <div className="text-left md:text-right">
                <h3 className="font-semibold text-lg mb-2 text-gray-800 dark:text-gray-200 invisible hidden md:block">Actions</h3>
                 <button 
                  onClick={() => onUpdateStatus(order.id, OrderStatus.Shipped)}
                  disabled={!canShip}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed dark:disabled:bg-gray-600"
                 >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.125-.504 1.125-1.125V14.25m-17.25 4.5v-1.875a3.375 3.375 0 0 1 3.375-3.375h1.5a1.125 1.125 0 0 1 1.125 1.125v-1.5a3.375 3.375 0 0 1 3.375-3.375H15M12 14.25h.008v.008H12v-.008Z" />
                    </svg>
                   Prepare for Shipping
                 </button>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetailModal;
