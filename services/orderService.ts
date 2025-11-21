import { Order, OrderStatus, CustomerHistory, Courier } from '../types';

// This function makes a network request to the WordPress site to fetch orders.
export const fetchOrders = async (siteUrl: string, apiKey: string): Promise<Order[]> => {
  // Ensure no trailing slash
  const baseUrl = siteUrl.replace(/\/+$/, "");
  const endpoint = `${baseUrl}/wp-json/order-manager/v1/orders`;

  try {
    const response = await fetch(endpoint, {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });

    const contentType = response.headers.get('content-type');

    // Check if the response is actually JSON. If not (e.g. HTML), throw a specific error.
    // This catches cases where WP returns a standard 404 HTML page because Permalinks aren't saved.
    if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text().catch(() => '');
        
        if (response.status === 404) {
             throw new Error(`Endpoint not found (404). \n\nCRITICAL FIX: Go to your WordPress Dashboard > Settings > Permalinks and click "Save Changes". This is required to enable the API.`);
        }

        if (text.includes('<!DOCTYPE html>') || text.includes('<html')) {
            throw new Error(`Connection Error: The site returned an HTML page instead of data (Status: ${response.status}). \n\nCommon Causes:\n1. Permalinks not saved (Go to Settings > Permalinks > Save Changes).\n2. Security Plugin (e.g., Wordfence) blocking the API.\n3. Maintenance Mode is enabled.`);
        }
        
        throw new Error(`Invalid response received from server (Status: ${response.status}).`);
    }

    if (!response.ok) {
      let errorMessage = `Server returned status: ${response.status} ${response.statusText}`;
      
      if (response.status === 401 || response.status === 403) {
          throw new Error(`Authorization failed (${response.status}). Please check that your API Key matches exactly.`);
      }

      // Try to parse JSON error from WordPress
      try {
        const errorData = await response.json();
        if (errorData.message) errorMessage = errorData.message;
        else if (errorData.code) errorMessage = `Error code: ${errorData.code}`;
      } catch (e) {
        // Ignore json parse error here as we handled non-json content-type above
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Fetch Orders Error:", error);
    
    if (error instanceof Error) {
        // Handle Network Errors (CORS, Mixed Content, Offline)
        // Browsers often just say "Failed to fetch" for CORS or Mixed Content errors.
        if (error.message === 'Failed to fetch' || error.message.toLowerCase().includes('network')) {
            throw new Error(`Network Connection Failed.\n\nMost likely causes:\n1. Mixed Content: Your WordPress is HTTP but this app is HTTPS.\n2. CORS: A security plugin is blocking the connection.\n3. Invalid Site URL (Check for typos).`);
        }
        throw error; 
    }
    throw new Error('An unknown error occurred while fetching orders.');
  }
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

  const baseUrl = siteUrl.replace(/\/+$/, "");
  
  try {
      const response = await fetch(`${baseUrl}/wp-json/order-manager/v1/orders/${orderId}`, {
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
            throw new Error(errorData.message || `Failed to update order status (${response.status}).`);
         } catch (e) {
            throw new Error(`Failed to update order status. Server returned: ${response.status} ${response.statusText}`);
         }
      }
      const data = await response.json();
      return data;
  } catch (error) {
      console.error("Update Status Error:", error);
      throw error instanceof Error ? error : new Error("An unexpected error occurred during status update.");
  }
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