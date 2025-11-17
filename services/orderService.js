import { Courier } from '../types.js';

// This function makes a network request to the WordPress site to fetch orders.
export const fetchOrders = async (siteUrl, apiKey) => {
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
export const updateOrderStatus = async (orderId, status, siteUrl, apiKey) => {
  const statusMap = {
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

  const response = await fetch(`${siteUrl.replace(/\/+$/, "")}/wp-json/order-manager/v1/orders/${orderId}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ status: wcStatus })
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

const fetchSteadfastHistory = async (phone, apiKey, secretKey) => {
    console.log(`MOCK: Fetching Steadfast history for phone: ${phone} with API Key: ${apiKey}`);
    await new Promise(resolve => setTimeout(resolve, 1500)); 
    const hash = phone.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const delivered = hash % 10;
    const returned = Math.floor(hash % 5 / 2);
    const pending = Math.floor(hash % 3 / 2);
    const totalParcels = delivered + returned + pending;
    return { totalParcels, delivered, returned, pending };
};

const fetchPathaoHistory = async (phone, accessToken) => {
    console.log(`MOCK: Fetching Pathao history for phone: ${phone} with Token: ${accessToken}`);
    await new Promise(resolve => setTimeout(resolve, 1500));
    const hash = phone.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const delivered = hash % 12;
    const returned = Math.floor(hash % 4 / 2);
    const pending = Math.floor(hash % 2);
    const totalParcels = delivered + returned + pending;
    return { totalParcels, delivered, returned, pending };
};

export const fetchCourierCustomerHistory = async (phone, courier, config) => {
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

const sendToSteadfast = async (order, apiKey, secretKey) => {
  const STEADFAST_API_URL = 'https://portal.steadfast.com.bd/api/v1/create_order';
  
  const payload = {
    invoice: order.id,
    recipient_name: order.customerName,
    recipient_address: order.shippingAddress.replace(/\n/g, ', '), // Replace newlines to prevent API errors
    recipient_phone: order.customerPhone,
    cod_amount: Number(order.total),
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

const sendToPathao = async (order, accessToken, storeId) => {
  const PATHAO_API_URL = 'https://api-hermes.pathao.com/aladdin/api/v1/orders';
  
  const payload = {
    store_id: storeId,
    recipient_name: order.customerName,
    recipient_address: order.shippingAddress,
    recipient_phone: order.customerPhone,
    amount_to_collect: Number(order.total),
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


export const sendToCourier = async (order, courier, config) => {
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