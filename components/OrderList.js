import React from 'react';
import { OrderStatus } from '../types.js';

const statusColors = {
    [OrderStatus.Pending]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300 ring-yellow-500/10',
    [OrderStatus.Processing]: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 ring-blue-500/10',
    [OrderStatus.Shipped]: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300 ring-indigo-500/10',
    [OrderStatus.Delivered]: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 ring-green-500/10',
    [OrderStatus.Cancelled]: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300 ring-red-500/10',
};

const OrderList = ({ orders, onViewDetails }) => {
  if (orders.length === 0) {
    return React.createElement("div", { className: "text-center py-12 px-6 text-gray-500" }, "No orders found.");
  }

  return React.createElement("div", { className: "divide-y divide-gray-200 dark:divide-gray-700" },
    orders.map((order) =>
      React.createElement("div", {
        key: order.id,
        className: "p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-200 cursor-pointer",
        onClick: () => onViewDetails(order),
        role: "button",
        tabIndex: 0,
        onKeyPress: (e) => e.key === 'Enter' && onViewDetails(order)
      },
        React.createElement("div", { className: "grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 items-center" },
          React.createElement("div", { className: "col-span-2 md:col-span-1" },
            React.createElement("p", { className: "font-bold text-indigo-500 dark:text-indigo-400" }, `#${order.id}`),
            React.createElement("p", { className: "text-sm text-gray-600 dark:text-gray-400 font-medium" }, order.customerName)
          ),
          React.createElement("div", { className: "hidden lg:block" },
            React.createElement("p", { className: "text-sm text-gray-500 dark:text-gray-400" }, new Date(order.orderDate).toLocaleDateString())
          ),
          React.createElement("div", { className: "hidden md:block" },
            React.createElement("p", { className: "font-semibold text-lg text-gray-800 dark:text-gray-200" }, `$${order.total.toFixed(2)}`)
          ),
          React.createElement("div", null,
            React.createElement("span", { className: `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ring-1 ring-inset ${statusColors[order.status]}` },
              order.status
            )
          ),
          React.createElement("div", { className: "text-right" },
            React.createElement("button", { 
              onClick: (e) => { e.stopPropagation(); onViewDetails(order); },
              className: "text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-200 font-semibold",
              "aria-label": `View details for order ${order.id}`
            }, "View")
          )
        )
      )
    )
  );
};

export default OrderList;