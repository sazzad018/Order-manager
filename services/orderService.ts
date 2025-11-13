import { Order, OrderStatus, CustomerHistory } from '../types';

// This function makes a network request to the WordPress site to fetch orders.
export const fetchOrders = async (siteUrl: string, apiKey: string): Promise<Order[]> => {
  const response = await fetch(`${siteUrl.replace(/\/+$/, "")}/wp-json/order-manager/v1/orders`, {
    headers: { 'Authorization': `Bearer ${apiKey}` }
  });
  if (!response.ok) {
     throw new Error('Failed to fetch orders. Check URL, API Key, and CORS settings on your WordPress site.');
  }
  const data = await response.json();
  return data;
};

// This function makes a network request to update the order status on the WordPress site.
export const updateOrderStatus = async (orderId: string, status: OrderStatus, siteUrl: string, apiKey: string): Promise<Order> => {
  // The PHP plugin expects the lowercase WooCommerce status, not the app's capitalized status.
  // We need to map it back before sending the update.
  const statusMap: { [key in OrderStatus]?: string } = {
      [OrderStatus.Pending]: 'pending',
      [OrderStatus.Processing]: 'processing',
      // WooCommerce doesn't have a "Shipped" status by default. Mapping to "completed" is a common practice.
      [OrderStatus.Shipped]: 'completed',
      [OrderStatus.Delivered]: 'completed',
      [OrderStatus.Cancelled]: 'cancelled',
  };

  const wcStatus = statusMap[status];

  if (!wcStatus) {
    throw new Error(`Unknown status mapping for: ${status}`);
  }

  const response = await fetch(`${siteUrl.replace(/\/+$/, "")}/wp-json/order-manager/v1/orders/${orderId}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ status: wcStatus }) // Send the lowercase WooCommerce status
  });
  
  if (!response.ok) {
     try {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update order status.');
     } catch (e) {
        throw new Error('Failed to update order status. The server returned an invalid response.');
     }
  }
  const data = await response.json();
  return data;
};

// This function fetches the order history for a specific customer.
export const fetchCustomerHistory = async (customerEmail: string, siteUrl: string, apiKey: string): Promise<CustomerHistory> => {
  const url = new URL(`${siteUrl.replace(/\/+$/, "")}/wp-json/order-manager/v1/customer-history`);
  url.searchParams.append('email', customerEmail);
  
  const response = await fetch(url.toString(), {
    headers: { 'Authorization': `Bearer ${apiKey}` }
  });

  if (!response.ok) {
    throw new Error("Failed to fetch customer history.");
  }
  
  const data = await response.json();
  return data;
};
