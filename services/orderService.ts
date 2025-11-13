import { Order, OrderStatus } from '../types';

// This file simulates API calls to the WordPress plugin.
// The actual logic is in the order-manager-connector.php file.

const mockOrders: Order[] = [
  {
    id: 'ORD-123',
    customerName: 'Jane Doe',
    customerEmail: 'jane.doe@example.com',
    customerPhone: '555-123-4567',
    orderDate: new Date('2023-10-26T10:00:00Z').toISOString(),
    status: OrderStatus.Processing,
    items: [
      { id: 'prod-001', name: 'Wireless Mouse', quantity: 1, price: 25.99, imageUrl: 'https://images.unsplash.com/photo-1527814050087-3793815479db?w=150&q=80' },
      { id: 'prod-002', name: 'Mechanical Keyboard', quantity: 1, price: 89.99, imageUrl: 'https://images.unsplash.com/photo-1595169369444-15b5315dd25?w=150&q=80' },
    ],
    total: 115.98,
    shippingAddress: '123 Main St, Anytown, USA 12345',
  },
  {
    id: 'ORD-124',
    customerName: 'John Smith',
    customerEmail: 'john.smith@example.com',
    customerPhone: '555-987-6543',
    orderDate: new Date('2023-10-25T14:30:00Z').toISOString(),
    status: OrderStatus.Pending,
    items: [
      { id: 'prod-003', name: 'USB-C Hub', quantity: 2, price: 19.50, imageUrl: 'https://images.unsplash.com/photo-1582925232829-927b5e45a49c?w=150&q=80' },
    ],
    total: 39.00,
    shippingAddress: '456 Oak Ave, Somecity, USA 54321',
  },
    {
    id: 'ORD-125',
    customerName: 'Emily White',
    customerEmail: 'emily.white@example.com',
    customerPhone: '555-555-5555',
    orderDate: new Date('2023-10-24T09:05:00Z').toISOString(),
    status: OrderStatus.Shipped,
    items: [
      { id: 'prod-004', name: '4K Webcam', quantity: 1, price: 120.00, imageUrl: 'https://images.unsplash.com/photo-1614624532983-4ce03382d63d?w=150&q=80' },
      { id: 'prod-005', name: 'Desk Mat', quantity: 1, price: 22.00, imageUrl: 'https://images.unsplash.com/photo-1616091195724-7b565a085603?w=150&q=80' },
    ],
    total: 142.00,
    shippingAddress: '789 Pine Ln, Otherville, USA 67890',
  },
   {
    id: 'ORD-126',
    customerName: 'Michael Brown',
    customerEmail: 'michael.brown@example.com',
    customerPhone: '555-111-2222',
    orderDate: new Date('2023-10-22T18:00:00Z').toISOString(),
    status: OrderStatus.Delivered,
    items: [
      { id: 'prod-006', name: 'Ergonomic Chair', quantity: 1, price: 350.00, imageUrl: 'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=150&q=80' },
    ],
    total: 350.00,
    shippingAddress: '101 Maple Dr, New Place, USA 13579',
  },
];

// This is a local copy for simulation purposes
let ordersData = JSON.parse(JSON.stringify(mockOrders));

// In a real app, this function would make a network request to the WordPress site
export const fetchOrders = async (siteUrl: string, apiKey: string): Promise<Order[]> => {
  console.log(`Fetching orders from ${siteUrl} with API key ${apiKey}...`);
  // ** REAL IMPLEMENTATION EXAMPLE **
  // const response = await fetch(`${siteUrl.replace(/\/+$/, "")}/wp-json/order-manager/v1/orders`, {
  //   headers: { 'Authorization': `Bearer ${apiKey}` }
  // });
  // if (!response.ok) {
  //    throw new Error('Failed to fetch orders. Check URL, API Key, and CORS settings.');
  // }
  // const data = await response.json();
  // return data;

  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  return JSON.parse(JSON.stringify(ordersData));
};

// In a real app, this function would make a network request to update the status
export const updateOrderStatus = async (orderId: string, status: OrderStatus, siteUrl: string, apiKey: string): Promise<Order> => {
  console.log(`Updating order ${orderId} to status ${status} on ${siteUrl}`);
  // ** REAL IMPLEMENTATION EXAMPLE **
  // const response = await fetch(`${siteUrl.replace(/\/+$/, "")}/wp-json/order-manager/v1/orders/${orderId}/status`, {
  //   method: 'POST',
  //   headers: {
  //     'Authorization': `Bearer ${apiKey}`,
  //     'Content-Type': 'application/json'
  //   },
  //   body: JSON.stringify({ status })
  // });
  // if (!response.ok) {
  //    throw new Error('Failed to update order status.');
  // }
  // const data = await response.json();
  // return data;
  
  // Simulate network delay for mock
  await new Promise(resolve => setTimeout(resolve, 500));
  const orderIndex = ordersData.findIndex((o: Order) => o.id === orderId);
  if (orderIndex !== -1) {
    ordersData[orderIndex].status = status;
    return { ...ordersData[orderIndex] };
  }
  
  throw new Error('Order not found');
};
