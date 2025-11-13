import { Order, OrderStatus, CustomerHistory, Courier } from '../types';

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


// --- COURIER HISTORY AND INTEGRATION ---

/**
 * MOCK: Simulates fetching customer delivery history from Steadfast using a phone number.
 * NOTE: This is a placeholder. The actual API endpoint and response structure may differ.
 */
const fetchSteadfastHistory = async (phone: string, apiKey: string, secretKey: string): Promise<CustomerHistory> => {
    console.log(`MOCK: Fetching Steadfast history for phone: ${phone} with API Key: ${apiKey}`);
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1500)); 

    // Mock response logic for demonstration.
    const hash = phone.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    if (hash % 5 === 0) {
        throw new Error("Customer phone not found in Steadfast records.");
    }
    const delivered = hash % 10;
    const returned = Math.floor(hash % 5 / 2);
    const pending = Math.floor(hash % 3 / 2);
    const totalParcels = delivered + returned + pending;

    return { totalParcels, delivered, returned, pending };
};

/**
 * MOCK: Simulates fetching customer delivery history from Pathao using a phone number.
 * NOTE: This is a placeholder. The actual API endpoint and response structure may differ.
 */
const fetchPathaoHistory = async (phone: string, accessToken: string): Promise<CustomerHistory> => {
    console.log(`MOCK: Fetching Pathao history for phone: ${phone} with Token: ${accessToken}`);
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Mock response logic for demonstration.
    const hash = phone.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
     if (hash % 6 === 0) {
        throw new Error("Customer phone not found in Pathao records.");
    }
    const delivered = hash % 12;
    const returned = Math.floor(hash % 4 / 2);
    const pending = Math.floor(hash % 2);
    const totalParcels = delivered + returned + pending;

    return { totalParcels, delivered, returned, pending };
};

export const fetchCourierCustomerHistory = async (phone: string, courier: Courier, config: any): Promise<CustomerHistory> => {
    console.log(`Fetching customer history for phone ${phone} from ${courier}`);
    if (courier === Courier.Steadfast) {
        if (!config.apiKey || !config.secretKey) throw new Error('Steadfast API Key and Secret Key are required.');
        return await fetchSteadfastHistory(phone, config.apiKey, config.secretKey);
    }
    if (courier === Courier.Pathao) {
        if (!config.apiKey) throw new Error('Pathao Access Token is required.');
        // Assuming config.apiKey is the access token for this call
        return await fetchPathaoHistory(phone, config.apiKey);
    }
    throw new Error(`History check for "${courier}" is not configured.`);
};


// --- REAL INTEGRATION CODE ---

const sendToSteadfast = async (order: Order, apiKey: string, secretKey: string) => {
  const STEADFAST_API_URL = 'https://portal.steadfast.com.bd/api/v1/create_order';
  
  const payload = {
    invoice: order.id,
    recipient_name: order.customerName,
    recipient_address: order.shippingAddress,
    recipient_phone: order.customerPhone,
    cod_amount: String(order.total), // Sending as string to avoid potential type issues on the server
    note: `Order from E-commerce Manager App. Total items: ${order.items.length}`,
  };

  try {
    const response = await fetch(STEADFAST_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Api-Key': apiKey,
        'Secret-Key': secretKey,
      },
      body: JSON.stringify(payload),
    });

    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.message || `Steadfast API returned status ${response.status}`);
        }
        
        const trackingId = result?.consignment?.tracking_code || `STDFST-${order.id}`;

        return {
            success: true,
            trackingId: trackingId,
            message: `Successfully booked with Steadfast. Tracking: ${trackingId}`
        };
    } else {
        const errorText = await response.text();
        console.error("Steadfast API non-JSON response:", errorText);
        throw new Error(`Received an invalid response from Steadfast (status: ${response.status}). Please check API keys and service status.`);
    }

  } catch (error) {
    console.error("Steadfast API Error:", error);
    if (error instanceof SyntaxError) {
        return {
            success: false,
            trackingId: '',
            message: 'Failed to parse response from Steadfast. The API may be down.'
        };
    }
    return {
      success: false,
      trackingId: '',
      message: error instanceof Error ? error.message : 'Failed to connect to Steadfast.'
    };
  }
};

const sendToPathao = async (order: Order, accessToken: string, storeId: string) => {
  const PATHAO_API_URL = 'https://api-hermes.pathao.com/aladdin/api/v1/orders';
  
  const payload = {
    store_id: storeId,
    recipient_name: order.customerName,
    recipient_address: order.shippingAddress,
    recipient_phone: order.customerPhone,
    amount_to_collect: String(order.total), // Sending as string to avoid potential type issues
    item_quantity: order.items.reduce((sum, item) => sum + item.quantity, 0),
    item_weight: 0.5, // Default weight in kg, adjust as needed
    item_description: order.items.map(i => i.name).join(', '),
    merchant_order_id: order.id,
  };

  try {
    const response = await fetch(PATHAO_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    
    const contentType = response.headers.get('content-type');

    if (contentType && contentType.includes('application/json')) {
        const result = await response.json();
        if (!response.ok) {
            const errorDetails = result.errors ? JSON.stringify(result.errors) : (result.message || `Pathao API returned status ${response.status}`);
            throw new Error(errorDetails);
        }
        
        const trackingId = result?.data?.consignment_id || `PTHO-${order.id}`;

        return {
            success: true,
            trackingId: trackingId,
            message: `Successfully booked with Pathao. Tracking: ${trackingId}`
        };
    } else {
        const errorText = await response.text();
        console.error("Pathao API non-JSON response:", errorText);
        throw new Error(`Received an invalid response from Pathao (status: ${response.status}). Please check API keys and service status.`);
    }
    
  } catch (error) {
    console.error("Pathao API Error:", error);
    if (error instanceof SyntaxError) {
        return {
            success: false,
            trackingId: '',
            message: 'Failed to parse response from Pathao. The API may be down.'
        };
    }
    return {
      success: false,
      trackingId: '',
      message: error instanceof Error ? error.message : 'Failed to connect to Pathao.'
    };
  }
};


export const sendToCourier = async (
    order: Order,
    courier: Courier,
    config: any
): Promise<{ success: boolean; trackingId: string; message: string }> => {
  console.log(`Sending order #${order.id} to ${courier} via live API.`);
  
  if (courier === Courier.Steadfast) {
    if (!config.apiKey || !config.secretKey) {
        return { success: false, trackingId: '', message: 'Steadfast API Key and Secret Key are required.' };
    }
    return await sendToSteadfast(order, config.apiKey, config.secretKey);
  }

  if (courier === Courier.Pathao) {
    if (!config.apiKey || !config.storeId) {
        return { success: false, trackingId: '', message: 'Pathao Access Token and Store ID are required.' };
    }
    return await sendToPathao(order, config.apiKey, config.storeId);
  }

  return { 
    success: false,
    trackingId: '',
    message: `Courier service "${courier}" is not configured.`
  };
};