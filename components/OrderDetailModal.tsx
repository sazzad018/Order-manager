import React, { useState, useEffect, useMemo } from 'react';
import { Order, OrderStatus, CustomerHistory, Courier } from '../types';
import { fetchCourierCustomerHistory, sendToCourier } from '../services/orderService';

interface OrderDetailModalProps {
  order: Order;
  onClose: () => void;
  onUpdateStatus: (orderId: string, status: OrderStatus) => void;
  onOrderBooked: (orderId: string, courier: Courier, trackingId: string) => void;
}

const statusColors: { [key in OrderStatus]: string } = {
  [OrderStatus.Pending]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
  [OrderStatus.Processing]: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
  [OrderStatus.Shipped]: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300',
  [OrderStatus.Delivered]: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
  [OrderStatus.Cancelled]: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
};

// A simple spinner component for loading states
const Spinner: React.FC<{className?: string}> = ({className}) => (
  <svg className={`animate-spin h-5 w-5 ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);


const OrderDetailModal: React.FC<OrderDetailModalProps> = ({ order, onClose, onUpdateStatus, onOrderBooked }) => {
  // State for courier histories
  const [steadfastHistory, setSteadfastHistory] = useState<CustomerHistory | null>(null);
  const [isSteadfastHistoryLoading, setIsSteadfastHistoryLoading] = useState(false);
  const [steadfastHistoryError, setSteadfastHistoryError] = useState<string | null>(null);
  const [pathaoHistory, setPathaoHistory] = useState<CustomerHistory | null>(null);
  const [isPathaoHistoryLoading, setIsPathaoHistoryLoading] = useState(false);
  const [pathaoHistoryError, setPathaoHistoryError] = useState<string | null>(null);

  // State for the courier booking feature
  const [courierStatus, setCourierStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [courierMessage, setCourierMessage] = useState('');
  const [selectedCourier, setSelectedCourier] = useState<Courier>(Courier.Steadfast);
  
  // Courier API Config State
  const [steadfastApiKey, setSteadfastApiKey] = useState<string|null>(null);
  const [steadfastSecretKey, setSteadfastSecretKey] = useState<string|null>(null);
  const [pathaoApiKey, setPathaoApiKey] = useState<string|null>(null);
  const [pathaoStoreId, setPathaoStoreId] = useState<string|null>(null);

  useEffect(() => {
    // Load configs and automatically fetch histories when the modal opens
    const sfApiKey = localStorage.getItem('steadfastApiKey');
    const sfSecretKey = localStorage.getItem('steadfastSecretKey');
    const ptApiKey = localStorage.getItem('pathaoApiKey');
    const ptStoreId = localStorage.getItem('pathaoStoreId');

    setSteadfastApiKey(sfApiKey);
    setSteadfastSecretKey(sfSecretKey);
    setPathaoApiKey(ptApiKey);
    setPathaoStoreId(ptStoreId);

    // Fetch Steadfast history
    if (sfApiKey && sfSecretKey) {
        setIsSteadfastHistoryLoading(true);
        setSteadfastHistoryError(null);
        setSteadfastHistory(null);
        fetchCourierCustomerHistory(order.customerPhone, Courier.Steadfast, { apiKey: sfApiKey, secretKey: sfSecretKey })
            .then(setSteadfastHistory)
            .catch(error => setSteadfastHistoryError(error instanceof Error ? error.message : 'Could not load Steadfast history.'))
            .finally(() => setIsSteadfastHistoryLoading(false));
    }

    // Fetch Pathao history
    if (ptApiKey) { // Pathao history check might only need the access token
        setIsPathaoHistoryLoading(true);
        setPathaoHistoryError(null);
        setPathaoHistory(null);
        fetchCourierCustomerHistory(order.customerPhone, Courier.Pathao, { apiKey: ptApiKey, storeId: ptStoreId })
            .then(setPathaoHistory)
            .catch(error => setPathaoHistoryError(error instanceof Error ? error.message : 'Could not load Pathao history.'))
            .finally(() => setIsPathaoHistoryLoading(false));
    }
  }, [order.customerPhone]);

  const totalHistory = useMemo(() => {
    if (!steadfastHistory && !pathaoHistory) {
        return null;
    }
    const total = {
        totalParcels: (steadfastHistory?.totalParcels || 0) + (pathaoHistory?.totalParcels || 0),
        delivered: (steadfastHistory?.delivered || 0) + (pathaoHistory?.delivered || 0),
        returned: (steadfastHistory?.returned || 0) + (pathaoHistory?.returned || 0),
        pending: (steadfastHistory?.pending || 0) + (pathaoHistory?.pending || 0),
    };
    // Only return the total object if there are any parcels to show
    return total.totalParcels > 0 ? total : null;
  }, [steadfastHistory, pathaoHistory]);
  
  const handleSendToCourier = async () => {
    let courierConfig = {};
    if (selectedCourier === Courier.Steadfast) {
      courierConfig = { apiKey: steadfastApiKey, secretKey: steadfastSecretKey };
    } else if (selectedCourier === Courier.Pathao) {
      courierConfig = { apiKey: pathaoApiKey, storeId: pathaoStoreId };
    }

    setCourierStatus('sending');
    setCourierMessage('');
    try {
      const result = await sendToCourier(order, selectedCourier, courierConfig);
      if (result.success) {
        setCourierStatus('sent');
        setCourierMessage(result.message);
        onOrderBooked(order.id, selectedCourier, result.trackingId);
        if (order.status === OrderStatus.Pending) {
          onUpdateStatus(order.id, OrderStatus.Processing);
        }
      } else {
        setCourierStatus('error');
        setCourierMessage(result.message);
      }
    } catch (err) {
      setCourierStatus('error');
      setCourierMessage('An unexpected error occurred.');
      console.error(err);
    }
  };

  const isBooked = !!order.courier;
  
  const isBookingConfigMissing = selectedCourier === Courier.Steadfast
    ? !steadfastApiKey || !steadfastSecretKey
    : !pathaoApiKey || !pathaoStoreId;

  const missingBookingConfigMessage = selectedCourier === Courier.Steadfast
    ? "Please add an API Key and Secret Key for Steadfast in the Settings."
    : "Please add an Access Token and Store ID for Pathao in the Settings.";

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
              <p><strong>Name:</strong> {order.customerName}</p>
              <p><strong>Email:</strong> {order.customerEmail}</p>
              <p><strong>Phone:</strong> {order.customerPhone}</p>
              
              <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-md text-sm">
                  <h4 className="font-semibold mb-2">Courier Delivery History</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Customer's delivery record based on their phone number.</p>
                  
                  <div className="space-y-3">
                      {/* Steadfast Section */}
                      <div>
                          <div className="flex items-center justify-between">
                              <h5 className="font-semibold text-gray-700 dark:text-gray-300">Steadfast</h5>
                              {isSteadfastHistoryLoading && <Spinner className="text-gray-400 w-4 h-4" />}
                          </div>
                          {!steadfastApiKey || !steadfastSecretKey ? (
                              <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                                  API details for Steadfast are missing in Settings.
                              </p>
                          ) : steadfastHistoryError ? (
                              <p className="text-sm text-red-500 mt-1">{steadfastHistoryError}</p>
                          ) : steadfastHistory ? (
                              <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                                  <p>Total: <span className="font-bold">{steadfastHistory.totalParcels}</span></p>
                                  <p>Delivered: <span className="font-bold text-green-500">{steadfastHistory.delivered}</span></p>
                                  <p>Pending: <span className="font-bold text-yellow-500">{steadfastHistory.pending}</span></p>
                                  <p>Returned: <span className="font-bold text-red-500">{steadfastHistory.returned}</span></p>
                              </div>
                          ) : null}
                      </div>

                      <hr className="border-gray-200 dark:border-gray-600" />

                      {/* Pathao Section */}
                      <div>
                          <div className="flex items-center justify-between">
                              <h5 className="font-semibold text-gray-700 dark:text-gray-300">Pathao</h5>
                              {isPathaoHistoryLoading && <Spinner className="text-gray-400 w-4 h-4" />}
                          </div>
                          {!pathaoApiKey ? (
                              <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                                  Access Token for Pathao is missing in Settings.
                              </p>
                          ) : pathaoHistoryError ? (
                              <p className="text-sm text-red-500 mt-1">{pathaoHistoryError}</p>
                          ) : pathaoHistory ? (
                              <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                                  <p>Total: <span className="font-bold">{pathaoHistory.totalParcels}</span></p>
                                  <p>Delivered: <span className="font-bold text-green-500">{pathaoHistory.delivered}</span></p>
                                  <p>Pending: <span className="font-bold text-yellow-500">{pathaoHistory.pending}</span></p>
                                  <p>Returned: <span className="font-bold text-red-500">{pathaoHistory.returned}</span></p>
                              </div>
                          ) : null}
                      </div>
                      
                      {totalHistory && (
                        <>
                          <hr className="border-gray-200 dark:border-gray-600" />
                          <div>
                              <div className="flex items-center justify-between">
                                  <h5 className="font-semibold text-gray-700 dark:text-gray-300">Total Record</h5>
                              </div>
                              <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                                  <p>Total: <span className="font-bold">{totalHistory.totalParcels}</span></p>
                                  <p>Delivered: <span className="font-bold text-green-500">{totalHistory.delivered}</span></p>
                                  <p>Pending: <span className="font-bold text-yellow-500">{totalHistory.pending}</span></p>
                                  <p>Returned: <span className="font-bold text-red-500">{totalHistory.returned}</span></p>
                              </div>
                          </div>
                        </>
                      )}
                  </div>
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-2 text-gray-800 dark:text-gray-200">Shipping Address</h3>
              <p className="whitespace-pre-line">{order.shippingAddress}</p>
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

          <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <h3 className="font-semibold text-lg mb-3 text-gray-800 dark:text-gray-200">Actions</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
              <div className="space-y-2">
                 <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Update Status</label>
                 <div className="flex items-center gap-2">
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
              <div className="space-y-2">
                 <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Courier Integration</label>
                  {isBooked ? (
                     <div className="p-3 rounded-md bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300">
                        <p className="font-semibold">Booked with {order.courier}</p>
                        <p className="text-sm">Tracking ID: {order.trackingId}</p>
                     </div>
                  ) : (
                    <>
                      <div className="flex gap-2">
                        <select
                          value={selectedCourier}
                          onChange={(e) => setSelectedCourier(e.target.value as Courier)}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          disabled={isBooked || courierStatus === 'sending'}
                        >
                          {Object.values(Courier).map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <button 
                          onClick={handleSendToCourier}
                          disabled={courierStatus === 'sending' || isBooked || isBookingConfigMissing}
                          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed dark:disabled:bg-gray-600 transition-colors"
                        >
                          {courierStatus === 'sending' && <Spinner className="-ml-1 mr-2 text-white" />}
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.125-.504 1.125-1.125V14.25m-17.25 4.5v-1.875a3.375 3.375 0 0 1 3.375-3.375h1.5a1.125 1.125 0 0 1 1.125 1.125v-1.5a3.375 3.375 0 0 1 3.375-3.375H15M12 14.25h.008v.008H12v-.008Z" />
                          </svg>
                          Send
                        </button>
                      </div>
                      {isBookingConfigMissing && !isBooked && (
                        <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                            {missingBookingConfigMessage}
                        </p>
                      )}
                      {courierMessage && (
                        <p className={`text-sm mt-2 ${courierStatus === 'error' ? 'text-red-500' : 'text-green-600'}`}>
                          {courierMessage}
                        </p>
                      )}
                    </>
                  )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetailModal;