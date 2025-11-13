import React from 'react';
import { Order, OrderStatus } from '../types';

interface OrderListProps {
  orders: Order[];
  onViewDetails: (order: Order) => void;
  onUpdateStatus: (orderId: string, status: OrderStatus) => void;
}

const statusColors: { [key in OrderStatus]: string } = {
    [OrderStatus.Pending]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300 ring-yellow-500/10',
    [OrderStatus.Processing]: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 ring-blue-500/10',
    [OrderStatus.Shipped]: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300 ring-indigo-500/10',
    [OrderStatus.Delivered]: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 ring-green-500/10',
    [OrderStatus.Cancelled]: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300 ring-red-500/10',
};

const OrderList: React.FC<OrderListProps> = ({ orders, onViewDetails }) => {
  if (orders.length === 0) {
    return <div className="text-center py-12 px-6 text-gray-500">No orders found.</div>;
  }

  return (
    <div className="divide-y divide-gray-200 dark:divide-gray-700">
      {orders.map((order) => (
        <div
          key={order.id}
          className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-200 cursor-pointer"
          onClick={() => onViewDetails(order)}
          role="button"
          tabIndex={0}
          onKeyPress={(e) => e.key === 'Enter' && onViewDetails(order)}
        >
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 items-center">
            <div className="col-span-2 md:col-span-1">
              <p className="font-bold text-indigo-500 dark:text-indigo-400">#{order.id}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">{order.customerName}</p>
            </div>
            
            <div className="hidden lg:block">
               <p className="text-sm text-gray-500 dark:text-gray-400">{new Date(order.orderDate).toLocaleDateString()}</p>
            </div>
            
            <div className="hidden md:block">
              <p className="font-semibold text-lg text-gray-800 dark:text-gray-200">${order.total.toFixed(2)}</p>
            </div>
            
            <div>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ring-1 ring-inset ${statusColors[order.status]}`}>
                {order.status}
              </span>
            </div>
            
            <div className="text-right">
              <button 
                onClick={(e) => { e.stopPropagation(); onViewDetails(order); }}
                className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-200 font-semibold"
                aria-label={`View details for order ${order.id}`}
              >
                View
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default OrderList;
