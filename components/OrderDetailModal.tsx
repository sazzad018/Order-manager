import React from 'react';
import { Order, OrderStatus } from '../types';

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
        </div>
      </div>
    </div>
  );
};

export default OrderDetailModal;
