import { Order, OrderStatus, CustomerHistory, Courier } from '../types';

// Helper to detect Mixed Content (HTTPS app trying to access HTTP api)
const checkMixedContent = (siteUrl: string) => {
    if (typeof window !== 'undefined' && window.location.protocol === 'https:' && siteUrl.startsWith('http:')) {
        throw new Error(`Security Error: Mixed Content.\n\nThis app is running on HTTPS (Secure), but your site is HTTP (Insecure).\nBrowsers block this connection for your safety.\n\nSolution: You must enable SSL (HTTPS) on your WordPress site to use it with this app.`);
    }
};

// Helper to map WooCommerce Standard API response to our App's Order Type
const mapWooCommerceOrder = (wcOrder: any): Order => {
    const statusMap: { [key: string]: OrderStatus } = {
        'pending': OrderStatus.Pending,
        'processing': OrderStatus.Processing,
        'on-hold': OrderStatus.Pending, // Map on-hold to pending for simplicity
        'completed': OrderStatus.Delivered, // Map completed to Delivered
        'cancelled': OrderStatus.Cancelled,
        'refunded': OrderStatus.Cancelled,
        'failed': OrderStatus.Cancelled
    };

    const items = wcOrder.line_items.map((item: any) => ({
        id: item.id.toString(),
        name: item.name,
        quantity: item.quantity,
        price: parseFloat(item.price || item.subtotal),
        // WC v3 API often includes image data if enhanced, but fallback to placeholder
        imageUrl: item.image?.src || 'https://placehold.co/100x100?text=Product', 
    }));

    const billing = wcOrder.billing || {};
    const shipping = wcOrder.shipping || {};
    
    // Construct address
    const addressParts = [
        `${shipping.first_name || billing.first_name || ''} ${shipping.last_name || billing.last_name || ''}`,
        shipping.company,
        shipping.address_1,
        shipping.address_2,
        `${shipping.city || ''}, ${shipping.state || ''} ${shipping.postcode || ''}`,
        shipping.country
    ].filter(part => part && part.trim() !== '');

    return {
        id: wcOrder.id.toString(),
        customerName: `${billing.first_name || ''} ${billing.last_name || ''}`.trim() || 'Guest',
        customerEmail: billing.email || wcOrder.billing_email || '',
        customerPhone: billing.phone || wcOrder.billing_phone || '',
        orderDate: wcOrder.date_created,
        status: statusMap[wcOrder.status] || OrderStatus.Pending,
        items: items,
        total: parseFloat(wcOrder.total),
        shippingAddress: addressParts.join('\n') || 'No address provided'
    };
};

// This function makes a network request to the WordPress site to fetch orders using standard WC API.
export const fetchOrders = async (siteUrl: string, authHeader: string): Promise<Order[]> => {
  // Ensure no trailing slash
  const baseUrl = siteUrl.replace(/\/+$/, "");
  checkMixedContent(baseUrl);

  // Use Standard WooCommerce API
  const url = `${baseUrl}/wp-json/wc/v3/orders?per_page=30`;

  let response: Response;

  try {
    response = await fetch(url, {
      headers: { 
          'Authorization': authHeader,
          'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error("Connection failed", error);
    const errMessage = error instanceof Error ? error.message : 'Unknown error';

    if (errMessage === 'Failed to fetch' || errMessage.toLowerCase().includes('network')) {
         throw new Error(`Connection Blocked (CORS).\n\nSince you are not using the helper plugin, your WordPress server is blocking this external request.\n\nSolution: Install a "WP CORS" plugin on your WordPress site to allow connections from this app.`);
    }
    throw error;
  }

  const contentType = response.headers.get('content-type');

  if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text().catch(() => '');
      if (text.includes('<!DOCTYPE html>')) {
          throw new Error(`Connection Error: The site returned HTML instead of JSON data. (Status: ${response.status}).\nCheck if your Permalink settings are saved, or if a security plugin is blocking the API.`);
      }
      throw new Error(`Invalid response received from server (Status: ${response.status}).`);
  }

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
        throw new Error(`Authorization failed (${response.status}). Please check your Username and Application Password.`);
    }
    if (response.status === 404) {
         throw new Error(`API Endpoint Not Found (404). Make sure WooCommerce is installed and Permalinks are set to 'Post name'.`);
    }
    
    let errorMessage = `Server returned status: ${response.status}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorMessage;
    } catch (e) {}
    throw new Error(errorMessage);
  }

  const data = await response.json();
  
  // Map WC data to App data
  return data.map(mapWooCommerceOrder);
};

// Update status using Standard WC API
export const updateOrderStatus = async (orderId: string, status: OrderStatus, siteUrl: string, authHeader: string): Promise<Order> => {
  checkMixedContent(siteUrl);

  const statusMap: { [key in OrderStatus]?: string } = {
      [OrderStatus.Pending]: 'pending',
      [OrderStatus.Processing]: 'processing',
      [OrderStatus.Shipped]: 'completed',
      [OrderStatus.Delivered]: 'completed',
      [OrderStatus.Cancelled]: 'cancelled',
  };

  const wcStatus = statusMap[status];
  const baseUrl = siteUrl.replace(/\/+$/, "");
  const url = `${baseUrl}/wp-json/wc/v3/orders/${orderId}`;
  
  try {
      const response = await fetch(url, {
        method: 'PUT', // WC API uses PUT for updates
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: wcStatus })
      });
      
      if (!response.ok) {
         try {
            const errorData = await response.json();
            throw new Error(errorData.message || `Failed to update order status (${response.status}).`);
         } catch (e) {
            throw new Error(`Failed to update order status. Server returned: ${response.status}`);
         }
      }
      const data = await response.json();
      return mapWooCommerceOrder(data);
  } catch (error) {
      console.error("Update Status Error:", error);
      throw error instanceof Error ? error : new Error("An unexpected error occurred during status update.");
  }
};


// --- HISTORY (REAL DATA FROM WOOCOMMERCE) ---

// Fetches order history from the connected WooCommerce store based on phone number
export const fetchCustomerHistory = async (phone: string, siteUrl: string, authHeader: string): Promise<CustomerHistory> => {
    if (!phone) throw new Error("No phone number provided for history check.");
    
    checkMixedContent(siteUrl);
    const baseUrl = siteUrl.replace(/\/+$/, "");
    // WooCommerce API allows searching by phone, name, etc.
    const url = `${baseUrl}/wp-json/wc/v3/orders?search=${encodeURIComponent(phone)}&per_page=50`;

    let response: Response;
    try {
        response = await fetch(url, {
            headers: { 
                'Authorization': authHeader,
                'Content-Type': 'application/json'
            }
        });
    } catch (error) {
        throw new Error("Failed to connect to store for history check.");
    }

    if (!response.ok) {
        throw new Error(`Failed to fetch history (Status: ${response.status})`);
    }

    const data = await response.json();
    
    // Calculate stats
    let total = 0;
    let delivered = 0;
    let returned = 0;
    let pending = 0;

    if (Array.isArray(data)) {
        total = data.length;
        data.forEach((order: any) => {
            const s = order.status;
            if (s === 'completed') delivered++;
            else if (s === 'failed' || s === 'cancelled' || s === 'refunded') returned++;
            else if (s === 'pending' || s === 'processing' || s === 'on-hold') pending++;
        });
    }

    return {
        totalParcels: total,
        delivered,
        returned,
        pending
    };
};


// --- REAL COURIER INTEGRATION CODE ---

// Fetch Global History from Steadfast API
export const fetchSteadfastGlobalStats = async (phone: string, apiKey: string, secretKey: string) => {
    if (!apiKey || !secretKey) throw new Error("Steadfast API Key and Secret Key are required.");
    
    // NOTE: This assumes the API allows searching parcels by mobile number.
    // Standard endpoint often is usually /parcels or similar with query params.
    const url = `https://portal.steadfast.com.bd/api/v1/parcels?mobile=${phone}`;

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Api-Key': apiKey,
                'Secret-Key': secretKey,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            const text = await response.text();
            console.error("Steadfast API Error Response:", text);
            throw new Error(`Steadfast API Error: ${response.status}`);
        }

        const data = await response.json();
        
        // Depending on API structure, data might be inside `data` property
        const parcels = Array.isArray(data) ? data : (data.data || []);
        
        return parcels;
    } catch (error) {
        console.error("Steadfast Global Fetch Error:", error);
        const msg = error instanceof Error ? error.message : "Unknown error";
        if (msg.includes("Failed to fetch")) {
             throw new Error("Connection Failed: The browser blocked the request (CORS) or the internet is down. Please use the 'Open Steadfast' button to check manually.");
        }
        throw error;
    }
}

const sendToSteadfast = async (order: Order, apiKey: string, secretKey: string) => {
  const STEADFAST_API_URL = 'https://portal.steadfast.com.bd/api/v1/create_order';
  const payload = {
    invoice: order.id,
    recipient_name: order.customerName,
    recipient_address: order.shippingAddress,
    recipient_phone: order.customerPhone,
    cod_amount: String(order.total),
    note: `Order from E-commerce Manager App.`,
  };

  try {
    const response = await fetch(STEADFAST_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Api-Key': apiKey, 'Secret-Key': secretKey },
      body: JSON.stringify(payload),
    });

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || `Steadfast API error: ${response.status}`);
        const trackingId = result?.consignment?.tracking_code || `STDFST-${order.id}`;
        return { success: true, trackingId: trackingId, message: `Successfully booked. Tracking: ${trackingId}` };
    } else {
        throw new Error(`Invalid response from Steadfast (status: ${response.status}).`);
    }
  } catch (error) {
    return { success: false, trackingId: '', message: error instanceof Error ? error.message : 'Failed to connect to Steadfast.' };
  }
};

const sendToPathao = async (order: Order, accessToken: string, storeId: string) => {
  const PATHAO_API_URL = 'https://api-hermes.pathao.com/aladdin/api/v1/orders';
  const payload = {
    store_id: storeId,
    recipient_name: order.customerName,
    recipient_address: order.shippingAddress,
    recipient_phone: order.customerPhone,
    amount_to_collect: String(order.total),
    item_quantity: order.items.length,
    item_weight: 0.5,
    item_description: 'Order items',
    merchant_order_id: order.id,
  };

  try {
    const response = await fetch(PATHAO_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}`, 'Accept': 'application/json' },
      body: JSON.stringify(payload),
    });
    
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
        const result = await response.json();
        if (!response.ok) throw new Error(JSON.stringify(result.errors) || result.message || `Pathao API error`);
        const trackingId = result?.data?.consignment_id || `PTHO-${order.id}`;
        return { success: true, trackingId: trackingId, message: `Successfully booked. Tracking: ${trackingId}` };
    } else {
        throw new Error(`Invalid response from Pathao (status: ${response.status}).`);
    }
  } catch (error) {
    return { success: false, trackingId: '', message: error instanceof Error ? error.message : 'Failed to connect to Pathao.' };
  }
};

export const sendToCourier = async (order: Order, courier: Courier, config: any) => {
  if (courier === Courier.Steadfast) {
    if (!config.apiKey || !config.secretKey) return { success: false, trackingId: '', message: 'Keys required.' };
    return await sendToSteadfast(order, config.apiKey, config.secretKey);
  }
  if (courier === Courier.Pathao) {
    if (!config.apiKey || !config.storeId) return { success: false, trackingId: '', message: 'Keys required.' };
    return await sendToPathao(order, config.apiKey, config.storeId);
  }
  return { success: false, trackingId: '', message: 'Service not configured.' };
};