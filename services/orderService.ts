import { Order, OrderStatus, CustomerHistory, Courier } from '../types';

// Helper to detect Mixed Content (HTTPS app trying to access HTTP api)
const checkMixedContent = (siteUrl: string) => {
    if (typeof window !== 'undefined' && window.location.protocol === 'https:' && siteUrl.startsWith('http:')) {
        throw new Error(`Security Error: Mixed Content.\n\nThis app is running on HTTPS (Secure), but your site is HTTP (Insecure).\nBrowsers block this connection for your safety.\n\nSolution: You must enable SSL (HTTPS) on your WordPress site to use it with this app.`);
    }
};

// This function makes a network request to the WordPress site to fetch orders.
export const fetchOrders = async (siteUrl: string, apiKey: string): Promise<Order[]> => {
  // Ensure no trailing slash
  const baseUrl = siteUrl.replace(/\/+$/, "");
  
  checkMixedContent(baseUrl);

  // STRATEGY:
  // 1. Try the "Pretty Permalink" URL (e.g. /wp-json/...)
  // 2. If that fails (404 or Network Error), try the "Plain Permalink" fallback (e.g. /?rest_route=...)
  // This solves issues where users haven't saved Permalinks in WP settings.

  const prettyUrl = `${baseUrl}/wp-json/order-manager/v1/orders`;
  const fallbackUrl = `${baseUrl}/?rest_route=/order-manager/v1/orders`;

  let response: Response;
  let primaryError: any = null;

  try {
    response = await fetch(prettyUrl, {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    
    // If we get a 404, it's likely a Permalink issue, so throw to trigger fallback.
    if (response.status === 404) {
        throw new Error('Permalink 404');
    }
  } catch (error) {
    console.warn("Primary connection failed, attempting fallback URL...", error);
    primaryError = error;
    
    try {
        // Try the fallback URL which works even if Permalinks are set to "Plain"
        response = await fetch(fallbackUrl, {
            headers: { 'Authorization': `Bearer ${apiKey}` }
        });
    } catch (fallbackError) {
        console.error("Fallback connection also failed.", fallbackError);
        
        const errToReport = primaryError instanceof Error ? primaryError : new Error('Unknown error');
        
        // Handle "Failed to fetch" (Network/CORS) explicitly
        if (errToReport.message === 'Failed to fetch' || errToReport.message.toLowerCase().includes('network')) {
            if (window.location.protocol === 'https:' && siteUrl.startsWith('http:')) {
                 throw new Error("Mixed Content Error: You are trying to connect an HTTP (insecure) WordPress site to this HTTPS (secure) app. This is blocked by your browser. Please enable SSL on your WordPress site.");
            }

            throw new Error(`Connection Blocked (CORS).\n\nYour browser blocked the connection to WordPress.\n\nFIX:\n1. Click 'Re-enter Settings'.\n2. Download the NEW Plugin (v1.2.0).\n3. Delete the old plugin from WordPress and install this new one.\n\n(The new version fixes these blocking issues)`);
        }
        throw errToReport;
    }
  }

  const contentType = response.headers.get('content-type');

  // Check if the response is actually JSON.
  if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text().catch(() => '');
      
      if (text.includes('<!DOCTYPE html>') || text.includes('<html')) {
          throw new Error(`Connection Error: The site returned an HTML page instead of data (Status: ${response.status}). \n\nThis usually means:\n1. A security plugin (Wordfence/iThemes) is blocking REST API requests.\n2. The site is in Maintenance Mode.\n3. You are redirected to a login page.`);
      }
      
      throw new Error(`Invalid response received from server (Status: ${response.status}).`);
  }

  if (!response.ok) {
    let errorMessage = `Server returned status: ${response.status} ${response.statusText}`;
    
    if (response.status === 401 || response.status === 403) {
        throw new Error(`Authorization failed (${response.status}). Please check that your API Key matches exactly.`);
    }

    try {
      const errorData = await response.json();
      if (errorData.message) errorMessage = errorData.message;
      else if (errorData.code) errorMessage = `Error code: ${errorData.code}`;
    } catch (e) {
      // Ignore
    }
    throw new Error(errorMessage);
  }

  const data = await response.json();
  return data;
};

// This function makes a network request to update the order status on the WordPress site.
export const updateOrderStatus = async (orderId: string, status: OrderStatus, siteUrl: string, apiKey: string): Promise<Order> => {
  checkMixedContent(siteUrl);

  const statusMap: { [key in OrderStatus]?: string } = {
      [OrderStatus.Pending]: 'pending',
      [OrderStatus.Processing]: 'processing',
      [OrderStatus.Shipped]: 'completed',
      [OrderStatus.Delivered]: 'completed',
      [OrderStatus.Cancelled]: 'cancelled',
  };

  const wcStatus = statusMap[status];

  if (!wcStatus) {
    throw new Error(`Unknown status mapping for: ${status}`);
  }

  const baseUrl = siteUrl.replace(/\/+$/, "");
  
  // We use the same fallback logic here for consistency
  const prettyUrl = `${baseUrl}/wp-json/order-manager/v1/orders/${orderId}`;
  const fallbackUrl = `${baseUrl}/?rest_route=/order-manager/v1/orders/${orderId}`;
  
  const makeRequest = async (url: string) => {
      return fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: wcStatus })
      });
  };

  try {
      let response = await makeRequest(prettyUrl);
      
      // If 404 on POST, it's almost certainly permalinks. Try fallback.
      if (response.status === 404) {
           console.log("Update failed on pretty URL (404), trying fallback...");
           response = await makeRequest(fallbackUrl);
      }
      
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

// MOCK: Simulates fetching customer delivery history from Steadfast
const fetchSteadfastHistory = async (phone: string, apiKey: string, secretKey: string): Promise<CustomerHistory> => {
    console.log(`MOCK: Fetching Steadfast history for phone: ${phone} with API Key: ${apiKey}`);
    await new Promise(resolve => setTimeout(resolve, 1500)); 

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

// MOCK: Simulates fetching customer delivery history from Pathao
const fetchPathaoHistory = async (phone: string, accessToken: string): Promise<CustomerHistory> => {
    console.log(`MOCK: Fetching Pathao history for phone: ${phone} with Token: ${accessToken}`);
    await new Promise(resolve => setTimeout(resolve, 1500));

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
    cod_amount: String(order.total),
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
    amount_to_collect: String(order.total),
    item_quantity: order.items.reduce((sum, item) => sum + item.quantity, 0),
    item_weight: 0.5,
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